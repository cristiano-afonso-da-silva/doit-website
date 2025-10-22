'use client';

import React, { useState, useEffect } from 'react';

interface PasswordGateProps {
  children: React.ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = localStorage.getItem('beta-auth');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'growwithdoit') {
      localStorage.setItem('beta-auth', 'authenticated');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };


  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f2f3]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4950c5]"></div>
      </div>
    );
  }

  // Show password form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f1f2f3] flex items-center justify-center px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6 lg:mb-8 leading-tight">
              Beta Access
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-black mb-6 lg:mb-8 leading-relaxed">
              Enter the beta password to access the application.
            </p>

            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-6 lg:mb-8">
              <p className="text-sm text-yellow-800">
                <strong>Desktop Recommended:</strong> Please use desktop for the best experience.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-4 border border-gray-300 rounded-full text-lg placeholder-gray-500 text-black focus:outline-none focus:ring-2 focus:ring-[#4950c5] focus:border-[#4950c5] transition-colors duration-200"
                  placeholder="Enter beta password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-red-600 text-lg text-center">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="w-full bg-[#4950c5] text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-[#3d42a8] transition-colors duration-200"
                >
                  Access Beta
                </button>
              </div>
            </form>

            <div className="mt-8">
              <p className="text-sm text-gray-600">
                Need access? Email{' '}
                <a 
                  href="mailto:doit.worklog@gmail.com" 
                  className="text-[#4950c5] hover:text-[#3d42a8] underline"
                >
                  doit.worklog@gmail.com
                </a>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                I&apos;ll reply in 24 hours. Please include your name, why you want to join Doit, and any productivity apps you use. Thanks!
              </p>
            </div>

            <div className="mt-8">
              <p className="text-sm text-gray-500">This is a beta version of the application</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show the actual application if authenticated
  return <>{children}</>;
}
