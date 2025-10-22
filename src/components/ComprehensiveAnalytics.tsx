'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as analytics from '../lib/analytics';
import WorkPatternVisualization from './WorkPatternVisualization';

interface ComprehensiveAnalyticsProps {
  workLogs: Array<{
    date: string;
    project: string;
    hours: number;
    execute: string | null;
  }>;
  csvRows: Record<string, any>[];
  columnNames: { dateCol: string, catCol: string, valCol: string } | null;
}

export default function ComprehensiveAnalytics({ workLogs, csvRows, columnNames }: ComprehensiveAnalyticsProps) {
  const [activeView, setActiveView] = useState<number>(0);

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

  const fixedColors = ['#4950c5', '#3d42a8', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316'];

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

  // Tab definitions
  const tabs = [
    'Consistency',
    'Focus',
    'Right Things',
    'Best Time',
    'Improving'
  ];

  // Summary Text Components for each tab (adaptive, ~20 words)
  const getSummaryText = (tabIndex: number) => {
    const getCategoryColor = (categoryName: string) => {
      const categoryIndex = summary.mix.findIndex(cat => cat.category === categoryName);
      return categoryIndex !== -1 ? fixedColors[categoryIndex % fixedColors.length] : '#4950c5';
    };

    const formatBold = (text: string, isColored: boolean = false, categoryName?: string, key?: string) => {
      const color = isColored && categoryName ? getCategoryColor(categoryName) : '#000000';
      return <strong key={key || text} className="font-black text-black" style={{ fontWeight: '900', color }}>{text}</strong>;
    };

    const formatGray = (text: string, key?: string) => <span key={key || text} className="font-semibold text-gray-600">{text}</span>;

    // Calculate weekly metrics for "Improving" tab
    const recentWeek = focusQuality.weekly[focusQuality.weekly.length - 1];
    const previousWeek = focusQuality.weekly[focusQuality.weekly.length - 2];
    const isImproving = recentWeek && previousWeek 
      ? recentWeek.deepHours > previousWeek.deepHours && recentWeek.switchesPerDay < previousWeek.switchesPerDay
      : null;

    // Calculate active days
    const byDay = analytics.groupByDay(analyticsData);
    const activeDays = Array.from(byDay.values()).filter(d => d.hours > 0).length;
    
    // Calculate streak (consecutive days with work)
    const sortedDates = Array.from(byDay.keys()).sort();
    let currentStreak = 0;
    
    if (sortedDates.length > 0) {
      // Start from the most recent work day and count backwards
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        const currentDate = new Date(sortedDates[i]);
        const previousDate = i > 0 ? new Date(sortedDates[i - 1]) : null;
        
        if (i === sortedDates.length - 1) {
          // First day (most recent) always counts
          currentStreak = 1;
        } else if (previousDate) {
          // Check if this day is consecutive to the previous day
          const dayDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
          if (dayDiff === 1) {
            currentStreak++;
          } else {
            break; // Streak broken
          }
        }
      }
    }

    switch (tabIndex) {
      case 0: // Consistency
        // Adaptive: Good if score >= 70, streak >= 3, switches <= 2
        const isConsistent = consistencyScore.score >= 70 && currentStreak >= 3 && summary.meanSwitchesPerDay <= 2;
        
        if (isConsistent) {
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Strong: ', 'status')}
                {formatBold(`${consistencyScore.score}/100`, false, undefined, 'score')}
                {formatGray(' score, ', 'comma1')}
                {formatBold(`${currentStreak}`, false, undefined, 'streak')}
                {formatGray('-day streak, ', 'streak-label')}
                {formatBold(`${summary.meanSwitchesPerDay.toFixed(1)}`, false, undefined, 'switches')}
                {formatGray(' switches/day. Keep two deep blocks daily.', 'advice')}
              </p>
            </div>
          );
        } else {
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Needs work: ', 'status')}
                {formatBold(`${consistencyScore.score}/100`, false, undefined, 'score')}
                {formatGray(' score, ', 'comma1')}
                {formatBold(`${currentStreak}`, false, undefined, 'streak')}
                {formatGray('-day streak, ', 'streak-label')}
                {formatBold(`${summary.meanSwitchesPerDay.toFixed(1)}`, false, undefined, 'switches')}
                {formatGray(' switches/day. Reduce switches, maintain ', 'advice1')}
                {formatBold(`5`, false, undefined, 'target')}
                {formatGray(' active days weekly.', 'advice2')}
              </p>
            </div>
          );
        }

      case 1: // Focus
        // Adaptive: Good if avg block >= 60min, deep work >= 50%, marathons < 10%
        const deepWorkBin = focusQuality.histogram.find(h => h.bin === '50-90');
        const totalBlocks = focusQuality.histogram.reduce((s, h) => s + h.count, 0);
        const deepWorkBlocks = deepWorkBin?.count || 0;
        const marathonBin = focusQuality.histogram.find(h => h.bin === '>180');
        const marathonBlocks = marathonBin?.count || 0;
        const isFocused = summary.avgBlockMinutes >= 60 && summary.deepWorkRatio >= 0.5 && (marathonBlocks / totalBlocks) < 0.1;
        
        if (isFocused) {
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Excellent: ', 'status')}
                {formatBold(`${summary.avgBlockMinutes.toFixed(0)}min`, false, undefined, 'avg-block')}
                {formatGray(' avg, ', 'comma1')}
                {formatBold(`${deepWorkBlocks}/${totalBlocks}`, false, undefined, 'deep-blocks')}
                {formatGray(' optimal (50-90min). Schedule two long sessions daily for consistency.', 'advice')}
              </p>
            </div>
          );
        } else {
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Improve focus: ', 'status')}
                {formatBold(`${summary.avgBlockMinutes.toFixed(0)}min`, false, undefined, 'avg-block')}
                {formatGray(' avg, only ', 'comma1')}
                {formatBold(`${deepWorkBlocks}/${totalBlocks}`, false, undefined, 'deep-blocks')}
                {formatGray(' optimal (50-90min). Combine tiny tasks, aim ', 'advice1')}
                {formatBold(`60min`, false, undefined, 'target')}
                {formatGray(' blocks.', 'advice2')}
              </p>
            </div>
          );
        }

      case 2: // Right Things
        // Adaptive: Good if top category >= 30%, zero-days <= 2/week for each category
        const topCategoryShare = summary.mix[0]?.share || 0;
        const isBalanced = topCategoryShare >= 0.30 && summary.mix.length <= 5;
        
        if (isBalanced) {
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Balanced: Top ', 'status')}
                {formatBold(summary.mix[0]?.category || '', true, summary.mix[0]?.category, 'top-cat')}
                {formatGray(' ', 'space1')}
                {formatBold(`${(topCategoryShare * 100).toFixed(0)}%`, false, undefined, 'top-percent')}
                {formatGray(', ', 'comma1')}
                {formatBold(summary.mix[1]?.category || '', true, summary.mix[1]?.category, 'second-cat')}
                {formatGray(' ', 'space2')}
                {formatBold(`${((summary.mix[1]?.share || 0) * 100).toFixed(0)}%`, false, undefined, 'second-percent')}
                {formatGray('. Keep portfolio focused.', 'advice')}
              </p>
            </div>
          );
        } else {
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Rebalance: Top ', 'status')}
                {formatBold(summary.mix[0]?.category || '', true, summary.mix[0]?.category, 'top-cat')}
                {formatGray(' only ', 'space1')}
                {formatBold(`${(topCategoryShare * 100).toFixed(0)}%`, false, undefined, 'top-percent')}
                {formatGray('. Double down on priorities, reduce ', 'advice1')}
                {formatBold(`${summary.mix.length}`, false, undefined, 'cat-count')}
                {formatGray(' categories to ', 'advice2')}
                {formatBold(`3-4`, false, undefined, 'target')}
                {formatGray('.', 'period')}
              </p>
            </div>
          );
        }

      case 3: // Best Time
        // Adaptive: Good if >= 3 theme days (≥40% dominance)
        const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const themeDaysByWeekday = themeDays.filter(t => t.isTheme).reduce((acc, t) => {
          if (!acc[t.weekday]) acc[t.weekday] = [];
          acc[t.weekday].push(t);
          return acc;
        }, {} as Record<number, typeof themeDays>);
        const themeCount = Object.keys(themeDaysByWeekday).length;
        const hasThemes = themeCount >= 3;
        
        if (hasThemes) {
          const topThemes = Object.entries(themeDaysByWeekday).slice(0, 2);
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Locked: ', 'status')}
                {formatBold(`${themeCount}`, false, undefined, 'theme-count')}
                {formatGray(' theme days. ', 'label')}
                {topThemes.map(([weekday, themes], i) => (
                  <React.Fragment key={`theme-${i}`}>
                    {i > 0 && formatGray(', ', `comma-${i}`)}
                    {formatBold(weekdayNames[Number(weekday)], false, undefined, `weekday-${i}`)}
                    {formatGray(':', `colon-${i}`)}
                    {formatBold(themes[0]?.category || '', true, themes[0]?.category, `cat-${i}`)}
                  </React.Fragment>
                ))}
                {formatGray('. Defend these days.', 'advice')}
              </p>
            </div>
          );
        } else {
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Build themes: Only ', 'status')}
                {formatBold(`${themeCount}`, false, undefined, 'theme-count')}
                {formatGray(' days ≥40% focus. Assign ', 'label')}
                {formatBold(`2-3`, false, undefined, 'target1')}
                {formatGray(' categories to specific days, push meetings away. Target ', 'advice')}
                {formatBold(`3+`, false, undefined, 'target2')}
                {formatGray(' theme days.', 'end')}
              </p>
            </div>
          );
        }

      case 4: // Improving
        // Adaptive: Improving if recent week > previous week (deep hours up, switches down)
        if (isImproving === null || focusQuality.weekly.length < 2) {
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Building data: Need ', 'status')}
                {formatBold(`2+`, false, undefined, 'target')}
                {formatGray(' weeks to track improvement. Current: ', 'label')}
                {formatBold(`${focusQuality.weekly.length}`, false, undefined, 'weeks')}
                {formatGray(' week(s). Keep logging to see trends.', 'advice')}
              </p>
            </div>
          );
        } else if (isImproving) {
          const deepChange = recentWeek.deepHours - previousWeek.deepHours;
          const switchChange = previousWeek.switchesPerDay - recentWeek.switchesPerDay;
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Improving: Deep hours ', 'status')}
                {formatBold(`+${deepChange.toFixed(1)}h`, false, undefined, 'deep-change')}
                {formatGray(', switches ', 'label1')}
                {formatBold(`-${switchChange.toFixed(1)}`, false, undefined, 'switch-change')}
                {formatGray(' this week. Protect weekly targets, review last week every Sunday.', 'advice')}
              </p>
            </div>
          );
        } else {
          const deepChange = recentWeek.deepHours - previousWeek.deepHours;
          const switchChange = recentWeek.switchesPerDay - previousWeek.switchesPerDay;
          return (
            <div className="text-black leading-tight font-black">
              <p className="leading-tight font-black mb-2">
                {formatGray('Declining: Deep hours ', 'status')}
                {formatBold(`${deepChange.toFixed(1)}h`, false, undefined, 'deep-change')}
                {formatGray(', switches ', 'label1')}
                {formatBold(`+${switchChange.toFixed(1)}`, false, undefined, 'switch-change')}
                {formatGray(' this week. Push coordination later, refocus on deep blocks.', 'advice')}
              </p>
            </div>
          );
        }

      default:
        return null;
    }
  };

  // Visualization Components for each tab
  const getVisualization = (tabIndex: number) => {
    const byDay = analytics.groupByDay(analyticsData);
    const activeDays = Array.from(byDay.values()).filter(d => d.hours > 0).length;
    
    // Calculate streak
    const sortedDates = Array.from(byDay.keys()).sort();
    let currentStreak = 0;
    
    if (sortedDates.length > 0) {
      // Start from the most recent work day and count backwards
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        const currentDate = new Date(sortedDates[i]);
        const previousDate = i > 0 ? new Date(sortedDates[i - 1]) : null;
        
        if (i === sortedDates.length - 1) {
          // First day (most recent) always counts
          currentStreak = 1;
        } else if (previousDate) {
          // Check if this day is consecutive to the previous day
          const dayDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
          if (dayDiff === 1) {
            currentStreak++;
          } else {
            break; // Streak broken
          }
        }
      }
    }

    switch (tabIndex) {
      case 0: // Consistency - Score Gauge + Counters
        return (
          <div className="bg-white rounded-2xl h-full p-6 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Consistency Score</h3>
            <div className="relative w-48 h-48 mb-6">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#4950c5"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - consistencyScore.score / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-bold text-gray-900">{consistencyScore.score}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div className="bg-[#f1f2f3] p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">{currentStreak}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
              <div className="bg-[#f1f2f3] p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">{activeDays}</div>
                <div className="text-sm text-gray-600">Active Days</div>
              </div>
              <div className="bg-[#f1f2f3] p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">{summary.meanSwitchesPerDay.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Switches/Day</div>
              </div>
              <div className="bg-[#f1f2f3] p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-[#4950c5]">{(summary.deepWorkRatio * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-600">Deep Work</div>
              </div>
            </div>
          </div>
        );

      case 1: // Focus - Block Length Histogram
        const histogramOption = {
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            top: '10%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: focusQuality.histogram.map(h => h.bin),
            name: 'Minutes per Execution',
            nameLocation: 'middle',
            nameGap: 30
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

        return (
          <div className="bg-white rounded-2xl h-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Block Length Distribution</h3>
            <ReactECharts 
              key={`focus-${activeView}`}
              option={histogramOption} 
              style={{ height: 'calc(100% - 40px)' }} 
            />
          </div>
        );

      case 2: // Right Things - Category Mix
        const categoryChartOption = {
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}h ({d}%)'
          },
          legend: {
            orient: 'vertical',
            right: 10,
            top: 'center'
          },
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['40%', '50%'],
            data: summary.mix.map((cat, i) => ({
              value: cat.hours,
              name: cat.category,
              itemStyle: { color: fixedColors[i % fixedColors.length] }
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              formatter: '{b}\n{d}%'
            }
          }]
        };

        return (
          <div className="bg-white rounded-2xl h-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Mix</h3>
            <ReactECharts 
              key={`right-things-${activeView}`}
              option={categoryChartOption} 
              style={{ height: 'calc(100% - 40px)' }} 
            />
          </div>
        );

      case 3: // Best Time - Theme Days
        const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const categories = Array.from(new Set(themeDays.map(t => t.category)));
        
        const matrix: Record<number, Array<{ category: string; share: number; isTheme: boolean }>> = {};
        for (const t of themeDays) {
          if (!matrix[t.weekday]) matrix[t.weekday] = [];
          matrix[t.weekday].push(t);
        }

        return (
          <div className="bg-white rounded-2xl h-full p-6 overflow-y-auto">
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

      case 4: // Improving - Weekly Deep Work vs Switches
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
            bottom: '10%',
            top: '15%',
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
          <div className="bg-white rounded-2xl h-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Deep Work vs Switches</h3>
            <ReactECharts 
              key={`improving-${activeView}`}
              option={weeklyOption} 
              style={{ height: 'calc(100% - 40px)' }} 
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="mb-4 flex justify-center overflow-x-auto">
        <div className="flex items-center gap-4">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveView(index)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center justify-center ${
                activeView === index
                  ? 'bg-[#4950c5] text-white'
                  : 'bg-[#f1f2f3] text-black hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 min-h-0">
        {/* Left: Summary Text */}
        <div key={`summary-${activeView}`} className="bg-[#f1f2f3] h-full overflow-y-auto rounded-2xl p-8">
          <div className="text-6xl space-y-8">
            {getSummaryText(activeView)}
          </div>
        </div>

        {/* Right: Visualization */}
        <div key={`visualization-${activeView}`} className="h-full overflow-hidden">
          {getVisualization(activeView)}
        </div>
      </div>
    </div>
  );
}

