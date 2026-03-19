import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/lib/database.types";

type Goal = Database["public"]["Tables"]["goals"]["Row"];

interface UseGoalsReturn {
  goals: Goal[];
  isLoading: boolean;
  error: Error | null;
  createGoal: (title: string) => Promise<{ data: Goal | null; error: Error | null }>;
  deleteGoal: (goalId: string) => Promise<{ error: Error | null }>;
  refreshGoals: () => Promise<void>;
}

export function useGoals(): UseGoalsReturn {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (supabaseError) throw supabaseError;
      
      setGoals(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch goals"));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async (title: string) => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    try {
      const { data, error: supabaseError } = await supabase
        .from("goals")
        .insert({
          user_id: user.id,
          title,
        } as any)
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      setGoals((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error("Failed to create goal") 
      };
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from("goals")
        .delete()
        .eq("id", goalId);

      if (supabaseError) throw supabaseError;

      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      return { error: null };
    } catch (err) {
      return { 
        error: err instanceof Error ? err : new Error("Failed to delete goal") 
      };
    }
  };

  return {
    goals,
    isLoading,
    error,
    createGoal,
    deleteGoal,
    refreshGoals: fetchGoals,
  };
}
