import { CommonOptions, ListOptions, RecordOptions } from "pocketbase";
import { pb } from "shared/api/pb";
import { User } from "shared/api/schema";
import { createPersistenceAdapter } from "signaldb";

type Config = { expand?: string[]; fields?: string[] };
function getOptions(config: Config = {}) {
  const options: RecordOptions & CommonOptions & ListOptions = {
    sort: "order,created",
  };
  if (config.expand) {
    options.expand = config.expand.join(",");
  }
  if (config.fields) {
    options.fields = config.fields.join(",");
  }
  return options;
}

export function pocketbaseReplication<
  T extends { id: string; deleted: boolean },
>(collectionName: string, config: Config = {}) {
  const options = getOptions(config);

  return createPersistenceAdapter<T, string>({
    async register(onChange) {
      // TODO: signaldb has no way to "unload" a collection to cleanup subscriptions
      // this causes a memory leak in development with HMR
      const unsub = await pb.collection<T>(collectionName).subscribe(
        "*",
        (e) => {
          console.log(collectionName, e);
          if (e.action === "update") {
            void onChange({
              changes: { modified: [e.record], added: [], removed: [] },
            });
            return;
          }

          if (e.action === "create") {
            void onChange({
              changes: { modified: [], added: [e.record], removed: [] },
            });

            return;
          }

          void onChange();
        },
        options,
      );
    },
    async load() {
      const user = pb.authStore.model as User | null;
      if (!user) {
        throw new Error("Unauthorized");
      }

      const items = await pb
        .collection<T>(collectionName)
        .getFullList({ ...options, filter: "deleted != true" });
      return { items };
    },
    async save(items, changes) {
      const user = pb.authStore.model as User | null;
      if (!user) {
        throw new Error("Unauthorized");
      }

      // TODO: ideally there would be a way to update the local cache based on these responses
      await Promise.all([
        ...changes.added.map((item) =>
          pb
            .collection<T>(collectionName)
            // don't autocancel parallel create requests
            .create({ ...item, created_by: user.id }, { requestKey: null }),
        ),
        ...changes.modified.map(({ id, ...item }) =>
          pb.collection<T>(collectionName).update(id, item),
        ),
        ...changes.removed.map((item) =>
          pb.collection<T>(collectionName).update(item.id, { deleted: true }),
        ),
      ]);
    },
  });
}
