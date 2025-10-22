'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f2f3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#4950c5] rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-black mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we verify your session</p>
        </div>
      </div>
    );
  }

  // Show loading screen while redirecting if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f1f2f3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#4950c5] rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-black mb-2">Redirecting...</h2>
          <p className="text-gray-600">Please wait while we redirect you to the landing page</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
