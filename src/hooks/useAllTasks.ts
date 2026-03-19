import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/lib/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface UseAllTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  refreshTasks: () => Promise<void>;
  getGoalProgress: (goalId: string) => number;
  getGoalCompletedCount: (goalId: string) => number;
  getGoalTotalCount: (goalId: string) => number;
  isGoalCompleted: (goalId: string) => boolean;
}

export function useAllTasks(): UseAllTasksReturn {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true });

      if (supabaseError) {
        console.error("Fetch all tasks error:", supabaseError);
        throw supabaseError;
      }

      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching all tasks:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch tasks"));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time subscription for all tasks
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel("all_tasks_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          const task = (payload.new as Task) || (payload.old as Task);

          if (task.user_id !== user.id) return;

          if (payload.eventType === "INSERT") {
            setTasks((prev) => {
              if (prev.find((t) => t.id === task.id)) return prev;
              return [...prev, task];
            });
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) => (t.id === task.id ? task : t))
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Helper functions
  const getGoalTasks = useCallback(
    (goalId: string) => {
      return tasks.filter((t) => t.goal_id === goalId);
    },
    [tasks]
  );

  const getGoalProgress = useCallback(
    (goalId: string) => {
      const goalTasks = getGoalTasks(goalId);
      if (goalTasks.length === 0) return 0;
      const completed = goalTasks.filter((t) => t.is_completed).length;
      return Math.round((completed / goalTasks.length) * 100);
    },
    [getGoalTasks]
  );

  const getGoalCompletedCount = useCallback(
    (goalId: string) => {
      const goalTasks = getGoalTasks(goalId);
      return goalTasks.filter((t) => t.is_completed).length;
    },
    [getGoalTasks]
  );

  const getGoalTotalCount = useCallback(
    (goalId: string) => {
      return getGoalTasks(goalId).length;
    },
    [getGoalTasks]
  );

  const isGoalCompleted = useCallback(
    (goalId: string) => {
      const goalTasks = getGoalTasks(goalId);
      if (goalTasks.length === 0) return false;
      return goalTasks.every((t) => t.is_completed);
    },
    [getGoalTasks]
  );

  return {
    tasks,
    isLoading,
    error,
    refreshTasks: fetchTasks,
    getGoalProgress,
    getGoalCompletedCount,
    getGoalTotalCount,
    isGoalCompleted,
  };
}
