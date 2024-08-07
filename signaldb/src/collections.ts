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
import { createSignal, onCleanup } from "solid-js";
import { idbPersister } from "./idb-persister";
import { pocketbaseReplication } from "./pocketbase-replication";

const reactivity = createReactivityAdapter({
  create() {
    const [depend, rerun] = createSignal(undefined, { equals: false });
    return {
      depend() {
        depend();
      },
      notify() {
        rerun();
      },
    };
  },
  isInScope: undefined,
  onDispose(callback) {
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

const board = new Collection<Board>({
  memory: [],
  reactivity,
  persistence: combinePersistenceAdapters(
    pocketbaseReplication("board"),
    idbPersister("board"),
  ),
}).on("persistence.error", errorHandler);

const board_column = new Collection<
  BoardColumn & { expand: { board: { public_id: string } } }
>({
  memory: [],
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
  memory: [],
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
  memory: [],
  reactivity,
  persistence: combinePersistenceAdapters(
    pocketbaseReplication("list"),
    idbPersister("list"),
  ),
}).on("persistence.error", errorHandler);

const list_item = new Collection<
  ListItem & { expand: { list: { public_id: string } } }
>({
  memory: [],
  reactivity,
  persistence: combinePersistenceAdapters(
    pocketbaseReplication("list_item", {
      expand: ["list"],
      fields: ["*", "expand.list.public_id"],
    }),
    idbPersister("list_item"),
  ),
}).on("persistence.error", errorHandler);

export const collections = { board, board_column, board_item, list, list_item };
