# Supabase Setup Instructions

## Database Schema Setup

To enable the work log functionality, you need to create the `work_logs` table in your Supabase database.

### Step 1: Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor

### Step 2: Run the Schema SQL

Copy and paste the following SQL into the SQL Editor and execute it:

```sql
-- Create work_logs table
CREATE TABLE IF NOT EXISTS work_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  project VARCHAR(255) NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  execute TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_logs_user_id ON work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_date ON work_logs(date);
CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON work_logs(user_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own work logs
CREATE POLICY "Users can view their own work logs" ON work_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own work logs
CREATE POLICY "Users can insert their own work logs" ON work_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own work logs
CREATE POLICY "Users can update their own work logs" ON work_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own work logs
CREATE POLICY "Users can delete their own work logs" ON work_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_work_logs_updated_at
  BEFORE UPDATE ON work_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Step 3: Verify Setup

After running the SQL, you should see:

1. ✅ `work_logs` table created
2. ✅ Indexes created for performance
3. ✅ Row Level Security enabled
4. ✅ RLS policies created for user data isolation
5. ✅ Trigger created for automatic timestamp updates

### Step 4: Test the Application

1. Start your development server: `npm run dev`
2. Sign up for a new account or sign in
3. Navigate to the dashboard
4. Try adding a work log entry
5. Check that it appears in the table and analytics

## Features Enabled

After setup, users will be able to:

- ✅ **Add work logs manually** instead of uploading CSV files
- ✅ **View all their work logs** in a table format
- ✅ **Delete individual work logs** 
- ✅ **See analytics and widgets** based on their work log data
- ✅ **Data is automatically synced** across all tabs (Upload, Analytics, Widgets)

## Data Structure

Each work log entry contains:
- **Date**: When the work was done
- **Project**: Category/project name
- **Hours**: Number of hours worked (decimal supported)
- **Execute**: Optional description of what was done

## Security

- All data is protected by Row Level Security (RLS)
- Users can only see and modify their own work logs
- No user can access another user's data

