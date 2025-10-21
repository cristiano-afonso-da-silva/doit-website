'use client';

import React, { useState } from 'react';

interface DashboardUploadProps {
  selectedFileName: string | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  chartData: any;
  setActiveTab: (tab: 'upload' | 'analytics' | 'widget') => void;
  csvRows: Record<string, any>[];
  columnNames: { dateCol: string, catCol: string, valCol: string } | null;
  deleteRow: (rowIndex: number) => void;
}

export default function DashboardUpload({ 
  selectedFileName, 
  handleFileUpload, 
  chartData, 
  setActiveTab,
  csvRows,
  columnNames,
  deleteRow
}: DashboardUploadProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  // Calculate pagination
  const totalPages = Math.ceil(csvRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = csvRows.slice(startIndex, endIndex);
  
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  return (
    <div className="h-full">
      <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Data Table</h2>
          {!csvRows.length && (
            <label
              htmlFor="file"
              className="px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer bg-[#f1f2f3] text-black hover:bg-gray-200 inline-block"
            >
              {selectedFileName || 'Start Uploading'}
            </label>
          )}
          <input
            id="file"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        
        {csvRows.length > 0 ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columnNames && Object.keys(csvRows[0] || {}).map((column, index) => (
                      <th
                        key={index}
                        className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentRows.map((row, rowIndex) => (
                    <tr key={startIndex + rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {columnNames && Object.values(row).map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-4 text-sm text-gray-900"
                          title={String(cell || '')}
                        >
                          <div className="truncate overflow-hidden">
                            {String(cell || '')}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <button
                          onClick={() => deleteRow(startIndex + rowIndex)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          title="Delete row"
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
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
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
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-[#4950c5] text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#4950c5] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">No Data Available</h3>
              <p className="text-lg text-black mb-8">Upload a CSV file to start viewing your data in a table format.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
