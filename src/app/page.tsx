'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
    return (
    <div className="min-h-screen bg-[#f1f2f3] flex flex-col">
      {/* Brand Name - Top Left */}
      <div className="absolute top-8 left-16 lg:top-10 lg:left-24 xl:left-32 z-10">
        <div className="flex items-center gap-3">
          <Image
            src="/assets/logo.png" 
            alt="Logo" 
            width={28}
            height={28}
            className="opacity-90 lg:w-8 lg:h-8"
          />
          <span className="text-base lg:text-lg font-normal text-black">doit.</span>
        </div>
      </div>

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto px-16 lg:px-24 xl:px-32 flex flex-col lg:flex-row items-center justify-center min-h-screen">
          {/* Left Content */}
          <div className="w-full lg:w-1/2 lg:pr-8 xl:pr-12 mb-12 lg:mb-0">
            <h1 className="text-4xl lg:text-5xl font-bold text-black mb-8 leading-tight">
              See your time. Understand your life.
            </h1>
            
            <p className="text-lg lg:text-xl text-black mb-12 leading-relaxed">
              Doit turns your work logs into clear, visual insights — helping you see where your time goes and how you're growing.
            </p>

            <div className="flex justify-start">
              <Link
                href="/dashboard"
                className="bg-[#4950c5] text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-[#3d42a8] transition-colors duration-200"
              >
                Visualize Now
              </Link>
            </div>
          </div>

          {/* Right Graphic Element */}
          <div className="w-full lg:w-1/2 lg:pl-8 xl:pl-12 flex justify-center items-center">
            <div className="relative w-96 h-96 lg:w-[30rem] lg:h-[30rem] flex items-center justify-center">
              {/* Logo */}
              <Image
                src="/assets/logo.png"
                alt="Doit Logo"
                width={400}
                height={400}
                className="opacity-90"
                priority
              />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Tagline */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 lg:bottom-10">
        <p className="text-lg lg:text-xl font-normal text-black">Quantify your effort. Visualize your growth.</p>
      </div>
    </div>
  );
}