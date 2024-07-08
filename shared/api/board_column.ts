import { z } from "zod";
import { PUBLIC_ID_SCHEMA } from "../nanoid";
import { pb } from "./pb";
import { BoardColumn, User } from "./schema";
import { omit } from "lodash-es";

export async function get(board_public_id: string) {
  return await pb.collection<BoardColumn>("board_column").getFullList({
    filter: `board.public_id = "${board_public_id}"`,
    sort: "order,created",
  });
}

const schema = z.array(
  z.discriminatedUnion("_op", [
    z.object({
      _op: z.literal("create"),
      public_id: PUBLIC_ID_SCHEMA,
      name: z.string().min(1).max(50),
      board: z.string(),
    }),
    z.object({
      _op: z.literal("update"),
      id: z.string(),
      board: z.string().optional(),
      name: z.string().min(1).max(50).optional(),
      order: z.number().optional(),
    }),
    z.object({
      _op: z.literal("delete"),
      id: z.string(),
    }),
  ]),
);
export type BoardColumnInputs = z.infer<typeof schema>;
export async function mutate(boardId: string, inputs: BoardColumnInputs) {
  const user = pb.authStore.model as User | null;
  if (!user) {
    throw new Error("Unauthorized");
  }
  const last = await pb.collection<BoardColumn>("board_column").getList(1, 1, {
    filter: `board = "${boardId}"`,
    sort: "-order",
  });
  const greatestOrder = last.items.at(0)?.order ?? 0;
  const items = schema.parse(inputs);
  await Promise.all(
    items
      .filter((item) => item._op === "delete")
      .map((item) =>
        pb.collection("board_column").update(item.id, { deleted: true }),
      ),
  );
  const updated = await Promise.all(
    items
      .filter((item) => item._op === "update")
      .map((item) =>
        pb
          .collection<BoardColumn>("board_column")
          .update(item.id, omit(item, ["_op", "id"])),
      ),
  );
  const created = await Promise.all(
    items
      .filter((item) => item._op === "create")
      .map((item, i) =>
        pb.collection<BoardColumn>("board_column").create({
          ...omit(item, "_op"),
          created_by: user.id,
          order: greatestOrder + i,
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
