'use client';

import React, { useState } from 'react';
import WorkLogEntry from './WorkLogEntry';
import WorkLogTable from './WorkLogTable';

interface DashboardUploadProps {
  selectedFileName: string | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  chartData: any;
  setActiveTab: (tab: 'upload' | 'analytics' | 'widget') => void;
  csvRows: Record<string, any>[];
  columnNames: { dateCol: string, catCol: string, valCol: string } | null;
  deleteRow: (rowIndex: number) => void;
  refreshWorkLogs?: () => void;
}

export default function DashboardUpload({ 
  selectedFileName, 
  handleFileUpload, 
  chartData, 
  setActiveTab,
  csvRows,
  columnNames,
  deleteRow,
  refreshWorkLogs
}: DashboardUploadProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleWorkLogAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    // Refresh work logs data for Analytics and Widget tabs
    if (refreshWorkLogs) {
      refreshWorkLogs();
    }
  };

  const handleWorkLogDeleted = () => {
    setRefreshTrigger(prev => prev + 1);
    // Refresh work logs data for Analytics and Widget tabs
    if (refreshWorkLogs) {
      refreshWorkLogs();
    }
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 h-full">
        {/* Add Work Log Form - Left (40%) */}
        <div className="lg:col-span-1">
          <WorkLogEntry onWorkLogAdded={handleWorkLogAdded} />
        </div>

        {/* Work Logs Table - Right (60%) */}
        <div className="lg:col-span-1">
          <WorkLogTable key={refreshTrigger} onWorkLogDeleted={handleWorkLogDeleted} />
        </div>
      </div>
    </div>
  );
}