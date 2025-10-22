'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function DynamicHeader() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Check if we're on an auth page
  const isAuthPage = pathname.startsWith('/auth/');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="absolute top-8 left-16 lg:top-10 lg:left-24 xl:left-32 right-16 lg:right-24 xl:right-32 z-10 flex justify-between items-center">
      {/* Brand Name - Left */}
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/assets/logo.png" 
          alt="Logo" 
          width={28}
          height={28}
          className="opacity-90 lg:w-8 lg:h-8"
        />
        <span className="text-base lg:text-lg font-normal text-black">doit.</span>
      </Link>
      
      {/* Right Side - Dynamic based on auth state and page */}
      {user ? (
        /* User is signed in - Show user dropdown */
        <div className="relative" ref={dropdownRef}>
          {/* User Avatar Button */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-10 h-10 bg-[#4950c5] rounded-full flex items-center justify-center hover:bg-[#3d42a8] transition-colors"
            title={user.email}
          >
            <span className="text-white text-sm font-medium">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </button>
          
          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-12 min-w-64 max-w-96 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              {/* User Email */}
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm text-gray-600 break-all">{user.email}</p>
              </div>
              
              {/* Dashboard Button */}
              <Link
                href="/dashboard"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </Link>
              
              {/* Sign Out Button */}
              <button
                onClick={() => {
                  signOut();
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      ) : isAuthPage ? (
        /* User is not signed in and on auth page - Show Back to Home button */
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      ) : (
        /* User is not signed in and on landing page - Show Get Started button */
        <Link
          href="/auth/signin"
          className="bg-[#4950c5] text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-[#3d42a8] transition-colors duration-200"
        >
          Get Started
        </Link>
      )}
    </div>
  );
}
