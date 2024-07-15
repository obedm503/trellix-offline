import Link from "lucide-solid/icons/link";
import { getUser } from "shared/api/auth";
import { pocketbaseId, publicId } from "shared/nanoid";
import { ReorderList } from "shared/reorder-list";
import { ScrollableCardLayout } from "shared/scrollable-card-layout";
import { Button } from "shared/ui/button";
import { TextField, TextFieldInput } from "shared/ui/text-field";
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
      addItemError={save.error?.message}
      onAddItem={(name) => {
        showToast(
          save.mutateAsync([
            {
              _op: "create",
              id: pocketbaseId(),
              public_id: publicId(),
              name,
              order: boards.data?.length ?? 0,
              created_by: user()!.id,
            },
          ]),
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
                        maxLength={60}
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
