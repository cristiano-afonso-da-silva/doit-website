'use client';

import React, { useState } from 'react';
import { useWorkLogs } from '../hooks/useWorkLogs';

interface WorkLogEntryProps {
  onWorkLogAdded: () => void;
}

export default function WorkLogEntry({ onWorkLogAdded }: WorkLogEntryProps) {
  const { addWorkLog } = useWorkLogs();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date
    project: '',
    hours: '',
    execute: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setMessage('');

    try {
      const result = await addWorkLog({
        date: formData.date,
        project: formData.project.trim(),
        hours: parseFloat(formData.hours),
        execute: formData.execute.trim()
      });

      if (result.error) {
        setMessage(`Error: ${result.error}`);
      } else {
        setMessage('Work log added successfully!');
        setFormData({
          date: new Date().toISOString().split('T')[0],
          project: '',
          hours: '',
          execute: ''
        });
        onWorkLogAdded(); // Notify parent component
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-black mb-6">Add Work Log</h2>
      
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        {/* Fixed Form Fields */}
        <div className="space-y-4">
          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#4950c5] focus:outline-none"
            />
          </div>

          {/* Project */}
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
              Project/Category *
            </label>
            <input
              type="text"
              id="project"
              name="project"
              value={formData.project}
              onChange={handleInputChange}
              placeholder="e.g., Frontend Development, Research, Meetings"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#4950c5] focus:outline-none"
            />
          </div>

          {/* Hours */}
          <div>
            <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-2">
              Hours *
            </label>
            <input
              type="number"
              id="hours"
              name="hours"
              value={formData.hours}
              onChange={handleInputChange}
              placeholder="e.g., 2.5"
              step="0.25"
              min="0"
              max="24"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#4950c5] focus:outline-none"
            />
          </div>
        </div>

        {/* Execute Field - Takes remaining space */}
        <div className="flex-1 flex flex-col mt-4">
          <label htmlFor="execute" className="block text-sm font-medium text-gray-700 mb-2">
            Execute *
          </label>
          <textarea
            id="execute"
            name="execute"
            value={formData.execute}
            onChange={handleInputChange}
            placeholder="e.g., Fixed bug in login component; Updated documentation; Reviewed code"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#4950c5] focus:outline-none resize-none flex-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate multiple actions with semicolons (;)
          </p>
        </div>

        {/* Submit Button and Message - Fixed at bottom */}
        <div className="mt-4 space-y-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#4950c5] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#3d42a8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Work Log'}
          </button>

          {/* Message */}
          {message && (
            <div className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}