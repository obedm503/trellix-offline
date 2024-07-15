import { createQuery } from "@tanstack/solid-query";
import {
  api,
  BoardColumnInputs,
  BoardInputs,
  BoardItemInputs,
  ListInputs,
  ListItemInputs,
} from "shared/api";
import { pb } from "shared/api/pb";
import { sortBy } from "shared/utils";
import { createOptimisticMutation } from "./create-optimistic-mutation";

export function getBoards() {
  return createQuery(() => ({
    queryKey: ["boards"],
    queryFn: () => api.board.get(pb),
    select: (data) => sortBy(data, ["order", "created"]),
  }));
}
export function mutateBoards() {
  return createOptimisticMutation(() => ({
    queryKey: ["boards"],
    mutationFn: (inputs: BoardInputs) => api.board.mutate(pb, inputs),
    idKey: "id",
    publicIdKey: "public_id",
  }));
}

export function getBoardColumns(boardPublicId: () => string) {
  return createQuery(() => ({
    queryKey: ["board_columns", boardPublicId()],
    queryFn: () => api.board_column.get(pb, boardPublicId()),
    select: (data) => sortBy(data, ["order", "created"]),
  }));
}
export function mutateBoardColumns(boardPublicId: () => string) {
  return createOptimisticMutation(() => ({
    queryKey: ["board_columns", boardPublicId()],
    mutationFn: (inputs: BoardColumnInputs) =>
      api.board_column.mutate(pb, inputs),
    idKey: "id",
    publicIdKey: "public_id",
  }));
}

export function getBoardItems(boardPublicId: () => string) {
  return createQuery(() => ({
    queryKey: ["board_items", boardPublicId()],
    queryFn: () => api.board_item.get(pb, boardPublicId()),
    select: (data) => sortBy(data, ["order", "created"]),
  }));
}
export function mutateBoardItems(boardPublicId: () => string) {
  return createOptimisticMutation(() => ({
    queryKey: ["board_items", boardPublicId()],
    mutationFn: (inputs: BoardItemInputs) => api.board_item.mutate(pb, inputs),
    idKey: "id",
    publicIdKey: "public_id",
  }));
}

export function getLists() {
  return createQuery(() => ({
    queryKey: ["lists"],
    queryFn: () => api.list.get(pb),
    select: (data) => sortBy(data, ["order", "created"]),
  }));
}
export function mutateLists() {
  return createOptimisticMutation(() => ({
    queryKey: ["lists"],
    mutationFn: (inputs: ListInputs) => api.list.mutate(pb, inputs),
    idKey: "id",
    publicIdKey: "public_id",
  }));
}

export function getListItems(listPublicId: () => string) {
  return createQuery(() => ({
    queryKey: ["list_items", listPublicId()],
    queryFn: () => api.list_item.get(pb, listPublicId()),
    select: (data) => sortBy(data, ["order", "created"]),
  }));
}
export function mutateListItems(listPublicId: () => string) {
  return createOptimisticMutation(() => ({
    queryKey: ["list_items", listPublicId()],
    mutationFn: (inputs: ListItemInputs) => api.list_item.mutate(pb, inputs),
    idKey: "id",
    publicIdKey: "public_id",
  }));
}
