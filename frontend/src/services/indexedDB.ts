import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Define database schema
interface AgentMarketDB extends DBSchema {
  offlineDrafts: {
    key: string
    value: {
      id: string
      type: 'task' | 'proposal' | 'message'
      data: any
      timestamp: number
      synced: boolean
    }
    indexes: {
      'by-timestamp': number
      'by-type': string
      'by-synced': boolean
    }
  }
  messages: {
    key: string
    value: {
      id: string
      conversationId: string
      senderId: string
      recipientId: string
      content: string
      timestamp: number
      synced: boolean
    }
    indexes: {
      'by-conversation': string
      'by-timestamp': number
    }
  }
  tasks: {
    key: string
    value: {
      id: string
      data: any
      timestamp: number
    }
    indexes: {
      'by-timestamp': number
    }
  }
  settings: {
    key: string
    value: any
  }
}

const DB_NAME = 'AgentMarketDB'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<AgentMarketDB> | null = null

// Initialize database
export async function initDB(): Promise<IDBPDatabase<AgentMarketDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<AgentMarketDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create offlineDrafts store
      if (!db.objectStoreNames.contains('offlineDrafts')) {
        const draftStore = db.createObjectStore('offlineDrafts', {
          keyPath: 'id'
        })
        draftStore.createIndex('by-timestamp', 'timestamp')
        draftStore.createIndex('by-type', 'type')
        draftStore.createIndex('by-synced', 'synced')
      }

      // Create messages store
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', {
          keyPath: 'id'
        })
        messageStore.createIndex('by-conversation', 'conversationId')
        messageStore.createIndex('by-timestamp', 'timestamp')
      }

      // Create tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', {
          keyPath: 'id'
        })
        taskStore.createIndex('by-timestamp', 'timestamp')
      }

      // Create settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }

      console.log(`[IndexedDB] Upgraded from version ${oldVersion} to ${DB_VERSION}`)
    },
    blocked() {
      console.warn('[IndexedDB] Database upgrade blocked')
    },
    blocking() {
      console.warn('[IndexedDB] Database is blocking other connections')
    },
  })

  console.log('[IndexedDB] Database initialized')
  return dbInstance
}

// Get database instance
export async function getDB(): Promise<IDBPDatabase<AgentMarketDB>> {
  if (!dbInstance) {
    return await initDB()
  }
  return dbInstance
}

// ==================== Offline Drafts ====================

export interface OfflineDraft {
  id: string
  type: 'task' | 'proposal' | 'message'
  data: any
  timestamp: number
  synced: boolean
}

export async function saveOfflineDraft(draft: OfflineDraft): Promise<void> {
  const db = await getDB()
  await db.put('offlineDrafts', {
    ...draft,
    timestamp: draft.timestamp || Date.now(),
    synced: false
  })
  console.log('[IndexedDB] Saved offline draft:', draft.id)
}

export async function getOfflineDraft(id: string): Promise<OfflineDraft | undefined> {
  const db = await getDB()
  return await db.get('offlineDrafts', id)
}

export async function getOfflineDraftsByType(
  type: 'task' | 'proposal' | 'message'
): Promise<OfflineDraft[]> {
  const db = await getDB()
  return await db.getAllFromIndex('offlineDrafts', 'by-type', type)
}

export async function getAllOfflineDrafts(): Promise<OfflineDraft[]> {
  const db = await getDB()
  return await db.getAll('offlineDrafts')
}

export async function deleteOfflineDraft(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('offlineDrafts', id)
  console.log('[IndexedDB] Deleted offline draft:', id)
}

export async function markDraftAsSynced(id: string): Promise<void> {
  const db = await getDB()
  const draft = await db.get('offlineDrafts', id)
  if (draft) {
    await db.put('offlineDrafts', { ...draft, synced: true })
  }
}

// ==================== Messages ====================

export interface OfflineMessage {
  id: string
  conversationId: string
  senderId: string
  recipientId: string
  content: string
  timestamp: number
  synced: boolean
}

export async function saveOfflineMessage(message: OfflineMessage): Promise<void> {
  const db = await getDB()
  await db.put('messages', {
    ...message,
    timestamp: message.timestamp || Date.now(),
    synced: false
  })
  console.log('[IndexedDB] Saved offline message:', message.id)
}

export async function getOfflineMessages(
  conversationId: string
): Promise<OfflineMessage[]> {
  const db = await getDB()
  return await db.getAllFromIndex('messages', 'by-conversation', conversationId)
}

export async function getAllOfflineMessages(): Promise<OfflineMessage[]> {
  const db = await getDB()
  return await db.getAll('messages')
}

export async function deleteOfflineMessage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('messages', id)
}

export async function markMessageAsSynced(id: string): Promise<void> {
  const db = await getDB()
  const message = await db.get('messages', id)
  if (message) {
    await db.put('messages', { ...message, synced: true })
  }
}

// ==================== Tasks ====================

export interface OfflineTask {
  id: string
  data: any
  timestamp: number
}

export async function saveOfflineTask(task: OfflineTask): Promise<void> {
  const db = await getDB()
  await db.put('tasks', {
    ...task,
    timestamp: task.timestamp || Date.now()
  })
  console.log('[IndexedDB] Saved offline task:', task.id)
}

export async function getOfflineTask(id: string): Promise<OfflineTask | undefined> {
  const db = await getDB()
  return await db.get('tasks', id)
}

export async function getAllOfflineTasks(): Promise<OfflineTask[]> {
  const db = await getDB()
  return await db.getAll('tasks')
}

export async function deleteOfflineTask(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tasks', id)
}

// ==================== Settings ====================

export async function saveSetting(key: string, value: any): Promise<void> {
  const db = await getDB()
  await db.put('settings', value, key)
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  return await db.get('settings', key)
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDB()
  await db.delete('settings', key)
}

// ==================== Sync Functions ====================

export async function getUnsyncedData(): Promise<{
  drafts: OfflineDraft[]
  messages: OfflineMessage[]
}> {
  const db = await getDB()
  
  const [drafts, messages] = await Promise.all([
    db.getAllFromIndex('offlineDrafts', 'by-synced', false),
    db.getAllFromIndex('messages', 'by-synced', false)
  ])

  return { drafts, messages }
}

export async function clearSyncedData(): Promise<void> {
  const db = await getDB()
  
  // Delete synced items older than 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  
  const { drafts, messages } = await getUnsyncedData()
  
  // Keep only unsynced or recent synced items
  for (const draft of drafts) {
    if (draft.synced && draft.timestamp < sevenDaysAgo) {
      await db.delete('offlineDrafts', draft.id)
    }
  }
  
  for (const message of messages) {
    if (message.synced && message.timestamp < sevenDaysAgo) {
      await db.delete('messages', message.id)
    }
  }
}

// ==================== Utilities ====================

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  
  for (const storeName of db.objectStoreNames) {
    await db.clear(storeName)
  }
  
  console.log('[IndexedDB] Cleared all data')
}

export async function getDBStats(): Promise<{
  drafts: number
  messages: number
  tasks: number
  settings: number
}> {
  const db = await getDB()
  
  const [drafts, messages, tasks, settings] = await Promise.all([
    db.count('offlineDrafts'),
    db.count('messages'),
    db.count('tasks'),
    db.count('settings')
  ])
  
  return { drafts, messages, tasks, settings }
}

export default { initDB, getDB }
