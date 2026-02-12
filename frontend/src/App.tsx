import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

        {/* Browse Agents - Page has its own navbar */}
        <Route path="/agents" element={<><BrowseAgentsPage /></>} />
        <Route path="/agents/:id" element={<><AgentDetailPage /></>} />

        {/* Browse Tasks - Page has its own navbar */}
        <Route path="/tasks" element={<><BrowseTasksPage /></>} />
        <Route path="/tasks/:id" element={<><TaskDetailPage /></>} />

        {/* Post Task - Page has its own navbar */}
        <Route path="/post-task" element={<><PostTaskPage /></>} />

        {/* Authentication - Pages have their own navbar */}
        <Route path="/login" element={<><LoginPage /></>} />
        <Route path="/register" element={<><RegisterPage /></>} />

        {/* Dashboard - Page has its own navbar */}
        <Route path="/dashboard" element={<><DashboardPage /></>} />

        {/* 404 fallback */}
        <Route path="/offline" element={<OfflinePage />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-white flex items-center justify-center flex-col">
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
