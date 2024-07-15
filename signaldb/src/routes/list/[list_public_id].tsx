import { RouteSectionProps } from "@solidjs/router";
import { pocketbaseId, publicId } from "shared/nanoid";
import { ReorderList } from "shared/reorder-list";
import { ScrollableCardLayout } from "shared/scrollable-card-layout";
import { Checkbox } from "shared/ui/checkbox";
import { TextField, TextFieldInput } from "shared/ui/text-field";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { collections } from "../../collections";

export default function ListDetail(props: RouteSectionProps) {
  const list_public_id = () => props.params.list_public_id;

  const list = createMemo(() =>
    collections.list.findOne({ public_id: list_public_id() }),
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

  const list_items = createMemo(() =>
    collections.list_item
      .find(
        {
          "expand.list.public_id": list_public_id(),
          deleted: { $ne: true },
        },
        { sort: { order: 1 } },
      )
      .fetch(),
  );

  return (
    <ScrollableCardLayout
      title={list()?.name}
      onAddItem={(text) => {
        collections.list_item.insert({
          id: pocketbaseId(),
          list: list()!.id,
          text,
          public_id: publicId(),
          expand: { list: { public_id: list_public_id() } },
          order: list_items().length,
        } as any);
      }}
    >
      {(props) => (
        <ReorderList
          list={list_items()}
          canDelete={(item) => !!item.id}
          find={(item, target) => item.public_id === target.public_id}
          delete={async (item) => {
            if (!!item.id) {
              collections.list_item.updateOne(
                { id: item.id },
                { $set: { deleted: true } },
              );
            }
          }}
          update={async (items) => {
            const list = items.filter((item) => !!item.id);
            for (let i = 0; i < list.length; i++) {
              const item = list[i];
              collections.list_item.updateOne(
                { id: item.id },
                { $set: { order: i } },
              );
            }
          }}
          itemId={(item) => item.public_id}
          scroll={props.scroll}
        >
          {(props) => {
            const [text, setText] = createSignal(props.item.text);
            function onFocusOut() {
              if (props.item.text !== text().trim()) {
                collections.list_item.updateOne(
                  { id: props.item.id },
                  { $set: { text: text().trim() } },
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
                      collections.list_item.updateOne(
                        { public_id: props.item.public_id },
                        { $set: { done: checked } },
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
      )}
    </ScrollableCardLayout>
  );
}
