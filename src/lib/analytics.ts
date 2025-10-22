// Core analytics utilities based on date, category, hours, execute only

export type WorkLog = {
  date: string;      // YYYY-MM-DD
  category: string;  // project/category name
  hours: number;
  execute: string;
};

const ymd = (d: string) => d.slice(0, 10);

export const executions = (r: WorkLog) =>
  Math.max(1, r.execute.split(";").filter(s => s.trim()).length);

export const blockMinutes = (r: WorkLog) =>
  (r.hours * 60) / executions(r);

export const isDeep = (r: WorkLog) => blockMinutes(r) >= 50; // deep-work threshold

export function groupByDay(rows: WorkLog[]) {
  const m = new Map<string, { hours: number; execs: number }>();
  for (const r of rows) {
    const k = ymd(r.date);
    const v = m.get(k) ?? { hours: 0, execs: 0 };
    v.hours += r.hours;
    v.execs += executions(r);
    m.set(k, v);
  }
  return m;
}

// Daily hours by category for timeseries
export function dailyCategoryHours(rows: WorkLog[]) {
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const d = ymd(r.date);
    const m = out.get(d) ?? new Map<string, number>();
    m.set(r.category, (m.get(r.category) ?? 0) + r.hours);
    out.set(d, m);
  }
  return out;
}

// Calculate elapsed calendar days in a date range
function elapsedDays(rows: WorkLog[]): number {
  if (rows.length === 0) return 0;
  const dates = rows.map(r => new Date(r.date)).filter(d => !isNaN(d.getTime()));
  if (dates.length === 0) return 0;
  const min = Math.min(...dates.map(d => d.getTime()));
  const max = Math.max(...dates.map(d => d.getTime()));
  return Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
}

// Summary KPIs
export function calculateSummary(rows: WorkLog[], daysInPeriod?: number) {
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const totalExecs = rows.reduce((s, r) => s + executions(r), 0);
  const elapsed = elapsedDays(rows);
  
  const paceHoursPerDay = elapsed > 0 ? totalHours / elapsed : 0;
  const paceExecsPerDay = elapsed > 0 ? totalExecs / elapsed : 0;
  
  // Projected hours (month views only)
  const projectedHours = daysInPeriod && elapsed > 0 
    ? (totalHours / elapsed) * daysInPeriod 
    : undefined;
  
  // Deep-work ratio
  const deepHours = rows.filter(isDeep).reduce((s, r) => s + r.hours, 0);
  const deepWorkRatio = totalHours > 0 ? deepHours / totalHours : 0;
  
  // Average block length
  const avgBlockMinutes = rows.length > 0
    ? rows.reduce((s, r) => s + blockMinutes(r), 0) / rows.length
    : 0;
  
  // Context switches per day
  const byDay = groupByDay(rows);
  const switchesPerDayArray = Array.from(byDay.values()).map(d => Math.max(0, d.execs - 1));
  const meanSwitchesPerDay = switchesPerDayArray.length > 0
    ? switchesPerDayArray.reduce((s, v) => s + v, 0) / switchesPerDayArray.length
    : 0;
  
  // Mix (share by category)
  const catHours = new Map<string, number>();
  for (const r of rows) {
    catHours.set(r.category, (catHours.get(r.category) ?? 0) + r.hours);
  }
  const mix = Array.from(catHours.entries())
    .map(([category, hours]) => ({
      category,
      hours,
      share: totalHours > 0 ? hours / totalHours : 0
    }))
    .sort((a, b) => b.hours - a.hours);
  
  return {
    totalHours,
    totalExecs,
    paceHoursPerDay,
    paceExecsPerDay,
    projectedHours,
    deepWorkRatio,
    avgBlockMinutes,
    meanSwitchesPerDay,
    mix
  };
}

// Timeseries data
export function getTimeseries(rows: WorkLog[]) {
  const dailyData = dailyCategoryHours(rows);
  const days = Array.from(dailyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, catMap]) => ({
      date,
      categories: Array.from(catMap.entries()).map(([category, hours]) => ({
        category,
        hours
      }))
    }));
  return { days };
}

// Theme-day matrix (weekday cadence)
export function getThemeDays(rows: WorkLog[]) {
  // hours by (weekday, category)
  const weekdayCatHours = new Map<number, Map<string, number>>();
  const weekdayTotals = new Map<number, number>();
  
  for (const r of rows) {
    const date = new Date(r.date);
    if (isNaN(date.getTime())) continue;
    const weekday = date.getDay(); // 0-6
    
    const catMap = weekdayCatHours.get(weekday) ?? new Map<string, number>();
    catMap.set(r.category, (catMap.get(r.category) ?? 0) + r.hours);
    weekdayCatHours.set(weekday, catMap);
    
    weekdayTotals.set(weekday, (weekdayTotals.get(weekday) ?? 0) + r.hours);
  }
  
  const result: Array<{ weekday: number; category: string; share: number; isTheme: boolean }> = [];
  for (const [weekday, catMap] of weekdayCatHours) {
    const total = weekdayTotals.get(weekday) ?? 0;
    for (const [category, hours] of catMap) {
      const share = total > 0 ? hours / total : 0;
      result.push({
        weekday,
        category,
        share,
        isTheme: share >= 0.40
      });
    }
  }
  
  return result.sort((a, b) => a.weekday - b.weekday || b.share - a.share);
}

// Focus quality histogram
export function getFocusQualityHistogram(rows: WorkLog[]) {
  const bins = [
    { label: '0-30', min: 0, max: 30, count: 0 },
    { label: '30-50', min: 30, max: 50, count: 0 },
    { label: '50-90', min: 50, max: 90, count: 0 }, // deep-work band
    { label: '90-120', min: 90, max: 120, count: 0 },
    { label: '120-180', min: 120, max: 180, count: 0 },
    { label: '>180', min: 180, max: Infinity, count: 0 }
  ];
  
  for (const r of rows) {
    const m = blockMinutes(r);
    const bin = bins.find(b => m >= b.min && m < b.max);
    if (bin) bin.count++;
  }
  
  return bins.map(b => ({ bin: b.label, count: b.count }));
}

// Weekly deep-work vs switches
export function getWeeklyFocusQuality(rows: WorkLog[]) {
  // Get ISO week start (Monday)
  const getWeekStart = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };
  
  // Group by week
  const weekData = new Map<string, WorkLog[]>();
  for (const r of rows) {
    const date = new Date(r.date);
    if (isNaN(date.getTime())) continue;
    const weekStart = getWeekStart(date);
    const arr = weekData.get(weekStart) ?? [];
    arr.push(r);
    weekData.set(weekStart, arr);
  }
  
  // Calculate metrics per week
  const weekly = [];
  for (const [weekStart, weekRows] of weekData) {
    const deepHours = weekRows.filter(isDeep).reduce((s, r) => s + r.hours, 0);
    const byDay = groupByDay(weekRows);
    const switchesPerDayArray = Array.from(byDay.values()).map(d => Math.max(0, d.execs - 1));
    const switchesPerDay = switchesPerDayArray.length > 0
      ? switchesPerDayArray.reduce((s, v) => s + v, 0) / switchesPerDayArray.length
      : 0;
    
    weekly.push({ weekStart, deepHours, switchesPerDay });
  }
  
  return weekly.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// Consistency score
export function getConsistencyScore(rows: WorkLog[]) {
  const summary = calculateSummary(rows);
  const byDay = groupByDay(rows);
  const sortedDates = Array.from(byDay.keys()).sort();
  
  // Calculate streak
  let currentStreak = 0;
  if (sortedDates.length > 0) {
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const currentDate = new Date(sortedDates[i]);
      const previousDate = i > 0 ? new Date(sortedDates[i - 1]) : null;
      
      if (i === sortedDates.length - 1) {
        currentStreak = 1;
      } else if (previousDate) {
        const dayDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }
  
  // Calculate components
  const D = summary.deepWorkRatio; // Deep work ratio (0-1)
  const C = summary.meanSwitchesPerDay; // Switches per day
  const S = Math.min(currentStreak / 30, 1); // Streak component (0-1, max at 30 days)
  
  // More balanced formula: 40% streak, 35% deep work, 25% switches
  const normSwitches = Math.min(Math.max(C / 6, 0), 1); // More realistic 0-6 switches/day
  const score = 0.4 * S + 0.35 * D + 0.25 * (1 - normSwitches);
  const score0_100 = Math.round(score * 100);
  
  return {
    score: score0_100,
    deepWorkRatio: D,
    meanSwitchesPerDay: C
  };
}

// Focus quality combined
export function getFocusQuality(rows: WorkLog[]) {
  return {
    histogram: getFocusQualityHistogram(rows),
    weekly: getWeeklyFocusQuality(rows)
  };
}

