# Sign-Up and Verification Flow

## Complete Flow Overview

### What Happens When User Signs Up:

1. **User enters email and password** → Click "Create Account"
2. **Password stored temporarily** → Saved in browser's sessionStorage (only for this session)
3. **OTP sent to email** → 6-digit code sent to user's email
4. **User NOT logged in yet** → Account is NOT created until verification
5. **User redirected** → Sent to verification page
6. **User enters code** → Types 6-digit code from email
7. **Account created** → User account is created with password
8. **User logged in** → Automatically signed in
9. **Redirect to dashboard** → User taken to their dashboard

## Key Features

✅ **Account NOT created until email is verified**
✅ **Password stored securely in browser session only**
✅ **6-digit verification code sent to email**
✅ **Automatic login after verification**
✅ **Password securely saved when account is created**

## Security

- Password is temporarily stored in browser's `sessionStorage`
- SessionStorage only persists for the current browser session
- Data is cleared after successful verification
- Data is cleared if user refreshes or closes browser (on error)
- Password is not sent to server until verification is complete

## Supabase Configuration Needed

You must configure Supabase to send OTP codes instead of magic links:

1. Go to **Authentication** > **Email Templates**
2. Find **"Magic Link"** template
3. Make sure it includes the 6-digit code: `{{ .Token }}`
4. Template should show the code clearly (not just a link)

## Testing

1. Sign up with a test email
2. You should receive a 6-digit code in email
3. Enter the code on verification page
4. You will be logged in and redirected to dashboard
5. Sign out and sign in again with password to verify password was saved
