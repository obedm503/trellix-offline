import { RouteSectionProps } from "@solidjs/router";
import type { BoardColumn, BoardItem } from "shared/api/schema";
import { Board } from "shared/board";
import type { Column, Item } from "shared/board/context";
import { pocketbaseId, publicId } from "shared/nanoid";
import { scroll } from "shared/scrollable-card-layout";
import { createEffect, createMemo, onCleanup } from "solid-js";
import { collections } from "../../collections";

export default function Boards(props: RouteSectionProps) {
  createEffect(() => {
    const currentTitle = document.title;
    document.title = "Boards";
    onCleanup(() => {
      document.title = currentTitle;
    });
  });

  const board_public_id = () => props.params.board_public_id;
  const board = createMemo(() =>
    collections.board.findOne({ public_id: board_public_id() }),
  );

  const items = createMemo(() =>
    collections.board_item
      .find(
        {
          "expand.column.expand.board.public_id": board_public_id(),
          deleted: { $ne: true },
        },
        { sort: { order: 1 } },
      )
      .fetch(),
  );

  const itemMap = createMemo(() => {
    const map = {} as Record<string, BoardItem>;
    for (const item of items()) {
      map[item.public_id] = item;
    }
    return map;
  });

  const columns = createMemo(() =>
    collections.board_column
      .find(
        { "expand.board.public_id": board_public_id(), deleted: { $ne: true } },
        { sort: { order: 1 } },
      )
      .fetch(),
  );
  const columnMap = createMemo(() => {
    const map = {} as Record<string, BoardColumn & { _items: BoardItem[] }>;
    for (const item of columns()) {
      const col = {
        ...item,
        _items: items().filter((a) => a.column === item.id),
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

  return (
    <main
      class="grid h-full w-full items-start justify-items-center overflow-x-auto sm:p-16"
      ref={xScrollable}
    >
      <Board
        columns={cols()}
        items={rows()}
        onItemCreated={(item) => {
          const col = columnMap()[item.columnPublicId];
          collections.board_item.insert({
            id: pocketbaseId(),
            text: item.text,
            public_id: publicId(),
            column: col.id,
            order: col._items.length,
            expand: {
              column: { expand: { board: { public_id: board_public_id() } } },
            },
          } as any);
        }}
        onItemsUpdated={(updated) => {
          for (const item of updated) {
            collections.board_item.updateOne(
              { id: itemMap()[item.publicId].id },
              {
                $set: {
                  order: item.order,
                  column: columnMap()[item.columnPublicId].id,
                  text: item.text,
                },
              },
            );
          }
        }}
        onItemDeleted={(itemId) => {
          collections.board_item.removeOne({ id: itemMap()[itemId].id });
        }}
        onColumnCreated={(col) => {
          collections.board_column.insert({
            id: pocketbaseId(),
            board: board()!.id,
            name: col.text,
            public_id: publicId(),
            order: columns().length,
            expand: { board: { public_id: board_public_id() } },
          } as any);

          scroll(xScrollable, "right");
        }}
        onColumnsUpdated={(updated) => {
          for (const col of updated) {
            collections.board_column.updateOne(
              { id: columnMap()[col.publicId].id },
              { $set: { order: col.order, name: col.text } },
            );
          }
        }}
        onColumnDeleted={(columnId) => {
          collections.board_column.removeOne({ id: columnMap()[columnId].id });
        }}
      />
    </main>
  );
}
