import { RouteSectionProps } from "@solidjs/router";
import { getUser } from "shared/api/auth";
import type { BoardColumn, BoardItem } from "shared/api/schema";
import { Board } from "shared/board";
import type { Column, Item } from "shared/board/context";
import { pocketbaseId, publicId } from "shared/nanoid";
import { scroll } from "shared/scrollable-card-layout";
import { showToast } from "shared/utils";
import { createEffect, createMemo, onCleanup } from "solid-js";
import {
  getBoardColumns,
  getBoardItems,
  getBoards,
  mutateBoardColumns,
  mutateBoardItems,
} from "../../queries";

export default function Boards(props: RouteSectionProps) {
  createEffect(() => {
    const currentTitle = document.title;
    document.title = "Boards";
    onCleanup(() => {
      document.title = currentTitle;
    });
  });

  const boards = getBoards();

  const board_public_id = () => props.params.board_public_id;
  const board = createMemo(() =>
    boards.data?.find((item) => item.public_id === board_public_id()),
  );

  const items = getBoardItems(board_public_id);

  const itemMap = createMemo(() => {
    const map = {} as Record<string, BoardItem>;
    for (const item of items.data ?? []) {
      map[item.public_id] = item;
    }
    return map;
  });

  const saveItem = mutateBoardItems(board_public_id);

  const columns = getBoardColumns(board_public_id);
  const columnMap = createMemo(() => {
    const map = {} as Record<string, BoardColumn & { _items: BoardItem[] }>;
    for (const item of columns.data ?? []) {
      const col = {
        ...item,
        _items: items.data?.filter((el) => el.column === item.id) ?? [],
      };
      map[item.id] = col;
      map[item.public_id] = col;
    }
    return map;
  });

  const saveColumn = mutateBoardColumns(board_public_id);

  const cols = createMemo(
    () =>
      columns.data?.map<Column>((c) => ({
        publicId: c.public_id,
        order: c.order,
        text: c.name,
      })) ?? [],
  );

  const rows = createMemo(() => {
    if (!columns.data || !items.data) {
      return [];
    }
    return items.data.map<Item>((item) => ({
      publicId: item.public_id,
      order: item.order,
      text: item.text,
      columnPublicId: columnMap()[item.column].public_id,
    }));
  });

  let xScrollable!: HTMLElement;

  const user = getUser();

  return (
    <main
      class="grid h-full w-full items-start justify-items-center overflow-x-auto sm:p-16"
      ref={xScrollable}
    >
      <Board
        columns={cols()}
        items={rows()}
        onItemCreated={(item) => {
          if (!columns.data) {
            return;
          }
          showToast(
            saveItem.mutateAsync([
              {
                _op: "create",
                id: pocketbaseId(),
                public_id: publicId(),
                text: item.text,
                column: columnMap()[item.columnPublicId].id,
                order: columnMap()[item.columnPublicId]._items.length,
                created_by: user()!.id,
              },
            ]),
          );
        }}
        onItemsUpdated={(updated) => {
          if (!items.data || !columns.data) {
            return;
          }
          showToast(
            saveItem.mutateAsync(
              updated.map((item) => ({
                _op: "update",
                order: item.order,
                id: itemMap()[item.publicId].id,
                column: columnMap()[item.columnPublicId].id,
                text: item.text,
              })),
            ),
          );
        }}
        onItemDeleted={(itemId) => {
          if (!items.data) {
            return;
          }
          showToast(
            saveItem.mutateAsync([
              {
                _op: "delete",
                id: itemMap()[itemId].id,
              },
            ]),
          );
        }}
        onColumnCreated={(col) => {
          showToast(
            saveColumn.mutateAsync([
              {
                _op: "create",
                id: pocketbaseId(),
                public_id: publicId(),
                board: board()!.id,
                name: col.text,
                order: cols().length,
                created_by: user()!.id,
              },
            ]),
          );

          scroll(xScrollable, "right");
        }}
        onColumnsUpdated={(cols) => {
          if (!columns.data) {
            return;
          }
          showToast(
            saveColumn.mutateAsync(
              cols.map((col) => ({
                _op: "update",
                id: columnMap()[col.publicId].id,
                order: col.order,
                name: col.text,
              })),
            ),
          );
        }}
        onColumnDeleted={(columnId) => {
          if (!columns.data) {
            return;
          }
          showToast(
            saveColumn.mutateAsync([
              {
                _op: "delete",
                id: columnMap()[columnId].id,
              },
            ]),
          );
        }}
      />
    </main>
  );
}
