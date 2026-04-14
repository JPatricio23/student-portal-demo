'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome
        </h1>
        <p className="text-gray-600 mb-8">
          Get started with our platform
        </p>
        <Link href="/auth">
          <button className="w-full bg-black text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-800 transition duration-300">
            Get Started
          </button>
        </Link>
      </div>
    </div>
  )
}