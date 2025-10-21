'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';

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

function guessColumns(headers: string[]) {
  const dateCol  = headers.find(h => /date|created|time/i.test(h)) ?? headers[0];
  const catCol   = headers.find(h => /category|project|tag|type/i.test(h)) ?? headers[1] ?? headers[0];
  const hoursCol = headers.find(h => /hours?|duration|value|amount/i.test(h)) ?? headers.at(-1) ?? headers[0];
  const execCol  = headers.find(h => /execute|action|note/i.test(h)) ?? 'Execute'; // common in your CSV
  return { dateCol, catCol, hoursCol, execCol };
}

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
export default function DoitConversationalParagraph() {
  const [paragraph, setParagraph] = useState<string>('');
  const [status, setStatus] = useState<string>('Pick a CSV to generate your summary.');

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('Parsing CSV…');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as Row[]).filter(Boolean);
        const headers = res.meta.fields ?? Object.keys(rows[0] ?? {});
        if (!rows.length || !headers.length) { setStatus('No rows found.'); return; }

        const { dateCol, catCol, hoursCol, execCol } = guessColumns(headers);
        const s = computeStats(rows, dateCol, catCol, hoursCol, execCol);
        if (!s) { setStatus('Could not compute stats.'); return; }

        const mix = s.focusTop.map(f => `${f.k} ${f.pct}%`).join(', ') || '—';
        const hoursTrend = s.dHp === 0 ? 'flat' : (s.dHp > 0 ? `${s.dHp}% higher` : `${Math.abs(s.dHp)}% lower`);
        const execTrend  = s.dEp === 0 ? 'flat' : (s.dEp > 0 ? `${s.dEp}% higher` : `${Math.abs(s.dEp)}% lower`);

        const p =
          `This month you've logged **${s.mtdHours}h** across **${s.mtdExec}** executions—` +
          `about **${s.avgH}h/day** and **${s.avgE} exec/day**—putting you on pace for **${s.projH}h** (and ~**${s.projE}** executions) by month-end. ` +
          `Your current mix leans **${mix}**. Compared with last month, your projected hours are **${hoursTrend}** and executions **${execTrend}**—a pace check, not a judgment. ` +
          `Each execution averages **${s.gran} min**, with roughly **${s.switches}** context switches per active day. ` +
          `Across your full log (${s.range}), you've accumulated **${s.lifetimeHours}h** over **${s.lifetimeExec}** executions across **${s.lifetimeDays}** active days.`;

        setParagraph(p);
        setStatus(`Parsed ${rows.length} rows • Using: ${dateCol} / ${catCol} / ${hoursCol} / ${execCol}`);
      },
      error: (err) => setStatus(`Parse failed: ${String(err)}`),
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={onPick}
        className="block w-full text-sm text-black file:mr-4 file:rounded-md file:border-0 file:bg-black file:px-4 file:py-2 file:text-white hover:file:bg-black/80"
      />
      <div className="text-sm text-black/60">{status}</div>

      {paragraph && (
        <p className="rounded-2xl border border-black/10 bg-white p-5 text-[15px] leading-7 text-black">
          {paragraph.split(/(\*\*.*?\*\*)/g).map((seg, i) =>
            seg.startsWith('**') && seg.endsWith('**') ? (
              <strong key={i} className="font-semibold">{seg.slice(2, -2)}</strong>
            ) : (
              <span key={i}>{seg}</span>
            )
          )}
        </p>
      )}
    </div>
  );
}

