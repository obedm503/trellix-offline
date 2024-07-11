import {
  autoScrollForElements,
  autoScrollWindowForElements,
} from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { centerUnderPointer } from "@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import ChevronLeft from "lucide-solid/icons/chevron-left";
import ChevronRight from "lucide-solid/icons/chevron-right";
import EllipsisVertical from "lucide-solid/icons/ellipsis-vertical";
import GripVertical from "lucide-solid/icons/grip-vertical";
import Plus from "lucide-solid/icons/plus";
import Trash from "lucide-solid/icons/trash";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { Portal } from "solid-js/web";
import { BoardCard } from "../board/card";
import {
  BoardContext,
  BoardContextValue,
  Column,
  ColumnContext,
  ColumnContextProps,
  useBoardContext,
  useColumnContext,
  type Column as BoardColumn,
  type Item,
} from "../board/context";
import { DropIndicator } from "../drop-indicator";
import { publicId } from "../nanoid";
import { scroll } from "../scrollable-card-layout";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { TextField, TextFieldInput } from "../ui/text-field";
import { cn } from "../utils";

/**
 * Note: not making `'is-dragging'` a `State` as it is
 * a _parallel_ state to `'is-column-over'`.
 *
 * Our board allows you to be over the column that is currently dragging
 */
type State = {
  type:
    | "idle"
    | "is-card-over"
    | "is-column-over"
    | "generate-safari-column-preview"
    | "generate-column-preview";
  closestEdge?: Edge | null;
  container?: HTMLElement;
};
// preventing re-renders with stable state objects
const idle: State = { type: "idle" };
const isCardOver: State = { type: "is-card-over" };

const stateStyles: {
  [key in State["type"]]: string | undefined;
} = {
  idle: "",
  "is-card-over": "bg-secondary",
  "is-column-over": undefined,
  /**
   * **Browser bug workaround**
   *
   * _Problem_
   * When generating a drag preview for an element
   * that has an inner scroll container, the preview can include content
   * vertically before or after the element
   *
   * _Fix_
   * We make the column a new stacking context when the preview is being generated.
   * We are not making a new stacking context at all times, as this _can_ mess up
   * other layering components inside of your card
   *
   * _Fix: Safari_
   * We have not found a great workaround yet. So for now we are just rendering
   * a custom drag preview
   */
  "generate-column-preview": "isolate",
  "generate-safari-column-preview": undefined,
};

function BoardColumn(props: {
  column: BoardColumn;
  items: Item[];
  class?: string;
  canDelete: boolean;
  onDelete(): void;
  canDeleteItem(item: Item): boolean;
  onDeleteItem(item: Item): void;
}) {
  const getColumnId = () => props.column.publicId;
  let columnRef!: HTMLDivElement;
  let columnInnerRef!: HTMLDivElement;
  let headerRef!: HTMLDivElement;
  let scrollableRef!: HTMLDivElement;
  const [state, setState] = createSignal<State>(idle);
  const [isDragging, setIsDragging] = createSignal<boolean>(false);

  const boardCtx = useBoardContext();

  createEffect(() => {
    onCleanup(
      combine(
        draggable({
          element: columnRef,
          dragHandle: headerRef,
          getInitialData: () => ({
            columnId: getColumnId(),
            type: "column",
            instanceId: boardCtx.instanceId,
          }),
          onGenerateDragPreview: ({ nativeSetDragImage }) => {
            const isSafari: boolean =
              navigator.userAgent.includes("AppleWebKit") &&
              !navigator.userAgent.includes("Chrome");

            if (!isSafari) {
              setState({ type: "generate-column-preview" });
              return;
            }
            setCustomNativeDragPreview({
              getOffset: centerUnderPointer,
              render: ({ container }) => {
                setState({
                  type: "generate-safari-column-preview",
                  container,
                });
                return () => setState(idle);
              },
              nativeSetDragImage,
            });
          },
          onDragStart: () => {
            setIsDragging(true);
          },
          onDrop() {
            setState(idle);
            setIsDragging(false);
          },
        }),
        dropTargetForElements({
          element: columnInnerRef,
          getData: () => props.column,
          canDrop: ({ source }) => {
            return (
              source.data.instanceId === boardCtx.instanceId &&
              source.data.type === "card"
            );
          },
          getIsSticky: () => true,
          onDragEnter: () => setState(isCardOver),
          onDragLeave: () => setState(idle),
          onDragStart: () => setState(isCardOver),
          onDrop: () => setState(idle),
        }),
        dropTargetForElements({
          element: columnRef,
          canDrop: ({ source }) => {
            return (
              source.data.instanceId === boardCtx.instanceId &&
              source.data.type === "column"
            );
          },
          getIsSticky: () => true,
          getData({ input, element }) {
            return attachClosestEdge(props.column, {
              input,
              element,
              allowedEdges: ["left", "right"],
            });
          },
          onDragEnter: (args) => {
            setState({
              type: "is-column-over",
              closestEdge: extractClosestEdge(args.self.data),
            });
          },
          onDrag: (args) => {
            // skip react re-render if edge is not changing
            setState((current) => {
              const closestEdge: Edge | null = extractClosestEdge(
                args.self.data,
              );
              if (
                current.type === "is-column-over" &&
                current.closestEdge === closestEdge
              ) {
                return current;
              }
              return {
                type: "is-column-over",
                closestEdge,
              };
            });
          },
          onDragLeave: () => {
            setState(idle);
          },
          onDrop: () => {
            setState(idle);
          },
        }),
        autoScrollForElements({
          element: scrollableRef,
          canScroll: ({ source }) =>
            source.data.instanceId === boardCtx.instanceId &&
            source.data.type === "card",
        }),
      ),
    );
  });

  const contextValue: ColumnContextProps = {
    getColumnId,
    getCardIndex(id: string) {
      return props.items.findIndex((item) => item.publicId === id);
    },
    getNumCards() {
      return props.items.length;
    },
  };

  const [newItemText, setNewItemText] = createSignal("");

  let columnTextInput!: HTMLInputElement;
  const [editingColumn, setEditingColumn] = createSignal(false);
  const [columnText, setColumnText] = createSignal(props.column.text);
  function onFocusOut() {
    if (props.column.text !== columnText().trim()) {
      boardCtx.updateColumnText({ ...props.column, text: columnText().trim() });
    }

    setEditingColumn(false);
  }

  return (
    <ColumnContext.Provider value={contextValue}>
      <div
        class={cn(
          "relative flex flex-col rounded-lg border shadow-lg ease-in-out",
          stateStyles[state().type],
          props.class,
        )}
        ref={columnRef}
        data-board={"column:" + getColumnId()}
        style={{ transition: `background 250ms` }}
      >
        {/* This element takes up the same visual space as the column.
            We are using a separate element so we can have two drop targets
            that take up the same visual space (one for cards, one for columns)
          */}
        <div class="min-h-0 grow" ref={columnInnerRef}>
          <div
            class={cn(
              "flex h-full min-h-0 grow flex-col gap-2",
              isDragging() ? "opacity-25" : "",
            )}
          >
            <div
              class="text-secondary-foreground inline-flex w-full select-none flex-row items-center justify-between gap-2 px-2"
              style={{
                "padding-block-start": "0.5rem",
              }}
            >
              <div
                ref={headerRef}
                class="flex h-10 w-10 cursor-grab items-center justify-center rounded-lg bg-white"
              >
                <GripVertical size="1.5rem" />
              </div>

              <Show
                when={editingColumn()}
                fallback={
                  <h3
                    class="grow cursor-text text-lg font-semibold"
                    onClick={() => {
                      setEditingColumn(true);
                      columnTextInput.focus();
                    }}
                  >
                    {props.column.text}
                  </h3>
                }
              >
                <TextField
                  class="grow"
                  disabled={!editingColumn()}
                  value={columnText()}
                  onChange={setColumnText}
                  onFocusOut={onFocusOut}
                >
                  <TextFieldInput
                    class="text-lg font-semibold"
                    type="text"
                    ref={columnTextInput}
                    minLength={1}
                    maxLength={50}
                  />
                </TextField>
              </Show>

              <ActionMenu
                onDelete={props.onDelete}
                canDelete={props.canDelete}
              />
            </div>

            <div
              class="flex grow flex-col overflow-y-auto p-2"
              ref={scrollableRef}
            >
              <For each={props.items}>
                {(item) => (
                  <BoardCard
                    item={item}
                    canDelete={props.canDeleteItem(item)}
                    onDelete={() => props.onDeleteItem(item)}
                  />
                )}
              </For>
            </div>

            <form
              class="flex w-full flex-col gap-2 p-2 pt-0"
              onSubmit={(e) => {
                e.preventDefault();

                if (newItemText().length) {
                  boardCtx.addCard({
                    id: publicId(),
                    text: newItemText(),
                    columnId: props.column.publicId,
                  });
                  setNewItemText("");

                  scroll(scrollableRef, "down");
                }
              }}
            >
              <TextField value={newItemText()} onChange={setNewItemText}>
                <TextFieldInput type="text" minLength={1} maxLength={50} />
              </TextField>

              <Button
                type="submit"
                size="icon"
                class="w-full"
                disabled={!newItemText().length}
              >
                <Plus />
              </Button>
            </form>
          </div>
        </div>

        <Show when={state().type === "is-column-over" && state().closestEdge}>
          <DropIndicator edge={state().closestEdge!} gap="0.5rem" />
        </Show>
      </div>

      <Show when={state().type === "generate-safari-column-preview"}>
        <Portal mount={state().container}>
          <SafariColumnPreview column={props.column} />
        </Portal>
      </Show>
    </ColumnContext.Provider>
  );
}

function SafariColumnPreview(props: { column: BoardColumn }) {
  return (
    <div
      style={{
        "padding-block-start": "0.25rem",
      }}
      class="bg-secondary text-secondary-foreground w-72 select-none rounded-lg border p-2 pe-2 ps-2"
    >
      <div>
        <GripVertical size="1.5rem" />
      </div>

      <h3 class="text-lg font-semibold">{props.column.text}</h3>
    </div>
  );
}

function ActionMenu(props: { canDelete: boolean; onDelete(): void }) {
  const boardCtx = useBoardContext();
  const colCtx = useColumnContext();

  const getStartIndex = createMemo(() => {
    return boardCtx
      .getColumns()
      .findIndex((column) => column.publicId === colCtx.getColumnId());
  });

  function moveLeft() {
    const startIndex = getStartIndex();
    if (typeof startIndex === "number") {
      boardCtx.reorderColumn({
        startIndex,
        finishIndex: startIndex - 1,
      });
    }
  }

  function moveRight() {
    const startIndex = getStartIndex();
    if (typeof startIndex === "number") {
      boardCtx.reorderColumn({
        startIndex,
        finishIndex: startIndex + 1,
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        as={Button}
        variant="secondary"
        size="icon"
        class="w-10"
      >
        <EllipsisVertical size="1.5rem" />
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-48">
        <DropdownMenuItem
          as="button"
          type="button"
          class="cursor-pointer"
          onClick={moveLeft}
          disabled={getStartIndex() === 0}
        >
          <ChevronLeft /> <span>Move left</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          as="button"
          type="button"
          class="cursor-pointer"
          onClick={moveRight}
          disabled={getStartIndex() === boardCtx.getColumns().length - 1}
        >
          <ChevronRight /> <span>Move right</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          as="button"
          type="button"
          class="text-destructive focus:text-destructive/90 cursor-pointer"
          disabled={!props.canDelete}
          onClick={props.onDelete}
        >
          <Trash /> <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Board(props: {
  columns: BoardColumn[];
  items: Item[];
  onItemCreated(item: Pick<Item, "text" | "columnPublicId">): void;
  onItemsUpdated(items: Item[]): void;
  onItemDeleted(itemId: string): void;
  onColumnCreated(item: Pick<BoardColumn, "text">): void;
  onColumnsUpdated(items: BoardColumn[]): void;
  onColumnDeleted(columnId: string): void;
}) {
  const orderedColumnIds = createMemo(() =>
    props.columns.map((col) => col.publicId),
  );
  const columnMap = createMemo(() => {
    const map = {} as Record<string, BoardColumn & { _items: Item[] }>;
    for (const col of props.columns) {
      map[col.publicId] = {
        ...col,
        _items: props.items.filter(
          (item) => item.columnPublicId === col.publicId,
        ),
      };
    }
    return map;
  });

  const instanceId = Symbol("instance-id");

  createEffect(() => {
    onCleanup(
      combine(
        monitorForElements({
          canMonitor({ source }) {
            return source.data.instanceId === instanceId;
          },
          onDrop(args) {
            const { location, source } = args;
            // didn't drop on anything
            if (!location.current.dropTargets.length) {
              return;
            }
            // need to handle drop

            // 1. remove element from original position
            // 2. move to new position

            if (source.data.type === "column") {
              const startIndex: number = orderedColumnIds().findIndex(
                (columnId) => columnId === source.data.columnId,
              );

              const target = location.current.dropTargets[0];
              const targetData = target.data as Column;
              const indexOfTarget: number = orderedColumnIds().findIndex(
                (id) => id === targetData.publicId,
              );
              const closestEdgeOfTarget = extractClosestEdge(targetData);

              const finishIndex = getReorderDestinationIndex({
                startIndex,
                indexOfTarget,
                closestEdgeOfTarget,
                axis: "horizontal",
              });

              contextValue.reorderColumn({
                startIndex,
                finishIndex,
              });
            }

            // Dragging a card
            if (source.data.type === "card") {
              const itemId = source.data.itemId;

              const [, startColumnRecord] = location.initial.dropTargets;
              const sourceId = (startColumnRecord.data as BoardColumn).publicId;

              const sourceColumn = columnMap()[sourceId];
              const itemIndex = sourceColumn._items.findIndex(
                (item) => item.publicId === itemId,
              );

              if (location.current.dropTargets.length === 1) {
                const [destinationColumnRecord] = location.current.dropTargets;
                const destinationId = (
                  destinationColumnRecord.data as BoardColumn
                ).publicId;

                const destinationColumn = columnMap()[destinationId];

                // reordering in same column
                if (sourceColumn === destinationColumn) {
                  const destinationIndex = getReorderDestinationIndex({
                    startIndex: itemIndex,
                    indexOfTarget: sourceColumn._items.length - 1,
                    closestEdgeOfTarget: null,
                    axis: "vertical",
                  });
                  contextValue.reorderCard({
                    columnId: sourceColumn.publicId,
                    startIndex: itemIndex,
                    finishIndex: destinationIndex,
                  });
                  return;
                }

                // moving to a new column
                contextValue.moveCard({
                  itemIndexInStartColumn: itemIndex,
                  startColumnId: sourceColumn.publicId,
                  finishColumnId: destinationColumn.publicId,
                });
                return;
              }

              // dropping in a column (relative to a card)
              if (location.current.dropTargets.length === 2) {
                const [destinationCardRecord, destinationColumnRecord] =
                  location.current.dropTargets;
                const destinationCardRecordData =
                  destinationCardRecord.data as {
                    type: "card";
                    itemId: string;
                  };

                const destinationColumnId = (
                  destinationColumnRecord.data as BoardColumn
                ).publicId;

                const destinationColumn = columnMap()[destinationColumnId];

                const indexOfTarget = destinationColumn._items.findIndex(
                  (item) => item.publicId === destinationCardRecordData.itemId,
                );
                const closestEdgeOfTarget: Edge | null = extractClosestEdge(
                  destinationCardRecordData,
                );

                // case 1: ordering in the same column
                if (sourceColumn === destinationColumn) {
                  const destinationIndex = getReorderDestinationIndex({
                    startIndex: itemIndex,
                    indexOfTarget,
                    closestEdgeOfTarget,
                    axis: "vertical",
                  });
                  contextValue.reorderCard({
                    columnId: sourceColumn.publicId,
                    startIndex: itemIndex,
                    finishIndex: destinationIndex,
                  });
                  return;
                }

                // case 2: moving into a new column relative to a card

                const destinationIndex =
                  closestEdgeOfTarget === "bottom"
                    ? indexOfTarget + 1
                    : indexOfTarget;

                contextValue.moveCard({
                  itemIndexInStartColumn: itemIndex,
                  startColumnId: sourceColumn.publicId,
                  finishColumnId: destinationColumn.publicId,
                  itemIndexInFinishColumn: destinationIndex,
                });
              }
            }
          },
        }),
      ),
    );
  });

  const contextValue: BoardContextValue = {
    getColumns: () => props.columns,
    reorderColumn({ startIndex, finishIndex }) {
      if (startIndex === finishIndex) {
        return;
      }

      const oldOrder = orderedColumnIds();
      const columnId = oldOrder[startIndex];
      const newOrder = reorder({
        list: oldOrder,
        startIndex,
        finishIndex,
      });

      const colMap = columnMap();
      props.onColumnsUpdated(
        newOrder.map((id, i) => ({ ...colMap[id], order: i })),
      );

      const el = document.querySelector(`[data-board="column:${columnId}"]`);
      if (el instanceof HTMLElement) {
        triggerPostMoveFlash(el);
      }
    },
    reorderCard({ columnId, startIndex, finishIndex }) {
      if (startIndex === finishIndex) {
        return;
      }

      const items = columnMap()[columnId]._items;
      const itemId = items[startIndex].publicId;
      const updatedItems = reorder({
        list: items,
        startIndex,
        finishIndex,
      });

      props.onItemsUpdated(
        updatedItems.map((item, i) => ({
          ...item,
          columnId,
          order: i,
        })),
      );

      const el = document.querySelector(`[data-board="item:${itemId}"]`);
      if (el instanceof HTMLElement) {
        // TODO: not flashing
        console.debug("triggerPostMoveFlash", el);
        triggerPostMoveFlash(el);
      }
    },
    moveCard({
      startColumnId,
      finishColumnId,
      itemIndexInStartColumn,
      itemIndexInFinishColumn,
    }) {
      // invalid cross column movement
      if (startColumnId === finishColumnId) {
        return;
      }

      const sourceColumn = columnMap()[startColumnId];
      const destinationColumn = columnMap()[finishColumnId];
      const item = sourceColumn._items[itemIndexInStartColumn];

      const newColumnItems = Array.from(destinationColumn._items);
      // Going into the first position if no index is provided
      const newIndexInDestination = itemIndexInFinishColumn ?? 0;
      newColumnItems.splice(newIndexInDestination, 0, item);

      const oldColumnUpdates = sourceColumn._items
        .filter((i) => i.publicId !== item.publicId)
        .map<Item>((item, i) => ({
          ...item,
          order: i,
          columnPublicId: startColumnId,
        }));

      const destinationColumnChanges = newColumnItems.map<Item>((item, i) => ({
        ...item,
        order: i,
        columnPublicId: finishColumnId,
      }));

      props.onItemsUpdated(destinationColumnChanges.concat(oldColumnUpdates));

      const el = document.querySelector(`[data-board="item:${item.publicId}"]`);
      if (el instanceof HTMLElement) {
        // TODO: not flashing
        console.debug("triggerPostMoveFlash", el);
        triggerPostMoveFlash(el);
      }

      /**
       * Because the card has moved column, it will have remounted.
       * This means we need to manually restore focus to it.
       */
      const actionMenuTrigger = document.querySelector(
        `[data-board="item-trigger:${item.publicId}"]`,
      );
      if (actionMenuTrigger instanceof HTMLElement) {
        // TODO: not working
        actionMenuTrigger.focus();
      }
    },
    instanceId,
    addCard(item) {
      props.onItemCreated({
        columnPublicId: item.columnId,
        text: item.text,
      });
    },
    updateCardText(item) {
      props.onItemsUpdated([item]);
    },
    updateColumnText(column) {
      props.onColumnsUpdated([column]);
    },
  };

  const [newCardText, setNewCardText] = createSignal("");

  createEffect(() => {
    onCleanup(
      // TODO: what is this for?
      autoScrollWindowForElements({
        canScroll: ({ source }) => source.data.instanceId === instanceId,
      }),
    );
  });

  return (
    <BoardContext.Provider value={contextValue}>
      <div class="flex flex-row items-start gap-2">
        <For each={orderedColumnIds()}>
          {(columnId) => (
            <BoardColumn
              column={columnMap()[columnId]}
              items={columnMap()[columnId]._items}
              class="h-[40rem] w-72"
              canDelete
              onDelete={() => {
                props.onColumnDeleted(columnId);
              }}
              canDeleteItem={(item) => true}
              onDeleteItem={(item) => props.onItemDeleted(item.publicId)}
            />
          )}
        </For>

        <form
          class="relative flex w-72 flex-col gap-2 rounded-lg border p-2 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();

            if (newCardText().length) {
              props.onColumnCreated({
                text: newCardText(),
              });
              setNewCardText("");
            }
          }}
        >
          <TextField value={newCardText()} onChange={setNewCardText}>
            <TextFieldInput type="text" minLength={1} maxLength={50} />
          </TextField>

          <Button
            type="submit"
            size="icon"
            class="w-full"
            disabled={!newCardText().length}
          >
            <Plus />
          </Button>
        </form>
      </div>
    </BoardContext.Provider>
  );
}
