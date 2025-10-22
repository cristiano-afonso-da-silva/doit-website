'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface WorkPatternVisualizationProps {
  csvRows: Record<string, any>[];
  columnNames: { dateCol: string, catCol: string, valCol: string };
}

export default function WorkPatternVisualization({ csvRows, columnNames }: WorkPatternVisualizationProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last30');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  if (!csvRows.length || !columnNames) return null;

  // Generate available months from data
  const getAvailableMonths = () => {
    const { dateCol } = columnNames;
    const months = new Set<string>();
    
    csvRows.forEach(row => {
      try {
        const rowDate = new Date(String(row[dateCol] ?? ''));
        if (!isNaN(rowDate.getTime())) {
          const monthKey = `${rowDate.getFullYear()}-${String(rowDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = rowDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          months.add(`${monthKey}|${monthName}`);
        }
      } catch (error) {
        // Error processing date
      }
    });
    
    return Array.from(months).sort().map(item => {
      const [key, name] = item.split('|');
      return { key, name };
    });
  };

  // Generate work pattern data based on selected period
  const generatePatternData = () => {
    const { dateCol, catCol, valCol } = columnNames;
    
    // Get all unique categories from the CSV data
    const categories = new Set<string>();
    csvRows.forEach(row => {
      const category = String(row[catCol] ?? 'Unknown').trim() || 'Unknown';
      categories.add(category);
    });

    let dateRange: string[] = [];
    const patternData: Record<string, number[]> = {};
    
    // Initialize pattern data for each category
    categories.forEach(category => {
      patternData[category] = [];
    });

    if (selectedPeriod === 'all') {
      // All time - get all unique dates
      const allDates = new Set<string>();
      csvRows.forEach(row => {
        try {
          const rowDate = new Date(String(row[dateCol] ?? ''));
          if (!isNaN(rowDate.getTime())) {
            const dateKey = rowDate.toISOString().split('T')[0];
            allDates.add(dateKey);
          }
        } catch (error) {
          // Error processing date
        }
      });
      
      dateRange = Array.from(allDates).sort();
    } else if (selectedPeriod === 'last30') {
      // Last 30 days
      const now = new Date();
      // Set to start of today to avoid timezone issues
      now.setHours(0, 0, 0, 0);
      const daysBack = 30;
      for (let i = 0; i < daysBack; i++) {
        const date = new Date(now.getTime() - (daysBack - 1 - i) * 86400000);
        dateRange.push(date.toISOString().split('T')[0]);
      }
    } else {
      // Specific month
      const [year, month] = selectedPeriod.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dateRange.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Initialize data for each day
    dateRange.forEach(() => {
      categories.forEach(category => {
        patternData[category].push(0);
      });
    });

    // Fill in actual data
    dateRange.forEach((dateKey, dayIndex) => {
      csvRows.forEach(row => {
        try {
          const rowDate = new Date(String(row[dateCol] ?? ''));
          const rowDateKey = rowDate.toISOString().split('T')[0];
          
          if (rowDateKey === dateKey) {
            const category = String(row[catCol] ?? 'Unknown').trim() || 'Unknown';
            const hours = parseFloat(String(row[valCol] ?? '0')) || 0;
            
            if (patternData[category]) {
              patternData[category][dayIndex] += hours;
            }
          }
        } catch (error) {
          // Error processing row
        }
      });
    });

    return { patternData, dates: dateRange };
  };

  const { patternData, dates } = generatePatternData();
  const availableMonths = getAvailableMonths();
  
  // Fixed color palette matching widget style
  const fixedColors = ['#4950c5', '#3d42a8', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316'];
  
  // Prepare ECharts data
  const series = Object.entries(patternData).map(([category, values], index) => ({
    name: category,
    type: 'line',
    data: values,
    smooth: true,
    symbol: 'none',
    lineStyle: {
      width: 4,
      color: fixedColors[index % fixedColors.length]
    },
    itemStyle: {
      color: fixedColors[index % fixedColors.length]
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          {
            offset: 0,
            color: `${fixedColors[index % fixedColors.length]}40` // 25% opacity
          },
          {
            offset: 1,
            color: `${fixedColors[index % fixedColors.length]}10` // 6% opacity
          }
        ]
      }
    }
  }));

  const workPatternChartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: {
        color: '#374151'
      }
    },
    legend: {
      show: false
    },
    grid: {
      left: 60,
      right: 30,
      bottom: 40,
      top: 20,
      containLabel: false,
      backgroundColor: 'white'
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#000000',
        fontSize: 14,
        fontWeight: 'bold',
        margin: 15
      }
    },
    yAxis: {
      type: 'value',
      show: true,
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        show: true,
        color: '#000000',
        fontSize: 14,
        fontWeight: 'bold',
        margin: 15
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'white',
          type: 'solid'
        }
      },
      minInterval: 1
    },
    series: series
  };

  const getPeriodLabel = () => {
    if (selectedPeriod === 'all') return 'All Time';
    if (selectedPeriod === 'last30') return 'Last 30 Days';
    const month = availableMonths.find(m => m.key === selectedPeriod);
    return month ? month.name : 'Custom Period';
  };


  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Work Patterns</h3>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-6 py-3 rounded-full text-sm font-medium bg-[#f1f2f3] text-black hover:bg-gray-200 transition-colors cursor-pointer border-0 outline-none flex items-center gap-2"
          >
            <span>{getPeriodLabel()}</span>
            <svg 
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-full z-50">
              <button
                onClick={() => {
                  setSelectedPeriod('all');
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm font-medium rounded-full hover:bg-gray-100 transition-colors ${
                  selectedPeriod === 'all' ? 'bg-gray-100 text-black' : 'text-gray-700'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => {
                  setSelectedPeriod('last30');
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm font-medium rounded-full hover:bg-gray-100 transition-colors ${
                  selectedPeriod === 'last30' ? 'bg-gray-100 text-black' : 'text-gray-700'
                }`}
              >
                Last 30 Days
              </button>
              {availableMonths.map(month => (
                <button
                  key={month.key}
                  onClick={() => {
                    setSelectedPeriod(month.key);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm font-medium rounded-full hover:bg-gray-100 transition-colors ${
                    selectedPeriod === month.key ? 'bg-gray-100 text-black' : 'text-gray-700'
                  }`}
                >
                  {month.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      
      {/* Graph - Full Width, No Padding */}
      <div className="flex-1 w-full">
        <ReactECharts
          option={workPatternChartOption}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Category Legend */}
      <div className="px-6 pt-4 pb-6">
        <div className="flex flex-wrap gap-4 justify-center items-center">
          {Object.entries(patternData).map(([category, values], index) => {
            const color = fixedColors[index % fixedColors.length];
            
            return (
              <div key={category} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium text-gray-800">
                  {category}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
