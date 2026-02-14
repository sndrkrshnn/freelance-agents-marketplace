import { useEffect, useState } from 'react'
import { Bell, BellOff, X, Check } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function PushNotificationPermission() {
  const { permission, supported, requestPermission } = usePushNotifications()
  const isOnline = useOnlineStatus()
  const [dismissed, setDismissed] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has previously dismissed
    const hasDismissed = localStorage.getItem('push-banner-dismissed')
    if (!hasDismissed) {
      // Show banner after 3 seconds if permission is default
      const timer = setTimeout(() => {
        if (permission === 'default' && supported) {
          setShowBanner(true)
        }
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [permission, supported])

  // Don't show if dismissed, not supported, or offline
  if (dismissed || !supported || permission !== 'default' || !isOnline || !showBanner) {
    return null
  }

  const handleAllow = async () => {
    const result = await requestPermission()
    if (result === 'granted') {
      setShowBanner(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('push-banner-dismissed', 'true')
    setDismissed(true)
    setShowBanner(false)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <Bell className="w-6 h-6 text-indigo-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Enable Notifications
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Stay updated with new tasks, messages, and project updates. We'll only send you what matters.
          </p>
        </div>

        {/* Settings button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleAllow}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <Bell className="w-4 h-4" />
          Enable
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Not Now
        </button>
      </div>
    </div>
  )
}

interface NotificationSettingsProps {
  className?: string
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { permission, supported, subscribe, unsubscribe, subscription, sendTestNotification, loading } = usePushNotifications()
  const isOnline = useOnlineStatus()
  const [settings, setSettings] = useState({
    newTasks: true,
    newMessages: true,
    taskUpdates: true,
    marketing: false
  })

  const handleToggleSubscription = async () => {
    if (!isOnline) {
      alert('Please connect to the internet first')
      return
    }

    if (subscription) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  const handleTestNotification = () => {
    if (!isOnline) {
      alert('Please connect to the internet first')
      return
    }
    sendTestNotification()
  }

  const handleSettingChange = (setting: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [setting]: value }))
    // In a real app, this would save to backend
    localStorage.setItem(`notification-${setting}`, String(value))
  }

  const isEnabled = permission === 'granted' && subscription !== null

  if (!supported) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-yellow-800">
          Push notifications are not supported in this browser. Please use Chrome, Firefox, or Safari on a modern device.
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage how you receive notifications
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {isEnabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {/* Toggle Push Notifications */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-indigo-100' : 'bg-gray-100'}`}>
            {isEnabled ? (
              <Bell className="w-5 h-5 text-indigo-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Push Notifications</p>
            <p className="text-xs text-gray-500">
              {permission === 'granted' ? 'Notifications enabled' : 
               permission === 'denied' ? 'Blocked in browser' : 
               'Enable to receive alerts'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleSubscription}
          disabled={loading || permission === 'denied'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-indigo-600' : 'bg-gray-200'
          } ${loading || permission === 'denied' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Notification Types */}
      <div className="mt-6 space-y-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Email & In-App</h4>
        
        <SettingToggle
          label="New Tasks"
          description="Get notified when new tasks match your skills"
          enabled={settings.newTasks}
          onChange={(v) => handleSettingChange('newTasks', v)}
        />

        <SettingToggle
          label="New Messages"
          description="Get notified when you receive new messages"
          enabled={settings.newMessages}
          onChange={(v) => handleSettingChange('newMessages', v)}
        />

        <SettingToggle
          label="Task Updates"
          description="Get notified about task status changes"
          enabled={settings.taskUpdates}
          onChange={(v) => handleSettingChange('taskUpdates', v)}
        />

        <SettingToggle
          label="Marketing Emails"
          description="Receive promotional emails and news"
          enabled={settings.marketing}
          onChange={(v) => handleSettingChange('marketing', v)}
        />
      </div>

      {/* Test Notification */}
      {(isEnabled || permission === 'granted') && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={handleTestNotification}
            disabled={!isOnline}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Send Test Notification
          </button>
        </div>
      )}

      {/* Permission Status */}
      {permission === 'denied' && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Notifications are blocked in your browser. To enable them, go to your browser settings and allow notifications for this site.
          </p>
        </div>
      )}
    </div>
  )
}

interface SettingToggleProps {
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}

function SettingToggle({ label, description, enabled, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}
