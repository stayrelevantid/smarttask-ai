import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/lib/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface DeletedTask {
  task: Task;
  index: number;
}

interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  createTask: (goalId: string, title: string, options?: { est_min?: number; depends_on?: string }) => 
    Promise<{ data: Task | null; error: Error | null }>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, "id" | "user_id" | "created_at" | "updated_at">>) => 
    Promise<{ error: Error | null }>;
  deleteTask: (taskId: string) => Promise<{ error: Error | null; deletedTask?: DeletedTask }>;
  restoreTask: (deletedTask: DeletedTask) => Promise<{ error: Error | null }>;
  toggleTaskComplete: (taskId: string, isCompleted: boolean) => Promise<{ error: Error | null }>;
  reorderTasks: (activeId: string, overId: string) => Promise<{ error: Error | null }>;
  refreshTasks: () => Promise<void>;
  isTaskLocked: (taskId: string) => boolean;
  canCompleteTask: (taskId: string) => boolean;
  getPreviousTask: (taskId: string) => Task | null;
  getTaskDependencies: (taskId: string) => Task[];
  getDependentTasks: (taskId: string) => Task[];
}

export function useTasks(goalId?: string): UseTasksReturn {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const deletedTaskRef = useRef<DeletedTask | null>(null);

  // Sort tasks by position
  const sortedTasks = tasks.sort((a, b) => (a.position || 0) - (b.position || 0));

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id);

      if (goalId) {
        query = query.eq("goal_id", goalId);
      }

      const { data, error: supabaseError } = await query.order("position", { ascending: true });

      if (supabaseError) {
        console.error("Fetch tasks error:", supabaseError);
        throw supabaseError;
      }
      
      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch tasks"));
    } finally {
      setIsLoading(false);
    }
  }, [user, goalId]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel("tasks_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          const task = payload.new as Task || payload.old as Task;
          
          if (task.user_id !== user.id) return;
          if (goalId && task.goal_id !== goalId) return;

          if (payload.eventType === "INSERT") {
            setTasks((prev) => {
              if (prev.find(t => t.id === task.id)) return prev;
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
  }, [user, goalId]);

  const createTask = async (
    goalId: string,
    title: string,
    options?: { est_min?: number; depends_on?: string }
  ) => {
    if (!user) {
      return { data: null, error: new Error("Not authenticated") };
    }

    try {
      // Get next position
      const maxPosition = tasks.length > 0 
        ? Math.max(...tasks.map(t => t.position || 0))
        : -1;

      const { data, error: supabaseError } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          goal_id: goalId,
          title,
          is_completed: false,
          est_min: options?.est_min || 15,
          depends_on: options?.depends_on || null,
          position: maxPosition + 1,
        } as any)
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      setTasks((prev) => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create task");
      return { data: null, error };
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Omit<Task, "id" | "user_id" | "created_at" | "updated_at">>) => {
    try {
      const { error: supabaseError } = await supabase
        .from("tasks")
        // @ts-expect-error - Supabase typing issue
        .update(updates)
        .eq("id", taskId);

      if (supabaseError) throw supabaseError;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
      
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to update task") };
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) return { error: new Error("Task not found") };

      const index = tasks.findIndex(t => t.id === taskId);
      deletedTaskRef.current = { task: taskToDelete, index };

      const { error: supabaseError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (supabaseError) throw supabaseError;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      
      return { error: null, deletedTask: deletedTaskRef.current };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to delete task") };
    }
  };

  const restoreTask = async (deletedTask: DeletedTask) => {
    try {
      const { task } = deletedTask;
      
      const { data, error: supabaseError } = await supabase
        .from("tasks")
        .insert({
          user_id: task.user_id,
          goal_id: task.goal_id,
          title: task.title,
          is_completed: task.is_completed,
          est_min: task.est_min,
          depends_on: task.depends_on,
          position: task.position,
        } as any)
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      // Restore to correct position
      setTasks((prev) => {
        const newTasks = [...prev];
        newTasks.splice(deletedTask.index, 0, data);
        return newTasks;
      });

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to restore task") };
    }
  };

  const reorderTasks = async (activeId: string, overId: string) => {
    try {
      const oldIndex = tasks.findIndex(t => t.id === activeId);
      const newIndex = tasks.findIndex(t => t.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return { error: null };

      // Reorder array
      const newTasks = [...tasks];
      const [movedTask] = newTasks.splice(oldIndex, 1);
      newTasks.splice(newIndex, 0, movedTask);

      // Update positions
      const updates = newTasks.map((task, index) => ({
        ...task,
        position: index,
      }));

      // Update in database
      for (const task of updates) {
        await supabase
          .from("tasks")
          // @ts-expect-error - Supabase typing issue
          .update({ position: task.position })
          .eq("id", task.id);
      }

      setTasks(updates);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Failed to reorder tasks") };
    }
  };

  const toggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    // Check if can complete (sequential dependency)
    if (isCompleted && !canCompleteTask(taskId)) {
      return { error: new Error("Complete previous tasks first") };
    }

    return updateTask(taskId, { is_completed: isCompleted });
  };

  // Check if task is locked due to dependency
  const isTaskLocked = useCallback((taskId: string): boolean => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return true;
    if (!task.depends_on) return false;

    const dependency = tasks.find((t) => t.id === task.depends_on);
    if (!dependency) return false;

    return !dependency.is_completed;
  }, [tasks]);

  // Check if task can be completed (sequential order)
  const canCompleteTask = useCallback((taskId: string): boolean => {
    const taskIndex = sortedTasks.findIndex(t => t.id === taskId);
    if (taskIndex <= 0) return true; // First task or not found

    // Check all previous tasks
    for (let i = 0; i < taskIndex; i++) {
      if (!sortedTasks[i].is_completed) {
        return false;
      }
    }
    return true;
  }, [sortedTasks]);

  // Get previous task in order
  const getPreviousTask = useCallback((taskId: string): Task | null => {
    const taskIndex = sortedTasks.findIndex(t => t.id === taskId);
    if (taskIndex <= 0) return null;
    return sortedTasks[taskIndex - 1];
  }, [sortedTasks]);

  const getTaskDependencies = useCallback((taskId: string): Task[] => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.depends_on) return [];

    const dependency = tasks.find((t) => t.id === task.depends_on);
    return dependency ? [dependency] : [];
  }, [tasks]);

  const getDependentTasks = useCallback((taskId: string): Task[] => {
    return tasks.filter((t) => t.depends_on === taskId);
  }, [tasks]);

  return {
    tasks: sortedTasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    restoreTask,
    toggleTaskComplete,
    reorderTasks,
    refreshTasks: fetchTasks,
    isTaskLocked,
    canCompleteTask,
    getPreviousTask,
    getTaskDependencies,
    getDependentTasks,
  };
}
