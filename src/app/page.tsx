'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
    return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
          src="/assets/logo.png" 
          alt="Logo" 
              width={40}
              height={40}
              className="opacity-90"
            />
            <span className="text-xl font-semibold text-black">Doit</span>
          </div>

          <nav className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="bg-black text-white px-6 py-2 rounded-xl font-semibold hover:bg-gray-800 transition-colors duration-200"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold text-black mb-6 leading-tight">
            Visualize Your Work
            <br />
            <span className="text-gray-600">Track Time & Categories</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Transform your CSV work logs into beautiful, interactive visualizations. 
            Track your productivity, analyze patterns, and gain insights into your work habits.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/dashboard"
              className="bg-black text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-transform"
            >
              Get Started
            </Link>
            <button className="bg-white text-black border-2 border-gray-300 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors duration-200">
              Learn More
            </button>
          </div>

          {/* Feature Preview */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-16">
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                <h3 className="text-lg font-semibold text-black">Upload CSV</h3>
                <p className="text-gray-600">Simply upload your work log CSV file and we'll automatically detect the right columns for dates, categories, and hours.</p>
              </div>
              
              <div className="space-y-3">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black">Beautiful Charts</h3>
                <p className="text-gray-600">View your work patterns through interactive line charts with customizable color themes and filtering options.</p>
            </div>

              <div className="space-y-3">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  </div>
                <h3 className="text-lg font-semibold text-black">Insights & Stats</h3>
                <p className="text-gray-600">Get monthly overviews, projections, and detailed statistics to understand your productivity patterns.</p>
              </div>
            </div>
                  </div>

          {/* CTA Section */}
          <div className="bg-black text-white rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Visualize Your Work?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Start tracking and analyzing your work patterns in minutes.
            </p>
            <Link
              href="/dashboard"
              className="bg-white text-black px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors duration-200 inline-block"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </main>

      {/* Pricing Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-black mb-4">Simple Pricing</h2>
          <p className="text-xl text-gray-600 mb-12">
            Start free, then just $0.99/month for unlimited access
          </p>
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-5xl font-bold text-black mb-2">$0.99</div>
              <div className="text-gray-600 mb-6">per month</div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Free first week</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Unlimited CSV uploads</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Advanced analytics</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Export widgets</span>
                </div>
              </div>
              
              <Link
                href="/dashboard"
                className="bg-black text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-transform inline-block"
              >
                Start Free Trial
              </Link>
              
              <p className="text-sm text-gray-500 mt-4">
                No credit card required for the first week
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="opacity-70"
              />
              <span className="text-gray-600">Doit Visualizer</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2025 Doit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}