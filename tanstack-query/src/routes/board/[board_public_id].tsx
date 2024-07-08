import { RouteSectionProps } from "@solidjs/router";
import type { BoardColumn, BoardItem } from "shared/api/schema";
import { Board } from "shared/board";
import type { Column, Item } from "shared/board/context";
import { publicId } from "shared/nanoid";
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

  const columns = getBoardColumns(board_public_id);
  const columnMap = createMemo(() => {
    const map = {} as Record<string, BoardColumn>;
    for (const item of columns.data ?? []) {
      map[item.id] = item;
      map[item.public_id] = item;
    }
    return map;
  });

  const saveColumn = mutateBoardColumns(board_public_id, () => board()!.id);

  const items = getBoardItems(board_public_id);

  const itemMap = createMemo(() => {
    const map = {} as Record<string, BoardItem>;
    for (const item of items.data ?? []) {
      map[item.public_id] = item;
    }
    return map;
  });

  const saveItem = mutateBoardItems(board_public_id);

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
                text: item.text,
                public_id: publicId(),
                column: columnMap()[item.columnPublicId].id,
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
                board: board()!.id,
                name: col.text,
                public_id: publicId(),
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
