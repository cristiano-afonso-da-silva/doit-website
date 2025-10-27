# Doit - Work Log Tracking Application

A modern work log tracking application built with Next.js and Supabase, featuring email verification, analytics, and data visualization.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Git

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd doit-website
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📧 Email Verification Setup (REQUIRED)

### The Problem
You're receiving **magic links** instead of **6-digit verification codes**. This is because Supabase's default email template sends clickable links.

### Quick Fix (2 minutes)

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Configure Email Template:**
   - Click: **Authentication** → **Email Templates**
   - Find: Template called **"Magic Link"**
   - Replace the template content with:

```html
Your verification code: {{ .Token }}
```

3. **Save and Test:**
   - Click **Save**
   - Sign up with a test email
   - You should now receive a 6-digit code!

### Professional Email Template

For a branded experience, use this professional template:

**Subject:** `Your Doit Verification Code`

**Message Body:**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
  
  <!-- Doit Logo -->
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #4950c5; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -1px;">doit</h1>
    <p style="color: #666; font-size: 14px; margin: 4px 0 0 0;">Work log tracking made simple</p>
  </div>
  
  <!-- Content -->
  <h2 style="color: #1a1a1a; font-size: 22px; font-weight: 600; margin: 0 0 16px 0;">Verify your email</h2>
  
  <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
    Enter this code on the verification page to complete your signup:
  </p>
  
  <!-- Code -->
  <div style="background: #f8f9fa; border: 2px solid #4950c5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
    <p style="font-size: 38px; font-weight: 600; color: #4950c5; margin: 0; font-family: 'Courier New', monospace; letter-spacing: 6px;">{{ .Token }}</p>
  </div>
  
  <p style="color: #999; font-size: 13px; margin: 24px 0 0 0; text-align: center;">
    Code expires in 60 minutes • Sent by <strong style="color: #4950c5;">Doit</strong>
  </p>
  
</div>
```

## 🗄️ Database Setup

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
- ✅ `work_logs` table created
- ✅ Indexes created for performance
- ✅ Row Level Security enabled
- ✅ RLS policies created for user data isolation
- ✅ Trigger created for automatic timestamp updates

## 🔐 Authentication Flow

### How It Works

1. **User signs up** → Enters email and password
2. **Password stored temporarily** → Saved in browser's sessionStorage
3. **OTP sent to email** → 6-digit code sent to user's email
4. **User NOT logged in yet** → Account is NOT created until verification
5. **User redirected** → Sent to verification page
6. **User enters code** → Types 6-digit code from email
7. **Account created** → User account is created with password
8. **User logged in** → Automatically signed in
9. **Redirect to dashboard** → User taken to their dashboard

### Key Features

✅ **Account NOT created until email is verified**
✅ **Password stored securely in browser session only**
✅ **6-digit verification code sent to email**
✅ **Automatic login after verification**
✅ **Password securely saved when account is created**

### Security

- Password is temporarily stored in browser's `sessionStorage`
- SessionStorage only persists for the current browser session
- Data is cleared after successful verification
- Data is cleared if user refreshes or closes browser (on error)
- Password is not sent to server until verification is complete

## 📊 Features

After setup, users will be able to:

- ✅ **Add work logs manually** instead of uploading CSV files
- ✅ **View all their work logs** in a table format
- ✅ **Delete individual work logs** 
- ✅ **See analytics and widgets** based on their work log data
- ✅ **Data is automatically synced** across all tabs (Upload, Analytics, Widgets)

### Data Structure

Each work log entry contains:
- **Date**: When the work was done
- **Project**: Category/project name
- **Hours**: Number of hours worked (decimal supported)
- **Execute**: Optional description of what was done

## 🛠️ Troubleshooting

### Still getting magic links instead of codes?
- Make sure you clicked "Save" after editing the template
- Try signing up with a different email address
- Clear your browser cache
- Check that you're using the correct Supabase project

### Not receiving any emails?
- Check spam/junk folder
- Verify email provider settings in Supabase
- Check Supabase logs for email delivery errors
- Make sure your site URL is configured in Supabase settings

### Code not working?
- Codes expire after 60 minutes
- Use the "Resend" button to get a new code
- Make sure you're entering all 6 digits
- Check for typos in the email address

### Data not refreshing after adding work logs?
- The application uses a shared cache system
- Data refreshes automatically on:
  - First dashboard visit after sign-in
  - After adding a work log
  - After deleting a work log
- Cache expires after 1 minute for fresh data

## 🚀 Deployment

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## 📚 Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - learn about Supabase features
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you have any questions or need help:
- Email: doit.worklog@gmail.com
- Create an issue in the repository

---

**Built with ❤️ using Next.js and Supabase**