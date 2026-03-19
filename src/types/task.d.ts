export interface Task {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  est_min: number;
  depends_on: string | null;
  created_at: string;
}

export interface CreateTaskInput {
  goal_id: string;
  title: string;
  est_min?: number;
  depends_on?: string | null;
}

export interface AITaskOutput {
  id: string;
  title: string;
  est_min: number;
  dep_id: string | null;
}
