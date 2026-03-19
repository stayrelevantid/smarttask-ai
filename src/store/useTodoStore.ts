import { create } from "zustand";
import type { Task } from "@/types/task";
import type { Goal } from "@/types/goal";

interface TodoState {
  goals: Goal[];
  tasks: Task[];
  currentGoal: Goal | null;
  isLoading: boolean;
  
  // Actions
  setGoals: (goals: Goal[]) => void;
  setTasks: (tasks: Task[]) => void;
  setCurrentGoal: (goal: Goal | null) => void;
  addGoal: (goal: Goal) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  toggleTaskComplete: (taskId: string) => void;
  
  // Computed
  getCompletedTasks: () => Task[];
  getPendingTasks: () => Task[];
  getProgressPercentage: () => number;
  getTasksByGoal: (goalId: string) => Task[];
  isTaskLocked: (taskId: string) => boolean;
  getTaskDependencies: (taskId: string) => Task[];
}

export const useTodoStore = create<TodoState>((set, get) => ({
  goals: [],
  tasks: [],
  currentGoal: null,
  isLoading: false,

  setGoals: (goals) => set({ goals }),
  setTasks: (tasks) => set({ tasks }),
  setCurrentGoal: (goal) => set({ currentGoal: goal }),

  addGoal: (goal) =>
    set((state) => ({ goals: [...state.goals, goal] })),

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    })),

  toggleTaskComplete: (taskId) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Check if task is locked
    if (!task.is_completed && state.isTaskLocked(taskId)) {
      return; // Cannot complete a locked task
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, is_completed: !t.is_completed } : t
      ),
    }));
  },

  getCompletedTasks: () => {
    return get().tasks.filter((task) => task.is_completed);
  },

  getPendingTasks: () => {
    return get().tasks.filter((task) => !task.is_completed);
  },

  getProgressPercentage: () => {
    const state = get();
    if (state.tasks.length === 0) return 0;
    const completed = state.tasks.filter((t) => t.is_completed).length;
    return Math.round((completed / state.tasks.length) * 100);
  },

  getTasksByGoal: (goalId) => {
    return get().tasks.filter((task) => task.goal_id === goalId);
  },

  isTaskLocked: (taskId) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return true;
    if (!task.depends_on) return false;

    const dependency = state.tasks.find((t) => t.id === task.depends_on);
    if (!dependency) return false;
    
    return !dependency.is_completed;
  },

  getTaskDependencies: (taskId) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || !task.depends_on) return [];

    const dependency = state.tasks.find((t) => t.id === task.depends_on);
    return dependency ? [dependency] : [];
  },
}));
