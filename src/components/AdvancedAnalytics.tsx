'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as analytics from '../lib/analytics';

interface AdvancedAnalyticsProps {
  workLogs: Array<{
    date: string;
    project: string;
    hours: number;
    execute: string | null;
  }>;
}

export default function AdvancedAnalytics({ workLogs }: AdvancedAnalyticsProps) {
  // Transform data to analytics format
  const analyticsData = useMemo(() => {
    return workLogs.map(log => ({
      date: log.date,
      category: log.project,
      hours: log.hours,
      execute: log.execute || ''
    }));
  }, [workLogs]);

  const summary = useMemo(() => analytics.calculateSummary(analyticsData), [analyticsData]);
  const themeDays = useMemo(() => analytics.getThemeDays(analyticsData), [analyticsData]);
  const focusQuality = useMemo(() => analytics.getFocusQuality(analyticsData), [analyticsData]);
  const consistencyScore = useMemo(() => analytics.getConsistencyScore(analyticsData), [analyticsData]);
  const timeseries = useMemo(() => analytics.getTimeseries(analyticsData), [analyticsData]);

  if (workLogs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#4950c5] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h3>
          <p className="text-lg text-gray-600">Add work logs to see analytics.</p>
        </div>
      </div>
    );
  }

  // KPI Strip Component
  const KpiStrip = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#f1f2f3] p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Total Hours</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalHours.toFixed(1)}</div>
        </div>
        <div className="bg-[#f1f2f3] p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Executions</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalExecs}</div>
        </div>
        <div className="bg-[#f1f2f3] p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Hours/Day</div>
          <div className="text-2xl font-bold text-gray-900">{summary.paceHoursPerDay.toFixed(1)}</div>
        </div>
        <div className="bg-[#f1f2f3] p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Exec/Day</div>
          <div className="text-2xl font-bold text-gray-900">{summary.paceExecsPerDay.toFixed(1)}</div>
        </div>
        <div className="bg-[#f1f2f3] p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Deep Work</div>
          <div className="text-2xl font-bold text-gray-900">{(summary.deepWorkRatio * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-[#f1f2f3] p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Avg Block</div>
          <div className="text-2xl font-bold text-gray-900">{summary.avgBlockMinutes.toFixed(0)}m</div>
        </div>
        <div className="bg-[#f1f2f3] p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Switches/Day</div>
          <div className="text-2xl font-bold text-gray-900">{summary.meanSwitchesPerDay.toFixed(1)}</div>
        </div>
        <div className="bg-[#f1f2f3] p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Score</div>
          <div className="text-2xl font-bold text-[#4950c5]">{consistencyScore.score}</div>
        </div>
      </div>

      {/* Category Mix */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Category Mix</h4>
        <div className="space-y-2">
          {summary.mix.slice(0, 5).map((cat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="text-sm text-gray-700 w-32 truncate">{cat.category}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#4950c5] h-2 rounded-full"
                  style={{ width: `${cat.share * 100}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 w-16 text-right">
                {cat.hours.toFixed(1)}h ({(cat.share * 100).toFixed(0)}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Work Patterns Chart
  const WorkPatternsChart = () => {
    const chartOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: Array.from(new Set(analyticsData.map(d => d.category))),
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeseries.days.map(d => d.date),
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        name: 'Hours'
      },
      series: (() => {
        const categories = Array.from(new Set(analyticsData.map(d => d.category)));
        return categories.map(cat => ({
          name: cat,
          type: 'line',
          stack: 'total',
          areaStyle: {},
          emphasis: { focus: 'series' },
          data: timeseries.days.map(day => {
            const catData = day.categories.find(c => c.category === cat);
            return catData ? catData.hours : 0;
          })
        }));
      })()
    };

    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Patterns (Stacked)</h3>
        <ReactECharts option={chartOption} style={{ height: '300px' }} />
      </div>
    );
  };

  // Theme Day Matrix
  const ThemeDayMatrix = () => {
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const categories = Array.from(new Set(themeDays.map(t => t.category)));
    
    // Group by weekday
    const matrix: Record<number, Array<{ category: string; share: number; isTheme: boolean }>> = {};
    for (const t of themeDays) {
      if (!matrix[t.weekday]) matrix[t.weekday] = [];
      matrix[t.weekday].push(t);
    }

    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme Days (≥40% = Theme)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Day</th>
                {categories.map((cat, i) => (
                  <th key={i} className="text-left py-2 px-3 font-semibold text-gray-700">{cat}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5, 6].map(weekday => (
                <tr key={weekday} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900">{weekdayNames[weekday]}</td>
                  {categories.map((cat, i) => {
                    const item = matrix[weekday]?.find(t => t.category === cat);
                    const share = item?.share ?? 0;
                    const isTheme = item?.isTheme ?? false;
                    return (
                      <td key={i} className="py-2 px-3">
                        <div
                          className={`inline-block px-2 py-1 rounded ${
                            isTheme ? 'bg-[#4950c5] text-white font-bold' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {(share * 100).toFixed(0)}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Focus Quality Panel
  const FocusQualityPanel = () => {
    const histogramOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: focusQuality.histogram.map(h => h.bin),
        name: 'Minutes per Execution'
      },
      yAxis: {
        type: 'value',
        name: 'Count'
      },
      series: [{
        type: 'bar',
        data: focusQuality.histogram.map(h => ({
          value: h.count,
          itemStyle: {
            color: h.bin === '50-90' ? '#4950c5' : '#cbd5e1'
          }
        })),
        emphasis: {
          itemStyle: { color: '#3d42a8' }
        }
      }]
    };

    const weeklyOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Deep Hours', 'Switches/Day'],
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: focusQuality.weekly.map(w => w.weekStart)
      },
      yAxis: [
        {
          type: 'value',
          name: 'Deep Hours',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Switches/Day',
          position: 'right'
        }
      ],
      series: [
        {
          name: 'Deep Hours',
          type: 'bar',
          data: focusQuality.weekly.map(w => w.deepHours),
          itemStyle: { color: '#4950c5' }
        },
        {
          name: 'Switches/Day',
          type: 'line',
          yAxisIndex: 1,
          data: focusQuality.weekly.map(w => w.switchesPerDay),
          itemStyle: { color: '#ef4444' }
        }
      ]
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Block Length Distribution</h3>
          <ReactECharts option={histogramOption} style={{ height: '250px' }} />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Deep Work vs Switches</h3>
          <ReactECharts option={weeklyOption} style={{ height: '250px' }} />
        </div>
      </div>
    );
  };

  // Consistency Score Card
  const ConsistencyScoreCard = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Consistency Score</h3>
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="#4950c5"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - consistencyScore.score / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{consistencyScore.score}</span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Deep Work Ratio</span>
          <span className="text-sm font-semibold text-gray-900">
            {(consistencyScore.deepWorkRatio * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Switches/Day</span>
          <span className="text-sm font-semibold text-gray-900">
            {consistencyScore.meanSwitchesPerDay.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-500">
          Score = 60% deep work + 40% (1 - normalized switches)
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-6">
        {/* KPI Strip */}
        <KpiStrip />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <WorkPatternsChart />
            <ConsistencyScoreCard />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ThemeDayMatrix />
            <FocusQualityPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

