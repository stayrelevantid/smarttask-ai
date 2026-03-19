import { useState, useCallback } from "react";
import { generateTasksWithAI, refineTasksWithAI } from "@/lib/ai-service";
import type { Task } from "@/types/task";

interface AIGeneratedTask {
  title: string;
  est_min: number;
  dep_id: string | null;
}

interface UseAIIntegrationReturn {
  isLoading: boolean;
  error: Error | null;
  generateTasks: (goalTitle: string, existingTasks?: Task[], language?: "en" | "id") => Promise<AIGeneratedTask[]>;
  refineTasks: (tasks: Task[], prompt: string, language?: "en" | "id") => Promise<AIGeneratedTask[]>;
}

export function useAIIntegration(): UseAIIntegrationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateTasks = useCallback(
    async (goalTitle: string, existingTasks?: Task[], language?: "en" | "id"): Promise<AIGeneratedTask[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const tasks = await generateTasksWithAI({ 
          goalTitle, 
          existingTasks,
          language 
        });
        return tasks;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to generate tasks");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const refineTasks = useCallback(
    async (tasks: Task[], prompt: string, language?: "en" | "id"): Promise<AIGeneratedTask[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const refinedTasks = await refineTasksWithAI({ tasks, prompt, language });
        return refinedTasks;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to refine tasks");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    error,
    generateTasks,
    refineTasks,
  };
}
