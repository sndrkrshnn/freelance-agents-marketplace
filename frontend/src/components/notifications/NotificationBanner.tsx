import { useEffect, useState } from 'react'
import { X, Check, AlertCircle, Info, Bell, MessageSquare, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'message' | 'task'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationBannerProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
  className?: string
}

export function NotificationBanner({ notifications, onDismiss, className }: NotificationBannerProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([])

  useEffect(() => {
    setVisibleNotifications(notifications)
  }, [notifications])

  const handleDismiss = (id: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id))
    onDismiss(id)
  }

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <div className={cn('fixed top-4 right-4 left-4 md:left-auto md:w-[400px] z-50 space-y-2', className)}>
      {visibleNotifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onDismiss: (id: string) => void
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const duration = notification.duration || 5000
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss(notification.id), 300)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [notification.id, notification.duration, onDismiss])

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <Check className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-600" />
      case 'task':
        return <Briefcase className="w-5 h-5 text-indigo-600" />
      default:
        return <Info className="w-5 h-5 text-gray-600" />
    }
  }

  const getBackgroundClass = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'message':
        return 'bg-blue-50 border-blue-200'
      case 'task':
        return 'bg-indigo-50 border-indigo-200'
      default:
        return 'bg-white border-gray-200'
    }
  }

  const getTitleClass = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-900'
      case 'error':
        return 'text-red-900'
      case 'warning':
        return 'text-yellow-900'
      case 'message':
        return 'text-blue-900'
      case 'task':
        return 'text-indigo-900'
      default:
        return 'text-gray-900'
    }
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-lg border p-4 transition-all duration-300',
        isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2',
        getBackgroundClass()
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', getTitleClass())}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-sm text-gray-600 mt-1">
              {notification.message}
            </p>
          )}
          {notification.action && (
            <button
              onClick={() => {
                notification.action!.onClick()
                onDismiss(notification.id)
              }}
              className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {notification.action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onDismiss(notification.id), 300)
          }}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = crypto.randomUUID()
    setNotifications(prev => [...prev, { ...notification, id }])
    return id
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Convenience methods
  const success = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'success', title, message, ...options })
  }

  const error = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'error', title, message, ...options })
  }

  const warning = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'warning', title, message, ...options })
  }

  const info = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'info', title, message, ...options })
  }

  const message = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'message', title, message, ...options })
  }

  const task = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'task', title, message, ...options })
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
    message,
    task
  }
}
