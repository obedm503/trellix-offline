import { Collection } from "@signaldb/core";
import createIndexedDBAdapter from "@signaldb/indexeddb";
import reactivity from "@signaldb/solid";
import type {
  Board,
  BoardColumn,
  BoardItem,
  List,
  ListItem,
} from "shared/api/schema";
import { showToast } from "shared/ui/toast";
import {
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  useContext,
} from "solid-js";
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
    persistenceAdapter: (id) => createIndexedDBAdapter(id),
    onError(options, error) {
      errorHandler(error);
    },
  });

  const board = new Collection<Board>({
    reactivity,
    persistence: createIndexedDBAdapter("board"),
  }).on("persistence.error", errorHandler);
  syncManager.addCollection(board, { name: "board" });

  const board_column = new Collection<
    BoardColumn & { expand: { board: { public_id: string } } }
  >({
    reactivity,
    persistence: createIndexedDBAdapter("board_column"),
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
    persistence: createIndexedDBAdapter("board_item"),
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
    persistence: createIndexedDBAdapter("list"),
  }).on("persistence.error", errorHandler);
  syncManager.addCollection(list, { name: "list" });

  const list_item = new Collection<
    ListItem & { expand: { list: { public_id: string } } }
  >({
    reactivity,
    persistence: createIndexedDBAdapter("list_item"),
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

  createEffect(async () => {
    // delay sync until syncManager metadata is in memory
    await collections.syncManager.isReady();
    await collections.syncManager.syncAll();
  });

  // restart sync when browser comes back online
  const listen = new AbortController();
  addEventListener("offline", () => collections.syncManager.pauseAll(), {
    signal: listen.signal,
  });
  addEventListener("online", () => collections.syncManager.syncAll(), {
    signal: listen.signal,
  });
  onCleanup(() => listen.abort());

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
