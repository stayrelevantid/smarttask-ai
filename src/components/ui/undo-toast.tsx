import { useState, useCallback } from "react";
import { X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onClose: () => void;
  duration?: number;
}

export function UndoToast({ message, onUndo, onClose, duration = 5000 }: UndoToastProps) {
  const [progress, setProgress] = useState(100);

  // Auto-close after duration
  useState(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  });

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-4 min-w-[300px] animate-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{message}</p>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onUndo}
            className="flex items-center gap-1"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function useUndoToast() {
  const [toast, setToast] = useState<{
    message: string;
    onUndo: () => void;
  } | null>(null);

  const showUndo = useCallback((message: string, onUndo: () => void) => {
    setToast({ message, onUndo });
  }, []);

  const hideUndo = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showUndo,
    hideUndo,
    UndoToastComponent: toast ? (
      <UndoToast
        message={toast.message}
        onUndo={() => {
          toast.onUndo();
          hideUndo();
        }}
        onClose={hideUndo}
      />
    ) : null,
  };
}
