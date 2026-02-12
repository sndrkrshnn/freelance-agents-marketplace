import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import HomePage from './pages/Home'
import PostTaskPage from './pages/PostTask'
import BrowseAgentsPage from './pages/BrowseAgents'
import BrowseTasksPage from './pages/BrowseTasks'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import DashboardPage from './pages/Dashboard'
import TaskDetailPage from './pages/TaskDetail'
import AgentDetailPage from './pages/AgentDetail'
import OfflinePage from './pages/Offline'
import { isStandalone } from './main'

// Navigation Component
function Navigation() {
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  return (
    !isHomePage && (
      <nav className="nav-fixed">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold">AGENTS.</span>
              <span className="font-mono text-sm bg-black text-white px-2 py-1">MARKET</span>
            </a>

            <div className="hidden md:flex items-center gap-1">
              <a href="/agents" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                FIND_AGENTS
              </a>
              <a href="/tasks" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                BROWSE_TASKS
              </a>
              <a href="/post-task" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                POST_TASK
              </a>
              <a href="/login" className="btn btn-primary ml-4">
                GET_STARTED
              </a>
            </div>

            <a href="/dashboard" className="btn btn-outline btn-small">
              DASHBOARD
            </a>
          </div>
        </div>
      </nav>
    )
  )
}

// Main App Component
function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    // Track when app is running as PWA
    if (isStandalone()) {
      document.body.classList.add('pwa-standalone')
      console.log('Running as PWA')
    }

    // Preload important assets
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_URLS',
        urls: ['/manifest.json']
      })
    }

    // Online/Offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Show offline page if offline
  if (!isOnline) {
    return <OfflinePage />
  }

  return (
    <>
      <Routes>
        {/* Home page has its own navigation */}
        <Route path="/" element={<><HomePage /></>} />

        {/* Browse Agents */}
        <Route
          path="/agents"
          element={
            <>
              <Navigation />
              <BrowseAgentsPage />
            </>
          }
        />
        <Route
          path="/agents/:id"
          element={
            <>
              <Navigation />
              <AgentDetailPage />
            </>
          }
        />

        {/* Browse Tasks */}
        <Route
          path="/tasks"
          element={
            <>
              <Navigation />
              <BrowseTasksPage />
            </>
          }
        />
        <Route
          path="/tasks/:id"
          element={
            <>
              <Navigation />
              <TaskDetailPage />
            </>
          }
        />

        {/* Post Task */}
        <Route
          path="/post-task"
          element={
            <>
              <Navigation />
              <PostTaskPage />
            </>
          }
        />

        {/* Authentication */}
        <Route
          path="/login"
          element={
            <>
              <Navigation />
              <LoginPage />
            </>
          }
        />
        <Route
          path="/register"
          element={
            <>
              <Navigation />
              <RegisterPage />
            </>
          }
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <>
              <Navigation />
              <DashboardPage />
            </>
          }
        />

        {/* 404 fallback */}
        <Route path="/offline" element={<OfflinePage />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-white flex items-center justify-center flex-col pt-24">
              <div className="text-center mb-8">
                <div className="font-mono text-9xl font-bold text-gray-200">404</div>
                <h2 className="text-4xl font-bold mt-4 mb-2">Page Lost</h2>
                <p className="text-gray-600 mb-8">This page doesn't exist (or the agent deleted it)</p>
              </div>
              <a href="/" className="btn btn-primary">
                Back Home →
              </a>
            </div>
          }
        />
      </Routes>
    </>
  )
}

export default App
