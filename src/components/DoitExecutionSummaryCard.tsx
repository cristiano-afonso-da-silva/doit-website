'use client';

import React from 'react';

type CategoryShare = { name: string; hoursPct: number; execPct?: number };

type SummaryProps = {
  // Date windows
  lifetimeRange: string; // e.g., "Aug 30 – Oct 18"
  monthLabel: string;    // e.g., "October"

  // Lifetime
  lifetimeHours: number;
  lifetimeExec: number;
  lifetimeActiveDays: number;
  lifetimeMinPerExec: number;     // minutes / execution
  lifetimeSwitchesPerDay: number; // context switches / active day
  hoursPerMonth: number;
  execPerMonth: number;
  momentumHoursPct: number; // last 3mo vs prior 3mo
  momentumExecPct: number;

  // Category (overall & month)
  overallCats: CategoryShare[];
  overallHHIHours?: number;
  overallHHIExec?: number;

  // This month
  mtdHours: number;
  mtdExec: number;
  mtdDays: number;
  daysInMonth: number;
  avgHoursPerDay: number;
  avgExecPerDay: number;
  projectedHours: number;
  projectedExec: number;
  lastMonthHours: number;
  lastMonthExec: number;
  monthCats: CategoryShare[];
  monthHHIHours?: number;
  monthHHIExec?: number;
  monthMinPerExec: number;
  monthSwitchesPerDay: number;
};

export default function DoitExecutionSummaryCard(p: SummaryProps) {
  const deltaHours = p.projectedHours - p.lastMonthHours;
  const deltaExec  = p.projectedExec  - p.lastMonthExec;
  const deltaHoursPct = pct(deltaHours, p.lastMonthHours);
  const deltaExecPct  = pct(deltaExec,  p.lastMonthExec);

  return (
    <div className="w-full max-w-2xl rounded-2xl bg-white text-black p-6 border border-black/10 shadow-sm">
      {/* Title */}
      <div className="mb-3 text-sm font-medium uppercase tracking-wide text-black/60">
        Doit — Execution Summary
      </div>

      {/* LIFETIME */}
      <Section title={`Lifetime overview (${p.lifetimeRange})`}>
        <Line>
          <Strong>{fmt(p.lifetimeHours || 0)} h</Strong> across <Strong>{p.lifetimeExec || 0}</Strong> executions, active on{' '}
          <Strong>{p.lifetimeActiveDays || 0}</Strong> days.
        </Line>
        <Line>
          Avg <Strong>{Math.round(p.lifetimeMinPerExec || 0)}</Strong> min/execution ·{' '}
          <Strong>{(p.lifetimeSwitchesPerDay || 0).toFixed(1)}</Strong> context switches/day.
        </Line>
        <Line>
          Pace ≈ <Strong>{round1(p.hoursPerMonth || 0)}</Strong> h/month ·{' '}
          <Strong>{round1(p.execPerMonth || 0)}</Strong> exec/month.
        </Line>
        <Line>
          Momentum{' '}
          <Chip value={p.momentumHoursPct || 0} suffix="% hrs" /> /{' '}
          <Chip value={p.momentumExecPct || 0} suffix="% exec" /> vs prior 3 months.
        </Line>

        {p.overallCats?.length > 0 && (
          <Line>
            Focus: <CategoryRow items={p.overallCats} />
            {p.overallHHIHours !== undefined && (
              <span className="text-black/50"> · HHI {p.overallHHIHours}</span>
            )}
          </Line>
        )}
      </Section>

      <div className="my-4 h-px bg-black/10" />

      {/* THIS MONTH */}
      <Section title={`This month (${p.monthLabel})`}>
        <Line>
          <Strong>{fmt(p.mtdHours || 0)} h</Strong> / <Strong>{p.mtdExec || 0}</Strong> executions over{' '}
          <Strong>{p.mtdDays || 0}</Strong>/<Strong>{p.daysInMonth || 0}</Strong> days —{' '}
          <Strong>{round1(p.avgHoursPerDay || 0)}</Strong> h/day ·{' '}
          <Strong>{round1(p.avgExecPerDay || 0)}</Strong> exec/day.
        </Line>
        <Line>
          Projected <Strong>{fmt(p.projectedHours || 0)} h</Strong> / <Strong>{round1(p.projectedExec || 0)}</Strong> exec, last month{' '}
          <Strong>{fmt(p.lastMonthHours || 0)} h</Strong> / <Strong>{p.lastMonthExec || 0}</Strong>{' '}
          (<Chip value={deltaHoursPct} suffix="% hrs" /> / <Chip value={deltaExecPct} suffix="% exec" />).
        </Line>
        {p.monthCats?.length > 0 && (
          <Line>
            Allocation: <CategoryRow items={p.monthCats} />
            {p.monthHHIHours !== undefined && (
              <span className="text-black/50"> · HHI {p.monthHHIHours}</span>
            )}
          </Line>
        )}
        <Line>
          Granularity ≈ <Strong>{Math.round(p.monthMinPerExec || 0)}</Strong> min/execution ·{' '}
          <Strong>{(p.monthSwitchesPerDay || 0).toFixed(1)}</Strong> switches/day.
        </Line>
      </Section>

      {/* COMPACT ONE-LINER (optional, for cards / mobile) */}
      <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-sm text-black/80">
        <span className="font-semibold">At a glance:</span>{' '}
        {p.monthLabel}: <b>{fmt(p.mtdHours || 0)}h</b>/<b>{p.mtdExec || 0}</b> exec · pace{' '}
        <b>{round1(p.avgHoursPerDay || 0)}h</b> & <b>{round1(p.avgExecPerDay || 0)}</b> exec/day · top:{' '}
        <InlineTop items={p.monthCats || []} count={3} /> · vs last mo:{' '}
        <ColorNum value={deltaHoursPct} suffix="% hrs" /> / <ColorNum value={deltaExecPct} suffix="% exec" />.
      </div>
    </div>
  );
}

/* ---------------- small parts ---------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-2">
      <h3 className="text-[13px] font-medium text-black/60 mb-1">{title}</h3>
      <div className="space-y-1.5 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="text-black/80">{children}</p>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <b className="text-black font-semibold">{children}</b>;
}

function CategoryRow({ items }: { items: CategoryShare[] }) {
  return (
    <span className="text-black">
      {items
        .map((c) =>
          c.execPct !== undefined
            ? `${c.name} ${Math.round(c.hoursPct)}%/${Math.round(c.execPct)}%`
            : `${c.name} ${Math.round(c.hoursPct)}%`
        )
        .join(' · ')}
    </span>
  );
}

function InlineTop({ items, count = 3 }: { items: CategoryShare[]; count?: number }) {
  const top = [...items].sort((a, b) => b.hoursPct - a.hoursPct).slice(0, count);
  return <>{top.map((c, i) => `${i ? ' · ' : ''}${c.name} ${Math.round(c.hoursPct)}%`)}</>;
}

function Chip({ value, suffix = '' }: { value: number; suffix?: string }) {
  const pos = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs ${
        pos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {pos ? '▲' : '▼'} {Math.abs(Math.round(value))}{suffix}
    </span>
  );
}

function ColorNum({ value, suffix = '' }: { value: number; suffix?: string }) {
  const pos = value >= 0;
  return (
    <span className={pos ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
      {pos ? '+' : '−'}
      {Math.abs(Math.round(value))}
      {suffix}
    </span>
  );
}

/* ---------------- utils ---------------- */

function pct(delta: number, base: number) {
  if (!isFinite(base) || base === 0) return 0;
  return (delta / base) * 100;
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function fmt(n: number) {
  // keep one decimal for hours like 159.5
  return (Math.round(n * 10) / 10).toLocaleString();
}
