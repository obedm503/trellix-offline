import {
  CommonOptions,
  ListOptions,
  RecordFullListOptions,
  RecordOptions,
} from "pocketbase";
import { pb } from "shared/api/pb";
import { User } from "shared/api/schema";
import { pocketbaseId } from "shared/nanoid";
import { createPersistenceAdapter } from "signaldb";

export interface Changeset<T> {
  added: T[];
  modified: T[];
  removed: T[];
}

type LoadResponse<T> =
  | {
      items: T[];
      changes?: never;
    }
  | {
      changes: Changeset<T>;
      items?: never;
    };

export function pushCollection<T extends { id: string }>(
  collectionName: string,
) {
  return async (changes: Changeset<T>, items: T[]) => {
    const user = pb.authStore.model as User | null;
    if (!user) {
      throw new Error("Unauthorized");
    }

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
  };
}

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

export function pullCollection<T extends { id: string }>(
  collectionName: string,
  config: Config = {},
) {
  const options = getOptions(config);
  return async () => {
    const user = pb.authStore.model as User | null;
    if (!user) {
      throw new Error("Unauthorized");
    }

    const items = await pb.collection<T>(collectionName).getFullList(options);
    return { items };
  };
}

export function subscribeCollection<T extends { id: string; deleted: boolean }>(
  collectionName: string,
  config: Config = {},
) {
  const options = getOptions(config);

  // TODO: integrate changes from subscription instead of getting the full list after every change
  // https://github.com/maxnowack/signaldb/pull/776
  return async (
    onChange: (data?: LoadResponse<T> | undefined) => void | Promise<void>,
  ) => {
    // TODO: signaldb has no way to "unload" a collection to cleanup subscriptions
    // this causes a memory leak in development with HMR
    const unsub = await pb.collection<T>(collectionName).subscribe(
      "*",
      (e) => {
        if (e.action === "update" && e.record.deleted) {
          void onChange({
            changes: { modified: [], added: [], removed: [e.record] },
          });
          return;
        } else if (e.action === "update") {
          void onChange({
            changes: { modified: [e.record], added: [], removed: [] },
          });
          return;
        } else if (e.action === "create") {
          // replace in-memory record with complete validated db record
          void onChange({
            changes: { modified: [e.record], added: [], removed: [] },
          });
          return;
        }

        void onChange();
      },
      options,
    );
  };
}

export function pocketbaseReplication<
  T extends { id: string; deleted: boolean },
>(collectionName: string, config: Config = {}) {
  const save = pushCollection(collectionName);
  return createPersistenceAdapter<T, string>({
    register: subscribeCollection(collectionName, config),
    load: pullCollection(collectionName, config),
    save(items, changes) {
      return save(changes, items);
    },
  });
}
