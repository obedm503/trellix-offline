import { RecordFullListOptions } from "pocketbase";
import { pb } from "shared/api/pb";
import { User } from "shared/api/schema";
import { pocketbaseId } from "shared/nanoid";

export interface Changeset<T> {
  added: T[];
  modified: T[];
  removed: T[];
}

export function pushCollection<T extends { id: string }>(
  collectionName: string,
) {
  return async (changes: Changeset<T>, items: T[]) => {
    const user = pb.authStore.model as User | null;
    if (!user) {
      throw new Error("Unauthorized");
    }

    await Promise.all([
      ...changes.added.map(({ id, ...item }) =>
        pb
          .collection<T>(collectionName)
          // don't autocancel parallel create requests
          .create(
            { ...item, id: pocketbaseId(), created_by: user.id },
            { requestKey: null },
          ),
      ),
      ...changes.modified.map(({ id, ...item }) =>
        pb.collection<T>(collectionName).update(id, item),
      ),
      ...changes.removed.map((item) =>
        pb.collection<T>(collectionName).update(item.id, { deleted: true }),
      ),
    ]);
  };
}

export function pullCollection<T extends { id: string }>(
  collectionName: string,
  config: { expand?: string[]; fields?: string[] } = {},
) {
  return async () => {
    const user = pb.authStore.model as User | null;
    if (!user) {
      throw new Error("Unauthorized");
    }

    const options: RecordFullListOptions = {
      sort: "order,created",
    };
    if (config.expand) {
      options.expand = config.expand.join(",");
    }
    if (config.fields) {
      options.fields = config.fields.join(",");
    }

    const items = await pb.collection<T>(collectionName).getFullList(options);
    return { items };
  };
}

export function subscribeCollection(collectionName: string) {
  // TODO: integrate changes from subscription instead of getting the full list after every change
  // https://github.com/maxnowack/signaldb/pull/776
  return async (onChange: () => void) => {
    // TODO: signaldb has no way to "unload" a collection to cleanup subscriptions
    // this causes a memory leak in development with HMR
    const unsub = await pb.collection(collectionName).subscribe("*", (e) => {
      console.log(`pb.collection(${collectionName}).subscribe('*')`, e);
      void onChange();
    });
  };
}
