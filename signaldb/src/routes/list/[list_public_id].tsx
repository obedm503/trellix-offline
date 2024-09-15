import { RouteSectionProps } from "@solidjs/router";
import { pocketbaseId, publicId } from "shared/nanoid";
import { ReorderList } from "shared/reorder-list";
import { ScrollableCardLayout } from "shared/scrollable-card-layout";
import { Checkbox } from "shared/ui/checkbox";
import { TextField, TextFieldInput } from "shared/ui/text-field";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { useCollections } from "../../collections";

export default function ListDetail(props: RouteSectionProps) {
  const list_public_id = () => props.params.list_public_id;

  const { list, list_item } = useCollections();
  const currentList = createMemo(() =>
    list.findOne({ public_id: list_public_id() }),
  );

  createEffect(() => {
    const currentTitle = document.title;

    const name = currentList()?.name;
    if (name) {
      document.title = name;
    }

    onCleanup(() => {
      document.title = currentTitle;
    });
  });

  const list_items = createMemo(() =>
    list_item
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
      title={currentList()?.name}
      onAddItem={(text) => {
        list_item.insert({
          id: pocketbaseId(),
          list: currentList()!.id,
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
          canDelete={(item) => !!item.created}
          find={(item, target) => item.public_id === target.public_id}
          delete={async (item) => {
            if (!!item.id) {
              list_item.updateOne({ id: item.id }, { $set: { deleted: true } });
            }
          }}
          update={async (items) => {
            const list = items.filter((item) => !!item.id);
            for (let i = 0; i < list.length; i++) {
              const item = list[i];
              list_item.updateOne({ id: item.id }, { $set: { order: i } });
            }
          }}
          itemId={(item) => item.public_id}
          scroll={props.scroll}
        >
          {(props) => {
            const [text, setText] = createSignal(props.item.text);
            function onFocusOut() {
              if (props.item.text !== text().trim()) {
                list_item.updateOne(
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
                      list_item.updateOne(
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
