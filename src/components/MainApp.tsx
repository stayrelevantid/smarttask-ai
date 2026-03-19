import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useGoals } from "@/hooks/useGoals";
import { useTasks } from "@/hooks/useTasks";
import { useAllTasks } from "@/hooks/useAllTasks";
import { useAIIntegration } from "@/hooks/useAIIntegration";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useUndoToast } from "@/components/ui/undo-toast";
import { SortableTaskItem } from "@/components/tasks/SortableTaskItem";
import { TaskInput } from "@/components/tasks/TaskInput";
import { AIRefiner } from "@/components/tasks/AIRefiner";
import { DeleteGoalDialog } from "@/components/goals/DeleteGoalDialog";
import { CompletionCelebration } from "@/components/CompletionCelebration";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AnimatedProgressBar } from "@/components/ui/animated-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, LogOut, Sparkles, Loader2, AlertCircle, GripVertical, CheckCircle2, Award } from "lucide-react";

export function MainApp() {
  const { user, logout } = useAuth();
  const { goals, createGoal, deleteGoal, isLoading: goalsLoading } = useGoals();
  const { language, t } = useLanguage();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  
  // Hook for selected goal's tasks (task list)
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    restoreTask,
    toggleTaskComplete,
    reorderTasks,
    isLoading: tasksLoading,
    isTaskLocked,
    canCompleteTask,
    getPreviousTask,
  } = useTasks(selectedGoalId || undefined);
  
  // Hook for all tasks (sidebar progress)
  const {
    getGoalProgress,
    isGoalCompleted: checkGoalCompleted,
  } = useAllTasks();
  
  const { generateTasks, refineTasks, isLoading: aiLoading } = useAIIntegration();
  const { showUndo, UndoToastComponent } = useUndoToast();
  
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [generatingGoalId, setGeneratingGoalId] = useState<string | null>(null);
  const [refiningGoalId, setRefiningGoalId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Find the selected goal
  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  // Helper function aliases for sidebar (using useAllTasks)
  const isGoalCompleted = checkGoalCompleted;

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const { data } = await createGoal(newGoalTitle);
    if (data) {
      setSelectedGoalId(data.id);
      setNewGoalTitle("");
      setShowGoalInput(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const { error } = await deleteGoal(goalId);
    if (!error && selectedGoalId === goalId) {
      setSelectedGoalId(null);
    }
  };

  const handleAddTask = async (title: string) => {
    if (!selectedGoalId) {
      setTaskError("Please select a goal first");
      return;
    }
    
    if (!title.trim()) return;
    
    setTaskError(null);
    
    try {
      const { error } = await createTask(selectedGoalId, title.trim());
      if (error) {
        setTaskError(`Failed to add task: ${error.message}`);
      }
    } catch (err) {
      setTaskError("An unexpected error occurred");
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: { title: string; est_min: number }
  ) => {
    setTaskError(null);
    const { error } = await updateTask(taskId, updates);
    if (error) {
      setTaskError(`Failed to update task: ${error.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string, index: number) => {
    setTaskError(null);
    
    const taskToDelete = tasks[index];
    if (!taskToDelete) return;

    const { error, deletedTask } = await deleteTask(taskId);
    
    if (error) {
      setTaskError(`Failed to delete task: ${error.message}`);
    } else if (deletedTask) {
      // Show undo toast
      showUndo(
        `Task "${taskToDelete.title}" deleted`,
        async () => {
          const { error: restoreError } = await restoreTask(deletedTask);
          if (restoreError) {
            setTaskError(`Failed to restore task: ${restoreError.message}`);
          }
        }
      );
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    setTaskError(null);
    
    // Get current task count before update
    const goalTasks = tasks.filter(t => t.goal_id === selectedGoalId);
    const completedCount = goalTasks.filter(t => t.is_completed).length;
    const totalCount = goalTasks.length;
    
    const { error } = await toggleTaskComplete(taskId, completed);
    
    if (error) {
      setTaskError(error.message);
    } else if (completed) {
      // Check if this was the last task to complete the goal
      // Show celebration only when completing the final task
      const wasLastTask = completedCount === totalCount - 1;
      if (wasLastTask && totalCount > 0) {
        setShowCelebration(true);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const { error } = await reorderTasks(active.id as string, over.id as string);
      if (error) {
        setTaskError(`Failed to reorder: ${error.message}`);
      }
    }
  };

  const handleGenerateTasks = async () => {
    if (!selectedGoal || !selectedGoalId) return;

    setGeneratingGoalId(selectedGoalId);
    setError(null);
    try {
      // Pass existing tasks and language to avoid duplicates and ensure language consistency
      const generatedTasks = await generateTasks(selectedGoal.title, tasks, language);

      for (const task of generatedTasks) {
        await createTask(selectedGoalId, task.title, {
          est_min: task.est_min,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate tasks";
      setError(errorMessage);
    } finally {
      setGeneratingGoalId(null);
    }
  };

  const handleRefine = async (prompt: string) => {
    if (!selectedGoalId || tasks.length === 0) return;

    setRefiningGoalId(selectedGoalId);
    try {
      // Pass language to ensure refined tasks stay in the same language
      const refinedTasks = await refineTasks(tasks, prompt, language);

      for (const task of tasks) {
        await deleteTask(task.id);
      }

      for (const task of refinedTasks) {
        await createTask(selectedGoalId, task.title, {
          est_min: task.est_min,
        });
      }
    } catch (error) {
      console.error("Failed to refine tasks:", error);
    } finally {
      setRefiningGoalId(null);
    }
  };

  const completedTasks = tasks.filter((t) => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Undo Toast */}
      {UndoToastComponent}

      {/* Completion Celebration */}
      <CompletionCelebration 
        isCompleted={showCelebration} 
        onClose={() => setShowCelebration(false)} 
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">SmartTask AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <span className="text-sm text-muted-foreground hidden sm:inline mx-2">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Goals Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("goals")}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoalInput(true)}
              disabled={showGoalInput}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("newGoal")}
            </Button>
          </div>

          {showGoalInput && (
            <form onSubmit={handleCreateGoal} className="space-y-2">
              <Input
                placeholder={language === "id" ? "Masukkan judul tujuan..." : "Enter goal title..."}
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  size="sm" 
                  className="flex-1"
                  disabled={!newGoalTitle.trim() || goalsLoading}
                >
                  {goalsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("create")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowGoalInput(false);
                    setNewGoalTitle("");
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {goalsLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noGoals")}</p>
            ) : (
              goals.map((goal) => {
                const isCompleted = isGoalCompleted(goal.id);
                const progress = getGoalProgress(goal.id);
                
                return (
                  <div
                    key={goal.id}
                    className={`group flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      selectedGoalId === goal.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    } ${isCompleted ? "border-green-500 bg-green-50" : ""}`}
                  >
                    <button
                      onClick={() => setSelectedGoalId(goal.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{goal.title}</p>
                        {isCompleted && (
                          <Award className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(goal.created_at).toLocaleDateString()}
                        </p>
                        {progress > 0 && !isCompleted && (
                          <span className="text-xs text-primary">{progress}%</span>
                        )}
                        {isCompleted && (
                          <span className="text-xs text-green-600 font-medium">{t("completedExcl")}</span>
                        )}
                      </div>
                      {/* Progress bar */}
                      {progress > 0 && (
                        <AnimatedProgressBar 
                          progress={progress} 
                          height="h-1.5"
                          className="mt-2"
                        />
                      )}
                    </button>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteGoalDialog
                        goalTitle={goal.title}
                        onDelete={() => handleDeleteGoal(goal.id)}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Tasks Area */}
        <div className="md:col-span-2 space-y-4">
          {selectedGoal ? (
            <>
              {/* Progress Header */}
              <Card className={progress === 100 && tasks.length > 0 ? "border-green-500" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">
                        {selectedGoal.title}
                      </h2>
                      {progress === 100 && tasks.length > 0 && (
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-300">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-bold">{t("completed").toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={progress === 100 && tasks.length > 0 ? "default" : "secondary"} className={progress === 100 && tasks.length > 0 ? "bg-green-600" : ""}>
                        {completedTasks} {language === "id" ? "dari" : "of"} {tasks.length} {t("completed").toLowerCase()}
                      </Badge>
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-medium ${progress === 100 && tasks.length > 0 ? "text-green-600" : ""}`}>
                          {progress}%
                        </span>
                        {tasks.length > 0 && (
                          <span className={`text-xs ${
                            progress === 0 ? "text-gray-500" :
                            progress <= 25 ? "text-red-600" :
                            progress <= 50 ? "text-orange-600" :
                            progress <= 75 ? "text-yellow-600" :
                            progress < 100 ? "text-blue-600" :
                            "text-green-600"
                          }`}>
                            {progress === 0 ? t("notStarted") :
                             progress <= 25 ? t("gettingStarted") :
                             progress <= 50 ? t("inProgress") :
                             progress <= 75 ? t("almostThere") :
                             progress < 100 ? t("finalStretch") :
                             t("completedExcl")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <AnimatedProgressBar 
                    progress={progress} 
                    height="h-2.5"
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              {/* AI Generate Button */}
              <Card>
                <CardContent className="py-4 space-y-3">
                  <Button
                    onClick={handleGenerateTasks}
                    disabled={aiLoading || generatingGoalId === selectedGoalId}
                    className="w-full"
                    variant="outline"
                  >
                    {generatingGoalId === selectedGoalId ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("generating")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t("generateAI")}
                      </>
                    )}
                  </Button>
                  
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive">
                        <strong>Error:</strong> {error}
                      </p>
                      <button 
                        onClick={() => setError(null)}
                        className="text-xs text-destructive/80 hover:text-destructive mt-1 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Task Error Message */}
              {taskError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-destructive">{taskError}</p>
                    <button 
                      onClick={() => setTaskError(null)}
                      className="text-xs text-destructive/80 hover:text-destructive mt-1 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Reorder Toggle */}
              {tasks.length > 1 && (
                <div className="flex justify-end">
                  <Button
                    variant={isReordering ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsReordering(!isReordering)}
                  >
                    <GripVertical className="h-4 w-4 mr-2" />
                    {isReordering ? t("doneReordering") : t("reorder")}
                  </Button>
                </div>
              )}

              {/* AI Refiner */}
              <AIRefiner
                onRefine={handleRefine}
                isLoading={refiningGoalId === selectedGoalId}
              />

              {/* Add Task */}
              <TaskInput onAddTask={handleAddTask} isLoading={tasksLoading} placeholder={t("addTask")} />

              {/* Tasks List with Drag & Drop */}
              {tasksLoading ? (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              ) : tasks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {t("noTasks")}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {tasks.map((task, index) => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          onToggle={(completed) => handleToggleComplete(task.id, completed)}
                          onEdit={isReordering ? undefined : (updates) => handleUpdateTask(task.id, updates)}
                          onDelete={isReordering ? undefined : () => handleDeleteTask(task.id, index)}
                          isLocked={isTaskLocked(task.id)}
                          isReordering={isReordering}
                          previousTask={getPreviousTask(task.id)}
                          canComplete={canCompleteTask(task.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t("selectGoal")}</h3>
                <p className="text-muted-foreground">
                  {language === "id" ? "Pilih tujuan dari sidebar atau buat yang baru untuk memulai." : "Choose a goal from the sidebar or create a new one to get started."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
