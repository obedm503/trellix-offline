import { z } from "zod";
import { pocketbaseId, PUBLIC_ID_SCHEMA } from "../nanoid";
import { pb } from "./pb";
import { List, User } from "./schema";
import { omit } from "lodash-es";

export async function get() {
  return await pb.collection<List>("list").getFullList({
    sort: "order,created",
    filter: "deleted != true",
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
export type ListInputs = z.infer<typeof schema>;
export async function mutate(inputs: ListInputs) {
  const user = pb.authStore.model as User | null;
  if (!user) {
    throw new Error("Unauthorized");
  }

  const last = await pb.collection<List>("list").getList(1, 1, {
    sort: "-order",
  });
  const greatestOrder = last.items.at(0)?.order ?? 0;

  const items = schema.parse(inputs);

  await Promise.all(
    items
      .filter((item) => item._op === "delete")
      .map((item) => pb.collection("list").update(item.id, { deleted: true })),
  );
  const updated = await Promise.all(
    items
      .filter((item) => item._op === "update")
      .map((item) =>
        pb.collection<List>("list").update(item.id, omit(item, ["_op", "id"])),
      ),
  );
  const created = await Promise.all(
    items
      .filter((item) => item._op === "create")
      .map((item, i) =>
        pb.collection<List>("list").create({
          ...omit(item, "_op"),
          id: pocketbaseId(),
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
