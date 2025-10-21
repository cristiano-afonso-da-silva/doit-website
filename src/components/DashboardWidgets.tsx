'use client';

import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import DoitExecutionSummaryParagraph from './DoitExecutionSummaryParagraph';

interface SummaryStats {
  totalHours: number;
  daysElapsed: number;
  daysInMonth: number;
  avgDailyMTD: number;
  projectedHours: number;
  lastMonthHours: number;
  projectedDelta: number;
  projectedRate: number;
  mostActiveCategory: string;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

interface DashboardWidgetsProps {
  summaryStats: SummaryStats | null;
  chartData: ChartData | null;
  csvRows: Record<string, any>[];
  columnNames: { dateCol: string, catCol: string, valCol: string } | null;
  downloadWidget: (type: 'monthly' | 'alltime' | 'execution-analysis', theme?: 'light' | 'dark') => void;
}

export default function DashboardWidgets({ 
  summaryStats, 
  chartData, 
  csvRows, 
  columnNames, 
  downloadWidget 
}: DashboardWidgetsProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  const MonthlyOverviewWidget = () => (
    <div className="monthly-overview-widget">
      <div className="pl-8 pr-6">
        <div className={`text-3xl font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
          {new Date().toLocaleString('en-US', { month: 'long' })} Overview
        </div>
        
        <div className="mt-0 flex items-end gap-2">
          <div className={`text-8xl font-black ${theme === 'light' ? 'text-black' : 'text-white'}`} style={{ fontWeight: '900' }}>
            {summaryStats ? summaryStats.totalHours : '—'}
          </div>
          <div className={`text-4xl font-medium ml-2 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
            hr
          </div>
        </div>
      </div>

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

  const AllTimeOverviewWidget = () => {
    const getAllTimeStats = () => {
      if (!chartData) return null;
      
      const totalHours = chartData.datasets.reduce((total, dataset) => 
        total + dataset.data.reduce((sum, value) => sum + value, 0), 0
      );
      
      const totalDays = chartData.labels.length;
      const avgDaily = totalDays > 0 ? totalHours / totalDays : 0;
      
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
        <div className="pl-8 pr-6">
          <div className={`text-3xl font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>All Time Overview</div>
          
          <div className="mt-0 flex items-end gap-2">
            <div className={`text-8xl font-black ${theme === 'light' ? 'text-black' : 'text-white'}`} style={{ fontWeight: '900' }}>
              {allTimeStats ? allTimeStats.totalHours : '—'}
            </div>
            <div className={`text-4xl font-medium ml-2 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
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

  const ExecutionAnalysisWidget = () => (
    <div className="execution-analysis-widget">
      <div className="pl-8 pr-8 pb-8">
        {csvRows.length && columnNames ? (
          <div className={`leading-relaxed font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`} style={{ fontSize: '2rem', lineHeight: '2.2' }}>
            <DoitExecutionSummaryParagraph
              rows={csvRows}
              dateCol={columnNames.dateCol}
              catCol={columnNames.catCol}
              hoursCol={columnNames.valCol}
              execCol="Execute"
              theme={theme}
              colors={['#4950c5', '#3d42a8', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316']}
              variant="widget"
            />
          </div>
        ) : (
          <div className={`text-center ${theme === 'light' ? 'text-black' : 'text-white'}`}>
            <div className="text-lg font-medium mb-2">No data available</div>
            <div className="text-xs opacity-75">Upload CSV data to see your execution analysis</div>
          </div>
        )}
      </div>
    </div>
  );

  const getWidgetChartOption = () => {
    if (!chartData) return {};

    const { labels, datasets } = chartData;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

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

    const fixedPalette = ['#4950c5', '#3d42a8', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316'];
    
    const sortedDatasets = [...datasets].map((ds, i) => ({
      ...ds,
      originalIndex: i,
      total: ds.data.reduce((sum, val) => sum + val, 0)
    })).sort((a, b) => b.total - a.total);
    
    const series = datasets.map((ds, i) => {
      const sortedIndex = sortedDatasets.findIndex(sd => sd.originalIndex === i);
      const col = fixedPalette[sortedIndex % fixedPalette.length];
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
          width: 16,
          color: col
        },
        itemStyle: { color: col },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${col}40` },
              { offset: 1, color: `${col}10` }
            ]
          }
        },
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
          color: theme === 'light' ? '#000000' : '#FFFFFF'
        },
        label: {
          show: true,
          position: 'top',
          formatter: `{text|${maxValue.toFixed(1)}}`,
          color: theme === 'light' ? '#FFFFFF' : '#000000',
          fontSize: 24,
          fontWeight: 'bold',
          backgroundColor: theme === 'light' ? '#000000' : '#FFFFFF',
          borderColor: theme === 'light' ? '#000000' : '#FFFFFF',
          borderWidth: 0,
          borderRadius: 8,
          padding: [6, 12],
          rich: {
            text: {
              color: theme === 'light' ? '#FFFFFF' : '#000000',
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
        backgroundColor: theme === 'light' ? 'white' : 'rgba(0, 0, 0, 0.9)',
        borderWidth: 1,
        borderColor: theme === 'light' ? '#e5e7eb' : 'transparent',
        padding: [12, 16],
        textStyle: { fontSize: 14, color: theme === 'light' ? '#000000' : '#FFFFFF' },
        formatter: (params: any) => {
          const d = params[0].axisValueLabel;
          const textColor = theme === 'light' ? '#000000' : '#FFFFFF';
          const lines = params.map((p: any) =>
            `<div style="display:flex;gap:8px;align-items:center;margin:2px 0;font-size:13px;color:${textColor}">
               <span style="width:8px;height:8px;border-radius:999px;background:${theme === 'light' ? 'white' : 'rgba(255, 255, 255, 0.9)'};border:2px solid ${p.color}"></span>
               <span>${p.seriesName}: <b>${p.data}</b></span>
             </div>`
          ).join('');
          return `<div style="font-weight:600;margin-bottom:6px;font-size:14px;color:${textColor}">${d}</div>${lines}`;
        }
      },
      series
    };
  };

  const getAllTimeChartOption = () => {
    if (!chartData) return {};

    const { labels, datasets } = chartData;

    const smoothData = (data: number[], windowSize: number = 5) => {
      const smoothed = [];
      for (let i = 0; i < data.length; i += windowSize) {
        const window = data.slice(i, i + windowSize);
        const average = window.reduce((sum, val) => sum + val, 0) / window.length;
        smoothed.push(average);
      }
      return smoothed;
    };

    const smoothedLabels = [];
    for (let i = 0; i < labels.length; i += 5) {
      smoothedLabels.push(labels[i]);
    }

    const fixedPalette = ['#4950c5', '#3d42a8', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316'];
    
    const series = datasets.map((ds, i) => {
      const col = fixedPalette[i % fixedPalette.length];
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
          width: 16,
          color: col
        },
        itemStyle: { color: col },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${col}40` },
              { offset: 1, color: `${col}10` }
            ]
          }
        },
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
          color: theme === 'light' ? '#000000' : '#FFFFFF'
        },
        label: {
          show: true,
          position: 'top',
          formatter: `{text|${maxValue.toFixed(1)}}`,
          color: theme === 'light' ? '#FFFFFF' : '#000000',
          fontSize: 24,
          fontWeight: 'bold',
          backgroundColor: theme === 'light' ? '#000000' : '#FFFFFF',
          borderColor: theme === 'light' ? '#000000' : '#FFFFFF',
          borderWidth: 0,
          borderRadius: 8,
          padding: [6, 12],
          rich: {
            text: {
              color: theme === 'light' ? '#FFFFFF' : '#000000',
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
        backgroundColor: theme === 'light' ? 'white' : 'rgba(0, 0, 0, 0.9)',
        borderWidth: 1,
        borderColor: theme === 'light' ? '#e5e7eb' : 'transparent',
        padding: [12, 16],
        textStyle: { fontSize: 14, color: theme === 'light' ? '#000000' : '#FFFFFF' },
        formatter: (params: any) => {
          const d = params[0].axisValueLabel;
          const textColor = theme === 'light' ? '#000000' : '#FFFFFF';
          const lines = params.map((p: any) =>
            `<div style="display:flex;gap:8px;align-items:center;margin:2px 0;font-size:13px;color:${textColor}">
               <span style="width:8px;height:8px;border-radius:999px;background:${theme === 'light' ? 'white' : 'rgba(255, 255, 255, 0.9)'};border:2px solid ${p.color}"></span>
               <span>${p.seriesName}: <b>${p.data}</b></span>
             </div>`
          ).join('');
          return `<div style="font-weight:600;margin-bottom:6px;font-size:14px;color:${textColor}">${d}</div>${lines}`;
        }
      },
      series
    };
  };

  return (
    <div className="h-full">
      <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
        {chartData ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-black mb-4">
                Doit Widgets
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Download and share your work insights with beautiful, professional widgets.
              </p>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            <div 
              className="square-screen-container" 
              id="monthly-widget"
              style={{
                backgroundColor: theme === 'light' ? '#e8e8e8' : 'black',
                color: theme === 'light' ? 'black' : 'white',
                position: 'relative',
                width: '420px',
                height: '420px',
                padding: '2rem 0 0 0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                boxShadow: 'none',
                overflow: 'hidden',
                borderRadius: '0px'
              }}
            >
              <MonthlyOverviewWidget />
            </div>
            <div 
              className="square-screen-container" 
              id="alltime-widget"
              style={{
                backgroundColor: theme === 'light' ? '#e8e8e8' : 'black',
                color: theme === 'light' ? 'black' : 'white',
                position: 'relative',
                width: '420px',
                height: '420px',
                padding: '2rem 0 0 0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                boxShadow: 'none',
                overflow: 'hidden',
                borderRadius: '0px'
              }}
            >
              <AllTimeOverviewWidget />
            </div>
            <div 
              className="square-screen-container" 
              id="execution-analysis-widget"
              style={{
                backgroundColor: theme === 'light' ? '#e8e8e8' : 'black',
                color: theme === 'light' ? 'black' : 'white',
                position: 'relative',
                width: '420px',
                height: '420px',
                padding: '2rem 0 0 0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                boxShadow: 'none',
                overflow: 'hidden',
                borderRadius: '0px'
              }}
            >
              <ExecutionAnalysisWidget />
            </div>
          </div>
          
          {/* Theme Toggle and Download Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors bg-white text-[#4950c5] border-2 border-[#4950c5] hover:bg-[#4950c5] hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {theme === 'dark' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                )}
              </svg>
              {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
            </button>
            <button
              onClick={() => downloadWidget('monthly', theme)}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors bg-[#4950c5] text-white hover:bg-[#3d42a8]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Monthly
            </button>
            <button
              onClick={() => downloadWidget('alltime', theme)}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors bg-[#4950c5] text-white hover:bg-[#3d42a8]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download All Time
            </button>
            <button
              onClick={() => downloadWidget('execution-analysis', theme)}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors bg-[#4950c5] text-white hover:bg-[#3d42a8]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Execution Analysis
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-[#4950c5] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">No Data Available</h3>
            <p className="text-lg text-black mb-8">Upload a CSV file in the Upload tab to start generating widgets.</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
