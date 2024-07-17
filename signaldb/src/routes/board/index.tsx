import Link from "lucide-solid/icons/link";
import { pocketbaseId, publicId } from "shared/nanoid";
import { ReorderList } from "shared/reorder-list";
import { ScrollableCardLayout } from "shared/scrollable-card-layout";
import { Button } from "shared/ui/button";
import { TextField, TextFieldInput } from "shared/ui/text-field";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { collections } from "../../collections";

export default function Boards() {
  createEffect(() => {
    const currentTitle = document.title;
    document.title = "Boards";
    onCleanup(() => {
      document.title = currentTitle;
    });
  });

  const boards = createMemo(() =>
    collections.board
      .find({ deleted: { $ne: true } }, { sort: { order: 1 } })
      .fetch(),
  );

  return (
    <ScrollableCardLayout
      title="Boards"
      onAddItem={(name) => {
        collections.board.insert({
          id: pocketbaseId(),
          name,
          public_id: publicId(),
          order: boards().length,
        } as any);
      }}
    >
      {(props) => (
        <ReorderList
          list={boards()}
          canDelete={(item) => !!item.created}
          find={(item, target) => item.public_id === target.public_id}
          delete={async (item) => {
            if (item.id) {
              collections.board.updateOne(
                { id: item.id },
                { $set: { deleted: true } },
              );
            }
          }}
          update={async (items) => {
            const list = items.filter((item) => !!item.id);
            for (let i = 0; i < list.length; i++) {
              const item = list[i];
              collections.board.updateOne(
                { id: item.id },
                { $set: { order: i } },
              );
            }
          }}
          itemId={(item) => item.public_id}
          scroll={props.scroll}
        >
          {(props) => {
            const [text, setText] = createSignal(props.item.name);
            function onFocusOut() {
              if (props.item.name !== text().trim()) {
                collections.board.updateOne(
                  { id: props.item.id },
                  { $set: { name: text().trim() } },
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
      )}
    </ScrollableCardLayout>
  );
}
