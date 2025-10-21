'use client';

import React from 'react';

/** ---------- helpers ---------- */
type Row = Record<string, any>;
const splitExec = (s: unknown) =>
  String(s ?? '').split(/[;，,]+/).map(x => x.trim()).filter(Boolean);

const parseDate = (s: any): Date | null => {
  if (s == null) return null;
  const raw = String(s);
  for (const v of [raw, raw.split(' ')[0]]) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
};

const num = (x: any) => {
  const v = Number.parseFloat(String(x).replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
};

const pct = (delta: number, base: number) => (!base ? 0 : (delta / base) * 100);
const round1 = (n: number) => Math.round(n * 10) / 10;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const monKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;

function computeStats(rows: Row[], dateCol: string, catCol: string, hoursCol: string, execCol: string) {
  if (!rows.length) return null;

  const byDay: Record<string,{h:number; e:number; sw:number; last?:string}> = {};
  const byMonth: Record<string,{h:number; e:number; days:Set<string>}> = {};
  const byCatThis: Record<string,{h:number; e:number}> = {};
  let first: Date | null = null, last: Date | null = null;

  // Aggregate
  for (const r of rows) {
    const d = parseDate(r[dateCol]); if (!d) continue;
    first = !first || d < first ? d : first;
    last  = !last  || d > last  ? d : last;

    const dk = dayKey(d), mk = monKey(d);
    const cat = (r[catCol] ?? 'Unknown').toString().trim() || 'Unknown';
    const h = num(r[hoursCol]);
    const e = splitExec(r[execCol]).length;

    if (!byDay[dk]) byDay[dk] = {h:0, e:0, sw:0, last: undefined};
    byDay[dk].h += h; byDay[dk].e += e;
    if (byDay[dk].last !== undefined && byDay[dk].last !== cat) byDay[dk].sw += 1;
    byDay[dk].last = cat;

    if (!byMonth[mk]) byMonth[mk] = {h:0, e:0, days:new Set()};
    byMonth[mk].h += h; byMonth[mk].e += e;
    if (h>0 || e>0) byMonth[mk].days.add(dk);
  }

  // Lifetime
  const lifetimeHours = round1(Object.values(byMonth).reduce((s,m)=>s+m.h,0));
  const lifetimeExec  = Object.values(byMonth).reduce((s,m)=>s+m.e,0);
  const lifetimeDays  = Object.values(byMonth).reduce((s,m)=>s+m.days.size,0);
  const range         = first && last ? `${dayKey(first)} → ${dayKey(last)}` : '—';

  // This month
  const now = new Date(); const y=now.getFullYear(), m=now.getMonth();
  const startThis = new Date(y,m,1), startNext = new Date(y,m+1,1), startLast = new Date(y,m-1,1);
  const daysInMonth = new Date(y,m+1,0).getDate(); const daysElapsed = now.getDate();

  let mH=0, mE=0, sw=0, activeDays=0;
  Object.entries(byDay).forEach(([k,v])=>{
    const d=new Date(k); if (d>=startThis && d<startNext){
      mH += v.h; mE += v.e; sw += v.sw; if (v.h>0 || v.e>0) activeDays++;
    }
  });

  // Month categories (share by hours, top 4)
  for (const r of rows) {
    const d = parseDate(r[dateCol]); if (!d || d<startThis || d>=startNext) continue;
    const cat = (r[catCol] ?? 'Unknown').toString().trim() || 'Unknown';
    const h = num(r[hoursCol]); const e = splitExec(r[execCol]).length;
    if (!byCatThis[cat]) byCatThis[cat] = {h:0, e:0};
    byCatThis[cat].h += h; byCatThis[cat].e += e;
  }
  const totalHThis = Object.values(byCatThis).reduce((a,b)=>a+b.h,0) || 1;
  const focusTop = Object.entries(byCatThis)
    .map(([k,v]) => ({k, pct: Math.round((v.h/totalHThis)*100)}))
    .sort((a,b)=>b.pct-a.pct)
    .slice(0,4);

  const avgH = mH/Math.max(1,daysElapsed);
  const avgE = mE/Math.max(1,daysElapsed);
  const projH = round1(avgH*daysInMonth);
  const projE = round1(avgE*daysInMonth);

  const lastKey = monKey(startLast);
  const lastH = round1(byMonth[lastKey]?.h ?? 0);
  const lastE = byMonth[lastKey]?.e ?? 0;

  const dHp = Math.round(pct(projH - lastH, lastH));
  const dEp = Math.round(pct(projE - lastE, lastE));

  const gran = mE ? Math.round((mH*60)/mE) : 0;
  const switches =
    activeDays
      ? round1(sw/activeDays)
      : 0;

  return {
    monthLabel: now.toLocaleString('en-US',{month:'long'}),
    mtdHours: round1(mH),
    mtdExec: mE,
    avgH: round1(avgH),
    avgE: round1(avgE),
    projH, projE,
    lastH, lastE, dHp, dEp,
    gran, switches,
    focusTop, lifetimeHours, lifetimeExec, lifetimeDays, range
  };
}

/** ---------- component ---------- */
type DoitExecutionSummaryParagraphProps = {
  rows: Row[];
  dateCol: string;
  catCol: string;
  hoursCol: string;
  execCol: string;
  colors?: string[];
  variant?: 'dashboard' | 'widget';
  theme?: 'light' | 'dark';
};

export default function DoitExecutionSummaryParagraph({ 
  rows, 
  dateCol, 
  catCol, 
  hoursCol, 
  execCol,
  colors = ['#4950c5', '#3d42a8', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316'],
  variant = 'widget',
  theme = 'dark'
}: DoitExecutionSummaryParagraphProps) {
  const s = computeStats(rows, dateCol, catCol, hoursCol, execCol);
  
  if (!s) return null;

  const mix = s.focusTop.map(f => `${f.k} ${f.pct}%`).join(', ') || '—';
  const hoursTrend = s.dHp === 0 ? 'flat' : (s.dHp > 0 ? `${s.dHp}% higher` : `${Math.abs(s.dHp)}% lower`);
  const execTrend  = s.dEp === 0 ? 'flat' : (s.dEp > 0 ? `${s.dEp}% higher` : `${Math.abs(s.dEp)}% lower`);

  const paragraph =
    `This month currently: **${s.mtdHours}h**, **${s.mtdExec}** executions; pace **${s.avgH}h/day**, **${s.avgE}/day**; projected **${s.projH}h**.\nMix: **${mix}**.`;

  // Function to get color for a category name
  const getCategoryColor = (categoryName: string) => {
    const categoryIndex = s.focusTop.findIndex(cat => cat.k === categoryName);
    return categoryIndex !== -1 ? colors[categoryIndex % colors.length] : '#ffffff';
  };

  // Different styling based on variant
  if (variant === 'dashboard') {
    return (
      <div className="text-black leading-tight font-black">
        {paragraph.split('\n').map((line, lineIndex) => (
          <p key={lineIndex} className="leading-tight font-black mb-2">
            {line.split(/(\*\*.*?\*\*)/g).map((seg, i) => {
              if (seg.startsWith('**') && seg.endsWith('**')) {
                const content = seg.slice(2, -2);
                // Check if this segment contains category names
                let coloredContent = content;
                s.focusTop.forEach(cat => {
                  if (content.includes(cat.k)) {
                    const color = getCategoryColor(cat.k);
                    coloredContent = coloredContent.replace(cat.k, `<span style="color: ${color}; font-weight: 900;">${cat.k}</span>`);
                  }
                });
                
                return (
                  <strong key={i} className="font-black text-black" style={{ fontWeight: '900' }} dangerouslySetInnerHTML={{ __html: coloredContent }} />
                );
              } else {
                return <span key={i} className="font-semibold text-gray-600">{seg}</span>;
              }
            })}
          </p>
        ))}
      </div>
    );
  }

  // Widget variant (default)
  return (
    <div className={`leading-tight font-black ${theme === 'light' ? 'text-black' : 'text-white'}`}>
      {paragraph.split('\n').map((line, lineIndex) => (
        <p key={lineIndex} className="leading-tight font-black mb-1">
          {line.split(/(\*\*.*?\*\*)/g).map((seg, i) => {
            if (seg.startsWith('**') && seg.endsWith('**')) {
              const content = seg.slice(2, -2);
              // Check if this segment contains category names
              let coloredContent = content;
              s.focusTop.forEach(cat => {
                if (content.includes(cat.k)) {
                  const color = getCategoryColor(cat.k);
                  coloredContent = coloredContent.replace(cat.k, `<span style="color: ${color}; font-weight: 900;">${cat.k}</span>`);
                }
              });
              
              return (
                <strong key={i} className={`font-black ${theme === 'light' ? 'text-black' : 'text-white'}`} style={{ fontWeight: '900' }} dangerouslySetInnerHTML={{ __html: coloredContent }} />
              );
            } else {
              return <span key={i} className={`font-semibold ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{seg}</span>;
            }
          })}
        </p>
      ))}
    </div>
  );
}
