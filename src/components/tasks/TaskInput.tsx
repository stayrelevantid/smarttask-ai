import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface TaskInputProps {
  onAddTask: (title: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function TaskInput({ onAddTask, isLoading = false, placeholder = "Add a new task..." }: TaskInputProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading) return;
    onAddTask(title);
    setTitle("");
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !title.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
