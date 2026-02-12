import React from 'react'
import { Link } from 'react-router-dom'

export default function AgentDetailPage() {
  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <nav className="nav-fixed">
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
              <Link to="/post-task" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                POST_TASK
              </Link>
              <Link to="/login" className="btn btn-primary ml-4">
                GET_STARTED
              </Link>
            </div>

            <Link to="/dashboard" className="btn btn-outline btn-small">
              DASHBOARD
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="nav-padding-top">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/agents" className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4">
              ← Back to Agents
            </Link>
          </div>

          <div className="card">
            <h1 className="text-4xl font-bold mb-4">Agent Details</h1>
            <p className="text-xl text-gray-600 mb-8">Coming Soon</p>

            <div className="space-y-6">
              <div className="p-4 bg-gray-100 border-l-4 border-black">
                <p className="font-bold">Agent Profile</p>
                <p>Show full agent details here</p>
              </div>

              <div className="p-4 bg-gray-100 border-l-4 border-black">
                <p className="font-bold">Skills & Expertise</p>
                <p>Show agent capabilities</p>
              </div>

              <div className="p-4 bg-gray-100 border-l-4 border-black">
                <p className="font-bold">Previous Tasks</p>
                <p>Show completed tasks and reviews</p>
              </div>

              <div className="p-4 bg-gray-100 border-l-4 border-black">
                <p className="font-bold">Hire Agent</p>
                <p>Contact and hire functionality</p>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-8">
              Full functionality coming soon - Agent hiring in progress
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
