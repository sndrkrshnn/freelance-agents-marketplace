import { WifiOff, RefreshCw, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { showLocalNotification } from '@/hooks/usePushNotifications'
import { getAllOfflineDrafts } from '@/services/indexedDB'

export default function Offline() {
  const isOnline = useOnlineStatus()
  const [draftsCount, setDraftsCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    // Load draft count
    loadDrafts()
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const loadDrafts = async () => {
    try {
      const drafts = await getAllOfflineDrafts()
      setDraftsCount(drafts.length)
    } catch (error) {
      console.error('Error loading drafts:', error)
    }
  }

  const handleReload = () => {
    setIsRetrying(true)
    window.location.reload()
  }

  const handleNotifyWhenBack = () => {
    if (Notification.permission === 'granted') {
      showLocalNotification('We\'re back online!', {
        body: 'The connection has been restored. You can now continue working.',
        requireInteraction: false
      })
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          showLocalNotification('We\'re back online!', {
            body: 'The connection has been restored. You can now continue working.'
          })
        }
      })
    }
  }

  // Auto-reload when coming back online
  useEffect(() => {
    if (isOnline) {
      console.log('Back online, reloading...')
      window.location.reload()
    }
  }, [isOnline])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-orange-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You're offline
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          No internet connection detected. Some features may be unavailable.
        </p>

        {/* Drafts info */}
        {draftsCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>{draftsCount}</strong> unsaved draft{draftsCount > 1 ? 's' : ''} will sync when you're back online
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleReload}
            disabled={isRetrying}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Reload Page
              </>
            )}
          </button>

          <button
            onClick={loadDrafts}
            className="w-full px-6 py-3 bg-white text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Check Draft Status
          </button>

          {Notification.permission === 'default' && (
            <button
              onClick={handleNotifyWhenBack}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Bell className="w-5 h-5" />
              Notify When Back Online
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3 font-medium">
            While offline, you can:
          </p>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              View saved tasks and agents
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Draft and save your work locally
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Access your profile and settings
            </li>
          </ul>
        </div>

        {/* Status indicator */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-500">
            {isOnline ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  )
}
