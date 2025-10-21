# Database Setup Instructions

## Prerequisites
1. You have a Supabase project set up
2. You have the project URL and API key configured

## Setup Steps

### 1. Run the Database Schema
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to execute the schema

### 2. Enable Authentication
1. In your Supabase dashboard, go to Authentication > Settings
2. Enable "Email" authentication
3. Configure email templates if desired

### 3. Test the Setup
1. Start your application
2. Try signing up with a new account
3. Upload CSV data and try saving it
4. Verify that data persists after page refresh

## Features Available After Setup

- ✅ User authentication (sign up/sign in)
- ✅ Data persistence (save/load datasets)
- ✅ User preferences (theme, default view)
- ✅ Real-time synchronization
- ✅ Row-level security

## Troubleshooting

If you see "Database tables not yet set up" errors:
1. Verify the SQL schema was executed successfully
2. Check that all tables were created in the Database section
3. Ensure Row Level Security is enabled on all tables

If authentication fails:
1. Check that email authentication is enabled
2. Verify your Supabase project settings
3. Check the browser console for detailed error messages
