import type Pocketbase from "pocketbase";
import type {
  ReplicacheClient,
  ReplicacheClientGroup,
  ReplicacheClientGroupInput,
  ReplicacheClientInput,
} from "shared/api/schema";

export type SearchResult = {
  id: string;
  row_version: number;
};

export type Affected = {
  // userIDs: string[];
  listIDs: string[];
  listItemIDs: string[];
  boardtIDs: string[];
  boardColumnIDs: string[];
  boardItemIDs: string[];
};

export async function getClientGroup(
  pb: Pocketbase,
  clientGroupID: string,
  userID: string,
): Promise<ReplicacheClientGroupInput> {
  const clientGroups = await pb
    .collection<ReplicacheClientGroup>("replicache_client_group")
    .getList(1, 1, {
      filter: pb.filter("replicache_id = {:clientGroupID}", { clientGroupID }),
    });

  const clientGroup = clientGroups.items[0];
  if (!clientGroup) {
    return {
      replicache_id: clientGroupID,
      created_by: userID,
      cvr_version: 0,
    };
  }

  return clientGroup;
}

export async function putClientGroup(
  pb: Pocketbase,
  clientGroup: ReplicacheClientGroupInput,
) {
  const { replicache_id, created_by, cvr_version } = clientGroup;

  const clientGroups = await pb
    .collection<ReplicacheClientGroup>("replicache_client_group")
    .getList(1, 1, {
      filter: pb.filter("replicache_id = {:replicache_id}", { replicache_id }),
    });
  const group = clientGroups.items.at(0);
  if (group) {
    await pb
      .collection<ReplicacheClientGroupInput>("replicache_client_group")
      .update(group.id, { created_by, cvr_version });
  } else {
    await pb
      .collection<ReplicacheClientGroupInput>("replicache_client_group")
      .create({ replicache_id, created_by, cvr_version });
  }
}

export async function searchClients(pb: Pocketbase, clientGroupID: string) {
  const rows = await pb
    .collection<ReplicacheClient>("replicache_client")
    .getFullList({
      filter: pb.filter("client_group_replicache_id = {:clientGroupID}", {
        clientGroupID,
      }),
    });

  return rows.map<SearchResult>((row) => ({
    id: row.id,
    row_version: row.last_mutation_id,
  }));
}

export async function getClient(
  pb: Pocketbase,
  clientID: string,
  clientGroupID: string,
): Promise<Omit<ReplicacheClientInput, "created_by">> {
  const clients = await pb
    .collection<ReplicacheClientInput>("replicache_client")
    .getList(1, 1, {
      filter: pb.filter("replicache_id = {:clientID}", { clientID }),
    });

  const client = clients.items[0];

  if (!client) {
    return {
      replicache_id: clientID,
      client_group_replicache_id: "",
      last_mutation_id: 0,
    };
  }

  if (client.client_group_replicache_id !== clientGroupID) {
    throw new Error(
      "Authorization error - client does not belong to client group",
    );
  }

  return client;
}

export async function putClient(pb: Pocketbase, client: ReplicacheClientInput) {
  const {
    replicache_id,
    client_group_replicache_id,
    last_mutation_id,
    created_by,
  } = client;

  const clients = await pb
    .collection<ReplicacheClient>("replicache_client")
    .getList(1, 1, {
      filter: pb.filter("replicache_id = {:replicache_id}", { replicache_id }),
    });
  const c = clients.items.at(0);
  if (c) {
    await pb
      .collection<ReplicacheClientInput>("replicache_client")
      .update(c.id, {
        client_group_replicache_id,
        last_mutation_id,
        created_by,
      });
  } else {
    await pb.collection<ReplicacheClientInput>("replicache_client").create({
      replicache_id,
      client_group_replicache_id,
      last_mutation_id,
      created_by,
    });
  }
}

export async function getCollection(
  pb: Pocketbase,
  collection: string,
  itemIDs: string[],
) {
  if (itemIDs.length === 0) {
    return [];
  }

  const rows = await pb.collection(collection).getFullList({
    filter: pb.filter(
      itemIDs.map((id, i) => `id = {:id${i}}`).join(" || "),
      Object.fromEntries(itemIDs.map((id, i) => [`id${i}`, id])),
    ),
  });

  return rows;
}

export async function searchCollection(
  pb: Pocketbase,
  collection: string,
  accessibleByUserID: string,
) {
  const rows = await pb.collection(collection).getFullList({
    filter: pb.filter("created_by = {:accessibleByUserID}", {
      accessibleByUserID,
    }),
  });

  return rows.map<SearchResult>((item) => ({
    id: item.id,
    row_version: new Date(item.updated).getTime(),
  }));
}
