import type { Session } from "hono-sessions";
import type Pocketbase from "pocketbase";
import type {
  PatchOperation,
  PullResponse,
  ReadonlyJSONValue,
} from "replicache";
import { ReplicacheClientGroupInput } from "shared/api/schema";
import { pocketbaseId } from "shared/nanoid";
import { z } from "zod";
import {
  CVREntries,
  cvrEntriesFromSearch,
  diffCVR,
  isCVRDiffEmpty,
  type CVR,
} from "./cvr";
import {
  getClientGroup,
  getCollection,
  putClientGroup,
  searchClients,
  searchCollection,
} from "./util";

const cookie = z.object({
  order: z.number(),
  cvrID: z.string(),
});

type Cookie = z.infer<typeof cookie>;

const pullRequest = z.object({
  clientGroupID: z.string(),
  cookie: z.union([cookie, z.null()]),
});

// cvrKey -> ClientViewRecord
// const cvrCache = new Map<string, CVR>();

// Implements the algorithm from:
// https://doc.replicache.dev/strategies/row-version#pull
export async function pull(
  session: Session,
  pb: Pocketbase,
  userID: string,
  requestBody: ReadonlyJSONValue,
): Promise<PullResponse> {
  console.log(`Processing pull`, JSON.stringify(requestBody, null, ""));

  const pull = pullRequest.parse(requestBody);

  const { clientGroupID } = pull;
  // 1: Fetch prevCVR
  const prevCVR = pull.cookie
    ? (session.get(pull.cookie.cvrID) as CVR)
    : undefined;
  // 2: Init baseCVR
  const baseCVR: CVR = prevCVR ?? {};
  console.log({ prevCVR, baseCVR });

  // 3: begin transaction
  const txResult = await (async () => {
    // 4-5: getClientGroup(body.clientGroupID), verify user
    const baseClientGroupRecord = await getClientGroup(
      pb,
      clientGroupID,
      userID,
    );

    const [
      listMeta,
      listItemMeta,
      boardMeta,
      boardColumnMeta,
      boardItemMeta,
      clientMeta,
    ] = await Promise.all([
      // 6: Read all domain data, just ids and versions
      searchCollection(pb, "list", userID),
      searchCollection(pb, "list_item", userID),
      searchCollection(pb, "board", userID),
      searchCollection(pb, "board_column", userID),
      searchCollection(pb, "board_item", userID),
      // 7: Read all clients in CG
      searchClients(pb, clientGroupID),
    ]);

    // 6: Read all domain data, just ids and versions
    console.log({
      baseClientGroupRecord,
      listMeta,
      listItemMeta,
      boardMeta,
      boardColumnMeta,
      boardItemMeta,
      clientMeta,
    });

    // 8: Build nextCVR
    const nextCVR: CVR = {
      list: cvrEntriesFromSearch(listMeta),
      list_item: cvrEntriesFromSearch(listItemMeta),
      board: cvrEntriesFromSearch(boardMeta),
      board_column: cvrEntriesFromSearch(boardColumnMeta),
      board_item: cvrEntriesFromSearch(boardItemMeta),
      client: cvrEntriesFromSearch(clientMeta),
    };
    console.log({ nextCVR });

    // 9: calculate diffs
    const diff = diffCVR(baseCVR, nextCVR);
    console.log({ diff });

    // 10: If diff is empty, return no-op PR
    if (prevCVR && isCVRDiffEmpty(diff)) {
      return null;
    }

    // 11: get entities
    const [lists, listItems, boards, boardColumns, boardItems] =
      await Promise.all([
        getCollection(pb, "list", diff.list.puts),
        getCollection(pb, "list_item", diff.list_item.puts),
        getCollection(pb, "board", diff.board.puts),
        getCollection(pb, "board_column", diff.board_column.puts),
        getCollection(pb, "board_item", diff.board_item.puts),
      ]);
    console.log({ lists, listItems, boards, boardColumns, boardItems });

    // 12: changed clients - no need to re-read clients from database,
    // we already have their versions.
    const clients: CVREntries = {};
    for (const clientID of diff.client.puts) {
      clients[clientID] = nextCVR.client[clientID];
    }
    console.log({ clients });

    // 13: newCVRVersion
    const baseCVRVersion = pull.cookie?.order ?? 0;
    const nextCVRVersion =
      Math.max(baseCVRVersion, baseClientGroupRecord.cvr_version) + 1;

    // 14: Write ClientGroupRecord
    const nextClientGroupRecord: ReplicacheClientGroupInput = {
      ...baseClientGroupRecord,
      cvr_version: nextCVRVersion,
    };
    console.log({ nextClientGroupRecord });
    await putClientGroup(pb, nextClientGroupRecord);

    return {
      entities: {
        list: { dels: diff.list.dels, puts: lists },
        list_item: { dels: diff.list_item.dels, puts: listItems },
        board: { dels: diff.board.dels, puts: boards },
        board_column: { dels: diff.board_column.dels, puts: boardColumns },
        board_item: { dels: diff.board_item.dels, puts: boardItems },
      },
      clients,
      nextCVR,
      nextCVRVersion,
    };
  })();

  // 10: If diff is empty, return no-op PR
  if (txResult === null) {
    return {
      cookie: pull.cookie,
      lastMutationIDChanges: {},
      patch: [],
    };
  }

  const { entities, clients, nextCVR, nextCVRVersion } = txResult;

  // 16-17: store cvr
  const cvrID = pull.cookie?.cvrID ?? pocketbaseId();
  session.set(cvrID, nextCVR);

  // 18(i): build patch
  const patch: PatchOperation[] = [];
  if (prevCVR === undefined) {
    patch.push({ op: "clear" });
  }

  for (const [name, { puts, dels }] of Object.entries(entities)) {
    for (const id of dels) {
      patch.push({ op: "del", key: `${name}/${id}` });
    }
    for (const entity of puts) {
      patch.push({
        op: "put",
        key: `${name}/${entity.id}`,
        value: entity,
      });
    }
  }

  // 18(ii): construct cookie
  const cookie: Cookie = {
    order: nextCVRVersion,
    cvrID,
  };

  // 17(iii): lastMutationIDChanges
  const lastMutationIDChanges = clients;

  return {
    cookie,
    lastMutationIDChanges,
    patch,
  };
}
