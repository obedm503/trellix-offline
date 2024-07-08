import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { dropTargetForExternal } from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronUp from "lucide-solid/icons/chevron-up";
import ChevronsDown from "lucide-solid/icons/chevrons-down";
import ChevronsUp from "lucide-solid/icons/chevrons-up";
import EllipsisVertical from "lucide-solid/icons/ellipsis-vertical";
import GripVertical from "lucide-solid/icons/grip-vertical";
import Trash from "lucide-solid/icons/trash";
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { DropIndicator } from "../drop-indicator";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../utils";
import {
  useBoardContext,
  useColumnContext,
  type Column,
  type Item,
} from "./context";

type State =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement }
  | { type: "dragging" };

const idleState: State = { type: "idle" };
const draggingState: State = { type: "dragging" };

function MoveToOtherColumnItem(props: {
  targetColumn: Column;
  startIndex: number;
}) {
  const boardCtx = useBoardContext();
  const colCtx = useColumnContext();

  function onClick() {
    boardCtx.moveCard({
      startColumnId: colCtx.getColumnId(),
      finishColumnId: props.targetColumn.publicId,
      itemIndexInStartColumn: props.startIndex,
    });
  }
  return (
    <DropdownMenuItem
      as="button"
      type="button"
      class="cursor-pointer"
      onClick={onClick}
    >
      {props.targetColumn.text}
    </DropdownMenuItem>
  );
}

function LazyDropdownItems(props: {
  publicId: string;
  onDelete(): void;
  canDelete: boolean;
}) {
  const boardCtx = useBoardContext();
  const colCtx = useColumnContext();

  const startIndex = () => colCtx.getCardIndex(props.publicId);

  function moveToTop() {
    boardCtx.reorderCard({
      columnId: colCtx.getColumnId(),
      startIndex: startIndex(),
      finishIndex: 0,
    });
  }

  function moveUp() {
    boardCtx.reorderCard({
      columnId: colCtx.getColumnId(),
      startIndex: startIndex(),
      finishIndex: startIndex() - 1,
    });
  }

  function moveDown() {
    boardCtx.reorderCard({
      columnId: colCtx.getColumnId(),
      startIndex: startIndex(),
      finishIndex: startIndex() + 1,
    });
  }

  function moveToBottom() {
    boardCtx.reorderCard({
      columnId: colCtx.getColumnId(),
      startIndex: startIndex(),
      finishIndex: colCtx.getNumCards() - 1,
    });
  }

  const isMoveUpDisabled = () => startIndex() === 0;
  const isMoveDownDisabled = () => startIndex() === colCtx.getNumCards() - 1;

  const moveColumnOptions = () =>
    boardCtx
      .getColumns()
      .filter((column) => column.publicId !== colCtx.getColumnId());

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>Reorder</DropdownMenuLabel>

        <DropdownMenuItem
          as="button"
          type="button"
          class="cursor-pointer"
          onClick={moveToTop}
          disabled={isMoveUpDisabled()}
        >
          <ChevronsUp /> <span>Move to top</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          as="button"
          type="button"
          class="cursor-pointer"
          onClick={moveUp}
          disabled={isMoveUpDisabled()}
        >
          <ChevronUp /> <span>Move up</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          as="button"
          type="button"
          class="cursor-pointer"
          onClick={moveDown}
          disabled={isMoveDownDisabled()}
        >
          <ChevronDown /> <span>Move down</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          as="button"
          type="button"
          class="cursor-pointer"
          onClick={moveToBottom}
          disabled={isMoveDownDisabled()}
        >
          <ChevronsDown /> <span>Move to bottom</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuGroup>
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        <For each={moveColumnOptions()}>
          {(column) => (
            <MoveToOtherColumnItem
              targetColumn={column}
              startIndex={startIndex()}
            />
          )}
        </For>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        as="button"
        type="button"
        class="cursor-pointer text-destructive focus:text-destructive/90"
        disabled={!props.canDelete}
        onClick={props.onDelete}
      >
        <Trash /> <span>Delete</span>
      </DropdownMenuItem>
    </>
  );
}

function CardPrimitive(props: {
  closestEdge: Edge | null;
  item: Item;
  state: State;
  dropTarget: ((el: HTMLDivElement) => void) | undefined;
  dragHandle: ((el: HTMLDivElement) => void) | undefined;
  canDelete: boolean;
  onDelete(): void;
}) {
  return (
    <div class="relative border-b border-secondary last:border-b-0">
      <div
        ref={props.dropTarget}
        data-board={
          props.state.type === "preview" ? undefined : "item:" + props.item.publicId
        }
        class={cn(
          "flex flex-row items-center justify-between gap-1 bg-background p-4 py-2",
          props.state.type === "preview" ? "rounded-lg border shadow" : "",
        )}
      >
        <div ref={props.dragHandle} class="cursor-grab">
          <GripVertical size="1.5rem" />
        </div>

        <h3 class="grow">{props.item.text}</h3>

        <DropdownMenu>
          <DropdownMenuTrigger
            as={Button}
            variant="secondary"
            size="icon"
            class="w-10"
            data-board={`item-trigger:${props.item.publicId}`}
          >
            <EllipsisVertical size="1.5rem" />
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-48">
            <LazyDropdownItems
              publicId={props.item.publicId}
              canDelete={props.canDelete}
              onDelete={props.onDelete}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Show when={props.closestEdge}>
        <DropIndicator edge={props.closestEdge!} gap="0.5rem" />
      </Show>
    </div>
  );
}

export function BoardCard(props: {
  item: Item;
  canDelete: boolean;
  onDelete(): void;
}) {
  let dragHandle!: HTMLDivElement;
  let dropTarget!: HTMLDivElement;
  const [closestEdge, setClosestEdge] = createSignal<Edge | null>(null);
  const [state, setState] = createSignal<State>(idleState);

  const ctx = useBoardContext();

  createEffect(() => {
    onCleanup(
      combine(
        draggable({
          element: dragHandle,
          getInitialData: () => ({
            type: "card",
            itemId: props.item.publicId,
            instanceId: ctx.instanceId,
          }),
          onGenerateDragPreview({ location, source, nativeSetDragImage }) {
            setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset({ container }) {
                const rect = container.getBoundingClientRect();
                return { y: rect.height / 2, x: 30 };
              },
              render({ container }) {
                setState({ type: "preview", container });
                return () => setState(draggingState);
              },
            });
          },
          onDragStart: () => setState(draggingState),
          onDrop: () => setState(idleState),
        }),
        dropTargetForExternal({
          element: dropTarget,
        }),
        dropTargetForElements({
          element: dropTarget,
          canDrop: ({ source }) => {
            return (
              source.data.instanceId === ctx.instanceId &&
              source.data.type === "card"
            );
          },
          getIsSticky: () => true,
          getData: ({ input, element }) => {
            const data = {
              type: "card",
              itemId: props.item.publicId,
            };

            return attachClosestEdge(data, {
              input,
              element,
              allowedEdges: ["top", "bottom"],
            });
          },
          onDragEnter({ source, self }) {
            if (source.data.itemId !== props.item.publicId) {
              setClosestEdge(extractClosestEdge(self.data));
            }
          },
          onDrag({ source, self }) {
            if (source.data.itemId !== props.item.publicId) {
              setClosestEdge(extractClosestEdge(self.data));
            }
          },
          onDragLeave() {
            setClosestEdge(null);
          },
          onDrop() {
            setClosestEdge(null);
          },
        }),
      ),
    );
  });

  return (
    <>
      <CardPrimitive
        dropTarget={(el) => {
          dropTarget = el;
        }}
        dragHandle={(el) => {
          dragHandle = el;
        }}
        item={props.item}
        state={state()}
        closestEdge={closestEdge()}
        canDelete={props.canDelete}
        onDelete={props.onDelete}
      />

      <Show when={state().type === "preview" && state()} keyed>
        {(state) => {
          if (state.type !== "preview") {
            return null;
          }
          return (
            <Portal mount={state.container}>
              <div
                class="box-border rounded-lg border"
                style={{
                  width: dropTarget.clientWidth + "px",
                }}
              >
                <CardPrimitive
                  item={props.item}
                  state={state}
                  closestEdge={null}
                  dragHandle={undefined}
                  dropTarget={undefined}
                  canDelete={false}
                  onDelete={() => {}}
                />
              </div>
            </Portal>
          );
        }}
      </Show>
    </>
  );
}
