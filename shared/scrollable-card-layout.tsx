import { Component, JSXElement } from "solid-js";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Dynamic } from "solid-js/web";

type ScrollDirection = "up" | "down" | "left" | "right";

type Props = { scroll(direction: ScrollDirection): void };

export function scroll(el: Element, direction: ScrollDirection) {
  if (direction === "up" || direction === "down") {
    el.scroll({
      top: direction === "up" ? 0 : el.scrollHeight,
      behavior: "smooth",
    });
  } else {
    el.scroll({
      left: direction === "left" ? 0 : el.scrollWidth,
      behavior: "smooth",
    });
  }
}

export function ScrollableCardLayout(props: {
  title: JSXElement;
  children: Component<Props>;
  footer: Component<Props>;
}) {
  let cardContent!: HTMLDivElement;
  function scrollCard(direction: ScrollDirection) {
    scroll(cardContent, direction);
  }
  return (
    <main class="grid h-screen items-start justify-items-center sm:pt-16">
      <Card class="w-full sm:max-w-xl">
        <CardHeader>
          <CardTitle class="text-center">{props.title}</CardTitle>
        </CardHeader>

        <CardContent
          class="relative flex h-[calc(100vh-17rem)] flex-col overflow-y-auto pt-6 sm:max-h-[60vh]"
          ref={cardContent}
        >
          <Dynamic component={props.children} scroll={scrollCard} />
        </CardContent>

        <CardFooter class="pt-6">
          <Dynamic component={props.footer} scroll={scrollCard} />
        </CardFooter>
      </Card>
    </main>
  );
}
