import { useMemo } from 'react';
import { Sprout, TreePine, Trees, Flower, Sparkles } from 'lucide-react';
import { ReviewLog } from '../types';

interface StudyGardenProps {
  reviewLogs: ReviewLog[];
  allLogsCount: number;
}

function getGardenLevel(streak: number, totalReviews: number): { level: number; label: string; icon: typeof Sprout; color: string } {
  if (totalReviews < 10) return { level: 0, label: 'Seedling', icon: Sprout, color: 'text-amber-500 dark:text-amber-400' };
  if (streak < 3) return { level: 1, label: 'Sprout', icon: Sprout, color: 'text-emerald-500 dark:text-emerald-400' };
  if (streak < 7) return { level: 2, label: 'Sapling', icon: TreePine, color: 'text-emerald-600 dark:text-emerald-400' };
  if (streak < 14) return { level: 3, label: 'Young Tree', icon: TreePine, color: 'text-emerald-600 dark:text-emerald-400' };
  if (streak < 30) return { level: 4, label: 'Blooming Tree', icon: Flower, color: 'text-pink-500 dark:text-pink-400' };
  if (streak < 60) return { level: 5, label: 'Mighty Oak', icon: Trees, color: 'text-emerald-700 dark:text-emerald-400' };
  return { level: 6, label: 'Enchanted Forest', icon: Sparkles, color: 'text-purple-500 dark:text-purple-400' };
}

export function StudyGarden({ reviewLogs, allLogsCount }: StudyGardenProps) {
  const streak = useMemo(() => {
    let s = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = reviewLogs.filter((l) => l.reviewedAt >= d.getTime() && l.reviewedAt < next.getTime()).length;
      if (count > 0) {
        s++;
      } else if (i > 0) {
        break;
      }
    }
    return s;
  }, [reviewLogs]);

  const todayCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return reviewLogs.filter((l) => l.reviewedAt >= today.getTime() && l.reviewedAt < tomorrow.getTime()).length;
  }, [reviewLogs]);

  const garden = getGardenLevel(streak, allLogsCount);
  const Icon = garden.icon;

  const nextLevelStreak = garden.level < 6 ? [0, 3, 7, 14, 30, 60][garden.level + 1] : null;
  const progress = nextLevelStreak ? Math.min(100, (streak / nextLevelStreak) * 100) : 100;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">My Study Garden</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{todayCount} today</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Garden visual */}
        <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
          <Icon className={`w-8 h-8 ${garden.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{garden.label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-medium">
              Lv {garden.level}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
            {streak} day streak · {allLogsCount} total reviews
          </p>
          {/* Progress bar */}
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {nextLevelStreak && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              {nextLevelStreak - streak} days to next level
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
