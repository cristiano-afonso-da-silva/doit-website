'use client';

import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';


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

export default function WorkLog() {
  const chartRef = useRef<ReactECharts>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
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
        
        setChartData(data);
        setSummaryStats(stats);
        setAvailableMonths(months);
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
        grid: { left: 40, right: 24, top: 24, bottom: 36 },
        xAxis: {
          type: 'category',
          data: x,
          boundaryGap: false,
          axisLine: { show: false },
          axisLabel: { show: false },
          axisTick: { show: false },
          splitLine: { show: true, lineStyle: { color: '#FFFFFF' } },
        },
        yAxis: {
          type: 'value',
          min: 0,
          axisLine: { show: false },
          axisLabel: { 
            color: '#000000',
            formatter: (value: number) => {
              if (value === 0) return '0';
              if (value < 1) return value.toFixed(1);
              return Math.round(value).toString();
            }
          },
          splitLine: { show: true, lineStyle: { color: '#FFFFFF' } },
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
      {isSquareScreen ? (
        <div className="square-screen-background">
          <button
            onClick={toggleSquareScreen}
            className="square-screen-close"
            aria-label="Close square screen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="square-screen-download-buttons">
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
      ) : (
        <>
          <div className="max-w-full mx-auto p-7">
            <div className="flex justify-end items-center mb-4">
              <div className="flex gap-3 items-center flex-wrap">
                <div className="relative">
                <select 
                  id="range"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="bg-white text-black border border-gray-300 rounded-xl px-3.5 py-2.5 pr-10 cursor-pointer min-w-[120px] appearance-none"
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
                  className="bg-white text-black border border-gray-300 rounded-xl px-3.5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors inline-block"
                >
                  {selectedFileName || 'Choose File'}
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
                  className="bg-white text-black border border-gray-300 rounded-xl px-3.5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  Render
                </button>
                {chartData && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Color Theme:</span>
                    <select
                      value={colorPalette}
                      onChange={(e) => setColorPalette(e.target.value as 'colorful' | 'red' | 'green' | 'blue' | 'black' | 'white' | 'yellow' | 'orange' | 'purple')}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white"
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
                  <button
                    onClick={toggleFullscreen}
                    className="bg-white text-black border border-gray-300 rounded-xl px-3.5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                )}
                {chartData && (
                  <button
                    onClick={toggleSquareScreen}
                    className="bg-white text-black border border-gray-300 rounded-xl px-3.5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {isSquareScreen ? 'Exit Square Screen' : 'Square Screen'}
                  </button>
                )}
              </div>
            </div>

        <div className="chart-container">
          <div className="summary-section mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-700 font-medium">Monthly Overview</div>

                <div className="mt-0 flex items-end gap-2">
                  <div className="text-4xl font-bold">
                    {summaryStats ? summaryStats.totalHours : '—'}
                  </div>

                  {summaryStats && (
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1
                        ${summaryStats.projectedDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      aria-label="projected monthly change"
                    >
                      {summaryStats.projectedDelta >= 0 ? '▲' : '▼'}
                      {Math.abs(summaryStats.projectedRate)}%
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-gray-600">
                  {getSummaryText(summaryStats)}
                </p>
              </div>
            </div>
          </div>
          <div className="chart-section">
            <div style={{ width: '100%', height: '360px' }}>
              {chartData && (
                <ReactECharts
                  ref={chartRef}
                  option={getChartOption()}
                  style={{ width: '100%', height: '100%' }}
                />
              )}
            </div>
            
            {chartData && (
              <div className="legend-section flex flex-wrap gap-4 justify-center mt-4">
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
                    <div
                      key={ds.label}
                      className="flex gap-2 items-center text-sm text-black cursor-pointer hover:opacity-70 transition-opacity"
                      onClick={() => handleLegendClick(ds.label)}
                    >
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      {ds.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
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
          padding: 2rem !important;
          height: 100vh !important;
          background: white !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
        }
        
             .square-screen-background {
               position: fixed;
               top: 0;
               left: 0;
               width: 100vw;
               height: 100vh;
               background: black;
               display: flex;
               align-items: center;
               justify-content: center;
               z-index: 1000;
             }
        
        .square-screen-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #374151;
          transition: all 0.2s ease;
          z-index: 1001;
        }
        
        .square-screen-close:hover {
          background: rgba(255, 255, 255, 1);
          transform: scale(1.1);
        }
        
        .square-screen-download-buttons {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          gap: 0.5rem;
          z-index: 1001;
        }
        
        .download-button {
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          color: #374151;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .download-button:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .square-screen-widgets-container {
          display: flex;
          gap: 2rem;
          align-items: center;
          justify-content: center;
        }
        
             .square-screen-container {
               position: relative;
               width: 400px;
               height: 400px;
               background: white;
               border-radius: 0px;
               padding: 2rem 0 0 0;
               display: flex;
               flex-direction: column;
               justify-content: flex-start;
               box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
               overflow: hidden;
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