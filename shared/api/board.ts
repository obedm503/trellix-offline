import { z } from "zod";
import { PUBLIC_ID_SCHEMA } from "../nanoid";
import { pb } from "./pb";
import { Board, User } from "./schema";
import { omit } from "lodash-es";

export async function get() {
  return await pb.collection<Board>("board").getFullList({
    sort: "order,created",
  });
}

const schema = z.array(
  z.discriminatedUnion("_op", [
    z.object({
      _op: z.literal("create"),
      public_id: PUBLIC_ID_SCHEMA,
      name: z.string().min(1).max(50),
    }),
    z.object({
      _op: z.literal("update"),
      id: z.string(),
      name: z.string().min(1).max(50).optional(),
      order: z.number().optional(),
    }),
    z.object({
      _op: z.literal("delete"),
      id: z.string(),
    }),
  ]),
);
export type BoardInputs = z.infer<typeof schema>;
export async function mutate(inputs: BoardInputs) {
  const user = pb.authStore.model as User | null;
  if (!user) {
    throw new Error("Unauthorized");
  }

  const last = await pb.collection<Board>("board").getList(1, 1, {
    sort: "-order",
  });
  const greatestOrder = last.items.at(0)?.order ?? 0;

  const items = schema.parse(inputs);

  await Promise.all(
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
      .map((item, i) =>
        pb.collection<Board>("board").create({
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
