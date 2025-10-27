# Supabase Email Template Setup

## The Problem
You're receiving **magic links** instead of **verification codes**. This is because Supabase's default email template sends a clickable link.

## The Solution
Configure Supabase to send **OTP codes (6-digit numbers)** instead of links.

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project (eewrhcifugblcjuawtsv)

### Step 2: Navigate to Email Templates
1. In the left sidebar, click **Authentication**
2. Click **Email Templates**
3. You should see several templates listed

### Step 3: Edit the "Magic Link" Template
1. Find the template called **"Magic Link"**
2. Click on it to edit

### Step 4: Update the Template Content
Replace the entire template content with this:

```html
<h2>Your verification code</h2>
<p>Use this code to verify your email:</p>
<h1 style="font-size: 48px; letter-spacing: 10px; margin: 20px 0; text-align: center; color: #4950c5;">{{ .Token }}</h1>
<p>This code will expire in 1 hour.</p>
<p>If you didn't request this code, you can safely ignore this email.</p>
```

**Key Points:**
- `{{ .Token }}` is the 6-digit code that gets replaced automatically
- The code is displayed prominently in large text
- The code is styled in blue (#4950c5) to match your app's color

### Step 5: Save the Template
1. Click **Save** button at the bottom
2. Wait for the confirmation message

### Step 6: Verify the Update
1. Go back to your app
2. Try signing up with a test email
3. You should now receive a 6-digit code instead of a link

## Alternative: Simpler Template

If the above doesn't work, try this even simpler version:

```html
Your verification code is: {{ .Token }}
Enter this code to verify your email.
```

## Troubleshooting

**Still getting magic links?**
- Make sure you clicked "Save" after editing the template
- Try signing up with a different email address
- Clear your browser cache

**Not receiving any emails?**
- Check spam/junk folder
- Verify your email in Supabase logs (Authentication > Logs)
- Make sure email provider is enabled in Supabase

**Code not working?**
- Codes expire after 60 minutes
- Use the "Resend" button to get a new code
- Make sure you're entering all 6 digits

## How It Works

1. User signs up → Enters email and password
2. Supabase sends email → Using the "Magic Link" template
3. Email contains 6-digit code → The `{{ .Token }}` variable
4. User enters code → On the verification page
5. Code verified → Account created and user logged in

## Important Note

The template type "Magic Link" is used for sending OTP codes. Even though it's called "Magic Link", when configured with `{{ .Token }}`, it sends the 6-digit code instead of a clickable link.
