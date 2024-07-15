import Link from "lucide-solid/icons/link";
import Plus from "lucide-solid/icons/plus";
import { getUser } from "shared/api/auth";
import { publicId } from "shared/nanoid";
import { ReorderList } from "shared/reorder-list";
import { ScrollableCardLayout } from "shared/scrollable-card-layout";
import { Button } from "shared/ui/button";
import {
  TextField,
  TextFieldErrorMessage,
  TextFieldInput,
} from "shared/ui/text-field";
import { showToast } from "shared/utils";
import { createEffect, createSignal, Match, onCleanup, Switch } from "solid-js";
import { getBoards, mutateBoards } from "../../queries";

export default function Boards() {
  createEffect(() => {
    const currentTitle = document.title;
    document.title = "Boards";
    onCleanup(() => {
      document.title = currentTitle;
    });
  });

  const boards = getBoards();

  const save = mutateBoards();

  const user = getUser();

  return (
    <ScrollableCardLayout
      title="Boards"
      footer={(props) => {
        const [name, setName] = createSignal("");
        return (
          <form
            class="flex w-full flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();

              if (name().length) {
                showToast(
                  save.mutateAsync([
                    {
                      _op: "create",
                      name: name(),
                      public_id: publicId(),
                      order: boards.data?.length ?? 0,
                      created_by: user()!.id,
                    },
                  ]),
                );
                setName("");

                props.scroll("down");
              }
            }}
          >
            <TextField
              value={name()}
              onChange={setName}
              validationState={save.error ? "invalid" : "valid"}
            >
              <TextFieldInput type="text" minLength={1} maxLength={50} />
              <TextFieldErrorMessage>
                {save.error?.message}
              </TextFieldErrorMessage>
            </TextField>

            <Button
              type="submit"
              size="icon"
              class="w-full"
              disabled={!name().length}
            >
              <Plus />
            </Button>
          </form>
        );
      }}
    >
      {(props) => (
        <Switch fallback={"Loading..."}>
          <Match when={boards.data}>
            <ReorderList
              list={boards.data!}
              canDelete={(item) => !!item.id}
              find={(item, target) => item.public_id === target.public_id}
              delete={async (item) => {
                if (item.id) {
                  return save.mutateAsync([{ _op: "delete", id: item.id }]);
                }
              }}
              update={async (items) => {
                const list = items
                  .filter((item) => !!item.id)
                  .map((item, i) => ({
                    _op: "update" as const,
                    id: item.id,
                    order: i,
                  }));
                if (list.length) {
                  return save.mutateAsync(list);
                }
              }}
              itemId={(item) => item.public_id}
              scroll={props.scroll}
            >
              {(props) => {
                const [text, setText] = createSignal(props.item.name);
                function onFocusOut() {
                  if (props.item.name !== text().trim()) {
                    showToast(
                      save.mutateAsync([
                        {
                          _op: "update",
                          id: props.item.id,
                          name: text().trim(),
                        },
                      ]),
                    );
                  }
                }

                return (
                  <>
                    <Button
                      class="border-primary text-primary hover:text-primary/90 h-10 w-10 text-xs"
                      variant="outline"
                      size="icon"
                      as="a"
                      href={`/board/${props.item.public_id}`}
                      disabled={!props.item.id}
                    >
                      <Link size="1.5em" />
                    </Button>

                    <TextField
                      class="grow"
                      value={text()}
                      onChange={setText}
                      onFocusOut={onFocusOut}
                      disabled={!props.item.id}
                    >
                      <TextFieldInput
                        class="disabled:cursor-default"
                        type="text"
                        minLength={1}
                        maxLength={50}
                      />
                    </TextField>
                  </>
                );
              }}
            </ReorderList>
          </Match>

          <Match when={boards.error}>
            <p class="text-destructive">{boards.error?.message}</p>
          </Match>
        </Switch>
      )}
    </ScrollableCardLayout>
  );
}
