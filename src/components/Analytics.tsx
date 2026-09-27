import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Activity, Clock, TrendingUp, Calendar, Zap } from 'lucide-react';
import { ReviewLog, Card } from '../types';
import { supabase } from '../supabaseClient';

interface AnalyticsProps {
  deckName: string;
  reviewLogs: ReviewLog[];
  cards: Card[];
  onBack: () => void;
}

interface AllReviewLog extends ReviewLog {
  timeSpentMs: number | null;
}

function fromDbAllReviewLog(row: Record<string, unknown>): AllReviewLog {
  return {
    id: row.id as string,
    cardId: row.card_id as string,
    deckId: row.deck_id as string,
    rating: row.rating as ReviewLog['rating'],
    reviewedAt: new Date(row.reviewed_at as string).getTime(),
    timeSpentMs: (row.time_spent_ms as number | null) ?? null,
  };
}

export function Analytics({ deckName, reviewLogs, cards, onBack }: AnalyticsProps) {
  const [allLogs, setAllLogs] = useState<AllReviewLog[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('review_logs')
        .select('*')
        .order('reviewed_at', { ascending: true });
      if (error) {
        console.error('Failed to load all review logs:', error);
        setAllLogs(reviewLogs.map((l) => ({ ...l, timeSpentMs: null })));
        return;
      }
      setAllLogs((data || []).map(fromDbAllReviewLog));
    })();
  }, []);

  // Activity Heat Map (last 365 days)
  const heatMapData = useMemo(() => {
    const days: { date: Date; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = allLogs.filter((l) => l.reviewedAt >= d.getTime() && l.reviewedAt < next.getTime()).length;
      days.push({ date: d, count });
    }
    return days;
  }, [allLogs]);

  const maxDailyCount = useMemo(() => Math.max(1, ...heatMapData.map((d) => d.count)), [heatMapData]);

  // Lifetime metrics
  const totalReviews = allLogs.length;
  const totalTimeMs = useMemo(() => {
    const timed = allLogs.filter((l) => l.timeSpentMs != null);
    if (timed.length === 0) return 0;
    return timed.reduce((sum, l) => sum + (l.timeSpentMs || 0), 0);
  }, [allLogs]);

  const avgTimePerCardMs = useMemo(() => {
    const timed = allLogs.filter((l) => l.timeSpentMs != null);
    if (timed.length === 0) return 0;
    return totalTimeMs / timed.length;
  }, [allLogs, totalTimeMs]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return '—';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Forgetting curve — retention probability over next 30 days based on average card stability
  const forgettingCurve = useMemo(() => {
    const reviewedCards = cards.filter((c) => c.stability > 0 && c.lastReview != null);
    if (reviewedCards.length === 0) return [];
    const avgStability = reviewedCards.reduce((sum, c) => sum + c.stability, 0) / reviewedCards.length;
    const points: { day: number; retention: number }[] = [];
    for (let d = 0; d <= 30; d++) {
      const retention = Math.exp(Math.log(0.9) * d / avgStability);
      points.push({ day: d, retention: Math.max(0, Math.min(1, retention)) });
    }
    return points;
  }, [cards]);

  // Current streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = allLogs.filter((l) => l.reviewedAt >= d.getTime() && l.reviewedAt < next.getTime()).length;
      if (count > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }, [allLogs]);

  // Build weeks for heat map (columns of 7)
  const weeks = useMemo(() => {
    const result: { date: Date; count: number }[][] = [];
    const firstDay = heatMapData[0]?.date;
    if (!firstDay) return result;
    const startOffset = firstDay.getDay();
    const padded: ({ date: Date; count: number } | null)[] = Array(startOffset).fill(null).concat(heatMapData);
    for (let i = 0; i < padded.length; i += 7) {
      result.push(padded.slice(i, i + 7) as ({ date: Date; count: number } | null)[]);
    }
    return result;
  }, [heatMapData]);

  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-700/50';
    const intensity = count / maxDailyCount;
    if (intensity > 0.75) return 'bg-blue-600 dark:bg-blue-500';
    if (intensity > 0.5) return 'bg-blue-500 dark:bg-blue-400';
    if (intensity > 0.25) return 'bg-blue-400 dark:bg-blue-600';
    return 'bg-blue-200 dark:bg-blue-800';
  };

  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    weeks.forEach((week, wi) => {
      const firstDay = week.find((d) => d != null);
      if (firstDay && firstDay.date.getDate() <= 7) {
        labels.push({ label: firstDay.date.toLocaleDateString('en', { month: 'short' }), weekIndex: wi });
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Analytics Studio</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500">{deckName} · All-time data</p>
          </div>
        </div>

        {/* Lifetime Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total Reviews</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalReviews}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Day Streak</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentStreak}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Avg / Card</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatTime(avgTimePerCardMs)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total Time</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatTime(totalTimeMs)}</p>
          </div>
        </div>

        {/* Activity Heat Map */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Activity Heat Map</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Last 365 days</span>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="inline-block min-w-full">
              {/* Month labels */}
              <div className="flex gap-1 mb-1 ml-7" style={{ minWidth: `${weeks.length * 14}px` }}>
                {monthLabels.map((ml, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-slate-400 dark:text-slate-500 absolute"
                    style={{ marginLeft: `${ml.weekIndex * 14}px` }}
                  >
                    {ml.label}
                  </span>
                ))}
              </div>
              {/* Grid */}
              <div className="flex gap-1">
                {/* Day labels */}
                <div className="flex flex-col gap-1 mr-1 shrink-0">
                  {['', 'M', '', 'W', '', 'F', ''].map((day, i) => (
                    <div key={i} className="h-3 flex items-center">
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">{day}</span>
                    </div>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1 shrink-0">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`w-3 h-3 rounded-sm ${day ? getHeatColor(day.count) : 'bg-transparent'} ${day && day.count > 0 ? 'cursor-pointer' : ''}`}
                        title={day ? `${day.date.toLocaleDateString()}: ${day.count} reviews` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 justify-end">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Less</span>
            <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-700/50" />
            <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-800" />
            <div className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-600" />
            <div className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-blue-400" />
            <div className="w-3 h-3 rounded-sm bg-blue-600 dark:bg-blue-500" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500">More</span>
          </div>
        </div>

        {/* Forgetting Curve */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Forgetting Curve</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Retention over next 30 days</span>
          </div>
          {forgettingCurve.length > 0 ? (
            <div className="relative">
              <svg viewBox="0 0 600 200" className="w-full h-40">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((y) => (
                  <line
                    key={y}
                    x1="40" y1={180 - y * 160} x2="590" y2={180 - y * 160}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-slate-200 dark:text-slate-700"
                  />
                ))}
                {/* Y-axis labels */}
                {[0, 25, 50, 75, 100].map((v, i) => (
                  <text key={i} x="5" y={184 - (v / 100) * 160} className="text-[10px] fill-slate-400 dark:fill-slate-500">
                    {v}%
                  </text>
                ))}
                {/* Curve */}
                <polyline
                  fill="none"
                  stroke="rgb(37, 99, 235)"
                  strokeWidth="2"
                  points={forgettingCurve.map((p, i) => {
                    const x = 40 + (i / (forgettingCurve.length - 1)) * 550;
                    const y = 180 - p.retention * 160;
                    return `${x},${y}`;
                  }).join(' ')}
                />
                {/* Area under curve */}
                <polygon
                  fill="rgba(37, 99, 235, 0.1)"
                  points={`40,180 ${forgettingCurve.map((p, i) => {
                    const x = 40 + (i / (forgettingCurve.length - 1)) * 550;
                    const y = 180 - p.retention * 160;
                    return `${x},${y}`;
                  }).join(' ')} 590,180`}
                />
                {/* X-axis labels */}
                {[0, 7, 14, 21, 30].map((d) => {
                  const x = 40 + (d / 30) * 550;
                  return (
                    <text key={d} x={x - 5} y="195" className="text-[10px] fill-slate-400 dark:fill-slate-500">
                      {d}d
                    </text>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">Review some cards to see your forgetting curve</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
