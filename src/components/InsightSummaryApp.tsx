"use client";
import React, { useMemo, useState } from "react";
import Papa from "papaparse";

// ===== Types =====
export type CategoryShare = { project: string; hoursShare: number; execShare: number };
export interface Analytics {
  // coverage
  firstDate: Date | null; lastDate: Date | null; monthsActive: number; lifetimeActiveDays: number;
  // lifetime totals
  totalHours: number; totalExec: number;
  // trends
  hoursSlope: number; execSlope: number; delta3H: number; delta3E: number;
  // monthly pace
  daysElapsed: number; daysInMonth: number;
  mtdHours: number; mtdExec: number; avgHoursDay: number; avgExecDay: number;
  projectedHours: number; projectedExec: number;
  lastHours: number; lastExec: number;
  // granularity & switches
  avgMinPerExecOverall: number; avgMinPerExecThis: number; switchesThis: number; switchesOverall: number;
  // categories
  allCatsOverall: CategoryShare[];
  allCatsThisMonth: CategoryShare[];
  // concentration
  hhiHoursOverall: number; hhiExecOverall: number; hhiHoursThis: number; hhiExecThis: number;
}

// ===== Helpers =====
const splitExec = (s: unknown): string[] => String(s ?? "").split(/[;，,]+/).map(x => x.trim()).filter(Boolean);
const toNum = (x: any) => { const v = Number.parseFloat(String(x).replace(",", ".")); return Number.isFinite(v) ? v : 0; };
const dayKey = (d: Date) => isNaN(d.getTime()) ? null : d.toISOString().slice(0,10);
const monthKey = (d: Date) => isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const fmt = (n: number | string, digits = 0) => typeof n === "number" ? n.toLocaleString(undefined,{maximumFractionDigits:digits}) : String(n);

function slopePerMonth(points: Array<{x:number;y:number}>): number {
  const n = points.length; if (n < 2) return 0;
  const sumX = points.reduce((s,p)=>s+p.x,0);
  const sumY = points.reduce((s,p)=>s+p.y,0);
  const sumXY = points.reduce((s,p)=>s+p.x*p.y,0);
  const sumXX = points.reduce((s,p)=>s+p.x*p.x,0);
  const denom = (n*sumXX - sumX*sumX); if (!denom) return 0;
  return (n*sumXY - sumX*sumY) / denom;
}

// ===== Core analytics from parsed rows =====
export function computeExecAnalytics(
  rows: Record<string, any>[],
  dateCol: string = "Date",
  projectCol: string = "Project",
  hoursCol: string = "Hours"
): Analytics {
  const byDay: Record<string,{hours:number;exec:number;switches:number;last?:string}> = {};
  const byMonth: Record<string,{hours:number;exec:number;activeDays:Set<string>}> = {};
  const byCatOverall: Record<string,{hours:number;exec:number}> = {};
  const byCatThisMonth: Record<string,{hours:number;exec:number}> = {};

  let firstDate: Date | null = null; let lastDate: Date | null = null;

  for (const r of rows) {
    const d = new Date(String(r[dateCol] ?? ""));
    const dk = dayKey(d); const mk = monthKey(d);
    if (!dk || !mk) continue;
    firstDate = !firstDate || d < firstDate ? d : firstDate;
    lastDate  = !lastDate  || d > lastDate  ? d : lastDate;

    const p = String(r[projectCol] ?? "Unknown").trim() || "Unknown";
    const h = toNum(r[hoursCol]);
    const e = splitExec(r["Execute"]).length;

    if (!byDay[dk]) byDay[dk] = { hours:0, exec:0, switches:0, last: undefined };
    byDay[dk].hours += h; byDay[dk].exec += e;
    if (byDay[dk].last !== undefined && byDay[dk].last !== p) byDay[dk].switches += 1;
    byDay[dk].last = p;

    if (!byMonth[mk]) byMonth[mk] = { hours:0, exec:0, activeDays:new Set() };
    byMonth[mk].hours += h; byMonth[mk].exec += e; if (h>0 || e>0) byMonth[mk].activeDays.add(dk);

    if (!byCatOverall[p]) byCatOverall[p] = { hours:0, exec:0 };
    byCatOverall[p].hours += h; byCatOverall[p].exec += e;
  }

  const now = new Date(); const Y = now.getFullYear(); const M = now.getMonth();
  const startThis = new Date(Y, M, 1); const startNext = new Date(Y, M+1, 1);
  const startLast = new Date(Y, M-1, 1);
  let mtdHours = 0, mtdExec = 0, mtdSwitch = 0, activeDaysThis = 0;
  Object.entries(byDay).forEach(([k,v])=>{ const d=new Date(k); if (d>=startThis && d<startNext){ mtdHours+=v.hours; mtdExec+=v.exec; mtdSwitch+=v.switches; if (v.hours>0||v.exec>0) activeDaysThis+=1; }});

  rows.forEach(r=>{ const d=new Date(String(r[dateCol] ?? "")); if (!(d>=startThis && d<startNext)) return; const p=String(r[projectCol] ?? "Unknown").trim()||"Unknown"; const h=toNum(r[hoursCol]); const e=splitExec(r["Execute"]).length; if (!byCatThisMonth[p]) byCatThisMonth[p]={hours:0,exec:0}; byCatThisMonth[p].hours+=h; byCatThisMonth[p].exec+=e; });

  const lastKey = `${startLast.getFullYear()}-${String(startLast.getMonth()+1).padStart(2,"0")}`;
  const lastHours = byMonth[lastKey]?.hours ?? 0; const lastExec = byMonth[lastKey]?.exec ?? 0;

  const totalHours = Object.values(byMonth).reduce((s,m)=>s+m.hours,0);
  const totalExec  = Object.values(byMonth).reduce((s,m)=>s+m.exec,0);
  const monthsActive = Object.keys(byMonth).length;
  const daysInMonth = new Date(Y, M+1, 0).getDate(); const daysElapsed = now.getDate();
  const avgHoursDay = mtdHours / Math.max(1, daysElapsed);
  const avgExecDay  = mtdExec  / Math.max(1, daysElapsed);
  const projectedHours = avgHoursDay * daysInMonth; const projectedExec = avgExecDay * daysInMonth;

  const monthKeysSorted = Object.keys(byMonth).sort();
  const hoursSeries = monthKeysSorted.map((k,i)=>({x:i,y:byMonth[k].hours}));
  const execSeries  = monthKeysSorted.map((k,i)=>({x:i,y:byMonth[k].exec}));
  const hoursSlope = Math.round(slopePerMonth(hoursSeries)*10)/10;
  const execSlope  = Math.round(slopePerMonth(execSeries)*10)/10;

  const lastN = (arr:number[], n:number)=>arr.slice(Math.max(0,arr.length-n));
  const seqH = monthKeysSorted.map(k=>byMonth[k].hours);
  const seqE = monthKeysSorted.map(k=>byMonth[k].exec);
  const avg3LastH = lastN(seqH,3).reduce((a,b)=>a+b,0)/Math.max(1,lastN(seqH,3).length);
  const avg3PrevH = lastN(seqH,6).slice(0,Math.max(0,lastN(seqH,6).length-3)).reduce((a,b)=>a+b,0)/Math.max(1,lastN(seqH,6).length-3);
  const avg3LastE = lastN(seqE,3).reduce((a,b)=>a+b,0)/Math.max(1,lastN(seqE,3).length);
  const avg3PrevE = lastN(seqE,6).slice(0,Math.max(0,lastN(seqE,6).length-3)).reduce((a,b)=>a+b,0)/Math.max(1,lastN(seqE,6).length-3);
  const delta3H = Math.round(((avg3LastH - (avg3PrevH||0)) / (avg3PrevH||1)) * 100);
  const delta3E = Math.round(((avg3LastE - (avg3PrevE||0)) / (avg3PrevE||1)) * 100);

  const totalHOverall = Object.values(byCatOverall).reduce((a,b)=>a+b.hours,0);
  const totalEOverall = Object.values(byCatOverall).reduce((a,b)=>a+b.exec,0);
  const totalHThis    = Object.values(byCatThisMonth).reduce((a,b)=>a+b.hours,0);
  const totalEThis    = Object.values(byCatThisMonth).reduce((a,b)=>a+b.exec,0);

  const allCatsOverall = Object.entries(byCatOverall).sort((a,b)=>b[1].hours-a[1].hours).map(([k,v])=>({ project:k, hoursShare: totalHOverall? Math.round((v.hours/totalHOverall)*100):0, execShare: totalEOverall? Math.round((v.exec/totalEOverall)*100):0 }));
  const allCatsThisMonth = Object.entries(byCatThisMonth).sort((a,b)=>b[1].hours-a[1].hours).map(([k,v])=>({ project:k, hoursShare: totalHThis? Math.round((v.hours/totalHThis)*100):0, execShare: totalEThis? Math.round((v.exec/totalEThis)*100):0 }));

  const hhi = (entries: Array<{share:number}>) => Math.round(entries.reduce((s,e)=> s + Math.pow((e.share||0)/100,2), 0)*1000)/1000;
  const hhiHoursOverall = hhi(allCatsOverall.map(x=>({share:x.hoursShare})));
  const hhiExecOverall  = hhi(allCatsOverall.map(x=>({share:x.execShare})));
  const hhiHoursThis    = hhi(allCatsThisMonth.map(x=>({share:x.hoursShare})));
  const hhiExecThis     = hhi(allCatsThisMonth.map(x=>({share:x.execShare})));

  const allDayKeys = Object.keys(byDay).sort();
  const lifetimeActiveDays = allDayKeys.filter(k=> (byDay[k].hours>0 || byDay[k].exec>0)).length;
  let longestStreak = 0, current = 0, prev: Date | null = null; // kept for potential future use
  for (const k of allDayKeys){const d=new Date(k); const active=(byDay[k].hours>0||byDay[k].exec>0); if (!prev || (d.getTime()-prev.getTime())===86400000){ current = active ? current+1 : 0; } else { current = active ? 1 : 0; } longestStreak = Math.max(longestStreak,current); prev=d;}

  const switchesThis = mtdSwitch / Math.max(1, activeDaysThis);
  const switchesOverall = Object.values(byDay).reduce((s,v)=>s+v.switches,0) / Math.max(1, lifetimeActiveDays);

  return {
    firstDate, lastDate, monthsActive, lifetimeActiveDays,
    totalHours: Math.round(totalHours*10)/10, totalExec,
    hoursSlope, execSlope, delta3H, delta3E,
    daysElapsed, daysInMonth,
    mtdHours: Math.round(mtdHours*10)/10, mtdExec,
    avgHoursDay: Math.round(avgHoursDay*10)/10, avgExecDay: Math.round(avgExecDay*10)/10,
    projectedHours: Math.round(projectedHours*10)/10, projectedExec: Math.round(projectedExec),
    lastHours: Math.round(lastHours*10)/10, lastExec,
    avgMinPerExecOverall: totalExec? Math.round((totalHours*60)/totalExec):0,
    avgMinPerExecThis: mtdExec? Math.round((mtdHours*60)/mtdExec):0,
    switchesThis: Math.round(switchesThis*10)/10, switchesOverall: Math.round(switchesOverall*10)/10,
    allCatsOverall, allCatsThisMonth,
    hhiHoursOverall, hhiExecOverall, hhiHoursThis, hhiExecThis,
  };
}

// ===== UI building blocks =====
const Pill: React.FC<{ label: string; value: string | number; tone?: "neutral" | "pos" | "neg" }> = ({ label, value, tone = "neutral" }) => {
  const cl = tone === "pos" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : tone === "neg" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cl}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
};

const Progress: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden" aria-label="month progress">
    <div className="h-full bg-gray-900" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

const Sparkline: React.FC<{ values: number[]; height?: number }> = ({ values, height = 32 }) => {
  if (!values || values.length < 2) return <div className="h-8"/>;
  const w = 160; const max = Math.max(...values); const min = Math.min(...values);
  const norm = (v: number) => max === min ? height/2 : height - ((v - min) / (max - min)) * height;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${norm(v)}`).join(" ");
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width={w} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#111" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="#111" strokeWidth="2" points={pts} />
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill="url(#sg)" opacity={0.35} />
      <circle cx={w} cy={norm(last)} r={3.5} fill="#111" />
    </svg>
  );
};

const CategoryRow: React.FC<{ project: string; hoursShare: number; execShare: number }> = ({ project, hoursShare, execShare }) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <div className="truncate text-sm font-medium text-gray-800" title={project}>{project}</div>
    <div className="flex-1">
      <div className="h-1.5 rounded bg-gray-200 overflow-hidden">
        <div className="h-full bg-gray-900" style={{ width: `${hoursShare}%` }} />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Pill label="h%" value={`${hoursShare}%`} />
      <Pill label="exec%" value={`${execShare}%`} />
    </div>
  </div>
);

// ===== Panel (visual, objective) =====
const InsightSummaryPanel: React.FC<{ a: Analytics; recentSeriesHours?: number[]; recentSeriesExec?: number[] }> = ({ a, recentSeriesHours, recentSeriesExec }) => {
  const monthName = new Date().toLocaleString("en-US", { month: "long" });
  const lifeSpan = a.firstDate && a.lastDate ? `${a.firstDate.toISOString().slice(0,10)} → ${a.lastDate.toISOString().slice(0,10)}` : "entire log";
  const dH = Number((a.projectedHours - a.lastHours).toFixed(1));
  const dE = Number((a.projectedExec - a.lastExec).toFixed(0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">Time & Execution Overview</h2>
          <p className="text-sm text-gray-500">Coverage: {lifeSpan} • {a.monthsActive} active month{a.monthsActive === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill label="Total Hours" value={fmt(a.totalHours,1)} />
          <Pill label="Total Exec" value={fmt(a.totalExec)} />
          <Pill label="Granularity" value={`${fmt(a.avgMinPerExecOverall)} min/exec`} />
        </div>
      </div>

      {/* Pace & Projection */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-end gap-3">
            <div>
              <div className="text-sm text-gray-600">{monthName} MTD</div>
              <div className="text-3xl font-bold text-gray-900">{fmt(a.mtdHours,1)}h</div>
            </div>
            <Pill label="exec" value={fmt(a.mtdExec)} />
            <Pill label="avg/day" value={`${fmt(a.avgHoursDay,1)}h · ${fmt(a.avgExecDay,1)} exec`} />
            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${dH>0?"bg-emerald-100 text-emerald-700":dH<0?"bg-rose-100 text-rose-700":"bg-gray-100 text-gray-700"}`}>Δ {fmt(dH,1)}h vs last</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${dE>0?"bg-emerald-100 text-emerald-700":dE<0?"bg-rose-100 text-rose-700":"bg-gray-100 text-gray-700"}`}>Δ {fmt(dE)} exec vs last</span>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Days {a.daysElapsed}/{a.daysInMonth}</span>
              <span>Projected {fmt(a.projectedHours,1)}h · {fmt(a.projectedExec)} exec</span>
            </div>
            <Progress value={(a.daysElapsed/Math.max(1,a.daysInMonth))*100} />
          </div>
          {(recentSeriesHours?.length || recentSeriesExec?.length) ? (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-600 mb-1">Recent hours</div>
                <Sparkline values={recentSeriesHours || []} />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Recent executions</div>
                <Sparkline values={recentSeriesExec || []} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Texture & Quality */}
        <div className="md:col-span-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <Pill label="HHI hours (this)" value={a.hhiHoursThis} />
            <Pill label="HHI exec (this)" value={a.hhiExecThis} />
            <Pill label="Granularity (this)" value={`${fmt(a.avgMinPerExecThis)} min/exec`} />
            <Pill label="Switches/day (this)" value={fmt(a.switchesThis,1)} />
            <Pill label="Slope (lifetime)" value={`${fmt(a.hoursSlope,1)}h / ${fmt(a.execSlope,1)} exec / mo`} />
            <Pill label="3M momentum" value={`${a.delta3H>=0?'+':''}${a.delta3H}% / ${a.delta3E>=0?'+':''}${a.delta3E}%`} />
          </div>
          <p className="text-xs text-gray-500 mt-3">Neutral description — pace, focus and fragmentation; compared only to yourself.</p>
        </div>
      </div>

      {/* Category allocation — Lifetime */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Category allocation (hours% / exec%) — lifetime</h3>
          <Pill label="HHI" value={`${a.hhiHoursOverall} / ${a.hhiExecOverall}`} />
        </div>
        <div className="divide-y divide-gray-100">
          {a.allCatsOverall.map(c => (
            <CategoryRow key={`life-${c.project}`} project={c.project} hoursShare={c.hoursShare} execShare={c.execShare} />
          ))}
        </div>
      </div>

      {/* Category allocation — This month */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Category allocation (hours% / exec%) — this month</h3>
          <Pill label="HHI" value={`${a.hhiHoursThis} / ${a.hhiExecThis}`} />
        </div>
        <div className="divide-y divide-gray-100">
          {a.allCatsThisMonth.map(c => (
            <CategoryRow key={`mo-${c.project}`} project={c.project} hoursShare={c.hoursShare} execShare={c.execShare} />
          ))}
        </div>
      </div>

      {/* Footer narrative */}
      <div className="text-sm text-gray-700">
        {`Summary: ${fmt(a.totalHours,1)}h and ${fmt(a.totalExec)} executions lifetime across ${a.lifetimeActiveDays} active days; `+
         `current month pacing toward ${fmt(a.projectedHours,1)}h / ${fmt(a.projectedExec)} exec with `+
         `${a.daysElapsed}/${a.daysInMonth} days elapsed.`}
      </div>
    </div>
  );
};

// ===== App shell: receives analytics data from parent =====
const InsightSummaryApp: React.FC<{ analytics: Analytics | null; rows: Record<string, any>[] }> = ({ analytics, rows }) => {
  const recentHours = useMemo(()=>{
    if (!rows.length) return [] as number[];
    const map: Record<string, number> = {};
    rows.forEach(r=>{ const dk = dayKey(new Date(String(r.Date))); if (!dk) return; map[dk]=(map[dk]||0)+toNum(r.Hours); });
    return Object.keys(map).sort().slice(-20).map(k=>map[k]);
  },[rows]);

  const recentExec = useMemo(()=>{
    if (!rows.length) return [] as number[];
    const map: Record<string, number> = {};
    rows.forEach(r=>{ const dk = dayKey(new Date(String(r.Date))); if (!dk) return; map[dk]=(map[dk]||0)+splitExec(r.Execute).length; });
    return Object.keys(map).sort().slice(-20).map(k=>map[k]);
  },[rows]);

  if (!analytics) {
    return (
      <div className="border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
        Upload your CSV and click "Generate Chart" to see an objective, visual summary of pace, focus and execution.
      </div>
    );
  }

  return (
    <InsightSummaryPanel a={analytics} recentSeriesHours={recentHours} recentSeriesExec={recentExec} />
  );
};

export default InsightSummaryApp;
