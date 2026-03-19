import { cn } from "@/lib/utils";

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  height?: string;
  className?: string;
  animated?: boolean;
}

export function AnimatedProgressBar({ 
  progress, 
  height = "h-2",
  className,
  animated = true 
}: AnimatedProgressBarProps) {
  // Determine color based on progress
  const getColorClass = (p: number): string => {
    if (p === 0) return "bg-gray-300";
    if (p <= 25) return "bg-red-500";
    if (p <= 50) return "bg-orange-500";
    if (p <= 75) return "bg-yellow-500";
    if (p < 100) return "bg-blue-500";
    return "bg-green-500";
  };

  const colorClass = getColorClass(progress);

  return (
    <div className={cn("w-full bg-muted rounded-full overflow-hidden", height, className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden",
          colorClass,
          animated && "animate-pulse-subtle"
        )}
        style={{ 
          width: `${progress}%`,
          transitionProperty: "width, background-color"
        }}
      >
        {/* Shimmer effect */}
        {animated && progress > 0 && progress < 100 && (
          <div className="absolute inset-0 shimmer-effect" />
        )}
        
        {/* Glow effect for high progress */}
        {progress >= 75 && (
          <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );
}

// Hook to track progress changes with animation trigger
export function useProgressAnimation(currentProgress: number) {
  const getProgressColor = (progress: number): string => {
    if (progress === 0) return "text-gray-500";
    if (progress <= 25) return "text-red-600";
    if (progress <= 50) return "text-orange-600";
    if (progress <= 75) return "text-yellow-600";
    if (progress < 100) return "text-blue-600";
    return "text-green-600";
  };

  const getProgressLabel = (progress: number): string => {
    if (progress === 0) return "Not Started";
    if (progress <= 25) return "Getting Started";
    if (progress <= 50) return "In Progress";
    if (progress <= 75) return "Almost There";
    if (progress < 100) return "Final Stretch";
    return "Completed!";
  };

  return {
    colorClass: getProgressColor(currentProgress),
    label: getProgressLabel(currentProgress),
  };
}
