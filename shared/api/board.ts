import { omit } from "lodash-es";
import type Pocketbase from "pocketbase";
import { z } from "zod";
import {
  POCKETBASE_ID_SCHEMA,
  pocketbaseId,
  PUBLIC_ID_SCHEMA,
} from "../nanoid";
import type { Board } from "./schema";

export async function get(pb: Pocketbase) {
  return await pb.collection<Board>("board").getFullList({
    sort: "order,created",
    filter: "deleted != true",
  });
}

export const schema = z.array(
  z.discriminatedUnion("_op", [
    z.object({
      _op: z.literal("create"),
      public_id: PUBLIC_ID_SCHEMA,
      name: z.string().min(1).max(50),
      order: z.number().min(0),
      created_by: POCKETBASE_ID_SCHEMA,
    }),
    z.object({
      _op: z.literal("update"),
      id: z.string(),
      name: z.string().min(1).max(50).optional(),
      order: z.number().min(0).optional(),
    }),
    z.object({
      _op: z.literal("delete"),
      id: z.string(),
    }),
  ]),
);
export type BoardInputs = z.infer<typeof schema>;
export async function mutate(pb: Pocketbase, inputs: BoardInputs) {
  const items = schema.parse(inputs);

  const deleted = await Promise.all(
    items
      .filter((item) => item._op === "delete")
      .map((item) => pb.collection("board").update(item.id, { deleted: true })),
  );
  const updated = await Promise.all(
    items
      .filter((item) => item._op === "update")
      .map((item) =>
        pb
          .collection<Board>("board")
          .update(item.id, omit(item, ["_op", "id"])),
      ),
  );
  const created = await Promise.all(
    items
      .filter((item) => item._op === "create")
      .map((item) =>
        pb.collection<Board>("board").create({
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
