'use client';

import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';
import Link from 'next/link';
import Image from 'next/image';
import InsightSummaryApp, { computeExecAnalytics, Analytics } from '../../components/InsightSummaryApp';


// Dynamic palette will be generated based on user selection

interface CSVRow {
  [key: string]: string | number;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

interface SummaryStats {
  // current month
  totalHours: number;          // MTD hours (so far)
  daysElapsed: number;         // days counted this month
  daysInMonth: number;         // total days this month
  avgDailyMTD: number;         // totalHours / daysElapsed
  projectedHours: number;      // avgDailyMTD * daysInMonth

  // last month
  lastMonthHours: number;

  // comparisons based on projection (not raw MTD)
  projectedDelta: number;      // projectedHours - lastMonthHours
  projectedRate: number;       // % difference vs last month
  mostActiveCategory: string;  // this month (MTD)
}

interface ColumnMapping {
  dateCol: string;
  catCol: string;
  valCol: string;
}

// Split Execute into actions (using ";" as primary; tolerate commas)
const splitExec = (s: unknown): string[] =>
  String(s ?? '')
    .split(/[;，,]+/)
    .map(x => x.trim())
    .filter(Boolean);

// Simple linear regression slope per month (for trend direction)
// returns slope (y units per month). Input: [{x:0, y:hours}, ...]
function slopePerMonth(points: Array<{x:number; y:number}>): number {
  const n = points.length;
  if (n < 2) return 0;
  const sumX = points.reduce((s,p)=>s+p.x,0);
  const sumY = points.reduce((s,p)=>s+p.y,0);
  const sumXY = points.reduce((s,p)=>s+p.x*p.y,0);
  const sumXX = points.reduce((s,p)=>s+p.x*p.x,0);
  const denom = (n*sumXX - sumX*sumX);
  if (denom === 0) return 0;
  return (n*sumXY - sumX*sumY) / denom; // y per (1 month)
}

function computeExecAnalytics(
  rows: Record<string, any>[],
  dateCol: string,
  projectCol: string,
  hoursCol: string
) {
  const num = (x: any) => {
    const v = Number.parseFloat(String(x).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  };
  const toDayKey = (d: Date) => isNaN(d.getTime()) ? null : d.toISOString().slice(0,10);
  const toMonthKey = (d: Date) => isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

  // Daily aggregation (for MTD, consistency, switches)
  const byDay: Record<string, {hours:number; exec:number; switches:number; last?:string}> = {};
  // Monthly aggregation (for lifetime trends)
  const byMonth: Record<string, {hours:number; exec:number; activeDays:Set<string>}> = {};
  // Category aggregation (overall & this month)
  const byCatOverall: Record<string, {hours:number; exec:number}> = {};
  const byCatThisMonth: Record<string, {hours:number; exec:number}> = {};

  let firstDate: Date | null = null;
  let lastDate: Date | null = null;

  for (const r of rows) {
    const d = new Date(String(r[dateCol] ?? ''));
    const dayKey = toDayKey(d);
    const monthKey = toMonthKey(d);
    if (!dayKey || !monthKey) continue;

    firstDate = !firstDate || d < firstDate ? d : firstDate;
    lastDate = !lastDate || d > lastDate ? d : lastDate;

    const p = String(r[projectCol] ?? 'Unknown').trim() || 'Unknown';
    const h = num(r[hoursCol]);
    const e = splitExec(r['Execute']).length;

    // byDay
    if (!byDay[dayKey]) byDay[dayKey] = { hours:0, exec:0, switches:0, last: undefined };
    byDay[dayKey].hours += h;
    byDay[dayKey].exec  += e;
    if (byDay[dayKey].last !== undefined && byDay[dayKey].last !== p) byDay[dayKey].switches += 1;
    byDay[dayKey].last = p;

    // byMonth
    if (!byMonth[monthKey]) byMonth[monthKey] = { hours:0, exec:0, activeDays: new Set() };
    byMonth[monthKey].hours += h;
    byMonth[monthKey].exec  += e;
    if (h > 0 || e > 0) byMonth[monthKey].activeDays.add(dayKey);

    // by category (overall)
    if (!byCatOverall[p]) byCatOverall[p] = { hours:0, exec:0 };
    byCatOverall[p].hours += h;
    byCatOverall[p].exec  += e;
  }

  // This month buckets
  const now = new Date();
  const Y = now.getFullYear(), M = now.getMonth();
  const startThis = new Date(Y, M, 1);
  const startNext = new Date(Y, M + 1, 1);
  const monthThisKey = `${Y}-${String(M+1).padStart(2,'0')}`;

  let mtdHours = 0, mtdExec = 0, mtdSwitch = 0, activeDaysThis = 0;
  Object.entries(byDay).forEach(([k, v]) => {
    const d = new Date(k);
    if (d >= startThis && d < startNext) {
      mtdHours += v.hours;
      mtdExec  += v.exec;
      mtdSwitch += v.switches;
      if (v.hours > 0 || v.exec > 0) activeDaysThis += 1;
    }
  });

  // This month categories
  rows.forEach(r => {
    const d = new Date(String(r[dateCol] ?? ''));
    if (!(d >= startThis && d < startNext)) return;
    const p = String(r[projectCol] ?? 'Unknown').trim() || 'Unknown';
    const h = num(r[hoursCol]);
    const e = splitExec(r['Execute']).length;
    if (!byCatThisMonth[p]) byCatThisMonth[p] = { hours:0, exec:0 };
    byCatThisMonth[p].hours += h;
    byCatThisMonth[p].exec  += e;
  });

  // Last month totals (for pace comparison)
  const startLast = new Date(Y, M - 1, 1);
  const lastMonthKey = `${startLast.getFullYear()}-${String(startLast.getMonth()+1).padStart(2,'0')}`;
  const lastHours = byMonth[lastMonthKey]?.hours ?? 0;
  const lastExec  = byMonth[lastMonthKey]?.exec  ?? 0;

  // Lifetime totals
  const totalHours = Object.values(byMonth).reduce((s,m)=>s+m.hours,0);
  const totalExec  = Object.values(byMonth).reduce((s,m)=>s+m.exec,0);
  const monthsActive = Object.keys(byMonth).length;

  // Pace & projection
  const daysInMonth = new Date(Y, M+1, 0).getDate();
  const daysElapsed = now.getDate();
  const avgHoursDay = mtdHours / Math.max(1, daysElapsed);
  const avgExecDay  = mtdExec  / Math.max(1, daysElapsed);
  const projectedHours = avgHoursDay * daysInMonth;
  const projectedExec  = avgExecDay  * daysInMonth;

  // Monthly sequences for trends
  const monthKeysSorted = Object.keys(byMonth).sort(); // YYYY-MM ascending
  const hoursSeries = monthKeysSorted.map((k, i) => ({ x:i, y: byMonth[k].hours }));
  const execSeries  = monthKeysSorted.map((k, i) => ({ x:i, y: byMonth[k].exec  }));
  const hoursSlope  = slopePerMonth(hoursSeries); // hours per month (trend)
  const execSlope   = slopePerMonth(execSeries);  // executions per month

  // Rolling averages for robustness (last 3 months vs previous 3 months)
  const lastN = (arr:number[], n:number) => arr.slice(Math.max(0, arr.length - n));
  const seqHours = monthKeysSorted.map(k => byMonth[k].hours);
  const seqExec  = monthKeysSorted.map(k => byMonth[k].exec);
  const avg3LastH = lastN(seqHours, 3).reduce((a,b)=>a+b,0) / Math.max(1, lastN(seqHours, 3).length);
  const avg3PrevH = lastN(seqHours, 6).slice(0, Math.max(0, lastN(seqHours, 6).length - 3)).reduce((a,b)=>a+b,0) / Math.max(1, lastN(seqHours, 6).length - 3);
  const avg3LastE = lastN(seqExec, 3).reduce((a,b)=>a+b,0) / Math.max(1, lastN(seqExec, 3).length);
  const avg3PrevE = lastN(seqExec, 6).slice(0, Math.max(0, lastN(seqExec, 6).length - 3)).reduce((a,b)=>a+b,0) / Math.max(1, lastN(seqExec, 6).length - 3);

  const delta3H = Math.round(((avg3LastH - (avg3PrevH || 0)) / (avg3PrevH || 1)) * 100);
  const delta3E = Math.round(((avg3LastE - (avg3PrevE || 0)) / (avg3PrevE || 1)) * 100);

  // Category shares (ALL categories) — overall & this month
  const totalHOverall = Object.values(byCatOverall).reduce((a,b)=>a+b.hours,0);
  const totalEOverall = Object.values(byCatOverall).reduce((a,b)=>a+b.exec,0);
  const totalHThis    = Object.values(byCatThisMonth).reduce((a,b)=>a+b.hours,0);
  const totalEThis    = Object.values(byCatThisMonth).reduce((a,b)=>a+b.exec,0);

  const allCatsOverall = Object.entries(byCatOverall)
    .sort((a,b)=>b[1].hours - a[1].hours)
    .map(([k,v]) => ({
      project: k,
      hoursShare: totalHOverall ? Math.round((v.hours/totalHOverall)*100) : 0,
      execShare:  totalEOverall ? Math.round((v.exec /totalEOverall)*100) : 0
    }));

  const allCatsThisMonth = Object.entries(byCatThisMonth)
    .sort((a,b)=>b[1].hours - a[1].hours)
    .map(([k,v]) => ({
      project: k,
      hoursShare: totalHThis ? Math.round((v.hours/totalHThis)*100) : 0,
      execShare:  totalEThis ? Math.round((v.exec /totalEThis)*100) : 0
    }));

  // Concentration (HHI) overall & this month (hours/exec)
  const hhi = (entries: Array<{share:number}>) =>
    Math.round(entries.reduce((s,e)=>s+Math.pow((e.share||0)/100,2),0)*1000)/1000;

  const hhiHoursOverall = hhi(allCatsOverall.map(x => ({share:x.hoursShare})));
  const hhiExecOverall  = hhi(allCatsOverall.map(x => ({share:x.execShare})));
  const hhiHoursThis    = hhi(allCatsThisMonth.map(x => ({share:x.hoursShare})));
  const hhiExecThis     = hhi(allCatsThisMonth.map(x => ({share:x.execShare})));

  // Granularity (avg minutes per execution) overall & this month
  const avgMinPerExecOverall = totalExec ? Math.round((totalHours*60)/totalExec) : 0;
  const avgMinPerExecThis    = mtdExec   ? Math.round((mtdHours*60)/mtdExec)   : 0;

  // Consistency: lifetime active days and longest streak
  const allDayKeys = Object.keys(byDay).sort(); // ascending
  const lifetimeActiveDays = allDayKeys.filter(k => (byDay[k].hours>0 || byDay[k].exec>0)).length;

  // Longest streak (consecutive active days)
  let longestStreak = 0, current = 0, prevDate: Date | null = null;
  for (const k of allDayKeys) {
    const d = new Date(k);
    const isActive = (byDay[k].hours>0 || byDay[k].exec>0);
    if (!prevDate || (d.getTime() - prevDate.getTime()) === 86400000) {
      current = isActive ? current + 1 : 0;
    } else {
      current = isActive ? 1 : 0;
    }
    longestStreak = Math.max(longestStreak, current);
    prevDate = d;
  }

  // Context switches per active day (this month & overall, proxy)
  const switchesThis = mtdSwitch / Math.max(1, activeDaysThis);
  const switchesOverall = Object.values(byDay).reduce((s,v)=>s+v.switches,0) /
                          Math.max(1, lifetimeActiveDays);

  return {
    // coverage
    firstDate, lastDate, monthsActive, lifetimeActiveDays,
    // lifetime totals
    totalHours: Math.round(totalHours*10)/10,
    totalExec,
    // trends
    hoursSlope: Math.round(hoursSlope*10)/10,   // hours/month
    execSlope:  Math.round(execSlope*10)/10,    // execs/month
    delta3H, delta3E,                            // 3-month momentum (%)
    // monthly pace
    daysElapsed, daysInMonth,
    mtdHours: Math.round(mtdHours*10)/10,
    mtdExec,
    avgHoursDay: Math.round(avgHoursDay*10)/10,
    avgExecDay:  Math.round(avgExecDay*10)/10,
    projectedHours: Math.round(projectedHours*10)/10,
    projectedExec:  Math.round(projectedExec*10)/10,
    lastHours: Math.round(lastHours*10)/10,
    lastExec,
    // granularity & switches
    avgMinPerExecOverall, avgMinPerExecThis,
    switchesThis: Math.round(switchesThis*10)/10,
    switchesOverall: Math.round(switchesOverall*10)/10,
    // categories (ALL)
    allCatsOverall,
    allCatsThisMonth,
    // concentration
    hhiHoursOverall, hhiExecOverall, hhiHoursThis, hhiExecThis,
  };
}

function buildObjectiveParagraph(a: ReturnType<typeof computeExecAnalytics>): string {
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });
  const dateSpan = a.firstDate && a.lastDate
    ? `${a.firstDate.toISOString().slice(0,10)} to ${a.lastDate.toISOString().slice(0,10)}`
    : 'entire log';

  const deltaH = a.lastHours ? (a.projectedHours - a.lastHours).toFixed(1) : '0.0';
  const deltaE = a.lastExec  ? (a.projectedExec  - a.lastExec ).toFixed(0) : '0';
  const rateH  = a.lastHours ? Math.round(((a.projectedHours - a.lastHours)/a.lastHours)*100) : 0;
  const rateE  = a.lastExec  ? Math.round(((a.projectedExec  - a.lastExec )/a.lastExec )*100) : 0;

  const catOverall = a.allCatsOverall
    .map(x => `${x.project} ${x.hoursShare}%/${x.execShare}%`)
    .join(' · ') || '—';

  const catThis = a.allCatsThisMonth
    .map(x => `${x.project} ${x.hoursShare}%/${x.execShare}%`)
    .join(' · ') || '—';

  return (
    `Lifetime overview (${dateSpan}, ${a.monthsActive} active month${a.monthsActive===1?'':'s'}): ` +
    `${a.totalHours} total hours across ${a.totalExec} executions, active on ${a.lifetimeActiveDays} days; ` +
    `average granularity ≈ ${a.avgMinPerExecOverall} min/execution, context switches ≈ ${a.switchesOverall}/active day. ` +
    `Monthly trend shows a slope of ${a.hoursSlope} h/month and ${a.execSlope} executions/month; ` +
    `last 3-month momentum vs prior 3 months: hours ${a.delta3H>=0?'+':''}${a.delta3H}% / executions ${a.delta3E>=0?'+':''}${a.delta3E}%. ` +
    `Category allocation (overall, hours%/exec%): ${catOverall} ` +
    `(concentration HHI — hours ${a.hhiHoursOverall}, executions ${a.hhiExecOverall}). ` +
    `This month: MTD ${a.mtdHours}h and ${a.mtdExec} executions over ${a.daysElapsed}/${a.daysInMonth} days ` +
    `(avg ${a.avgHoursDay}h/day, ${a.avgExecDay} exec/day); at this pace, ${monthName} projects to ` +
    `${a.projectedHours}h and ${a.projectedExec} executions (last month ${a.lastHours}h/${a.lastExec}; ` +
    `Δ ${deltaH}h / ${deltaE} exec; ${rateH>=0?'+':''}${rateH}% / ${rateE>=0?'+':''}${rateE}%). ` +
    `This month's allocation (hours%/exec%): ${catThis} ` +
    `(concentration HHI — hours ${a.hhiHoursThis}, executions ${a.hhiExecThis}); average granularity ≈ ${a.avgMinPerExecThis} min/execution, ` +
    `context switches ≈ ${a.switchesThis}/active day. ` +
    `The paragraph above is descriptive only, indicating current pace, lifetime direction, and how time and actions are distributed across categories.`
  );
}

export default function WorkLog() {
  const chartRef = useRef<ReactECharts>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [execAnalytics, setExecAnalytics] = useState<ReturnType<typeof computeExecAnalytics> | null>(null);
  const [execParagraph, setExecParagraph] = useState<string>('');
  const [insightAnalytics, setInsightAnalytics] = useState<Analytics | null>(null);
  const [csvRows, setCsvRows] = useState<Record<string, any>[]>([]);
  const [status, setStatus] = useState<string>('');
  const [range, setRange] = useState<string>('all');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSquareScreen, setIsSquareScreen] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<Array<{value: string, label: string}>>([]);
  const [colorPalette, setColorPalette] = useState<'colorful' | 'red' | 'green' | 'blue' | 'black' | 'white' | 'yellow' | 'orange' | 'purple'>('colorful');

  // Color palette generation functions
  const generateColorPalette = (baseColor: string, count: number): string[] => {
    const colors: string[] = [];
    
    if (baseColor === 'colorful') {
      // Updated colorful palette
      return ['#8B5CF6', '#4A90E2', '#FCD34D', '#9CA3AF', '#EF4444', '#F97316', '#22C55E'];
    }
    
    // Generate different shades/tones for single color themes using specific base colors
    const baseColors = {
      'red': '#EF4444',
      'green': '#22C55E', 
      'blue': '#4A90E2',
      'yellow': '#FCD34D',
      'orange': '#F97316',
      'purple': '#8B5CF6',
      'black': '#9CA3AF'
    };
    
    for (let i = 0; i < count; i++) {
      let color = '';
      
      if (baseColor === 'white') {
        // Create different tints of white/light colors
        const whiteValue = Math.floor(255 * (0.7 + (i * 0.3 / count))); // Range from light to white
        color = `rgb(${whiteValue}, ${whiteValue}, ${whiteValue})`;
      } else if (baseColor === 'black') {
        // Create different shades from medium dark to white
        const grayValue = Math.floor(255 * (0.2 + (i * 0.8 / count))); // Range from medium dark (20%) to white (100%)
        color = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
      } else if (baseColors[baseColor as keyof typeof baseColors]) {
        // Convert hex to RGB
        const hex = baseColors[baseColor as keyof typeof baseColors];
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        // Create proper shades (adding black) and tints (adding white)
        // Split the count: first half are tints (lighter), second half are shades (darker)
        const tintCount = Math.ceil(count / 2);
        const shadeCount = count - tintCount;
        
        if (i < tintCount) {
          // Create tints by adding white (70% to 0% white max) - reversed
          const whitePercent = ((tintCount - 1 - i) / (tintCount - 1)) * 0.7; // 0.7 to 0.0 (reversed)
          const newR = Math.floor(r + (255 - r) * whitePercent);
          const newG = Math.floor(g + (255 - g) * whitePercent);
          const newB = Math.floor(b + (255 - b) * whitePercent);
          color = `rgb(${newR}, ${newG}, ${newB})`;
        } else {
          // Create shades by adding black (40% to 0% black max) - reversed
          const blackPercent = ((shadeCount - 1 - (i - tintCount)) / (shadeCount - 1)) * 0.4; // 0.4 to 0.0 (reversed)
          const newR = Math.floor(r * (1 - blackPercent));
          const newG = Math.floor(g * (1 - blackPercent));
          const newB = Math.floor(b * (1 - blackPercent));
          color = `rgb(${newR}, ${newG}, ${newB})`;
        }
      } else {
        color = '#EF4444'; // Default red
      }
      
      colors.push(color);
    }
    
    return colors;
  };

  const guessColumns = (headers: string[]): ColumnMapping => {
    const dateCol = headers.find(h => /date|created|time/i.test(h)) || headers[0];
    const catCol = headers.find(h => /category|project|tag|type/i.test(h)) || headers[1] || headers[0];
    const valCol = headers.find(h => /hours?|duration|value|amount/i.test(h)) || headers[headers.length - 1] || headers[0];
    return { dateCol, catCol, valCol };
  };

  const parseDate = (s: string | number): Date | null => {
    if (!s) return null;
    const raw = String(s);
    const candidates = [raw, raw.split(" ")[0]];
    
    for (const v of candidates) {
      const parsed = new Date(v);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const aggregateDaily = (rows: CSVRow[], dateCol: string, catCol: string, valCol: string): ChartData => {
    const buckets = new Map<string, number>();
    const byCat = new Map<string, Map<string, number>>();

    // First pass: collect all dates and categories
    for (const r of rows) {
      const dt = parseDate(r[dateCol]);
      if (!dt) continue;
      
      const key = dt.toISOString().split('T')[0];
      const cat = (r[catCol] ?? "Unknown").toString().trim() || "Unknown";
      const num = Number.parseFloat(String(r[valCol]).replace(',', '.'));
      if (!Number.isFinite(num)) continue;

      buckets.set(key, 1);
      if (!byCat.has(cat)) byCat.set(cat, new Map());
      const m = byCat.get(cat)!;
      m.set(key, (m.get(key) || 0) + num);
    }

    // Sort dates and create labels
    const sortedDates = Array.from(buckets.keys()).sort();
    
    // Create datasets
    const datasets = Array.from(byCat.entries()).map(([cat, map]) => ({
      label: cat,
      data: sortedDates.map(date => map.get(date) || 0)
    }));

    return {
      labels: sortedDates,
      datasets
    };
  };

  const calculateSummaryStats = (rows: CSVRow[], dateCol: string, catCol: string, valCol: string): SummaryStats => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const startThis = new Date(y, m, 1);
    const startNext = new Date(y, m + 1, 1);
    const startLast = new Date(y, m - 1, 1);

    const dayIndex = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const num = (x: any) => {
      const v = Number.parseFloat(String(x).replace(',', '.'));
      return Number.isFinite(v) ? v : 0;
    };

    // Helper: sum hours in [a, b)
    const sumIn = (a: Date, b: Date) =>
      rows.reduce((acc, r) => {
        const d = parseDate(r[dateCol]); 
        if (!d) return acc;
        if (d >= a && d < b) return acc + num(r[valCol]);
        return acc;
      }, 0);

    // Month-to-date stats (up to "today")
    const today = dayIndex(now);
    const mtdHours = sumIn(startThis, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    const daysElapsed = Math.max(
      1,
      Math.min(
        Math.ceil((today.getTime() - startThis.getTime()) / 86400000) + 1,
        new Date(y, m + 1, 0).getDate()
      )
    );
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const avgDailyMTD = mtdHours / daysElapsed;
    const projectedHours = Math.round(avgDailyMTD * daysInMonth * 10) / 10;

    // Last month total
    const lastMonthHours = sumIn(startLast, startThis);

    // Comparison based on projection
    const projectedDelta = Math.round((projectedHours - lastMonthHours) * 10) / 10;
    const projectedRate =
      lastMonthHours > 0 ? Math.round(((projectedHours - lastMonthHours) / lastMonthHours) * 100) : (projectedHours > 0 ? 100 : 0);

    // Most active category (MTD)
    const byCat = new Map<string, number>();
    rows.forEach(r => {
      const d = parseDate(r[dateCol]);
      if (!d || d < startThis || d >= startNext) return;
      const cat = (r[catCol] ?? 'Unknown').toString().trim() || 'Unknown';
      byCat.set(cat, (byCat.get(cat) || 0) + num(r[valCol]));
    });
    const mostActiveCategory =
      Array.from(byCat.entries()).sort(([,a],[,b]) => b - a)[0]?.[0] ?? '—';

    return {
      totalHours: Math.round(mtdHours * 10) / 10,
      daysElapsed,
      daysInMonth,
      avgDailyMTD: Math.round(avgDailyMTD * 10) / 10,
      projectedHours,
      lastMonthHours: Math.round(lastMonthHours * 10) / 10,
      projectedDelta,
      projectedRate,
      mostActiveCategory
    };
  };

  const getAvailableMonths = (rows: CSVRow[], dateCol: string): Array<{value: string, label: string}> => {
    const months = new Set<string>();
    
    rows.forEach(row => {
      const dt = parseDate(row[dateCol]);
      if (dt) {
        const year = dt.getFullYear();
        const month = dt.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        months.add(monthKey);
      }
    });
    
    // Sort by date (most recent first)
    const sortedMonths = Array.from(months).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });
    
    return sortedMonths.map(monthKey => {
      const [year, monthNum] = monthKey.split('-').map(Number);
      const monthName = new Date(year, monthNum - 1).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      return {
        value: monthKey,
        label: monthName
      };
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileInput(file);
    setSelectedFileName(file.name);
  };

  const handleRender = () => {
    if (!fileInput) {
      setStatus('Pick a CSV');
      return;
    }

    setStatus('Processing...');
    
    Papa.parse(fileInput, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows = results.data as CSVRow[];
        if (!parsedRows || parsedRows.length === 0) {
          setStatus('No data found');
          return;
        }
        
        const headers = results.meta.fields || Object.keys(parsedRows[0]);
        const { dateCol, catCol, valCol } = guessColumns(headers);
        const data = aggregateDaily(parsedRows, dateCol, catCol, valCol);
        const stats = calculateSummaryStats(parsedRows, dateCol, catCol, valCol);
        const months = getAvailableMonths(parsedRows, dateCol);
        
        // Compute execution analytics
        const analytics = computeExecAnalytics(parsedRows, dateCol, catCol, valCol);
        const paragraph = buildObjectiveParagraph(analytics);
        
        // Compute insight analytics using the new function
        const insightData = computeExecAnalytics(parsedRows, dateCol, catCol, valCol);
        
        setChartData(data);
        setSummaryStats(stats);
        setAvailableMonths(months);
        setExecAnalytics(analytics);
        setExecParagraph(paragraph);
        setInsightAnalytics(insightData);
        setCsvRows(parsedRows);
        setStatus(`Parsed ${data.labels.length} days • ${data.datasets.length} categories`);
      },
      error: () => {
        setStatus('Parse failed');
      }
    });
  };

  const getChartOption = () => {
    if (!chartData) return {};

    const { labels, datasets } = chartData;

    // Month filter
    let x = labels;
    let startIndex = 0;
    
    if (range !== 'all') {
      const [year, month] = range.split('-').map(Number);
      const targetDate = new Date(year, month - 1, 1);
      const nextMonth = new Date(year, month, 1);
      
      const foundIndex = labels.findIndex(label => {
        const labelDate = new Date(label);
        return labelDate >= targetDate && labelDate < nextMonth;
      });
      
      const endIndex = labels.findIndex(label => {
        const labelDate = new Date(label);
        return labelDate >= nextMonth;
      });
      
      if (foundIndex !== -1) {
        startIndex = foundIndex;
        const endIdx = endIndex !== -1 ? endIndex : labels.length;
        x = labels.slice(startIndex, endIdx);
      }
    }

    // Generate dynamic palette based on user selection
    const dynamicPalette = generateColorPalette(colorPalette, datasets.length);
    
    // Sort datasets by total values (highest first) for color assignment
    const sortedDatasets = [...datasets].map((ds, i) => ({
      ...ds,
      originalIndex: i,
      total: ds.data.reduce((sum, val) => sum + val, 0)
    })).sort((a, b) => b.total - a.total);
    
    // Build series with modern styling
    const series = datasets.map((ds, i) => {
      // Find the sorted position of this dataset
      const sortedIndex = sortedDatasets.findIndex(sd => sd.originalIndex === i);
      const col = dynamicPalette[sortedIndex % dynamicPalette.length];
      const y = ds.data.slice(startIndex);
      return {
        name: ds.label,
        type: 'line',
        smooth: 0.5,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: y,
        lineStyle: { 
          width: 7
        },
        itemStyle: { color: col },
        emphasis: {
          lineStyle: { width: 4.5 }
        },
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      };
    });

      return {
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        grid: { left: 40, right: 24, top: 24, bottom: 50 },
        xAxis: {
          type: 'category',
          data: x,
          boundaryGap: false,
          axisLine: { show: false },
          axisLabel: { 
            show: true,
            color: '#000000',
            fontSize: 12,
            backgroundColor: '#f3f4f6',
            borderRadius: 6,
            padding: [4, 8],
            interval: 'auto',
            formatter: (value: string, index: number) => {
              // Show labels for every few days to avoid crowding, but skip the first date
              if (index > 0 && index % Math.ceil(x.length / 8) === 0) {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }
              return null;
            }
          },
          axisTick: { show: false },
          splitLine: { show: false },
        },
        yAxis: {
          type: 'value',
          min: 0,
          axisLine: { show: false },
          axisLabel: { 
            color: '#000000',
            backgroundColor: '#f3f4f6',
            borderRadius: 6,
            padding: [4, 8],
            formatter: (value: number) => {
              if (value === 0) return '0';
              if (value < 1) return value.toFixed(1);
              return Math.round(value).toString();
            }
          },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        className: 'echarts-tooltip-p',
        formatter: (params: any) => {
          const d = params[0].axisValueLabel;
          const lines = params.map((p: any) =>
            `<div style="display:flex;gap:8px;align-items:center;margin:2px 0">
               <span style="width:8px;height:8px;border-radius:999px;background:${p.color}"></span>
               <span>${p.seriesName} — <b>${p.data}</b></span>
             </div>`
          ).join('');
          return `<div class="echarts-tooltip-p">
                    <div style="font-weight:600;margin-bottom:4px">${d}</div>
                    ${lines}
                  </div>`;
        }
      },
      series
    };
  };

  const handleLegendClick = (seriesName: string) => {
    if (chartRef.current) {
      const chart = chartRef.current.getEchartsInstance();
      chart.dispatchAction({
        type: 'legendToggleSelect',
        name: seriesName
      });
    }
  };

  const toggleFullscreen = () => {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;

    if (!document.fullscreenElement) {
      chartContainer.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const toggleSquareScreen = () => {
    setIsSquareScreen(!isSquareScreen);
  };

  const downloadWidget = async (type: 'monthly' | 'alltime') => {
    // Try multiple approaches
    const element = document.getElementById(`${type}-widget`);
    if (!element) return;

    // Approach 1: Try using the browser's native screenshot API (if available)
    try {
      if ('getDisplayMedia' in navigator) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        // This is more complex, let's try a simpler approach first
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (e) {
      // Continue to next approach
    }

    // Approach 2: Try a different canvas method
    try {
      // Hide buttons temporarily
      const downloadButtons = document.querySelector('.square-screen-download-buttons') as HTMLElement;
      const closeButton = document.querySelector('.square-screen-close') as HTMLElement;
      
      if (downloadButtons) downloadButtons.style.display = 'none';
      if (closeButton) closeButton.style.display = 'none';

      // Wait for DOM update and ensure images are loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Ensure all images in the element are loaded
      const images = element.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(true);
          } else {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
          }
        });
      }));

      // Try with dom-to-image instead of html2canvas
      // @ts-ignore
      const domtoimage = await import('dom-to-image').then(module => module.default);
      
      const dataUrl = await domtoimage.toPng(element, {
        quality: 1.0,
        bgcolor: 'white',
        width: 1600,
        height: 1600,
        style: {
          backgroundColor: 'white',
          transform: 'scale(4)',
          transformOrigin: 'top left',
          width: '400px',
          height: '400px'
        },
        filter: (node: any) => {
          // Keep all elements except download buttons and close button
          if (node.classList && (
            node.classList.contains('square-screen-download-buttons') ||
            node.classList.contains('square-screen-close')
          )) {
            return false;
          }
          return true;
        }
      });

      // Restore buttons
      if (downloadButtons) downloadButtons.style.display = 'flex';
      if (closeButton) closeButton.style.display = 'flex';

      // Download
      const link = document.createElement('a');
      link.download = `${type}-overview.png`;
      link.href = dataUrl;
      link.click();
      
      return;
    } catch (error) {
      console.log('dom-to-image failed, trying html2canvas...');
    }

    // Approach 3: Simplified html2canvas
    try {
      const downloadButtons = document.querySelector('.square-screen-download-buttons') as HTMLElement;
      const closeButton = document.querySelector('.square-screen-close') as HTMLElement;
      
      if (downloadButtons) downloadButtons.style.display = 'none';
      if (closeButton) closeButton.style.display = 'none';

      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Ensure all images in the element are loaded
      const images = element.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(true);
          } else {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
          }
        });
      }));

      const canvas = await import('html2canvas').then(module => module.default);
      const dataURL = await canvas(element, {
        background: 'white',
        logging: false,
        width: 1600,
        height: 1600,
        useCORS: true,
        allowTaint: true
      });

      if (downloadButtons) downloadButtons.style.display = 'flex';
      if (closeButton) closeButton.style.display = 'flex';

      const link = document.createElement('a');
      link.download = `${type}-overview.png`;
      link.href = dataURL.toDataURL('image/png');
      link.click();
      
      return;
    } catch (error) {
      console.log('html2canvas failed');
    }

    // Approach 4: Manual instructions with visual guidance
    const downloadButtons = document.querySelector('.square-screen-download-buttons') as HTMLElement;
    const closeButton = document.querySelector('.square-screen-close') as HTMLElement;
    if (downloadButtons) downloadButtons.style.display = 'flex';
    if (closeButton) closeButton.style.display = 'flex';

    // Highlight the widget temporarily
    (element as HTMLElement).style.border = '3px solid #007bff';
    (element as HTMLElement).style.boxShadow = '0 0 20px rgba(0, 123, 255, 0.5)';
    
    setTimeout(() => {
      (element as HTMLElement).style.border = '';
      (element as HTMLElement).style.boxShadow = '';
    }, 3000);

    alert(`Automatic download failed. I've highlighted the ${type} widget for you.

To save it manually:
1. Right-click on the highlighted ${type === 'monthly' ? 'left' : 'right'} widget
2. Choose "Save image as..." or "Copy image"
3. Or use Ctrl+Shift+S (Windows) / Cmd+Shift+4 (Mac) to screenshot

The widget is now highlighted for 3 seconds to show you exactly what to save.`);
  };

  const getSummaryText = (s: SummaryStats | null) => {
    if (!s) return 'Upload your CSV to see monthly stats.';
    
    return (
      <>
        <b>{s.avgDailyMTD.toFixed(1)}</b> h/day • <b>{s.projectedHours}</b> h projected • <b>{s.daysInMonth - s.daysElapsed}</b> days left
        <br />
        Top: <b>{s.mostActiveCategory}</b>
      </>
    );
  };

  const getWidgetChartOption = () => {
    if (!chartData) return {};

    const { labels, datasets } = chartData;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Filter to current month only
    const targetDate = new Date(currentYear, currentMonth, 1);
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    
    const foundIndex = labels.findIndex(label => {
      const labelDate = new Date(label);
      return labelDate >= targetDate && labelDate < nextMonth;
    });
    
    const endIndex = labels.findIndex(label => {
      const labelDate = new Date(label);
      return labelDate >= nextMonth;
    });
    
    let x = labels;
    let startIndex = 0;
    
    if (foundIndex !== -1) {
      startIndex = foundIndex;
      const endIdx = endIndex !== -1 ? endIndex : labels.length;
      x = labels.slice(startIndex, endIdx);
    }

    // Generate dynamic palette based on user selection
    const dynamicPalette = generateColorPalette(colorPalette, datasets.length);
    
    // Sort datasets by total values (highest first) for color assignment
    const sortedDatasets = [...datasets].map((ds, i) => ({
      ...ds,
      originalIndex: i,
      total: ds.data.reduce((sum, val) => sum + val, 0)
    })).sort((a, b) => b.total - a.total);
    
    // Build series with modern styling
    const series = datasets.map((ds, i) => {
      // Find the sorted position of this dataset
      const sortedIndex = sortedDatasets.findIndex(sd => sd.originalIndex === i);
      const col = dynamicPalette[sortedIndex % dynamicPalette.length];
      const y = ds.data.slice(startIndex);
      return {
        name: ds.label,
        type: 'line',
        smooth: 0.5,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        data: y,
        lineStyle: { 
          width: 12
        },
        itemStyle: { color: col },
        emphasis: {
          lineStyle: { width: 5 }
        },
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      };
    });

    // Find the highest value across all datasets for current month
    let maxValue = 0;
    let maxIndex = -1;
    let maxDataset = '';
    
    datasets.forEach(ds => {
      const monthData = ds.data.slice(startIndex, endIndex !== -1 ? endIndex : ds.data.length);
      monthData.forEach((value, index) => {
        if (value > maxValue) {
          maxValue = value;
          maxIndex = index;
          maxDataset = ds.label;
        }
      });
    });

    // Add highest value indicator as a scatter series
    if (maxIndex !== -1) {
      const indicatorData = new Array(x.length).fill(null);
      indicatorData[maxIndex] = maxValue;
      
      (series as any[]).push({
        name: 'Highest Value',
        type: 'scatter',
        data: indicatorData,
        symbol: 'circle',
        symbolSize: 16,
        itemStyle: {
          color: '#000000' // Fixed black circle
        },
        label: {
          show: true,
          position: 'top',
          formatter: `{text|${maxValue.toFixed(1)}}`,
          color: '#FFFFFF',
          fontSize: 24,
          fontWeight: 'bold',
          backgroundColor: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          borderRadius: 8,
          padding: [6, 12],
          rich: {
            text: {
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: 24
            }
          }
        },
        z: 10
      });
    }

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
        grid: { left: 0, right: 0, top: 40, bottom: 2 },
      xAxis: {
        type: 'category',
        data: x,
        boundaryGap: false,
        axisLine: { show: false },
        axisLabel: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLine: { show: false },
        axisLabel: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 0,
        padding: [8, 12],
        textStyle: { fontSize: 12 },
        formatter: (params: any) => {
          const d = params[0].axisValueLabel;
          const lines = params.map((p: any) =>
            `<div style="display:flex;gap:6px;align-items:center;margin:1px 0;font-size:11px">
               <span style="width:6px;height:6px;border-radius:999px;background:${p.color}"></span>
               <span>${p.seriesName}: <b>${p.data}</b></span>
             </div>`
          ).join('');
          return `<div style="font-weight:600;margin-bottom:4px;font-size:12px">${d}</div>${lines}`;
        }
      },
      series
    };
  };

  const getAllTimeChartOption = () => {
    if (!chartData) return {};

    const { labels, datasets } = chartData;

    // Smooth data by averaging over 5-day periods
    const smoothData = (data: number[], windowSize: number = 5) => {
      const smoothed = [];
      for (let i = 0; i < data.length; i += windowSize) {
        const window = data.slice(i, i + windowSize);
        const average = window.reduce((sum, val) => sum + val, 0) / window.length;
        smoothed.push(average);
      }
      return smoothed;
    };

    // Create smoothed labels (every 5th day)
    const smoothedLabels = [];
    for (let i = 0; i < labels.length; i += 5) {
      smoothedLabels.push(labels[i]);
    }

    // Generate dynamic palette based on user selection
    const dynamicPalette = generateColorPalette(colorPalette, datasets.length);
    
    // Build series with smoothed data
    const series = datasets.map((ds, i) => {
      const col = dynamicPalette[i % dynamicPalette.length];
      const smoothedY = smoothData(ds.data);
      return {
        name: ds.label,
        type: 'line',
        smooth: 0.5,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        data: smoothedY,
        lineStyle: { 
          width: 12
        },
        itemStyle: { color: col },
        emphasis: {
          lineStyle: { width: 5 }
        },
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      };
    });

    // Find the highest 5-day average across all datasets
    let maxValue = 0;
    let maxIndex = -1;
    let maxDataset = '';
    
    datasets.forEach(ds => {
      const smoothedY = smoothData(ds.data);
      smoothedY.forEach((value, index) => {
        if (value > maxValue) {
          maxValue = value;
          maxIndex = index;
          maxDataset = ds.label;
        }
      });
    });

    // Add highest value indicator as a scatter series
    if (maxIndex !== -1) {
      const indicatorData = new Array(smoothedLabels.length).fill(null);
      indicatorData[maxIndex] = maxValue;
      
      (series as any[]).push({
        name: 'Highest Value',
        type: 'scatter',
        data: indicatorData,
        symbol: 'circle',
        symbolSize: 16,
        itemStyle: {
          color: '#000000' // Fixed black circle
        },
        label: {
          show: true,
          position: 'top',
          formatter: `{text|${maxValue.toFixed(1)}}`,
          color: '#FFFFFF',
          fontSize: 24,
          fontWeight: 'bold',
          backgroundColor: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          borderRadius: 8,
          padding: [6, 12],
          rich: {
            text: {
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: 24
            }
          }
        },
        z: 10
      });
    }


    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
        grid: { left: 0, right: 0, top: 60, bottom: 2 },
      xAxis: {
        type: 'category',
        data: smoothedLabels,
        boundaryGap: false,
        axisLine: { show: false },
        axisLabel: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLine: { show: false },
        axisLabel: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 0,
        padding: [8, 12],
        textStyle: { fontSize: 12 },
        formatter: (params: any) => {
          const d = params[0].axisValueLabel;
          const lines = params.map((p: any) =>
            `<div style="display:flex;gap:6px;align-items:center;margin:1px 0;font-size:11px">
               <span style="width:6px;height:6px;border-radius:999px;background:${p.color}"></span>
               <span>${p.seriesName}: <b>${p.data}</b></span>
             </div>`
          ).join('');
          return `<div style="font-weight:600;margin-bottom:4px;font-size:12px">${d}</div>${lines}`;
        }
      },
      series
    };
  };

  const calculateAllTimeStats = (rows: CSVRow[], dateCol: string, catCol: string, valCol: string) => {
    const num = (x: any) => {
      const v = Number.parseFloat(String(x).replace(',', '.'));
      return Number.isFinite(v) ? v : 0;
    };

    // Total hours across all time
    const totalHours = rows.reduce((acc, r) => acc + num(r[valCol]), 0);
    
    // Get date range
    const dates = rows.map(r => parseDate(r[dateCol])).filter(Boolean).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const daysTotal = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1 : 1;
    const avgDaily = totalHours / daysTotal;

    // Most active category overall
    const byCat = new Map<string, number>();
    rows.forEach(r => {
      const cat = (r[catCol] ?? 'Unknown').toString().trim() || 'Unknown';
      byCat.set(cat, (byCat.get(cat) || 0) + num(r[valCol]));
    });
    const mostActiveCategory = Array.from(byCat.entries()).sort(([,a],[,b]) => b - a)[0]?.[0] ?? '—';

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      avgDaily: Math.round(avgDaily * 10) / 10,
      daysTotal,
      mostActiveCategory
    };
  };

  const AllTimeOverviewWidget = () => {
    // Calculate all-time stats from chartData
    const getAllTimeStats = () => {
      if (!chartData) return null;
      
      // Sum all data across all categories and time periods
      const totalHours = chartData.datasets.reduce((total, dataset) => 
        total + dataset.data.reduce((sum, value) => sum + value, 0), 0
      );
      
      // Calculate average daily
      const totalDays = chartData.labels.length;
      const avgDaily = totalDays > 0 ? totalHours / totalDays : 0;
      
      // Find most active category
      const categoryTotals = chartData.datasets.map(dataset => ({
        name: dataset.label,
        total: dataset.data.reduce((sum, value) => sum + value, 0)
      }));
      const mostActive = categoryTotals.reduce((max, current) => 
        current.total > max.total ? current : max, categoryTotals[0]
      );
      
      return {
        totalHours: Math.round(totalHours * 10) / 10,
        avgDaily: Math.round(avgDaily * 10) / 10,
        mostActiveCategory: mostActive?.name || '—'
      };
    };

    const allTimeStats = getAllTimeStats();

    return (
      <div className="monthly-overview-widget">
        <img 
          src="/assets/logo.png" 
          alt="Logo" 
          width={72} 
          height={72}
          className="opacity-80 absolute top-0 right-4 z-10"
          crossOrigin="anonymous"
        />
        <div className="pl-8 pr-8">
          <div className="text-3xl text-black font-medium">All Time Overview</div>
          
          <div className="mt-0 flex items-end gap-2">
            <div className="text-8xl font-bold">
              {allTimeStats ? allTimeStats.totalHours : '—'}
            </div>
            <div className="text-4xl font-medium ml-2">
              hr
            </div>
          </div>

        </div>


      {chartData && (
        <div className="flex-1" style={{ width: '100%', height: 'calc(100% - 20px)' }}>
          <ReactECharts
            option={getAllTimeChartOption()}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}

    </div>
    );
  };

  const MonthlyOverviewWidget = () => (
    <div className="monthly-overview-widget">
      <img 
        src="/assets/logo.png" 
        alt="Logo" 
        width={72} 
        height={72}
        className="opacity-80 absolute top-0 right-4 z-10"
        crossOrigin="anonymous"
      />
      <div className="pl-8 pr-8">
        <div className="text-3xl text-black font-medium">{new Date().toLocaleString('en-US', { month: 'long' })} Overview</div>
        
        <div className="mt-0 flex items-end gap-2">
          <div className="text-8xl font-bold">
            {summaryStats ? summaryStats.totalHours : '—'}
          </div>
          <div className="text-4xl font-medium ml-2">
            hr
          </div>
        </div>

      </div>

      {chartData && (() => {
        // Filter to current month data only
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const targetDate = new Date(currentYear, currentMonth, 1);
        const nextMonth = new Date(currentYear, currentMonth + 1, 1);
        
        const foundIndex = chartData.labels.findIndex(label => {
          const labelDate = new Date(label);
          return labelDate >= targetDate && labelDate < nextMonth;
        });
        
        const endIndex = chartData.labels.findIndex(label => {
          const labelDate = new Date(label);
          return labelDate >= nextMonth;
        });
        
        const startIndex = foundIndex !== -1 ? foundIndex : 0;
        const endIdx = endIndex !== -1 ? endIndex : chartData.labels.length;
        
        // Get categories that have data in current month
        const activeCategories = chartData.datasets.filter(ds => {
          const monthData = ds.data.slice(startIndex, endIdx);
          return monthData.some(value => value > 0);
        });

      })()}

      {chartData && (
        <div className="flex-1" style={{ width: '100%', height: 'calc(100% - 20px)' }}>
          <ReactECharts
            option={getWidgetChartOption()}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}
    </div>
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && chartData) {
        toggleFullscreen();
      }
      if (e.key.toLowerCase() === 's' && chartData) {
        toggleSquareScreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [chartData]);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/assets/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="opacity-90"
            />
            <span className="text-xl font-semibold text-black">Doit</span>
          </Link>
          <Link
            href="/"
            className="text-gray-600 hover:text-black transition-colors text-sm font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {isSquareScreen ? (
        <div className="square-screen-background">
          {/* Header */}
          <header className="square-screen-header">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/assets/logo.png"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="opacity-90"
                />
                <span className="text-xl font-semibold text-black">Doit</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => downloadWidget('monthly')}
                  className="download-button"
                  aria-label="Download Monthly Overview"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Monthly
                </button>
                <button
                  onClick={() => downloadWidget('alltime')}
                  className="download-button"
                  aria-label="Download All Time Overview"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  All Time
                </button>
                <button
                  onClick={toggleSquareScreen}
                  className="square-screen-close"
                  aria-label="Close square screen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="square-screen-content">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-black mb-4">
                  Doit Widgets
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Download and share your work insights with beautiful, professional widgets.
                </p>
              </div>
              
              <div className="square-screen-widgets-container">
                <div className="square-screen-container" id="monthly-widget">
                  <MonthlyOverviewWidget />
                </div>
                <div className="square-screen-container" id="alltime-widget">
                  <AllTimeOverviewWidget />
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="square-screen-footer">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/assets/logo.png"
                    alt="Logo"
                    width={24}
                    height={24}
                    className="opacity-70"
                  />
                  <span className="text-gray-600 text-sm">Doit Visualizer</span>
                </div>
                <p className="text-gray-500 text-sm">
                  Press ESC or click the X to exit
                </p>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        <>
          <main className="max-w-7xl mx-auto px-6 py-8">
            {/* Welcome Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-black mb-4">
                Doit Dashboard
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload your CSV file to visualize your work patterns, track productivity, and gain insights into your work habits.
              </p>
            </div>

            {/* Controls Section */}
            <div className="bg-gray-50 rounded-2xl p-8 mb-8">
              <h2 className="text-xl font-semibold text-black mb-6">Upload & Configure</h2>
              <div className="flex flex-wrap gap-4 items-center justify-center">
                <div className="relative">
                  <select 
                    id="range"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className="bg-white text-black border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 cursor-pointer min-w-[140px] appearance-none font-medium hover:border-gray-400 transition-colors"
                  >
                    <option value="all">All time</option>
                    {availableMonths.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                <label
                  htmlFor="file"
                  className="bg-white text-black border-2 border-gray-300 rounded-xl px-6 py-3 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors inline-block font-medium"
                >
                  {selectedFileName || 'Choose CSV File'}
                </label>
                <input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <button
                  onClick={handleRender}
                  className="bg-black text-white rounded-xl px-6 py-3 cursor-pointer hover:bg-gray-800 transition-colors font-medium"
                >
                  Generate Chart
                </button>
                {chartData && (
                  <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border-2 border-gray-300">
                    <span className="text-sm font-medium text-gray-700">Theme:</span>
                    <select
                      value={colorPalette}
                      onChange={(e) => setColorPalette(e.target.value as 'colorful' | 'red' | 'green' | 'blue' | 'black' | 'white' | 'yellow' | 'orange' | 'purple')}
                      className="px-2 py-1 border-0 rounded-lg text-sm bg-transparent font-medium focus:outline-none"
                    >
                      <option value="colorful">Colorful</option>
                      <option value="red">Red</option>
                      <option value="green">Green</option>
                      <option value="blue">Blue</option>
                      <option value="yellow">Yellow</option>
                      <option value="orange">Orange</option>
                      <option value="purple">Purple</option>
                      <option value="black">Black</option>
                      <option value="white">White</option>
                    </select>
                  </div>
                )}
                
                {chartData && (
                  <div className="flex gap-2">
                    <button
                      onClick={toggleFullscreen}
                      className="bg-white text-black border-2 border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium"
                    >
                      {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </button>
                    <button
                      onClick={toggleSquareScreen}
                      className="bg-white text-black border-2 border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium"
                    >
                      {isSquareScreen ? 'Exit Square Screen' : 'Square Screen'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chart Section */}
            {chartData ? (
              <div className="space-y-8">
                {/* Summary Stats */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-black mb-2">Monthly Overview</h3>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-6xl font-bold text-black">
                        {summaryStats ? summaryStats.totalHours : '—'}
                      </div>
                      <div className="text-2xl font-medium text-gray-600">hours</div>
                      {summaryStats && (
                        <span
                          className={`text-sm font-semibold px-3 py-2 rounded-xl inline-flex items-center gap-1
                            ${summaryStats.projectedDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                          aria-label="projected monthly change"
                        >
                          {summaryStats.projectedDelta >= 0 ? '▲' : '▼'}
                          {Math.abs(summaryStats.projectedRate)}%
                        </span>
                      )}
                    </div>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                      {getSummaryText(summaryStats)}
                    </p>
                  </div>
                </div>

                {/* Execution Analytics */}
                {execParagraph && (
                  <div className="bg-white rounded-2xl p-8 border border-gray-200">
                    <h3 className="text-xl font-semibold text-black mb-4">Execution Analytics</h3>
                    <div className="bg-gray-50 rounded-xl p-6">
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {execParagraph}
                      </p>
                    </div>
                  </div>
                )}

                {/* Insight Summary */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                  <h3 className="text-xl font-semibold text-black mb-6">Insight Summary</h3>
                  <InsightSummaryApp analytics={insightAnalytics} rows={csvRows} />
                </div>

                {/* Chart Visualization */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                  <h3 className="text-xl font-semibold text-black mb-6 text-center">Work Pattern Visualization</h3>
                  <div className="chart-container" style={{ width: '100%', height: '400px' }}>
                    {chartData && (
                      <ReactECharts
                        ref={chartRef}
                        option={getChartOption()}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </div>
                  
                  {chartData && (
                    <div className="mt-6">
                      <h4 className="text-lg font-medium text-black mb-4 text-center">Categories</h4>
                      <div className="flex flex-wrap gap-4 justify-center">
                        {chartData.datasets.map((ds, i) => {
                          const dynamicPalette = generateColorPalette(colorPalette, chartData.datasets.length);
                          // Sort datasets by total values (highest first) for color assignment
                          const sortedDatasets = [...chartData.datasets].map((ds, i) => ({
                            ...ds,
                            originalIndex: i,
                            total: ds.data.reduce((sum, val) => sum + val, 0)
                          })).sort((a, b) => b.total - a.total);
                          const sortedIndex = sortedDatasets.findIndex(sd => sd.originalIndex === i);
                          const color = dynamicPalette[sortedIndex % dynamicPalette.length];
                          return (
                            <button
                              key={ds.label}
                              className="flex gap-3 items-center text-sm text-black hover:opacity-70 transition-opacity bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-medium"
                              onClick={() => handleLegendClick(ds.label)}
                            >
                              <span 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: color }}
                              />
                              {ds.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">No Data Yet</h3>
                <p className="text-gray-600 mb-6">Upload a CSV file above to start visualizing your work patterns.</p>
              </div>
            )}
          </main>
        </>
      )}

      <style jsx global>{`
        .echarts-tooltip-p {
          background: rgba(255, 255, 255, 0.85) !important;
          color: #0E1116 !important;
          padding: 8px 10px !important;
          border-radius: 12px !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25) !important;
        }
        
        .chart-container:fullscreen {
          padding: 0 !important;
          height: 100vh !important;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
          position: relative !important;
        }
        
        .chart-container:fullscreen::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          z-index: 10;
        }
        
        .chart-container:fullscreen .echarts-for-react {
          background: white !important;
          border-radius: 20px !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1) !important;
          margin: 100px 40px 40px 40px !important;
          padding: 20px !important;
          width: calc(100% - 80px) !important;
          height: calc(100% - 140px) !important;
        }
        
        .square-screen-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: white;
          display: flex;
          flex-direction: column;
          z-index: 1000;
        }
        
        .square-screen-header {
          padding: 24px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .square-screen-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .square-screen-footer {
          padding: 24px 0;
          border-top: 1px solid #e5e7eb;
        }
        
        .square-screen-close {
          background: white;
          border: 2px solid #d1d5db;
          border-radius: 12px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #374151;
          transition: all 0.2s ease;
        }
        
        .square-screen-close:hover {
          background: #f9fafb;
          border-color: #9ca3af;
          transform: scale(1.05);
        }
        
        .download-button {
          background: white;
          border: 2px solid #d1d5db;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .download-button:hover {
          background: #f9fafb;
          border-color: #9ca3af;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .square-screen-widgets-container {
          display: flex;
          gap: 3rem;
          align-items: center;
          justify-content: center;
        }
        
        .square-screen-container {
          position: relative;
          width: 420px;
          height: 420px;
          background: white;
          border-radius: 24px;
          padding: 2rem 0 0 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        
             .monthly-overview-widget {
               position: relative;
               width: 100%;
               height: 100%;
               display: flex;
               flex-direction: column;
               justify-content: center;
             }
             
             .legend-section {
               line-height: 0.4 !important;
             }
             
             .legend-section > div {
               margin-bottom: -8px !important;
             }
      `}</style>
    </div>
  );
}
