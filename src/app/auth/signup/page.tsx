'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import DynamicHeader from '../../../components/DynamicHeader';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Store email and password BEFORE sending OTP
      sessionStorage.setItem('pending_signup_email', email);
      sessionStorage.setItem('pending_signup_password', password);

      // Send OTP code to email (not magic link)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          // Force OTP instead of magic link
          data: {
            // Custom data to ensure OTP flow
          },
        },
      });

      if (otpError) {
        console.error('OTP error:', otpError);
        // Clean up session storage on error
        sessionStorage.removeItem('pending_signup_email');
        sessionStorage.removeItem('pending_signup_password');
        setError(otpError.message);
        setLoading(false);
        return;
      }

      // Redirect to verification page
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error('Sign up error:', err);
      // Clean up session storage on error
      sessionStorage.removeItem('pending_signup_email');
      sessionStorage.removeItem('pending_signup_password');
      setError('An unexpected error occurred');
      setLoading(false);
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
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-black mb-2">Create your account</h1>
              <p className="text-gray-600">Get started with doit today</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4950c5] focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4950c5] focus:border-transparent"
                  placeholder="Create a password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4950c5] focus:border-transparent"
                  placeholder="Confirm your password"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4950c5] text-white py-3 rounded-lg font-medium hover:bg-[#3d42a8] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-[#4950c5] hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
