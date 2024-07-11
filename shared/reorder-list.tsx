import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronUp from "lucide-solid/icons/chevron-up";
import ChevronsDown from "lucide-solid/icons/chevrons-down";
import ChevronsUp from "lucide-solid/icons/chevrons-up";
import EllipsisVertical from "lucide-solid/icons/ellipsis-vertical";
import GripVertical from "lucide-solid/icons/grip-vertical";
import Trash from "lucide-solid/icons/trash";
import {
  Component,
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { DropIndicator } from "./drop-indicator";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn, showToast } from "./utils";

const itemKey = Symbol("list_item");
type ItemData<T> = {
  [itemKey]: true;
  item: T;
  index: number;
  instanceId: symbol;
};

function getItemData<T>({
  item,
  index,
  instanceId,
}: {
  item: T;
  index: number;
  instanceId: symbol;
}): ItemData<T> {
  return {
    [itemKey]: true,
    item,
    index,
    instanceId,
  };
}

function isItemData<T>(
  data: Record<string | symbol, unknown>,
): data is ItemData<T> {
  return data[itemKey] === true;
}

type ItemPosition = "first" | "last" | "middle" | "only";
function getItemPosition<T>({
  index,
  items,
}: {
  index: number;
  items: T[];
}): ItemPosition {
  if (items.length === 1) {
    return "only";
  }

  if (index === 0) {
    return "first";
  }

  if (index === items.length - 1) {
    return "last";
  }

  return "middle";
}

function flashItem(itemId: string) {
  const element = document.querySelector(`[data-reorder-item-id="${itemId}"]`);
  if (element instanceof HTMLElement) {
    triggerPostMoveFlash(element);
  }
}

function reorderItems<T>({
  update,
  list,
  closestEdgeOfTarget,
  indexOfTarget,
  startIndex,
}: {
  list: T[];
  startIndex: number;
  indexOfTarget: number;
  closestEdgeOfTarget: Edge | null;
  update(items: T[]): Promise<any>;
}) {
  const finishIndex = getReorderDestinationIndex({
    startIndex,
    closestEdgeOfTarget,
    indexOfTarget,
    axis: "vertical",
  });

  if (finishIndex === startIndex) {
    return;
  }

  const reordered = reorder({
    list,
    startIndex,
    finishIndex,
  });
  showToast(update(reordered));
}

function MoveDropdown(props: {
  canDelete: boolean;
  onDelete(): void;
  position: ItemPosition;
  moveTop(): void;
  moveUp(): void;
  moveDown(): void;
  moveBottom(): void;
}) {
  const isMoveUpDisabled = () =>
    props.position === "first" || props.position === "only";
  const isMoveDownDisabled = () =>
    props.position === "last" || props.position === "only";

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
          onClick={props.moveTop}
          disabled={isMoveUpDisabled()}
        >
          <ChevronsUp /> <span>Move to top</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          as="button"
          type="button"
          class="cursor-pointer"
          onClick={props.moveUp}
          disabled={isMoveUpDisabled()}
        >
          <ChevronUp /> <span>Move up</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          as="button"
          type="button"
          class="cursor-pointer"
          onClick={props.moveDown}
          disabled={isMoveDownDisabled()}
        >
          <ChevronDown /> <span>Move down</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          as="button"
          type="button"
          class="cursor-pointer"
          onClick={props.moveBottom}
          disabled={isMoveDownDisabled()}
        >
          <ChevronsDown /> <span>Move to bottom</span>
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

function ReorderListItem<T>(props: {
  item: T;
  itemId: string;
  list: T[];
  index: number;
  instanceId: symbol;
  position: ItemPosition;
  canDelete(item: T): boolean;
  delete(items: T): Promise<any>;
  update(items: T[]): Promise<any>;
  scroll(direction: "up" | "down"): void;
  children: Component<{ item: T }>;
}) {
  type DraggableState =
    | { type: "idle" }
    | { type: "preview"; container: HTMLElement }
    | { type: "dragging" };

  let dropTarget!: HTMLDivElement;
  let dragHandle!: HTMLDivElement;

  const [closestEdge, setClosestEdge] = createSignal<Edge | null>(null);
  const [draggableState, setDraggableState] = createSignal<DraggableState>({
    type: "idle",
  });

  const data = getItemData({
    item: props.item,
    index: props.index,
    instanceId: props.instanceId,
  });

  createEffect(() => {
    onCleanup(
      draggable({
        element: dragHandle,
        getInitialData: () => data,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset({ container }) {
              const rect = container.getBoundingClientRect();
              return { y: rect.height / 2, x: 36 };
            },
            render({ container }) {
              setDraggableState({ type: "preview", container });
              return () => setDraggableState({ type: "dragging" });
            },
          });
        },
        onDragStart() {
          setDraggableState({ type: "dragging" });
        },
        onDrop() {
          setDraggableState({ type: "idle" });
        },
      }),
    );

    onCleanup(
      dropTargetForElements({
        element: dropTarget,
        canDrop({ source }) {
          return (
            isItemData(source.data) &&
            source.data.instanceId === props.instanceId
          );
        },
        getData({ input }) {
          return attachClosestEdge(data, {
            element: dropTarget,
            input,
            allowedEdges: ["top", "bottom"],
          });
        },
        getIsSticky() {
          return true;
        },
        onDrag({ self, source }) {
          const isSource = source.element === dropTarget;
          if (isSource) {
            setClosestEdge(null);
            return;
          }

          const closestEdge = extractClosestEdge(self.data);

          setClosestEdge(closestEdge);
          const sourceIndex = (source.data as ItemData<T>).index;
          if (typeof sourceIndex !== "number") {
            return;
          }

          const isItemBeforeSource = props.index === sourceIndex - 1;
          const isItemAfterSource = props.index === sourceIndex + 1;

          const isDropIndicatorHidden =
            (isItemBeforeSource && closestEdge === "bottom") ||
            (isItemAfterSource && closestEdge === "top");

          if (isDropIndicatorHidden) {
            setClosestEdge(null);
            return;
          }

          setClosestEdge(closestEdge);
        },
        onDragLeave() {
          setClosestEdge(null);
        },
        onDrop() {
          setClosestEdge(null);
        },
      }),
    );
  });

  function moveToTop() {
    reorderItems({
      list: props.list,
      startIndex: props.index,
      indexOfTarget: 0,
      closestEdgeOfTarget: null,
      update: props.update,
    });

    props.scroll("up");

    requestAnimationFrame(() => {
      flashItem(props.itemId);
    });
  }

  function moveUp() {
    reorderItems({
      list: props.list,
      startIndex: props.index,
      indexOfTarget: props.index - 1,
      closestEdgeOfTarget: null,
      update: props.update,
    });

    flashItem(props.itemId);
  }

  function moveDown() {
    reorderItems({
      list: props.list,
      startIndex: props.index,
      indexOfTarget: props.index + 1,
      closestEdgeOfTarget: null,
      update: props.update,
    });

    flashItem(props.itemId);
  }

  function moveToBottom() {
    reorderItems({
      list: props.list,
      startIndex: props.index,
      indexOfTarget: props.list.length - 1,
      closestEdgeOfTarget: null,
      update: props.update,
    });

    props.scroll("down");

    flashItem(props.itemId);
  }

  return (
    <>
      <div class="border-secondary relative border-b last:border-b-0">
        <div
          ref={dropTarget}
          data-reorder-item-id={props.itemId}
          class={cn("flex flex-row items-center gap-4 py-2", {
            "opacity-25": draggableState().type === "dragging",
          })}
        >
          <div
            class="inline-flex h-10 w-10 cursor-grab items-center justify-center"
            ref={dragHandle}
          >
            <GripVertical size="1.5rem" />
          </div>

          <Dynamic component={props.children} item={props.item} />

          <MoveDropdown
            moveBottom={moveToBottom}
            moveDown={moveDown}
            moveTop={moveToTop}
            moveUp={moveUp}
            position={props.position}
            canDelete={props.canDelete(props.item)}
            onDelete={() => {
              showToast(props.delete(props.item));
            }}
          />
        </div>

        <Show when={closestEdge()}>
          <DropIndicator edge={closestEdge()!} gap="0.5rem" />
        </Show>
      </div>

      <Show when={draggableState().type === "preview"}>
        <Portal mount={(draggableState() as any).container}>
          <div
            style={{
              width: dropTarget ? dropTarget.clientWidth + "px" : undefined,
            }}
            class="flex w-full flex-row items-center gap-4 rounded-lg bg-white p-4 opacity-100 active:cursor-grabbing"
          >
            <div class="inline-flex h-10 w-10 items-center justify-center">
              <GripVertical size="1.5rem" />
            </div>

            <Dynamic component={props.children} item={props.item} />

            <Button variant="secondary" size="icon" class="w-10">
              <EllipsisVertical size="1.5rem" />
            </Button>
          </div>
        </Portal>
      </Show>
    </>
  );
}

export function ReorderList<T>(props: {
  scroll(direction: "up" | "down"): void;
  list: T[];
  itemId(item: T): string;
  children: Component<{ item: T }>;

  canDelete(item: T): boolean;
  delete(items: T): Promise<any>;
  update(items: T[]): Promise<any>;
  find(item: T, target: T): boolean;
}) {
  // Isolated instances of this component from one another
  const instanceId = Symbol("instance-id");

  createEffect(() => {
    onCleanup(
      monitorForElements({
        canMonitor({ source }) {
          return (
            isItemData(source.data) && source.data.instanceId === instanceId
          );
        },
        onDrop({ location, source }) {
          const target = location.current.dropTargets[0];
          if (!target) {
            return;
          }

          const sourceData = source.data as ItemData<T>;
          const targetData = target.data as ItemData<T>;
          if (!isItemData(sourceData) || !isItemData(targetData)) {
            return;
          }

          const indexOfTarget = props.list.findIndex((item) =>
            props.find(item, targetData.item),
          );

          if (indexOfTarget < 0) {
            return;
          }

          const closestEdgeOfTarget = extractClosestEdge(targetData);

          reorderItems({
            closestEdgeOfTarget,
            indexOfTarget,
            startIndex: sourceData.index,
            list: props.list,
            update: props.update,
          });

          flashItem(props.itemId(sourceData.item));
        },
      }),
    );
  });

  return (
    <For
      each={props.list}
      fallback={
        <p class="text-muted-foreground text-center">No items in this list.</p>
      }
    >
      {(item, index) => (
        <ReorderListItem
          item={item}
          itemId={props.itemId(item)}
          update={props.update}
          delete={props.delete}
          canDelete={props.canDelete}
          index={index()}
          instanceId={instanceId}
          position={getItemPosition({ index: index(), items: props.list })}
          scroll={props.scroll}
          list={props.list}
          children={props.children}
        />
      )}
    </For>
  );
}
