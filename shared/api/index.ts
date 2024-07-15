import * as board from "./board";
import * as board_column from "./board_column";
import * as board_item from "./board_item";
import * as list from "./list";
import * as list_item from "./list_item";

export type { BoardInputs } from "./board";
export type { BoardColumnInputs } from "./board_column";
export type { BoardItemInputs } from "./board_item";

export type { ListInputs } from "./list";
export type { ListItemInputs } from "./list_item";

export const api = { list, list_item, board, board_column, board_item };
