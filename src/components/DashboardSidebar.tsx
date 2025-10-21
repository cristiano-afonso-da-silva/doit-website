'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserMenu } from './UserMenu';

interface DashboardSidebarProps {
  activeTab: 'upload' | 'analytics' | 'widget';
  setActiveTab: (tab: 'upload' | 'analytics' | 'widget') => void;
  savedDatasets: any[];
  onLoadDataset: (datasetId: string) => void;
  onSaveDataset: (name: string, description: string) => void;
  csvRows: any[];
}

export default function DashboardSidebar({ 
  activeTab, 
  setActiveTab, 
  savedDatasets, 
  onLoadDataset, 
  onSaveDataset, 
  csvRows 
}: DashboardSidebarProps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');

  const handleSave = () => {
    if (datasetName.trim()) {
      onSaveDataset(datasetName.trim(), datasetDescription.trim());
      setDatasetName('');
      setDatasetDescription('');
      setShowSaveModal(false);
    }
  };

  return (
    <div className="w-64 bg-[#f1f2f3] border-r border-gray-200 flex flex-col">
      {/* User Menu */}
      <div className="p-4 border-b border-gray-200">
        <UserMenu />
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">MENU</h3>
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-gray-800 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-gray-800 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </button>
          
          <button
            onClick={() => setActiveTab('widget')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'widget'
                ? 'bg-gray-800 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Widget
          </button>
        </nav>

        {/* Dataset Management */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">DATASETS</h3>
            {csvRows.length > 0 && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="text-xs bg-[#4950c5] text-white px-2 py-1 rounded hover:bg-[#3d42a8] transition-colors"
              >
                Save
              </button>
            )}
          </div>
          
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {savedDatasets.map((dataset) => (
              <button
                key={dataset.id}
                onClick={() => onLoadDataset(dataset.id)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <div className="font-medium truncate">{dataset.name}</div>
                <div className="text-xs text-gray-500">{dataset.total_rows} rows</div>
              </button>
            ))}
            {savedDatasets.length === 0 && (
              <div className="text-xs text-gray-500 px-3 py-2">
                No saved datasets
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Dataset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Save Dataset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dataset Name
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4950c5]"
                  placeholder="Enter dataset name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={datasetDescription}
                  onChange={(e) => setDatasetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4950c5]"
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!datasetName.trim()}
                className="flex-1 bg-[#4950c5] text-white py-2 px-4 rounded-md hover:bg-[#3d42a8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Home */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
