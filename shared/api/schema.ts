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
  updated: string;
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
  updated: string;
};

export type schema = {
  user: User;
  board: Board;
  board_column: BoardColumn;
  board_item: BoardItem;
  list: List;
  list_item: ListItem;
};

export type ReplicacheClientGroup = {
  id: string;
  created: string;
  updated: string;
  cvr_version: number;
  created_by: string;
  replicache_id: string;
};
export type ReplicacheClientGroupInput = {
  cvr_version: number;
  created_by: string;
  replicache_id: string;
};

export type ReplicacheClient = {
  id: string;
  created: string;
  updated: string;
  replicache_id: string;
  last_mutation_id: number;
  client_group_replicache_id: string;
  created_by: string;
};
export type ReplicacheClientInput = {
  replicache_id: string;
  last_mutation_id: number;
  client_group_replicache_id: string;
  created_by: string;
};
