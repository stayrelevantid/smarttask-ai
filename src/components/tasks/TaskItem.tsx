import { useOptimistic } from "react";
import { Lock, Clock, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditTaskDialog } from "./EditTaskDialog";
import type { Database } from "@/lib/database.types";
import { formatDuration } from "@/lib/utils";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface TaskItemProps {
  task: Task;
  onToggle: (completed: boolean) => Promise<void>;
  onEdit?: (updates: { title: string; est_min: number }) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLocked?: boolean;
  dependentTasks?: Task[];
}

export function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  isLocked = false,
  dependentTasks = [],
}: TaskItemProps) {
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(
    task.is_completed,
    (_state, newValue: boolean) => newValue
  );

  const handleToggle = async () => {
    if (isLocked && !task.is_completed) return;

    const newValue = !task.is_completed;
    setOptimisticCompleted(newValue);

    try {
      await onToggle(newValue);
    } catch (error) {
      // Revert on error
      setOptimisticCompleted(task.is_completed);
    }
  };

  return (
    <Card
      className={`${isLocked ? "opacity-60" : ""} transition-opacity`}
    >
      <CardContent className="flex items-center gap-4 py-4">
        <Checkbox
          checked={optimisticCompleted}
          onCheckedChange={handleToggle}
          disabled={isLocked}
          className="h-5 w-5"
        />

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              task.is_completed
                ? "line-through text-muted-foreground"
                : ""
            }`}
          >
            {task.title}
          </p>

          {dependentTasks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Blocks: {dependentTasks.map((d) => d.title).join(", ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(task.est_min)}
          </Badge>

          {isLocked && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          )}

          {onEdit && (
            <EditTaskDialog
              task={task}
              onSave={onEdit}
            />
          )}

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
