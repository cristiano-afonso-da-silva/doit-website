# QUICK FIX: Stop Receiving Magic Links

## The Issue
You're getting magic links in your email instead of 6-digit verification codes.

## The Solution (Takes 2 Minutes)

### You MUST configure Supabase's email template:

1. **Go to**: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Click**: Authentication → Email Templates

3. **Find**: Template called "Magic Link"

4. **Replace** the template content with:

```
Your verification code: {{ .Token }}
```

5. **Click**: Save

6. **Test**: Sign up with a test email - you should now get a 6-digit code!

---

## Why This Happens

Supabase defaults to sending **clickable links** (magic links) in emails. Your code is correct, but Supabase needs to be told to send the **6-digit code** instead.

## What {{ .Token }} Does

This is a placeholder that Supabase replaces with the actual 6-digit code (like: 123456)

## Files You Need to Edit

**NONE!** The code is already correct. You only need to update Supabase's email template.

## After You Fix It

1. User signs up
2. Gets 6-digit code in email (like: 123456)
3. Enters code on verification page
4. Account created and user logged in ✅

---

**Read**: `SUPABASE_EMAIL_SETUP.md` for detailed step-by-step instructions with screenshots.
