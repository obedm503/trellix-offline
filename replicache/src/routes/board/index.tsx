import Link from "lucide-solid/icons/link";
import { getUser } from "shared/api/auth";
import { Board } from "shared/api/schema";
import { pocketbaseId, publicId } from "shared/nanoid";
import { ReorderList } from "shared/reorder-list";
import { ScrollableCardLayout } from "shared/scrollable-card-layout";
import { Button } from "shared/ui/button";
import { TextField, TextFieldInput } from "shared/ui/text-field";
import { sortBy } from "shared/utils";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { createSubscribe, useReplicache } from "../../replicache";

export default function Boards() {
  createEffect(() => {
    const currentTitle = document.title;
    document.title = "Boards";
    onCleanup(() => {
      document.title = currentTitle;
    });
  });

  const rep = useReplicache();
  const user = getUser();

  const boards = createSubscribe(
    async (tx) => {
      const items = await tx
        .scan<Board>({ prefix: "board/" })
        .values()
        .toArray();
      return sortBy(
        items.filter((item) => item.deleted !== true),
        ["order", "created"],
      );
    },
    { initial: [] },
  );

  return (
    <ScrollableCardLayout
      title="Boards"
      onAddItem={async (name) => {
        await rep().mutate.board([
          {
            _op: "create",
            id: pocketbaseId(),
            public_id: publicId(),
            name,
            order: boards().length,
            created_by: user()!.id,
          },
        ]);
      }}
    >
      {(props) => (
        <ReorderList
          list={boards()}
          canDelete={(item) => !!item.created}
          find={(item, target) => item.public_id === target.public_id}
          delete={async (item) => {
            if (item.id) {
              await rep().mutate.board([{ _op: "delete", id: item.id }]);
            }
          }}
          update={async (items) => {
            const list = items.filter((item) => !!item.id);

            await rep().mutate.board(
              list.map((item, i) => ({ _op: "update", id: item.id, order: i })),
            );
          }}
          itemId={(item) => item.public_id}
          scroll={props.scroll}
        >
          {(props) => {
            const [text, setText] = createSignal(props.item.name);
            async function onFocusOut() {
              if (props.item.name !== text().trim()) {
                await rep().mutate.board([
                  { _op: "update", id: props.item.id, name: text().trim() },
                ]);
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
