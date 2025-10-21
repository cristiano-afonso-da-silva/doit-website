-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT CHECK (theme IN ('light', 'dark')) DEFAULT 'dark',
  default_view TEXT CHECK (default_view IN ('upload', 'analytics', 'widget')) DEFAULT 'upload',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_datasets table
CREATE TABLE IF NOT EXISTS user_datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  column_mapping JSONB NOT NULL,
  total_rows INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create data_rows table
CREATE TABLE IF NOT EXISTS data_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES user_datasets(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  row_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_rows ENABLE ROW LEVEL SECURITY;

-- Create policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for user_datasets
CREATE POLICY "Users can view their own datasets" ON user_datasets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own datasets" ON user_datasets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets" ON user_datasets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets" ON user_datasets
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for data_rows
CREATE POLICY "Users can view their own data rows" ON data_rows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_datasets 
      WHERE user_datasets.id = data_rows.dataset_id 
      AND user_datasets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own data rows" ON data_rows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_datasets 
      WHERE user_datasets.id = data_rows.dataset_id 
      AND user_datasets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own data rows" ON data_rows
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_datasets 
      WHERE user_datasets.id = data_rows.dataset_id 
      AND user_datasets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own data rows" ON data_rows
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_datasets 
      WHERE user_datasets.id = data_rows.dataset_id 
      AND user_datasets.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_datasets_user_id ON user_datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_datasets_created_at ON user_datasets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_rows_dataset_id ON data_rows(dataset_id);
CREATE INDEX IF NOT EXISTS idx_data_rows_row_index ON data_rows(dataset_id, row_index);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_datasets_updated_at 
  BEFORE UPDATE ON user_datasets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
