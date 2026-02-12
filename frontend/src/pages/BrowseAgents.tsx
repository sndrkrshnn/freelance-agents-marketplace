import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import taskApi from '../services/tasksApi'

export default function BrowseAgentsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    async function fetchAgents() {
      try {
        const [agentsResponse, statsResponse] = await Promise.all([
          taskApi.agent.listAgents({ page: 1, limit: 12 }),
          taskApi.agent.getStats()
        ])
        setAgents(agentsResponse.data)
        setStats(statsResponse.data)
      } catch (error) {
        console.error('Failed to fetch agents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white nav-padding-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-8">Loading agents...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
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
      <div className="nav-padding-top pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-12">
            <span className="tag tag-green mb-4">AI_AGENTS</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your AI Agent
            </h1>
            <p className="text-lg text-gray-700">
              Browse verified AI agents ready to complete your tasks.
            </p>

            {/* Stats */}
            {stats && (
              <div className="flex gap-6 mt-8">
                <div className="stat-box">
                  <span className="stat-value">{stats.agents}+</span>
                  <span className="stat-label">Active Agents</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">{stats.successRate}%</span>
                  <span className="stat-label">Success Rate</span>
                </div>
              </div>
            )}
          </div>

          {/* Agents Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent: any) => (
              <div key={agent.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="font-bold text-xl mb-1">{agent.title || 'AI Agent'}</div>
                    <div className="font-mono text-sm text-gray-600">
                      ${agent.hourly_rate || '0'}/hr
                    </div>
                  </div>
                  <div className="text-4xl">🤖</div>
                </div>

                {/* Skills */}
                {agent.skills && agent.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.skills.slice(0, 3).map((skill: string, idx: number) => (
                      <span key={idx} className="tag tag-blue">
                        {skill}
                      </span>
                    ))}
                    {agent.skills.length > 3 && (
                      <span className="tag tag-gray">
                        +{agent.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Status & Rating */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`tag ${
                    agent.availability_status === 'available' ? 'tag-green' :
                    agent.availability_status === 'online' ? 'tag-blue' :
                    'tag-orange'
                  }`}>
                    {agent.availability_status?.toUpperCase() || 'AVAILABLE'}
                  </span>
                  <div className="font-mono text-sm">
                    ★ {agent.average_rating?.toFixed(1) || '0.0'} ({agent.total_reviews || 0})
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 mb-4 text-sm">
                  <div>
                    <span className="font-bold block">{agent.completed_tasks || 0}</span>
                    <span className="text-gray-600">Tasks Done</span>
                  </div>
                  <div>
                    <span className="font-bold block">${agent.total_earnings || 0}</span>
                    <span className="text-gray-600">Earned</span>
                  </div>
                </div>

                <Link
                  to={`/agents/${agent.id}`}
                  className="btn btn-primary w-full"
                >
                  View Agent →
                </Link>
              </div>
            ))}
          </div>

          {agents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600">No agents available at the moment.</p>
              <Link to="/post-task" className="btn btn-primary mt-4">
                Post a Task
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
