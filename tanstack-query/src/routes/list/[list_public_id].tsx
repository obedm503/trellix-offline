import { RouteSectionProps } from "@solidjs/router";
import Plus from "lucide-solid/icons/plus";
import { publicId } from "shared/nanoid";
import { ReorderList } from "shared/reorder-list";
import { ScrollableCardLayout } from "shared/scrollable-card-layout";
import { Button } from "shared/ui/button";
import { Checkbox } from "shared/ui/checkbox";
import {
  TextField,
  TextFieldErrorMessage,
  TextFieldInput,
} from "shared/ui/text-field";
import { showToast } from "shared/utils";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  onCleanup,
  Switch,
} from "solid-js";
import { getListItems, getLists, mutateListItems } from "../../queries";

export default function ListDetail(props: RouteSectionProps) {
  const list_public_id = () => props.params.list_public_id;

  const lists = getLists();
  const list = createMemo(() =>
    lists.data?.find((item) => item.public_id === list_public_id()),
  );

  createEffect(() => {
    const currentTitle = document.title;

    const name = list()?.name;
    if (name) {
      document.title = name;
    }

    onCleanup(() => {
      document.title = currentTitle;
    });
  });

  const list_items = getListItems(list_public_id);

  const save = mutateListItems(list_public_id, () => list()!.id);

  return (
    <ScrollableCardLayout
      title={
        <Switch fallback={"Loading..."}>
          <Match when={list()}>{list()?.name}</Match>

          <Match when={lists.error}>
            <p class="text-destructive">{lists.error?.message}</p>
          </Match>
        </Switch>
      }
      footer={(props) => {
        const [listItemText, setListItemText] = createSignal("");
        return (
          <form
            class="flex w-full flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();

              if (listItemText().length) {
                showToast(
                  save.mutateAsync([
                    {
                      _op: "create",
                      text: listItemText(),
                      public_id: publicId(),
                      order: list_items.data?.length ?? 0,
                    },
                  ]),
                );
                setListItemText("");

                props.scroll("down");
              }
            }}
          >
            <TextField
              value={listItemText()}
              onChange={setListItemText}
              validationState={save.error ? "invalid" : "valid"}
            >
              <TextFieldInput type="text" maxLength={60} minLength={1} />
              <TextFieldErrorMessage>
                {save.error?.message}
              </TextFieldErrorMessage>
            </TextField>

            <Button
              type="submit"
              size="icon"
              class="w-full"
              disabled={!listItemText().length}
            >
              <Plus />
            </Button>
          </form>
        );
      }}
    >
      {(props) => (
        <Switch fallback={"Loading..."}>
          <Match when={list_items.data}>
            <ReorderList
              list={list_items.data!}
              canDelete={(item) => !!item.id}
              find={(item, target) => item.public_id === target.public_id}
              delete={async (item) => {
                if (!!item.id) {
                  return save.mutateAsync([{ _op: "delete", id: item.id }]);
                }
              }}
              update={async (items) => {
                const list = items
                  .filter((item) => !!item.id)
                  .map((item, i) => ({
                    _op: "update" as const,
                    id: item.id!,
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
                const [text, setText] = createSignal(props.item.text);
                function onFocusOut() {
                  if (props.item.text !== text().trim()) {
                    showToast(
                      save.mutateAsync([
                        {
                          _op: "update",
                          id: props.item.id,
                          text: text().trim(),
                        },
                      ]),
                    );
                  }
                }

                return (
                  <>
                    <Checkbox
                      class="w-10"
                      disabled={!props.item.id}
                      checked={!!props.item.done}
                      onChange={(checked) => {
                        if (!!props.item.id) {
                          showToast(
                            save.mutateAsync([
                              {
                                _op: "update",
                                id: props.item.id!,
                                done: checked,
                              },
                            ]),
                          );
                        }
                      }}
                    />

                    <TextField
                      class="grow data-[disabled]:line-through"
                      disabled={!!props.item.done}
                      value={text()}
                      onChange={setText}
                      onFocusOut={onFocusOut}
                    >
                      <TextFieldInput
                        class="disabled:cursor-default"
                        type="text"
                        maxLength={60}
                        minLength={1}
                      />
                    </TextField>
                  </>
                );
              }}
            </ReorderList>
          </Match>

          <Match when={list_items.error}>
            <p class="text-destructive">{list_items.error?.message}</p>
          </Match>
        </Switch>
      )}
    </ScrollableCardLayout>
  );
}
