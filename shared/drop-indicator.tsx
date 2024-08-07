import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import type { JSX } from "solid-js";
import { cn } from "./utils";

type Orientation = "horizontal" | "vertical";

const edgeToOrientationMap: Record<Edge, Orientation> = {
  top: "horizontal",
  bottom: "horizontal",
  left: "vertical",
  right: "vertical",
};

const orientationStyles: Record<
  Orientation,
  JSX.HTMLAttributes<HTMLElement>["class"]
> = {
  horizontal:
    "h-[--line-thickness] left-[--terminal-radius] right-0 before:left-[--negative-terminal-size]",
  vertical:
    "w-[--line-thickness] top-[--terminal-radius] bottom-0 before:top-[--negative-terminal-size]",
};

const edgeStyles: Record<Edge, JSX.HTMLAttributes<HTMLElement>["class"]> = {
  top: "top-[--line-offset] before:top-[--offset-terminal]",
  right: "right-[--line-offset] before:right-[--offset-terminal]",
  bottom: "bottom-[--line-offset] before:bottom-[--offset-terminal]",
  left: "left-[--line-offset] before:left-[--offset-terminal]",
};

const strokeSize = 2;
const terminalSize = 8;
const offsetToAlignTerminalWithLine = (strokeSize - terminalSize) / 2;

/**
 * This is a tailwind port of `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box`
 */
export function DropIndicator(props: {
  edge: Edge;
  gap: string;
  class?: string;
}) {
  return (
    <div
      style={
        {
          "--line-thickness": `${strokeSize}px`,
          // "--line-offset": `calc(-0.5 * (${props.gap} + ${strokeSize}px))`,
          "--terminal-size": `${terminalSize}px`,
          "--terminal-radius": `${terminalSize / 2}px`,
          "--negative-terminal-size": `-${terminalSize}px`,
          "--offset-terminal": `${offsetToAlignTerminalWithLine}px`,
        } as JSX.CSSProperties
      }
      class={cn(
        "bg-primary before:border-primary pointer-events-none absolute z-10 box-border before:absolute before:h-[--terminal-size] before:w-[--terminal-size] before:rounded-full before:border-[length:--line-thickness] before:border-solid before:content-['']",
        orientationStyles[edgeToOrientationMap[props.edge]],
        edgeStyles[props.edge],
        props.class,
      )}
    />
  );
}
