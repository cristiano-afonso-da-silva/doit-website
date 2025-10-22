'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase';
import DynamicHeader from '../../../components/DynamicHeader';

function VerifyPageContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleVerification = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (token && type === 'signup') {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup',
          });

          if (error) {
            setError(error.message);
          } else {
            setSuccess(true);
            // Redirect to dashboard after successful verification
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
        } catch (err) {
          setError('An unexpected error occurred');
        }
      } else {
        setError('Invalid verification link');
      }
      
      setLoading(false);
    };

    handleVerification();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#f1f2f3] flex flex-col">
      {/* Dynamic Header */}
      <DynamicHeader />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-16 lg:px-24 xl:px-32">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            {loading && (
              <div>
                <div className="w-16 h-16 bg-[#4950c5] rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h1 className="text-2xl font-bold text-black mb-2">Verifying your email...</h1>
                <p className="text-gray-600">Please wait while we verify your account</p>
              </div>
            )}

            {success && (
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-black mb-2">Email verified!</h1>
                <p className="text-gray-600 mb-6">Your account has been successfully verified. Redirecting to dashboard...</p>
                <Link
                  href="/dashboard"
                  className="inline-block bg-[#4950c5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#3d42a8] transition-colors duration-200"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}

            {error && (
              <div>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-black mb-2">Verification failed</h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <div className="space-y-3">
                  <Link
                    href="/auth/signin"
                    className="inline-block bg-[#4950c5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#3d42a8] transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                  <br />
                  <Link
                    href="/auth/signup"
                    className="inline-block text-[#4950c5] hover:underline font-medium"
                  >
                    Try signing up again
                  </Link>
                </div>
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
