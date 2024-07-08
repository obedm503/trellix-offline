import { z } from "zod";
import { PUBLIC_ID_SCHEMA } from "../nanoid";
import { pb } from "./pb";
import { ListItem, User } from "./schema";
import { omit } from "lodash-es";

export async function get(list_public_id: string) {
  return await pb.collection<ListItem>("list_item").getFullList({
    filter: `list.public_id = "${list_public_id}"`,
    sort: "order,created",
  });
}

const schema = z.array(
  z.discriminatedUnion("_op", [
    z.object({
      _op: z.literal("create"),
      public_id: PUBLIC_ID_SCHEMA,
      text: z.string().min(1).max(60),
      order: z.number().min(0).optional(),
      done: z.boolean().optional(),
    }),
    z.object({
      _op: z.literal("update"),
      id: z.string(),
      text: z.string().min(1).max(60).optional(),
      order: z.number().min(0).optional(),
      done: z.boolean().optional(),
    }),
    z.object({
      _op: z.literal("delete"),
      id: z.string(),
    }),
  ]),
);
export type ListItemInputs = z.infer<typeof schema>;
export async function mutate(listId: string, inputs: ListItemInputs) {
  const user = pb.authStore.model as User | null;
  if (!user) {
    throw new Error("Unauthorized");
  }
  const last = await pb.collection<ListItem>("list_item").getList(1, 1, {
    filter: `list = "${listId}"`,
    sort: "-order",
  });
  const greatestOrder = last.items.at(0)?.order ?? 0;
  const items = schema.parse(inputs);
  await Promise.all(
    items
      .filter((item) => item._op === "delete")
      .map((item) =>
        pb.collection("list_item").update(item.id, { deleted: true }),
      ),
  );
  const updated = await Promise.all(
    items
      .filter((item) => item._op === "update")
      .map((item) =>
        pb
          .collection<ListItem>("list_item")
          .update(item.id, omit(item, ["_op", "id"])),
      ),
  );
  const created = await Promise.all(
    items
      .filter((item) => item._op === "create")
      .map((item, i) =>
        pb.collection<ListItem>("list_item").create({
          ...omit(item, "_op"),
          list: listId,
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
