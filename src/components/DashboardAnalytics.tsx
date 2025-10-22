'use client';

import React from 'react';
import ComprehensiveAnalytics from './ComprehensiveAnalytics';

interface DashboardAnalyticsProps {
  chartData: any;
  csvRows: Record<string, any>[];
  columnNames: { dateCol: string, catCol: string, valCol: string } | null;
}

export default function DashboardAnalytics({ chartData, csvRows, columnNames }: DashboardAnalyticsProps) {
  if (!chartData) {
    return (
      <div className="h-full">
        <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#4950c5] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">No Data Available</h3>
              <p className="text-lg text-black mb-8">Add work logs to start analyzing your data.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Transform csvRows to work logs format
  const workLogs = csvRows.map(row => ({
    date: String(row[columnNames?.dateCol || 'date'] || ''),
    project: String(row[columnNames?.catCol || 'project'] || ''),
    hours: Number(row[columnNames?.valCol || 'hours'] || 0),
    execute: String(row['Execute'] || row['execute'] || '')
  }));

  return (
    <div className="h-full">
      <ComprehensiveAnalytics 
        workLogs={workLogs} 
        csvRows={csvRows} 
        columnNames={columnNames} 
      />
    </div>
  );
}
