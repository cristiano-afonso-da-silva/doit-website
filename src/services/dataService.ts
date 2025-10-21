import { supabase, UserDataset, DataRow, UserPreferences } from '../lib/supabase'

export class DataService {
  // User Datasets
  static async createDataset(
    userId: string,
    name: string,
    description: string,
    columnMapping: { dateCol: string; catCol: string; valCol: string },
    rows: Record<string, any>[]
  ): Promise<{ data: UserDataset | null; error: any }> {
    try {
      // Create the dataset
      const { data: dataset, error: datasetError } = await supabase
        .from('user_datasets')
        .insert({
          user_id: userId,
          name,
          description,
          column_mapping: columnMapping,
          total_rows: rows.length
        })
        .select()
        .single()

      if (datasetError) {
        return { data: null, error: datasetError }
      }

      // Insert all data rows
      const dataRows = rows.map((row, index) => ({
        dataset_id: dataset.id,
        row_index: index,
        row_data: row
      }))

      const { error: rowsError } = await supabase
        .from('data_rows')
        .insert(dataRows)

      if (rowsError) {
        // Clean up the dataset if rows insertion failed
        await supabase.from('user_datasets').delete().eq('id', dataset.id)
        return { data: null, error: rowsError }
      }

      return { data: dataset, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getUserDatasets(userId: string): Promise<{ data: UserDataset[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_datasets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error && error.code === 'PGRST116') {
        // Table doesn't exist yet, return empty array
        return { data: [], error: null }
      }

      return { data, error }
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return { data: [], error: null }
      }
      return { data: null, error }
    }
  }

  static async getDatasetRows(datasetId: string): Promise<{ data: DataRow[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('data_rows')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('row_index', { ascending: true })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async deleteDataset(datasetId: string): Promise<{ error: any }> {
    try {
      // Delete data rows first
      const { error: rowsError } = await supabase
        .from('data_rows')
        .delete()
        .eq('dataset_id', datasetId)

      if (rowsError) {
        return { error: rowsError }
      }

      // Delete the dataset
      const { error: datasetError } = await supabase
        .from('user_datasets')
        .delete()
        .eq('id', datasetId)

      return { error: datasetError }
    } catch (error) {
      return { error }
    }
  }

  static async updateDataset(
    datasetId: string,
    updates: Partial<UserDataset>
  ): Promise<{ data: UserDataset | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_datasets')
        .update(updates)
        .eq('id', datasetId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // User Preferences
  static async getUserPreferences(userId: string): Promise<{ data: UserPreferences | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<{ data: UserPreferences | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences
        })
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Real-time subscriptions
  static subscribeToDatasets(
    userId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel('user_datasets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_datasets',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }

  static subscribeToDatasetRows(
    datasetId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel('dataset_rows')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_rows',
          filter: `dataset_id=eq.${datasetId}`
        },
        callback
      )
      .subscribe()
  }
}
