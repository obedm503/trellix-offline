import { PersistenceAdapter, ReactivityAdapter } from "@signaldb/core";
import { SyncManager } from "@signaldb/sync";
import type { CommonOptions, ListOptions, RecordOptions } from "pocketbase";
import { pb } from "shared/api/pb";
import type { User } from "shared/api/schema";

type Config = { expand?: string[]; fields?: string[] };
function getOptions(config: Config) {
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

type Options = {
  persistenceAdapter(id: string): PersistenceAdapter<any, any>;
  reactivity: ReactivityAdapter;
  onError(collectionOptions: Config & { name: string }, error: Error): void;
};

export function createPocketbaseSyncManager<
  T extends {
    id: string;
    created: string;
    updated: string;
    deleted: boolean;
  },
>({ onError, reactivity, persistenceAdapter }: Options) {
  return new SyncManager<Config & { name: string }, T>({
    persistenceAdapter,
    reactivity,
    onError,
    async registerRemoteChange(
      { name: collectionName, ...sendOptions },
      onChange,
    ) {
      const cleanup = await pb
        .collection<T & { collectionName: string }>(collectionName)
        .subscribe(
          "*",
          (e) => {
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
          getOptions(sendOptions),
        );

      return cleanup;
    },
    async pull(
      { name: collectionName, ...sendOptions },
      { lastFinishedSyncEnd },
    ) {
      const user = pb.authStore.model as User | null;
      if (!user) {
        throw new Error("Unauthorized");
      }

      const lastSync = lastFinishedSyncEnd
        ? new Date(lastFinishedSyncEnd).toISOString()
        : undefined;

      const options = getOptions(sendOptions);
      const filter = lastSync
        ? // include deleted since last sync
          pb.filter("created >= {:date} || updated >= {:date}", {
            date: lastSync,
          })
        : "deleted != true";

      const items = await pb
        .collection<T>(collectionName)
        .getFullList({ ...options, filter });

      if (lastSync) {
        const added = [];
        const modified = [];
        const removed = [];

        for (const item of items) {
          if (item.deleted) {
            removed.push(item);
          } else if (item.created >= lastSync) {
            added.push(item);
          } else {
            modified.push(item);
          }
        }

        return { changes: { added, modified, removed } };
      }

      return { items };
    },
    async push({ name: collectionName }, { changes }) {
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
