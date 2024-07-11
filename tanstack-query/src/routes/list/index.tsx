import Link from "lucide-solid/icons/link";
import Plus from "lucide-solid/icons/plus";
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
import { getLists, mutateLists } from "../../queries";

export default function Lists() {
  createEffect(() => {
    const currentTitle = document.title;

    document.title = "Lists";

    onCleanup(() => {
      document.title = currentTitle;
    });
  });

  const lists = getLists();

  const save = mutateLists();

  return (
    <ScrollableCardLayout
      title="Lists"
      footer={(props) => {
        const [listName, setListName] = createSignal("");
        return (
          <form
            class="flex w-full flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();

              if (listName().length) {
                showToast(
                  save.mutateAsync([
                    {
                      _op: "create",
                      name: listName(),
                      public_id: publicId(),
                      order: lists.data?.length ?? 0,
                    },
                  ]),
                );
                setListName("");

                props.scroll("down");
              }
            }}
          >
            <TextField
              value={listName()}
              onChange={setListName}
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
              disabled={!listName().length}
            >
              <Plus />
            </Button>
          </form>
        );
      }}
    >
      {(props) => (
        <Switch fallback={"Loading..."}>
          <Match when={lists.data}>
            <ReorderList
              list={lists.data!}
              canDelete={(item) => !item.id}
              find={(item, target) => item.public_id === target.public_id}
              delete={async (item) => {
                if (item.id) {
                  return save.mutateAsync([{ _op: "delete", id: item.id }]);
                }
              }}
              update={async (items) => {
                const list = items
                  .filter((item) => item.id)
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
                  if (props.item.name !== text()) {
                    showToast(
                      save.mutateAsync([
                        {
                          _op: "update",
                          id: props.item.id,
                          name: text(),
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
                      href={`/list/${props.item.public_id}`}
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

          <Match when={lists.error}>
            <p class="text-destructive">{lists.error?.message}</p>
          </Match>
        </Switch>
      )}
    </ScrollableCardLayout>
  );
}
