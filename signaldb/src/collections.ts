import type {
  Board,
  BoardColumn,
  BoardItem,
  List,
  ListItem,
} from "shared/api/schema";
import { showToast } from "shared/ui/toast";
import { createReactivityAdapter, ReplicatedCollection } from "signaldb";
import { createSignal, onCleanup } from "solid-js";
import { createIDBPersister } from "./idb-persister";
import {
  pullCollection,
  pushCollection,
  subscribeCollection,
} from "./pocketbase-persister";

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

export const board = new ReplicatedCollection<Board>({
  memory: [],
  reactivity,
  persistence: createIDBPersister("board"),
  pull: pullCollection("board"),
  push: pushCollection("board"),
  registerRemoteChange: subscribeCollection("board"),
}).on("persistence.error", errorHandler);

export const board_column = new ReplicatedCollection<
  BoardColumn & { expand: { board: { public_id: string } } }
>({
  memory: [],
  reactivity,
  persistence: createIDBPersister("board_column"),
  pull: pullCollection("board_column", {
    expand: ["board"],
    fields: ["*", "expand.board.public_id"],
  }),
  push: pushCollection("board_column"),
  registerRemoteChange: subscribeCollection("board_column"),
}).on("persistence.error", errorHandler);

export const board_item = new ReplicatedCollection<
  BoardItem & {
    expand: { column: { expand: { board: { public_id: string } } } };
  }
>({
  memory: [],
  reactivity,
  persistence: createIDBPersister("board_item"),
  pull: pullCollection("board_item", {
    expand: ["column.board"],
    fields: [
      "*",
      "expand.column.public_id",
      "expand.column.expand.board.public_id",
    ],
  }),
  push: pushCollection("board_item"),
  registerRemoteChange: subscribeCollection("board_item"),
}).on("persistence.error", errorHandler);

export const list = new ReplicatedCollection<List>({
  memory: [],
  reactivity,
  persistence: createIDBPersister("list"),
  pull: pullCollection("list"),
  push: pushCollection("list"),
  registerRemoteChange: subscribeCollection("list"),
}).on("persistence.error", errorHandler);

export const list_item = new ReplicatedCollection<
  ListItem & { expand: { list: { public_id: string } } }
>({
  memory: [],
  reactivity,
  push: pushCollection("list_item"),
  pull: pullCollection("list_item", {
    expand: ["list"],
    fields: ["*", "expand.list.public_id"],
  }),
  registerRemoteChange: subscribeCollection("list_item"),
  persistence: createIDBPersister("list_item"),
}).on("persistence.error", errorHandler);

export const collections = { board, board_column, board_item, list, list_item };
