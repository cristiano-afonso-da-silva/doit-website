'use client';

import React from 'react';
import DoitExecutionSummaryParagraph from './DoitExecutionSummaryParagraph';
import WorkPatternVisualization from './WorkPatternVisualization';

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
              <p className="text-lg text-black mb-8">Upload a CSV file in the Upload tab to start analyzing your data.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Main Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 h-full">
        {/* Execution Analytics - Left */}
        {csvRows.length && columnNames && (
          <div className="bg-[#f1f2f3] h-full overflow-y-auto rounded-2xl">
            <div className="text-6xl space-y-8">
              <DoitExecutionSummaryParagraph
                rows={csvRows}
                dateCol={columnNames.dateCol}
                catCol={columnNames.catCol}
                hoursCol={columnNames.valCol}
                execCol="Execute"
                colors={['#4950c5', '#3d42a8', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316']}
                variant="dashboard"
              />
             </div>
           </div>
        )}

        {/* Work Pattern Visualization - Right */}
        <div className="bg-white rounded-2xl h-full overflow-hidden">
          <WorkPatternVisualization csvRows={csvRows} columnNames={columnNames} />
        </div>
      </div>
    </div>
  );
}
