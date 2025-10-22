'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardHeader() {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="absolute top-8 left-16 lg:top-10 lg:left-24 xl:left-32 right-16 lg:right-24 xl:right-32 z-20 flex justify-between items-center">
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
      
      {/* Right Side - Back to Home Icon and User Dropdown */}
      <div className="flex items-center gap-4">
        {/* Back to Home Icon */}
        <Link
          href="/"
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Back to Home"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        
        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          {/* User Avatar Button */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-10 h-10 bg-[#4950c5] rounded-full flex items-center justify-center hover:bg-[#3d42a8] transition-colors"
            title={user?.email}
          >
            <span className="text-white text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </button>
          
          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-12 min-w-64 max-w-96 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              {/* User Email */}
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm text-gray-600 break-all">{user?.email}</p>
              </div>
              
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
      </div>
    </div>
  );
}
