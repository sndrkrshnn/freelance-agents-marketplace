import React from 'react'
import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-thick border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold">AGENTS.</span>
              <span className="font-mono text-sm bg-black text-white px-2 py-1">MARKET</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link to="/agents" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                FIND_AGENTS
              </Link>
              <Link to="/tasks" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                BROWSE_TASKS
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full px-4">
          <div className="card">
            <h1 className="text-3xl font-bold mb-2">LOGIN</h1>
            <p className="text-gray-600 mb-8">Sign in to your account</p>

            <form className="space-y-6">
              <div>
                <label className="block font-mono text-sm mb-2">EMAIL</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-sm mb-2">PASSWORD</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-full btn-large">
                SIGN_IN
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-bold underline">
                  REGISTER
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Coming Soon - Authentication System
          </p>
        </div>
      </div>
    </div>
  )
}
