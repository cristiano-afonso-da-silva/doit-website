'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    if (isSigningOut) return // Prevent multiple clicks
    
    setIsSigningOut(true)
    try {
      console.log('Attempting to sign out...')
      const { error } = await signOut()
      if (error) {
        console.error('Sign out error:', error)
        alert('Error signing out. Please try again.')
      } else {
        console.log('Successfully signed out')
        setIsOpen(false)
        // Force page reload to ensure clean state
        window.location.reload()
      }
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Error signing out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (!user) return null

  const getUserInitials = () => {
    const fullName = user.user_metadata?.full_name || user.email
    return fullName
      .split(' ')
      .map((name: string) => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-[#4950c5] rounded-full flex items-center justify-center text-white text-sm font-medium">
          {getUserInitials()}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-900">
              {user.user_metadata?.full_name || 'User'}
            </div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
          
          <div className="py-1">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-2">
                {isSigningOut ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                )}
                <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
