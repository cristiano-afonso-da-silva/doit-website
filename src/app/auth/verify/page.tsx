'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import DynamicHeader from '../../../components/DynamicHeader';

function VerifyPageContent() {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setError('Email parameter is missing');
    }
  }, [searchParams]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      setLoading(false);
      return;
    }

    try {
      // Verify the OTP code
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email',
      });

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      // If verification succeeds, check if we need to create the user with password
      const pendingPassword = sessionStorage.getItem('pending_signup_password');
      
      if (pendingPassword) {
        // User was created by OTP, now we need to update with password
        const { error: updateError } = await supabase.auth.updateUser({
          password: pendingPassword
        });

        if (updateError) {
          console.error('Update password error:', updateError);
          setError('Failed to set up your account. Please try signing in.');
          setLoading(false);
          return;
        }

        // Clean up session storage
        sessionStorage.removeItem('pending_signup_email');
        sessionStorage.removeItem('pending_signup_password');
      }

      setSuccess(true);
      // Redirect to dashboard after successful verification
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Verification error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    try {
      // Resend OTP code
      const pendingPassword = sessionStorage.getItem('pending_signup_password');
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: pendingPassword ? true : false,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        alert('A new verification code has been sent to your email');
      }
    } catch (err) {
      console.error('Resend error:', err);
      setError('Failed to resend verification code');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f2f3] flex flex-col">
      {/* Dynamic Header */}
      <DynamicHeader />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-16 lg:px-24 xl:px-32">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            {!success ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-black mb-2">Verify your email</h1>
                  <p className="text-gray-600">
                    We sent a verification code to <br />
                    <span className="font-medium text-black">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      id="code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4950c5] focus:border-transparent text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Enter the 6-digit code from your email
                    </p>
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full bg-[#4950c5] text-white py-3 rounded-lg font-medium hover:bg-[#3d42a8] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      'Verify Email'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-600 text-sm">
                    Didn&apos;t receive the code?{' '}
                    <button
                      onClick={handleResendCode}
                      className="text-[#4950c5] hover:underline font-medium"
                      type="button"
                    >
                      Resend
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-black mb-2">Email verified!</h1>
                <p className="text-gray-600 mb-6">Your account has been successfully verified. Redirecting to dashboard...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f1f2f3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#4950c5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
