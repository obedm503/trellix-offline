import { omit } from "lodash-es";
import { z } from "zod";
import { pocketbaseId, PUBLIC_ID_SCHEMA } from "../nanoid";
import { pb } from "./pb";
import { BoardItem, User } from "./schema";

export async function get(board_public_id: string) {
  return await pb.collection<BoardItem>("board_item").getFullList({
    filter: `deleted != true && column.board.public_id = "${board_public_id}"`,
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
      order: z.number().min(0),
    }),
    z.object({
      _op: z.literal("update"),
      id: z.string(),
      column: z.string().optional(),
      text: z.string().min(1).max(60).optional(),
      order: z.number().min(0).optional(),
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

  const created = await Promise.all(
    items
      .filter((item) => item._op === "create")
      .map((item, i) =>
        pb.collection<BoardItem>("board_item").create({
          ...omit(item, "_op"),
          id: pocketbaseId(),
          created_by: user.id,
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
