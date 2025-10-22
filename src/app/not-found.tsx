import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f1f2f3] flex flex-col items-center justify-center">
      <div className="text-center">
        <Image
          src="/assets/logo.png"
          alt="Doit Logo"
          width={120}
          height={120}
          className="mx-auto mb-8 opacity-90"
        />
        <h1 className="text-6xl font-bold text-black mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-black mb-4">Page Not Found</h2>
        <p className="text-lg text-gray-600 mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="bg-[#4950c5] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#3d42a8] transition-colors duration-200"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

