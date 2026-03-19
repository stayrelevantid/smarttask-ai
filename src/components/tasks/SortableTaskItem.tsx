import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lock, Clock, Trash2, GripVertical, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditTaskDialog } from "./EditTaskDialog";
import type { Database } from "@/lib/database.types";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface SortableTaskItemProps {
  task: Task;
  onToggle: (completed: boolean) => Promise<void>;
  onEdit?: (updates: { title: string; est_min: number }) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLocked?: boolean;
  isReordering?: boolean;
  previousTask?: Task | null;
  canComplete?: boolean;
}

export function SortableTaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  isLocked = false,
  isReordering = false,
  previousTask,
  canComplete = true,
}: SortableTaskItemProps) {
  const [isCompleted, setIsCompleted] = useState(task.is_completed);
  const [showPreviousWarning, setShowPreviousWarning] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isReordering });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const handleToggle = async () => {
    if (!canComplete && !task.is_completed) {
      setShowPreviousWarning(true);
      setTimeout(() => setShowPreviousWarning(false), 3000);
      return;
    }

    const newValue = !isCompleted;
    setIsCompleted(newValue);

    try {
      await onToggle(newValue);
    } catch (error) {
      setIsCompleted(task.is_completed);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "opacity-50",
        isReordering && "cursor-grab active:cursor-grabbing"
      )}
    >
      <Card
        className={cn(
          isLocked ? "opacity-60" : "",
          "transition-opacity",
          isReordering && "border-primary"
        )}
      >
        <CardContent className="flex items-center gap-3 py-4">
          {/* Drag Handle */}
          {isReordering && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {/* Checkbox */}
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggle}
            disabled={isLocked || (!canComplete && !task.is_completed)}
            className="h-5 w-5"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium truncate",
                task.is_completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </p>

            {/* Previous task warning */}
            {showPreviousWarning && previousTask && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Complete "{previousTask.title}" first
              </p>
            )}

            {/* Position indicator */}
            {isReordering && (
              <p className="text-xs text-muted-foreground mt-1">
                Position: {(task.position || 0) + 1}
              </p>
            )}
          </div>

          {/* Actions */}
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

            {!canComplete && !task.is_completed && !isLocked && (
              <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 border-yellow-600">
                <AlertCircle className="h-3 w-3" />
                Previous
              </Badge>
            )}

            {!isReordering && onEdit && (
              <EditTaskDialog task={task} onSave={onEdit} />
            )}

            {!isReordering && onDelete && (
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
    </div>
  );
}
