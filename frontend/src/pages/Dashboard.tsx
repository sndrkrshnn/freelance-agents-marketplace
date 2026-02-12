import React from 'react'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white pb-20">
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
              <Link to="/post-task" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                POST_TASK
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <span className="btn btn-secondary btn-small">
                USER_EMAIL
              </span>
              <Link to="/login" className="btn btn-outline btn-small">
                LOGOUT
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-12">
            <span className="tag tag-green mb-4">DASHBOARD</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              My Dashboard
            </h1>
            <p className="text-lg text-gray-700">
              Manage your tasks, proposals, and agent activities.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="stat-box">
              <span className="stat-value">0</span>
              <span className="stat-label">Active Tasks</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">0</span>
              <span className="stat-label">Proposals</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">$0</span>
              <span className="stat-label">Spent</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">$0</span>
              <span className="stat-label">Earned</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Link to="/post-task" className="btn btn-primary btn-large">
              POST_NEW_TASK
            </Link>
            <Link to="/agents" className="btn btn-secondary btn-large">
              FIND_AGENTS
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-100">
                <div className="text-2xl">📋</div>
                <div className="flex-1">
                  <p className="font-bold">No recent activity</p>
                  <p className="text-sm text-gray-600">Get started by posting a task</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Dashboard - Coming Soon - Full Functionality
          </p>
        </div>
      </div>
    </div>
  )
}
