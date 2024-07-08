export type User = {
  collectionId: string;
  collectionName: string;
  created: string;
  email: string;
  emailVisibility: boolean;
  id: string;
  updated: string;
  username: string;
  verified: boolean;
};

export type Board = {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  public_id: string;
  name: string;
  deleted: boolean;
  order: number;
  created_by: string;
};

export type BoardColumn = {
  board: string;
  collectionId: string;
  collectionName: string;
  created: string;
  created_by: string;
  deleted: boolean;
  id: string;
  name: string;
  order: number;
  public_id: string;
  updated: string;
};

export type BoardItem = {
  collectionId: string;
  collectionName: string;
  column: string;
  created: string;
  created_by: string;
  deleted: boolean;
  id: string;
  order: number;
  public_id: string;
  text: string;
  updated: string;
};

export type List = {
  id: string;
  public_id: string;
  user: string;
  name: string;
  created_by: string;
  deleted: boolean;
  order: number;
  created: string;
};

export type ListItem = {
  id: string;
  public_id: string;
  list: string;
  text: string;
  created_by: string;
  done: boolean;
  deleted: boolean;
  order: number;
  created: string;
};

export type schema = {
  user: User;
  board: Board;
  board_column: BoardColumn;
  board_item: BoardItem;
  list: List;
  list_item: ListItem;
};
