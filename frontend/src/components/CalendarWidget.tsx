import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Flame, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  /** ISO timestamps (e.g. session.created_at) of days the student studied */
  sessionDates?: string[];
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Local-date key like "2026-10-23" (uses the viewer's own timezone)
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ sessionDates = [] }) => {
  const today = new Date();
  const todayKey = dayKey(today);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

  // Days on which at least one revision session was created
  const studiedDays = useMemo(() => {
    const set = new Set<string>();
    sessionDates.forEach((s) => {
      // Backend timestamps are UTC; add "Z" if no timezone is present so local conversion is right
      const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(' ', 'T')}Z`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) set.add(dayKey(d));
    });
    return set;
  }, [sessionDates]);

  // Current streak = consecutive studied days ending today (or yesterday)
  const streak = useMemo(() => {
    const cursor = new Date();
    if (!studiedDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (studiedDays.has(dayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [studiedDays]);

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const isCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Study Schedule &amp; Streaks</h4>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
          <Flame className="w-3.5 h-3.5 fill-current text-amber-500" />
          <span>{streak}-Day Streak{streak > 0 ? ' 🔥' : ''}</span>
        </div>
      </div>

      <div className="text-xs font-semibold text-slate-500 flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="min-w-[110px] text-center">{monthLabel}</span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() })}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Today
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {DAYS_OF_WEEK.map((d) => (
          <span key={d} className="text-[10px] font-bold text-slate-400 py-1">
            {d}
          </span>
        ))}

        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`pad-${i}`} className="p-1.5" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const key = dayKey(new Date(view.year, view.month, day));
          const isToday = key === todayKey;
          const isStudied = studiedDays.has(key);

          return (
            <div
              key={day}
              className={`p-1.5 rounded-xl text-[11px] font-medium transition flex items-center justify-center relative ${
                isToday
                  ? 'bg-indigo-600 text-white font-extrabold shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-700'
                  : isStudied
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {day}
              {isStudied && !isToday && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-emerald-500" />
              )}
              {isStudied && isToday && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-white" />
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed session
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-600" /> Today
        </span>
      </div>
    </div>
  );
};
