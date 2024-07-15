import Plus from "lucide-solid/icons/plus";
import { Component, createSignal, JSXElement } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  TextField,
  TextFieldErrorMessage,
  TextFieldInput,
} from "./ui/text-field";

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
  onAddItem(text: string): void | Promise<void>;
  addItemError?: string;
}) {
  let cardContent!: HTMLDivElement;
  function scrollCard(direction: ScrollDirection) {
    scroll(cardContent, direction);
  }

  const [text, setText] = createSignal("");
  const trimmed = () => text().trim();

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
          <form
            class="flex w-full flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault();

              if (trimmed().length) {
                await props.onAddItem(trimmed());
                setText("");
                scrollCard("down");
              }
            }}
          >
            <TextField
              value={text()}
              onChange={setText}
              validationState={props.addItemError ? "invalid" : "valid"}
            >
              <TextFieldInput type="text" minLength={1} maxLength={60} />
              <TextFieldErrorMessage>
                {props.addItemError}
              </TextFieldErrorMessage>
            </TextField>

            <Button
              type="submit"
              size="icon"
              class="w-full"
              disabled={!trimmed().length}
            >
              <Plus />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </main>
  );
}
