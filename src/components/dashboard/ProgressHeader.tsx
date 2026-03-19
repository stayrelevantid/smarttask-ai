import { useTodoStore } from "@/store/useTodoStore";
import { useLanguage } from "@/hooks/useLanguage";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

export function ProgressHeader() {
  const { t } = useLanguage();
  const progress = useTodoStore((state) => state.getProgressPercentage());
  const completedTasks = useTodoStore((state) => state.getCompletedTasks().length);

  return (
    <div className="sticky top-0 z-50 w-full bg-background border-b">
      <Card className="rounded-none border-0 shadow-none">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900">{t('progress')}</h2>
            <span className="text-sm text-slate-600">
              {completedTasks} {t('tasks').toLowerCase()} {t('completed').toLowerCase()}
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-200" />
          <p className="text-right text-sm text-slate-600 mt-1">{progress}%</p>
        </CardContent>
      </Card>
    </div>
  );
}
