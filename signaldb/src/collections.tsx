import type {
  Board,
  BoardColumn,
  BoardItem,
  List,
  ListItem,
} from "shared/api/schema";
import { showToast } from "shared/ui/toast";
import { Collection } from "signaldb";
import reactivity from "signaldb-plugin-solid";
import {
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  useContext,
} from "solid-js";
import { idbPersister } from "./idb-persister";
import { createPocketbaseSyncManager } from "./pocketbase-replication";

function errorHandler(error: Error) {
  if (error.message.includes("autocancelled")) {
    // not a real error
    return;
  }

  showToast({
    title: error.name,
    description: error.message,
    variant: "error",
  });
}

function createCollections() {
  const syncManager = createPocketbaseSyncManager({
    reactivity,
    persistenceAdapter: (id) => idbPersister(id),
    onError: errorHandler,
  });

  const board = new Collection<Board>({
    reactivity,
    persistence: idbPersister("board"),
  }).on("persistence.error", errorHandler);
  syncManager.addCollection(board, { name: "board" });

  const board_column = new Collection<
    BoardColumn & { expand: { board: { public_id: string } } }
  >({
    reactivity,
    persistence: idbPersister("board_column"),
  }).on("persistence.error", errorHandler);
  syncManager.addCollection(board_column, {
    name: "board_column",
    expand: ["board"],
    fields: ["*", "expand.board.public_id"],
  });

  const board_item = new Collection<
    BoardItem & {
      expand: { column: { expand: { board: { public_id: string } } } };
    }
  >({
    reactivity,
    persistence: idbPersister("board_item"),
  }).on("persistence.error", errorHandler);
  syncManager.addCollection(board_item, {
    name: "board_item",
    expand: ["column.board"],
    fields: [
      "*",
      "expand.column.public_id",
      "expand.column.expand.board.public_id",
    ],
  });

  const list = new Collection<List>({
    reactivity,
    persistence: idbPersister("list"),
  }).on("persistence.error", errorHandler);
  syncManager.addCollection(list, { name: "list" });

  const list_item = new Collection<
    ListItem & { expand: { list: { public_id: string } } }
  >({
    reactivity,
    persistence: idbPersister("list_item"),
  }).on("persistence.error", errorHandler);
  syncManager.addCollection(list_item, {
    name: "list_item",
    expand: ["list"],
    fields: ["*", "expand.list.public_id"],
  });

  return {
    syncManager,
    board,
    board_column,
    board_item,
    list,
    list_item,
  };
}

type Collections = ReturnType<typeof createCollections>;

const CollectionsContext = createContext<Collections>();
export function CollectionsProvider(props: { children: JSXElement }) {
  const collections = createCollections();

  // TODO: SyncManager should emit a ready event when it's ready to sync
  // attempting to sync before then will result the sync manager not finding
  // the last successful sync and requesting the entire dataset instead of
  // just the changes since last sync
  const syncManagerReady = Promise.all([
    new Promise((res) => {
      // @ts-ignore
      collections.syncManager.syncOperations.once(
        "persistence.pullCompleted",
        res,
      );
    }),
    new Promise((res) => {
      // @ts-ignore
      collections.syncManager.changes.once("persistence.pullCompleted", res);
    }),
    new Promise((res) => {
      // @ts-ignore
      collections.syncManager.remoteChanges.once(
        "persistence.pullCompleted",
        res,
      );
    }),
    new Promise((res) => {
      // @ts-ignore
      collections.syncManager.snapshots.once("persistence.pullCompleted", res);
    }),
  ]);

  createEffect(async () => {
    // delay sync until syncManager metadata is in memory
    await syncManagerReady;
    await collections.syncManager.startSyncAll();
  });

  // restart sync when browser comes back online
  function offline() {
    collections.syncManager.pauseSyncAll();
  }
  addEventListener("offline", offline);
  onCleanup(() => {
    removeEventListener("offline", offline);
  });

  function online() {
    collections.syncManager.startSyncAll();
  }
  addEventListener("online", online);
  onCleanup(() => {
    removeEventListener("online", online);
  });

  return (
    <CollectionsContext.Provider value={collections}>
      {props.children}
    </CollectionsContext.Provider>
  );
}

export function useCollections(): Collections {
  const collections = useContext(CollectionsContext);

  if (!collections) {
    throw new Error(
      "`useCollection` must be used within a `CollectionsProvider`",
    );
  }

  return collections;
}
