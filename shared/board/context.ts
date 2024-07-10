import { createContext, useContext } from "solid-js";

export type Item = {
  publicId: string;
  text: string;
  order: number;
  columnPublicId: string;
};

export type Column = {
  publicId: string;
  text: string;
  order: number;
};

export type BoardContextValue = {
  getColumns: () => Column[];
  reorderColumn: (args: { startIndex: number; finishIndex: number }) => void;
  reorderCard: (args: {
    columnId: string;
    startIndex: number;
    finishIndex: number;
  }) => void;
  moveCard: (args: {
    startColumnId: string;
    finishColumnId: string;
    itemIndexInStartColumn: number;
    itemIndexInFinishColumn?: number;
  }) => void;
  addCard(item: { id: string; text: string; columnId: string }): void;
  updateCardText(item: Item): void;
  updateColumnText(column: Column): void;
  instanceId: symbol;
};

export const BoardContext = createContext<BoardContextValue>();

export function useBoardContext(): BoardContextValue {
  const value = useContext(BoardContext)!;
  return value;
}

export type ColumnContextProps = {
  getColumnId: () => string;
  getCardIndex: (board_item_public_id: string) => number;
  getNumCards: () => number;
};

export const ColumnContext = createContext<ColumnContextProps>();

export function useColumnContext() {
  const value = useContext(ColumnContext)!;
  return value;
}
