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

// Shared data cache to prevent unnecessary refetches
let workLogsCache: WorkLog[] = [];
let cacheUserId: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export function useWorkLogs() {
  const { user } = useAuth();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorkLogs = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setWorkLogs([]);
      setLoading(false);
      return;
    }

    // Check if we have valid cached data
    const now = Date.now();
    const isCacheValid = !forceRefresh && 
                         cacheUserId === user.id && 
                         workLogsCache.length > 0 &&
                         (now - cacheTimestamp) < CACHE_DURATION;

    if (isCacheValid) {
      setWorkLogs(workLogsCache);
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
        const fetchedData = data || [];
        setWorkLogs(fetchedData);
        setError('');
        
        // Update cache
        workLogsCache = fetchedData;
        cacheUserId = user.id;
        cacheTimestamp = Date.now();
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

      // Update cache
      workLogsCache = [data, ...workLogsCache];
      cacheTimestamp = Date.now();
      
      setWorkLogs(workLogsCache);
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

      // Update cache
      workLogsCache = workLogsCache.filter(log => log.id !== id);
      cacheTimestamp = Date.now();
      
      setWorkLogs(workLogsCache);
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

      // Update cache
      workLogsCache = workLogsCache.map(log => log.id === id ? data : log);
      cacheTimestamp = Date.now();
      
      setWorkLogs(workLogsCache);
      return { data };
    } catch (err) {
      return { error: 'Failed to update work log' };
    }
  }, [user]);

  // Only fetch on mount or when user changes
  useEffect(() => {
    fetchWorkLogs();
  }, [user?.id]); // Only depend on user.id, not the entire fetchWorkLogs function

  // Sync with cache when it changes (from other instances of the hook)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (workLogsCache.length > 0 && cacheUserId === user?.id) {
        // Check if cache is different from current state
        if (JSON.stringify(workLogs) !== JSON.stringify(workLogsCache)) {
          setWorkLogs([...workLogsCache]);
        }
      }
    }, 100); // Check every 100ms

    return () => clearInterval(syncInterval);
  }, [workLogs, user?.id]);

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
