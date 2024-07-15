import { omit } from "lodash-es";
import type { WriteTransaction } from "replicache";
import {
  api,
  BoardColumnInputs,
  BoardInputs,
  BoardItemInputs,
  type ListInputs,
  type ListItemInputs,
} from "shared/api";
import type { BoardItem, List, ListItem } from "shared/api/schema";

export type Mutators = typeof mutators;

export const mutators = {
  async list(tx: WriteTransaction, inputs: ListInputs) {
    const items = api.list.schema.parse(inputs);
    await Promise.all([
      ...items
        .filter((item) => item._op === "delete")
        .map(async (item) => {
          const prev = await tx.get<List>(`list/${item.id}`);
          await tx.set(`list/${item.id}`, { ...prev, deleted: true });
        }),
      ...items
        .filter((item) => item._op === "update")
        .map(async (item) => {
          const prev = await tx.get<List>(`list/${item.id}`);
          await tx.set(`list/${item.id}`, {
            ...prev,
            ...omit(item, ["_op", "id"]),
          });
        }),
      ...items
        .filter((item) => item._op === "create")
        .map(async (item) => {
          await tx.set(`list/${item.id}`, omit(item, "_op"));
        }),
    ]);
  },
  async list_item(tx: WriteTransaction, inputs: ListItemInputs) {
    const items = api.list_item.schema.parse(inputs);
    await Promise.all([
      ...items
        .filter((item) => item._op === "delete")
        .map(async (item) => {
          const prev = await tx.get<ListItem>(`list_item/${item.id}`);
          await tx.set(`list_item/${item.id}`, { ...prev, deleted: true });
        }),
      ...items
        .filter((item) => item._op === "update")
        .map(async (item) => {
          const prev = await tx.get<ListItem>(`list_item/${item.id}`);
          await tx.set(`list_item/${item.id}`, {
            ...prev,
            ...omit(item, ["_op", "id"]),
          });
        }),
      ...items
        .filter((item) => item._op === "create")
        .map(async (item) => {
          await tx.set(`list_item/${item.id}`, omit(item, "_op"));
        }),
    ]);
  },
  async board(tx: WriteTransaction, inputs: BoardInputs) {
    const items = api.board.schema.parse(inputs);
    await Promise.all([
      ...items
        .filter((item) => item._op === "delete")
        .map(async (item) => {
          const prev = await tx.get<BoardItem>(`board/${item.id}`);
          await tx.set(`board/${item.id}`, { ...prev, deleted: true });
        }),
      ...items
        .filter((item) => item._op === "update")
        .map(async (item) => {
          const prev = await tx.get<BoardItem>(`board/${item.id}`);
          await tx.set(`board/${item.id}`, {
            ...prev,
            ...omit(item, ["_op", "id"]),
          });
        }),
      ...items
        .filter((item) => item._op === "create")
        .map(async (item) => {
          await tx.set(`board/${item.id}`, omit(item, "_op"));
        }),
    ]);
  },
  async board_column(tx: WriteTransaction, inputs: BoardColumnInputs) {
    const items = api.board_column.schema.parse(inputs);
    await Promise.all([
      ...items
        .filter((item) => item._op === "delete")
        .map(async (item) => {
          const prev = await tx.get<BoardItem>(`board_column/${item.id}`);
          await tx.set(`board_column/${item.id}`, { ...prev, deleted: true });
        }),
      ...items
        .filter((item) => item._op === "update")
        .map(async (item) => {
          const prev = await tx.get<BoardItem>(`board_column/${item.id}`);
          await tx.set(`board_column/${item.id}`, {
            ...prev,
            ...omit(item, ["_op", "id"]),
          });
        }),
      ...items
        .filter((item) => item._op === "create")
        .map(async (item) => {
          await tx.set(`board_column/${item.id}`, omit(item, "_op"));
        }),
    ]);
  },
  async board_item(tx: WriteTransaction, inputs: BoardItemInputs) {
    const items = api.board_item.schema.parse(inputs);
    await Promise.all([
      ...items
        .filter((item) => item._op === "delete")
        .map(async (item) => {
          const prev = await tx.get<BoardItem>(`board_item/${item.id}`);
          await tx.set(`board_item/${item.id}`, { ...prev, deleted: true });
        }),
      ...items
        .filter((item) => item._op === "update")
        .map(async (item) => {
          const prev = await tx.get<BoardItem>(`board_item/${item.id}`);
          await tx.set(`board_item/${item.id}`, {
            ...prev,
            ...omit(item, ["_op", "id"]),
          });
        }),
      ...items
        .filter((item) => item._op === "create")
        .map(async (item) => {
          await tx.set(`board_item/${item.id}`, omit(item, "_op"));
        }),
    ]);
  },
};
