'use client'

import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthModal } from './AuthModal'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4950c5]"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-[#4950c5] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Doit Visualizer
              </h1>
              <p className="text-gray-600 mb-8">
                Sign in to access your data and create beautiful visualizations from your work logs.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setAuthMode('signin')
                    setAuthModalOpen(true)
                  }}
                  className="w-full bg-[#4950c5] text-white py-3 px-4 rounded-lg hover:bg-[#3d42a8] focus:outline-none focus:ring-2 focus:ring-[#4950c5] focus:ring-offset-2 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup')
                    setAuthModalOpen(true)
                  }}
                  className="w-full bg-white text-[#4950c5] py-3 px-4 rounded-lg border-2 border-[#4950c5] hover:bg-[#4950c5] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#4950c5] focus:ring-offset-2 transition-colors"
                >
                  Sign Up
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                Your data is securely stored and synced across all your devices.
              </p>
            </div>
          </div>
        )}
        
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      </>
    )
  }

  return <>{children}</>
}
