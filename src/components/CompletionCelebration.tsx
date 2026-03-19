import { useEffect, useState } from "react";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface CompletionCelebrationProps {
  isCompleted: boolean;
  onClose?: () => void;
}

export function CompletionCelebration({ isCompleted, onClose }: CompletionCelebrationProps) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (isCompleted) {
      setShow(true);
      // Generate confetti
      const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD"];
      const newConfetti = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setConfetti(newConfetti);

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        setShow(false);
        onClose?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isCompleted, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-2 h-2 rounded-full animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            top: "-10px",
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: "3s",
          }}
        />
      ))}

      {/* Celebration Card */}
      <div className={cn(
        "bg-white rounded-2xl shadow-2xl p-8 text-center transform animate-celebration",
        "border-4 border-green-500"
      )}>
        <div className="mb-4">
          <PartyPopper className="h-16 w-16 text-green-500 mx-auto animate-bounce" />
        </div>
        <h2 className="text-3xl font-bold text-green-600 mb-2">
          {t('completedExcl')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {t('goalCompleted')}
        </p>
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">{t('congratulations')}</span>
        </div>
      </div>
    </div>
  );
}
