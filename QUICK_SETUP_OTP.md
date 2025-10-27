# Quick Setup Guide - Fix Email Confirmation Issue

## Problem
You're receiving confirmation links instead of verification codes.

## Solution
**You MUST disable email confirmation in your Supabase dashboard**

## Steps to Fix (Takes 2 minutes):

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

### 2. Navigate to Email Settings
Click: **Authentication** → **Providers** → **Email**

### 3. Disable "Confirm email"
- Find the **"Confirm email"** toggle switch
- Turn it **OFF** (should be gray/disabled)
- Click **Save** at the bottom

### 4. Test the Application
- Go to your app's sign-up page
- Enter email and password
- You should now receive a **6-digit code** instead of a link
- Enter the code on the verification page
- You'll be redirected to the dashboard ✅

## Visual Reference

```
Supabase Dashboard Structure:
├── Authentication
│   ├── Providers
│   │   └── Email
│   │       ├── [✓] Enable Email provider
│   │       └── [✗] Confirm email  ← TURN THIS OFF!
```

## What Changed in the Code

The sign-up flow now:
1. Creates user account
2. Sends OTP code to email (6 digits)
3. Redirects to verification page
4. User enters code
5. Verifies and logs in
6. Redirects to dashboard

## Troubleshooting

**Still getting confirmation links?**
- Make sure you clicked "Save" after disabling "Confirm email"
- Try signing up with a different email address
- Clear browser cache and cookies
- Check that you're using the correct Supabase project

**Not receiving any emails?**
- Check spam/junk folder
- Verify email provider settings in Supabase
- Check Supabase logs for email delivery errors

**OTP code not working?**
- Codes expire after 60 seconds - request a new one using "Resend"
- Make sure you're entering all 6 digits
- Check for typos in the email address

