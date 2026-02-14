import { useState, useEffect } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine
  )

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log('[useOnlineStatus] Connection restored')
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('[useOnlineStatus] Connection lost')
    }

    // Listen to browser online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen to custom events from main.tsx
    const handleOnlineStatusChange = (event: CustomEvent) => {
      setIsOnline(event.detail.isOnline)
    }

    window.addEventListener('onlineStatusChange' as any, handleOnlineStatusChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('onlineStatusChange' as any, handleOnlineStatusChange)
    }
  }, [])

  return isOnline
}

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')

  useEffect(() => {
    const handleSync = () => {
      setSyncStatus('syncing')
      // Trigger sync logic
      setTimeout(() => {
        setSyncStatus('synced')
        setTimeout(() => setSyncStatus('idle'), 2000)
      }, 1000)
    }

    window.addEventListener('syncOfflineData' as any, handleSync)
    return () => window.removeEventListener('syncOfflineData' as any, handleSync)
  }, [])

  const triggerSync = () => {
    window.dispatchEvent(new CustomEvent('syncOfflineData'))
  }

  return { syncStatus, triggerSync }
}
