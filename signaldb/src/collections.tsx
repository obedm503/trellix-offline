import type {
  Board,
  BoardColumn,
  BoardItem,
  List,
  ListItem,
} from "shared/api/schema";
import { showToast } from "shared/ui/toast";
import {
  Collection,
  combinePersistenceAdapters,
  createReactivityAdapter,
} from "signaldb";
import {
  createContext,
  createEffect,
  createSignal,
  getOwner,
  onCleanup,
  useContext,
} from "solid-js";
import { idbPersister } from "./idb-persister";
import { pocketbaseReplication } from "./pocketbase-replication";

const reactivity = createReactivityAdapter({
  create: () => {
    const [depend, rerun] = createSignal(undefined, { equals: false });
    return {
      depend: () => {
        depend();
      },
      notify: () => {
        rerun();
      },
    };
  },
  isInScope: () => !!getOwner(),
  onDispose: (callback) => {
    onCleanup(callback);
  },
});

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

export function createCollections() {
  const board = new Collection<Board>({
    reactivity,
    persistence: combinePersistenceAdapters(
      pocketbaseReplication("board"),
      idbPersister("board"),
    ),
  }).on("persistence.error", errorHandler);

  const board_column = new Collection<
    BoardColumn & { expand: { board: { public_id: string } } }
  >({
    reactivity,
    persistence: combinePersistenceAdapters(
      pocketbaseReplication("board_column", {
        expand: ["board"],
        fields: ["*", "expand.board.public_id"],
      }),
      idbPersister("board_column"),
    ),
  }).on("persistence.error", errorHandler);

  const board_item = new Collection<
    BoardItem & {
      expand: { column: { expand: { board: { public_id: string } } } };
    }
  >({
    reactivity,
    persistence: combinePersistenceAdapters(
      pocketbaseReplication("board_item", {
        expand: ["column.board"],
        fields: [
          "*",
          "expand.column.public_id",
          "expand.column.expand.board.public_id",
        ],
      }),
      idbPersister("board_item"),
    ),
  }).on("persistence.error", errorHandler);

  const list = new Collection<List>({
    reactivity,
    persistence: combinePersistenceAdapters(
      pocketbaseReplication("list"),
      idbPersister("list"),
    ),
  }).on("persistence.error", errorHandler);

  const list_item = new Collection<
    ListItem & { expand: { list: { public_id: string } } }
  >({
    reactivity,
    persistence: combinePersistenceAdapters(
      pocketbaseReplication("list_item", {
        expand: ["list"],
        fields: ["*", "expand.list.public_id"],
      }),
      idbPersister("list_item"),
    ),
  }).on("persistence.error", errorHandler);

  return { board, board_column, board_item, list, list_item };
}

type Collections = ReturnType<typeof createCollections>;

const CollectionsContext = createContext<Collections>();
export const CollectionsProvider = CollectionsContext.Provider;
export function useCollections(): Collections {
  const collections = useContext(CollectionsContext);

  if (!collections) {
    throw new Error(
      "`useCollection` must be used within a `CollectionsProvider`",
    );
  }

  return collections;
}
