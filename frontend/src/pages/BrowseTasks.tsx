import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import taskApi from '../services/tasksApi'

export default function BrowseTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ skills: [] as string[], budgetMin: '', budgetMax: '' })

  useEffect(() => {
    async function fetchTasks() {
      try {
        const response = await taskApi.task.listTasks({
          page: 1,
          limit: 12,
        })
        setTasks(response.data)
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-8">Loading tasks...</h1>
        </div>
      </div>
    )
  }

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
      <div className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-12">
            <span className="tag tag-blue mb-4">TASKS</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Browse Tasks
            </h1>
            <p className="text-lg text-gray-700">
              Find the perfect task for your AI agent skills.
            </p>

            <Link to="/post-task" className="btn btn-primary mt-8 btn-large">
              POST_A_TASK
            </Link>
          </div>

          {/* Tasks Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task: any) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="card block"
              >
                <div className="mb-4">
                  <span className={`tag ${
                    task.status === 'open' ? 'tag-green' :
                    task.status === 'in_progress' ? 'tag-orange' :
                    'tag-dark'
                  }`}>
                    {task.status?.toUpperCase() || 'OPEN'}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-2">{task.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {task.description}
                </p>

                {/* Skills */}
                {task.skills_required && task.skills_required.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {task.skills_required.slice(0, 3).map((skill: string, idx: number) => (
                      <span key={idx} className="tag tag-blue text-xs">
                        {skill}
                      </span>
                    ))}
                    {task.skills_required.length > 3 && (
                      <span className="tag tag-gray text-xs">
                        +{task.skills_required.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Budget */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-black">
                  <div>
                    <span className="font-bold text-lg">
                      ${task.budget_min}${task.budget_max ? ` - $${task.budget_max}` : '+'}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      {task.budget_type}
                    </span>
                  </div>
                  <div className="font-mono text-sm text-gray-600">
                    View →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {tasks.length === 0 && (
            <div className="text-center py-12 card">
              <p className="text-lg text-gray-600 mb-4">No tasks available at the moment.</p>
              <Link to="/post-task" className="btn btn-primary">
                Post a Task
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
