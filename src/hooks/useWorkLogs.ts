'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface WorkLog {
  id: string;
  date: string;
  project: string;
  hours: number;
  execute: string | null;
  created_at: string;
}

export function useWorkLogs() {
  const { user } = useAuth();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorkLogs = useCallback(async () => {
    if (!user) {
      setWorkLogs([]);
      setLoading(false);
      return;
    }

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
        setError('');
      }
    } catch (err) {
      setError('Failed to fetch work logs');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addWorkLog = useCallback(async (workLog: Omit<WorkLog, 'id' | 'created_at'>) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('work_logs')
        .insert({
          user_id: user.id,
          date: workLog.date,
          project: workLog.project,
          hours: workLog.hours,
          execute: workLog.execute
        })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      setWorkLogs(prev => [data, ...prev]);
      return { data };
    } catch (err) {
      return { error: 'Failed to add work log' };
    }
  }, [user]);

  const deleteWorkLog = useCallback(async (id: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        return { error: error.message };
      }

      setWorkLogs(prev => prev.filter(log => log.id !== id));
      return { success: true };
    } catch (err) {
      return { error: 'Failed to delete work log' };
    }
  }, [user]);

  const updateWorkLog = useCallback(async (id: string, updates: Partial<WorkLog>) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('work_logs')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      setWorkLogs(prev => prev.map(log => log.id === id ? data : log));
      return { data };
    } catch (err) {
      return { error: 'Failed to update work log' };
    }
  }, [user]);

  useEffect(() => {
    fetchWorkLogs();
  }, [fetchWorkLogs]);

  return {
    workLogs,
    loading,
    error,
    fetchWorkLogs,
    addWorkLog,
    deleteWorkLog,
    updateWorkLog
  };
}
