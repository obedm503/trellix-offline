import type Pocketbase from "pocketbase";
import type { ReadonlyJSONValue } from "replicache";
import { api } from "shared/api";
import type { ReplicacheClientInput } from "shared/api/schema";
import { z } from "zod";
import type { Mutators } from "../../src/mutators";
import {
  getClient,
  getClientGroup,
  putClient,
  putClientGroup,
  type Affected,
} from "./util";

const mutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  name: z.string(),
  args: z.any(),
});

type Mutation = z.infer<typeof mutationSchema>;

const pushRequestSchema = z.object({
  clientGroupID: z.string(),
  mutations: z.array(mutationSchema),
});

export async function push(
  pb: Pocketbase,
  userID: string,
  requestBody: ReadonlyJSONValue,
) {
  console.log("Processing push", JSON.stringify(requestBody, null, ""));

  const push = pushRequestSchema.parse(requestBody);

  const t0 = Date.now();

  const allAffected: Record<keyof Affected, Set<string>> = {
    listIDs: new Set<string>(),
    listItemIDs: new Set<string>(),
    boardtIDs: new Set<string>(),
    boardColumnIDs: new Set<string>(),
    boardItemIDs: new Set<string>(),
  };

  for (const mutation of push.mutations) {
    try {
      const affected = await processMutation(
        pb,
        userID,
        push.clientGroupID,
        mutation,
        false,
      );
      affected.listIDs.forEach((id) => allAffected.listIDs.add(id));
      affected.listItemIDs.forEach((id) => allAffected.listItemIDs.add(id));
      affected.boardtIDs.forEach((id) => allAffected.boardtIDs.add(id));
      affected.boardColumnIDs.forEach((id) =>
        allAffected.boardColumnIDs.add(id),
      );
      affected.boardItemIDs.forEach((id) => allAffected.boardItemIDs.add(id));
    } catch (e) {
      await processMutation(pb, userID, push.clientGroupID, mutation, true);
    }
  }

  console.log("Processed all mutations in", Date.now() - t0);
}

// Implements the push algorithm from
// https://doc.replicache.dev/strategies/row-version#push
async function processMutation(
  pb: Pocketbase,
  userID: string,
  clientGroupID: string,
  mutation: Mutation,
  // 1: `let errorMode = false`. In JS, we implement this step naturally
  // as a param. In case of failure, caller will call us again with `true`.
  errorMode: boolean,
): Promise<Affected> {
  // 2: beginTransaction
  let affected: Affected = {
    listIDs: [],
    listItemIDs: [],
    boardtIDs: [],
    boardColumnIDs: [],
    boardItemIDs: [],
  };

  console.log(
    "Processing mutation",
    errorMode ? "errorMode" : "",
    JSON.stringify(mutation, null, ""),
  );

  // 3: `getClientGroup(body.clientGroupID)`
  // 4: Verify requesting user owns cg (in function)
  const clientGroup = await getClientGroup(pb, clientGroupID, userID);
  // 5: `getClient(mutation.clientID)`
  // 6: Verify requesting client group owns requested client
  const baseClient = await getClient(pb, mutation.clientID, clientGroupID);

  // 7: init nextMutationID
  const nextMutationID = baseClient.last_mutation_id + 1;

  // 8: rollback and skip if already processed.
  if (mutation.id < nextMutationID) {
    console.log(
      `Mutation ${mutation.id} has already been processed - skipping`,
    );
    return affected;
  }

  // 9: Rollback and error if from future.
  if (mutation.id > nextMutationID) {
    throw new Error(`Mutation ${mutation.id} is from the future - aborting`);
  }

  const t1 = Date.now();

  if (!errorMode) {
    try {
      // 10(i): Run business logic
      // 10(i)(a): xmin column is automatically updated by Postgres for any
      //   affected rows.
      affected = await mutate(pb, mutation);
    } catch (e) {
      // 10(ii)(a-c): log error, abort, and retry
      console.error(
        `Error executing mutation: ${JSON.stringify(mutation)}: ${e}`,
      );
      throw e;
    }
  }

  // 11-12: put client and client group
  const nextClient: ReplicacheClientInput = {
    replicache_id: mutation.clientID,
    client_group_replicache_id: clientGroupID,
    last_mutation_id: nextMutationID,
    created_by: userID,
  };

  await Promise.all([
    putClientGroup(pb, clientGroup),
    putClient(pb, nextClient),
  ]);

  console.log("Processed mutation in", Date.now() - t1);
  return affected;
}

async function mutate(pb: Pocketbase, mutation: Mutation): Promise<Affected> {
  switch (mutation.name as keyof Mutators) {
    case "list": {
      const res = await api.list.mutate(pb, mutation.args);
      return {
        listIDs: res.map((item) => item.id),
        listItemIDs: [],
        boardColumnIDs: [],
        boardItemIDs: [],
        boardtIDs: [],
      };
    }
    case "list_item": {
      const res = await api.list_item.mutate(pb, mutation.args);
      return {
        listIDs: [],
        listItemIDs: res.map((item) => item.id),
        boardtIDs: [],
        boardColumnIDs: [],
        boardItemIDs: [],
      };
    }
    case "board": {
      const res = await api.board.mutate(pb, mutation.args);
      return {
        listIDs: [],
        listItemIDs: [],
        boardtIDs: res.map((item) => item.id),
        boardColumnIDs: [],
        boardItemIDs: [],
      };
    }
    case "board_column": {
      const res = await api.board_column.mutate(pb, mutation.args);
      return {
        listIDs: [],
        listItemIDs: [],
        boardtIDs: [],
        boardColumnIDs: res.map((item) => item.id),
        boardItemIDs: [],
      };
    }
    case "board_item": {
      const res = await api.board_item.mutate(pb, mutation.args);
      return {
        listIDs: [],
        listItemIDs: [],
        boardtIDs: [],
        boardColumnIDs: [],
        boardItemIDs: res.map((item) => item.id),
      };
    }
    default:
      return {
        listIDs: [],
        listItemIDs: [],
        boardtIDs: [],
        boardColumnIDs: [],
        boardItemIDs: [],
      };
  }
}
