import { RouteSectionProps } from "@solidjs/router";
import { getUser } from "shared/api/auth";
import type {
  BoardColumn,
  BoardItem,
  Board as BoardType,
} from "shared/api/schema";
import { Board } from "shared/board";
import type { Column, Item } from "shared/board/context";
import { pocketbaseId, publicId } from "shared/nanoid";
import { scroll } from "shared/scrollable-card-layout";
import { sortBy } from "shared/utils";
import { createEffect, createMemo, onCleanup } from "solid-js";
import { createSubscribe, useReplicache } from "../../replicache";

export default function Boards(props: RouteSectionProps) {
  createEffect(() => {
    const currentTitle = document.title;
    document.title = "Boards";
    onCleanup(() => {
      document.title = currentTitle;
    });
  });

  const board_public_id = () => props.params.board_public_id;
  const board = createSubscribe(
    (tx) => tx.scan<BoardType>({ prefix: "board/" }).values().toArray(),
    {
      initial: [],
      select(data) {
        return data.find(
          (item) =>
            item.public_id === board_public_id() && item.deleted !== true,
        );
      },
    },
  );

  const columns = createSubscribe(
    (tx) =>
      tx.scan<BoardColumn>({ prefix: "board_column/" }).values().toArray(),
    {
      initial: [],
      select(data) {
        return sortBy(
          data.filter(
            (item) => item.board === board()?.id && item.deleted !== true,
          ),
          ["order", "created"],
        );
      },
    },
  );
  const columnIds = createMemo(() => columns().map((c) => c.id));

  const items = createSubscribe(
    (tx) => tx.scan<BoardItem>({ prefix: "board_item/" }).values().toArray(),
    {
      initial: [],
      select(data) {
        return sortBy(
          data.filter(
            (item) =>
              columnIds().includes(item.column) && item.deleted !== true,
          ),
          ["order", "created"],
        );
      },
    },
  );
  const itemMap = createMemo(() => {
    const map = {} as Record<string, BoardItem>;
    for (const item of items()) {
      map[item.public_id] = item;
    }
    return map;
  });

  const columnMap = createMemo(() => {
    const map = {} as Record<string, BoardColumn & { _items: BoardItem[] }>;
    for (const item of columns()) {
      const col = {
        ...item,
        _items: sortBy(
          items().filter((a) => a.column === item.id),
          ["order", "created"],
        ),
      };
      map[item.id] = col;
      map[item.public_id] = col;
    }
    return map;
  });

  const cols = createMemo(
    () =>
      columns().map<Column>((c) => ({
        publicId: c.public_id,
        order: c.order,
        text: c.name,
      })) ?? [],
  );

  const rows = createMemo(() => {
    return items().map<Item>((item) => ({
      publicId: item.public_id,
      order: item.order,
      text: item.text,
      columnPublicId: columnMap()[item.column].public_id,
    }));
  });

  let xScrollable!: HTMLElement;

  const user = getUser();
  const rep = useReplicache();

  return (
    <main
      class="grid h-full w-full items-start justify-items-center overflow-x-auto sm:p-16"
      ref={xScrollable}
    >
      <Board
        columns={cols()}
        items={rows()}
        onItemCreated={async (item) => {
          const col = columnMap()[item.columnPublicId];
          await rep().mutate.board_item([
            {
              _op: "create",
              id: pocketbaseId(),
              public_id: publicId(),
              text: item.text,
              column: col.id,
              order: col._items.length,
              created_by: user()!.id,
            },
          ]);
        }}
        onItemsUpdated={async (updated) => {
          await rep().mutate.board_item(
            updated.map((item) => ({
              _op: "update",
              id: itemMap()[item.publicId].id,
              order: item.order,
              column: columnMap()[item.columnPublicId].id,
              text: item.text,
            })),
          );
        }}
        onItemDeleted={async (itemId) => {
          await rep().mutate.board_item([
            { _op: "delete", id: itemMap()[itemId].id },
          ]);
        }}
        onColumnCreated={async (col) => {
          await rep().mutate.board_column([
            {
              _op: "create",
              id: pocketbaseId(),
              public_id: publicId(),
              board: board()!.id,
              name: col.text,
              order: columns().length,
              created_by: user()!.id,
            },
          ]);

          scroll(xScrollable, "right");
        }}
        onColumnsUpdated={async (updated) => {
          await rep().mutate.board_column(
            updated.map((item) => ({
              _op: "update",
              id: columnMap()[item.publicId].id,
              order: item.order,
              name: item.text,
            })),
          );
        }}
        onColumnDeleted={async (columnId) => {
          await rep().mutate.board_column([
            { _op: "delete", id: columnMap()[columnId].id },
          ]);
        }}
      />
    </main>
  );
}
