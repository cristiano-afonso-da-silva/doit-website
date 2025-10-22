'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WorkLog {
  id: string;
  date: string;
  project: string;
  hours: number;
  execute: string | null;
  created_at: string;
}

interface WorkLogTableProps {
  onWorkLogDeleted?: () => void;
}

export default function WorkLogTable({ onWorkLogDeleted }: WorkLogTableProps) {
  const { user } = useAuth();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Fixed at 10 entries per page

  // Format date without timezone issues
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
  };

  // Pagination logic
  const totalPages = Math.ceil(workLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentWorkLogs = workLogs.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const fetchWorkLogs = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setWorkLogs(data || []);
      }
    } catch (err) {
      setError('Failed to fetch work logs');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteWorkLog = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        setError(error.message);
      } else {
        setWorkLogs(workLogs.filter(log => log.id !== id));
        // Notify parent component that a work log was deleted
        if (onWorkLogDeleted) {
          onWorkLogDeleted();
        }
      }
    } catch (err) {
      setError('Failed to delete work log');
    }
  };

  useEffect(() => {
    fetchWorkLogs();
  }, [user, fetchWorkLogs]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-[#4950c5] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={fetchWorkLogs}
            className="bg-[#4950c5] text-white px-4 py-2 rounded-lg hover:bg-[#3d42a8] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-black">Your Work Logs</h2>
        <span className="text-sm text-gray-500">{workLogs.length} entries</span>
      </div>

      {workLogs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No work logs yet</h3>
            <p className="text-gray-500">Start by adding your first work log above.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Project</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Hours</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Execute</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentWorkLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">
                        {formatDate(log.date)}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {log.project}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {log.hours}h
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {log.execute ? (
                          <div className="max-w-xs truncate" title={log.execute}>
                            {log.execute}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deleteWorkLog(log.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete work log"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {workLogs.length > itemsPerPage && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Pagination info */}
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, workLogs.length)} of {workLogs.length} entries
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="bg-[#f1f2f3] text-gray-700 px-4 py-2 rounded-full flex items-center justify-center font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-4 py-2 rounded-full flex items-center justify-center font-medium text-sm transition-colors duration-200 ${
                          currentPage === pageNum
                            ? 'bg-[#4950c5] text-white hover:bg-[#3d42a8]'
                            : 'bg-[#f1f2f3] text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="bg-[#f1f2f3] text-gray-700 px-4 py-2 rounded-full flex items-center justify-center font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}