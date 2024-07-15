import { omit } from "lodash-es";
import type Pocketbase from "pocketbase";
import { z } from "zod";
import {
  POCKETBASE_ID_SCHEMA,
  pocketbaseId,
  PUBLIC_ID_SCHEMA,
} from "../nanoid";
import type { BoardItem } from "./schema";

export async function get(pb: Pocketbase, board_public_id: string) {
  return await pb.collection<BoardItem>("board_item").getFullList({
    filter: `deleted != true && column.board.public_id = "${board_public_id}"`,
    sort: "order,created",
  });
}

export const schema = z.array(
  z.discriminatedUnion("_op", [
    z.object({
      _op: z.literal("create"),
      public_id: PUBLIC_ID_SCHEMA,
      column: POCKETBASE_ID_SCHEMA,
      text: z.string().min(1).max(60),
      order: z.number().min(0),
      created_by: POCKETBASE_ID_SCHEMA,
    }),
    z.object({
      _op: z.literal("update"),
      id: z.string(),
      column: POCKETBASE_ID_SCHEMA.optional(),
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
export async function mutate(pb: Pocketbase, inputs: BoardItemInputs) {
  const items = schema.parse(inputs);

  const deleted = await Promise.all(
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
      .map((item) =>
        pb.collection<BoardItem>("board_item").create({
          ...omit(item, "_op"),
          id: pocketbaseId(),
        }),
      ),
  );

  return [...deleted, ...created, ...updated].sort((a, b) => {
    if (typeof a.order === "number" && typeof b.order === "number") {
      return a.order - b.order;
    }
    return new Date(a.created).getTime() - new Date(b.created).getTime();
  });
}
