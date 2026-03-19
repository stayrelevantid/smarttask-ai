export interface Goal {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface CreateGoalInput {
  title: string;
}
