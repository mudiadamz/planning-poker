export type Room = {
  id: string;
  name: string | null;
  deck: string[];
  revealed: boolean;
  /** Optional explicit owner override. Falls back to oldest joined player. */
  owner_id: string | null;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  vote: string | null;
  last_seen: string;
  joined_at: string;
};
