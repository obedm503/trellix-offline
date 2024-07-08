import { z } from "zod";
import { PUBLIC_ID_SCHEMA } from "../nanoid";
import { pb } from "./pb";
import { BoardItem, User } from "./schema";
import { omit } from "lodash-es";

export async function get(board_public_id: string) {
  return await pb.collection<BoardItem>("board_item").getFullList({
    filter: `column.board.public_id = "${board_public_id}"`,
    sort: "order,created",
  });
}

const schema = z.array(
  z.discriminatedUnion("_op", [
    z.object({
      _op: z.literal("create"),
      public_id: PUBLIC_ID_SCHEMA,
      column: z.string(),
      text: z.string().min(1).max(60),
    }),
    z.object({
      _op: z.literal("update"),
      id: z.string(),
      column: z.string().optional(),
      text: z.string().min(1).max(60).optional(),
      order: z.number().optional(),
    }),
    z.object({
      _op: z.literal("delete"),
      id: z.string(),
    }),
  ]),
);
export type BoardItemInputs = z.infer<typeof schema>;
export async function mutate(inputs: BoardItemInputs) {
  const user = pb.authStore.model as User | null;
  if (!user) {
    throw new Error("Unauthorized");
  }

  const items = schema.parse(inputs);

  await Promise.all(
    items
      .filter((item) => item._op === "delete")
      .map((item) =>
        pb.collection("board_item").update(item.id, { deleted: true }),
      ),
  );
  const updated = await Promise.all(
    items
      .filter((item) => item._op === "update")
      .map((item) =>
        pb
          .collection<BoardItem>("board_item")
          .update(item.id, omit(item, ["_op", "id"])),
      ),
  );

  const createItems = items.filter((item) => item._op === "create");
  const createItemsColumns = Array.from(
    new Set(createItems.map((item) => item.column)),
  );
  const greatestInColumn = Object.fromEntries(
    await Promise.all(
      createItemsColumns.map(async (column) => {
        const last = await pb
          .collection<BoardItem>("board_item")
          .getList(1, 1, {
            filter: `column = "${column}"`,
            sort: "-order",
          });
        return [column, last.items.at(0)?.order ?? 0] as const;
      }),
    ),
  );
  const created = await Promise.all(
    createItems.map((item, i) =>
      pb.collection<BoardItem>("board_item").create({
        ...omit(item, "_op"),
        created_by: user.id,
        order: greatestInColumn[item.column] + i,
      }),
    ),
  );

  return [...created, ...updated].sort((a, b) => {
    if (typeof a.order === "number" && typeof b.order === "number") {
      return a.order - b.order;
    }
    return new Date(a.created).getTime() - new Date(b.created).getTime();
  });
}
