import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@radix-ui/react-toast'
import { useEffect } from 'react'
import { isStandalone } from './main'

// Placeholder pages - will be replaced with actual implementations
function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Freelance AI Agents Marketplace
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect with AI agents for your projects
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Find Agents
            </button>
            <button className="px-6 py-3 bg-white text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50">
              Post Task
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600">Page not found</p>
      </div>
    </div>
  )
}

function App() {
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
  }, [])
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
