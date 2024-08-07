import { RouteSectionProps } from "@solidjs/router";
import { getUser } from "shared/api/auth";
import type { List, ListItem } from "shared/api/schema";
import { pocketbaseId, publicId } from "shared/nanoid";
import { ReorderList } from "shared/reorder-list";
import { ScrollableCardLayout } from "shared/scrollable-card-layout";
import { Checkbox } from "shared/ui/checkbox";
import { TextField, TextFieldInput } from "shared/ui/text-field";
import { sortBy } from "shared/utils";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { createSubscribe, useReplicache } from "../../replicache";

export default function ListDetail(props: RouteSectionProps) {
  const list_public_id = () => props.params.list_public_id;
  const user = getUser();

  const rep = useReplicache();

  const list = createSubscribe(
    (tx) => tx.scan<List>({ prefix: "list/" }).values().toArray(),
    {
      initial: [],
      select(data) {
        return data.find(
          (item) =>
            item.public_id === list_public_id() && item.deleted !== true,
        );
      },
    },
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

  const list_items = createSubscribe(
    (tx) => tx.scan<ListItem>({ prefix: "list_item/" }).values().toArray(),
    {
      initial: [],
      select(data) {
        return sortBy(
          data.filter(
            (item) => item.list === list()?.id && item.deleted !== true,
          ),
          ["order", "created"],
        );
      },
    },
  );

  return (
    <ScrollableCardLayout
      title={list()?.name}
      onAddItem={async (text) => {
        await rep().mutate.list_item([
          {
            _op: "create",
            id: pocketbaseId(),
            public_id: publicId(),
            list: list()!.id,
            text,
            order: list_items().length,
            created_by: user().id,
          },
        ]);
      }}
    >
      {(props) => (
        <ReorderList
          list={list_items()}
          canDelete={(item) => !!item.created}
          find={(item, target) => item.public_id === target.public_id}
          delete={async (item) => {
            if (!!item.id) {
              await rep().mutate.list_item([{ _op: "delete", id: item.id }]);
            }
          }}
          update={async (items) => {
            const list = items.filter((item) => !!item.id);
            await rep().mutate.list_item(
              list.map((item, i) => ({ _op: "update", id: item.id, order: i })),
            );
          }}
          itemId={(item) => item.public_id}
          scroll={props.scroll}
        >
          {(props) => {
            const [text, setText] = createSignal(props.item.text);
            async function onFocusOut() {
              if (props.item.text !== text().trim()) {
                await rep().mutate.list_item([
                  { _op: "update", id: props.item.id, text: text().trim() },
                ]);
              }
            }

            return (
              <>
                <Checkbox
                  class="w-10"
                  disabled={!props.item.id}
                  checked={!!props.item.done}
                  onChange={async (checked) => {
                    if (!!props.item.id) {
                      await rep().mutate.list_item([
                        { _op: "update", id: props.item.id, done: checked },
                      ]);
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
                    minLength={1}
                    maxLength={60}
                  />
                </TextField>
              </>
            );
          }}
        </ReorderList>
      )}
    </ScrollableCardLayout>
  );
}
