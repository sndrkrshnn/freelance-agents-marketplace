import { useEffect, useState } from 'react'

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export function usePushNotifications() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkSupport()
  }, [])

  const checkSupport = () => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(isSupported)
    
    if (isSupported) {
      setPermission(Notification.permission)
      getExistingSubscription()
    }
  }

  const getExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()
      setSubscription(existingSubscription as unknown as PushSubscription | null)
    } catch (error) {
      console.error('[usePushNotifications] Error getting subscription:', error)
    }
  }

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!supported) {
      console.warn('[usePushNotifications] Push notifications not supported')
      return 'denied'
    }

    let permission = Notification.permission

    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission()
        setPermission(permission)
      } catch (error) {
        console.error('[usePushNotifications] Error requesting permission:', error)
        return 'denied'
      }
    }

    if (permission === 'granted') {
      await subscribeUser()
    }

    return permission
  }

  const subscribeUser = async (): Promise<PushSubscription | null> => {
    if (!supported) {
      return null
    }

    setLoading(true)
    
    try {
      const registration = await navigator.serviceWorker.ready
      
      // Get VAPID public key from environment
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.warn('[usePushNotifications] VAPID public key not configured')
        return null
      }

      // Convert base64 to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidKey)
      
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      // Send subscription to backend
      await sendSubscriptionToBackend(pushSubscription)

      setSubscription(pushSubscription as unknown as PushSubscription)
      return pushSubscription as unknown as PushSubscription
      
    } catch (error) {
      console.error('[usePushNotifications] Error subscribing:', error)
      return null
    } finally {
      setLoading(false)
    }
  }

  const unsubscribeUser = async (): Promise<boolean> => {
    if (!subscription) {
      return true
    }

    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const pushSubscription = await registration.pushManager.getSubscription()
      
      if (pushSubscription) {
        await pushSubscription.unsubscribe()
        await deleteSubscriptionFromBackend(pushSubscription)
        setSubscription(null)
        return true
      }
      
      return false
    } catch (error) {
      console.error('[usePushNotifications] Error unsubscribing:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const sendSubscriptionToBackend = async (sub: PushSubscription) => {
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(sub)
      })
    } catch (error) {
      console.error('[usePushNotifications] Error sending subscription:', error)
    }
  }

  const deleteSubscriptionFromBackend = async (sub: PushSubscription) => {
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(sub)
      })
    } catch (error) {
      console.error('[usePushNotifications] Error deleting subscription:', error)
    }
  }

  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      await requestPermission()
    }

    try {
      const token = localStorage.getItem('token')
      await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      })
    } catch (error) {
      console.error('[usePushNotifications] Error sending test notification:', error)
    }
  }

  // Helper function to convert base64 to Uint8Array
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  return {
    subscription,
    permission,
    supported,
    loading,
    requestPermission,
    subscribe: subscribeUser,
    unsubscribe: unsubscribeUser,
    sendTestNotification
  }
}

// Local notification helper (works without push subscription)
export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    return new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      ...options
    })
  }
  return null
}
