import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Service Worker Registration
const registerSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        type: 'module',
      })
      
      console.log('SW registered:', registration)
      
      // Handle updates
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      
      // Listen for new service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              if (confirm('New version available. Update now?')) {
                registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
                window.location.reload()
              }
            }
          })
        }
      })
      
      // Listen for controlling change (new version activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
      
    } catch (error) {
      console.error('SW registration failed:', error)
    }
  }
}

// Service Worker Update Control
function registerServiceWorker() {
  if (import.meta.env.PROD) {
    registerSW()
  } else {
    // Enable in dev mode for testing
    registerSW()
  }
}

// Check if app is running in standalone mode (installed PWA)
export const isStandalone = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

// Online/Offline event listeners
const setupOnlineStatus = () => {
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine
    document.body.classList.toggle('offline', !isOnline)
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('onlineStatusChange', { 
      detail: { isOnline } 
    }))
    
    // Show notification when coming back online
    if (isOnline) {
      console.log('App is online')
      // Trigger sync of offline data
      window.dispatchEvent(new CustomEvent('syncOfflineData'))
    } else {
      console.log('App is offline')
    }
  }
  
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  
  // Initial check
  updateOnlineStatus()
}

// Initialize app
const initApp = () => {
  // Register service worker
  registerServiceWorker()
  
  // Setup online status tracking
  setupOnlineStatus()
  
  // Check for updates periodically
  setInterval(() => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' })
    }
  }, 60 * 60 * 1000) // Check every hour
}

// Render app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// Initialize PWA features
initApp()

// Export for testing
export { registerSW, setupOnlineStatus }
