import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { useToast } from './useToast.js'

const SAVE_DEBOUNCE_MS = 300
const BOARD_ID = 'main' // Single fixed board
const OFFLINE_QUEUE_KEY = 'mood-board-offline-queue'

export function useSync() {
  const store = useBoardStore()
  const toast = useToast()
  const boardId = ref(BOARD_ID)
  const connected = ref(false)
  const syncing = ref(false)
  let ws = null
  let saveTimer = null
  let ignoreNextWatch = false
  let reconnectTimer = null
  let initialized = false
  let serverVersion = -1
  let wasConnected = false

  const isOffline = computed(() => !connected.value && initialized)

  function getLocalKey() {
    return 'mood-board-main'
  }

  function saveLocal() {
    try {
      localStorage.setItem(getLocalKey(), JSON.stringify(store.exportBoard()))
    } catch { /* ignore */ }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(getLocalKey())
      if (raw) {
        store.loadBoard(JSON.parse(raw))
        return true
      }
    } catch { /* ignore */ }
    return false
  }

  // Offline queue — only stores latest snapshot
  function saveOfflineQueue(board) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(board))
    } catch { /* ignore */ }
  }

  function loadOfflineQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return null
  }

  function clearOfflineQueue() {
    localStorage.removeItem(OFFLINE_QUEUE_KEY)
  }

  function getWsUrl() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const host = location.host
    const userId = localStorage.getItem('mood-board-user-id') || 'anon'
    const name = encodeURIComponent(localStorage.getItem('mood-board-user-name') || 'Anonymous')
    const color = encodeURIComponent(localStorage.getItem('mood-board-user-color') || '#2563eb')
    return `${proto}://${host}/ws?board=${BOARD_ID}&user=${userId}&name=${name}&color=${color}`
  }

  function connect() {
    if (!boardId.value) return
    initialized = false // Reset on each connection attempt
    try {
      ws = new WebSocket(getWsUrl())
    } catch {
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      connected.value = true
      if (wasConnected) {
        toast.show('Back online', 'success')
      }
      wasConnected = true
    }

    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }

      if (msg.type === 'sync' && msg.board) {
        // Check if we have queued offline changes
        const queued = loadOfflineQueue()
        if (queued && initialized) {
          // Try to push our offline changes
          if (ws?.readyState === 1) {
            ws.send(JSON.stringify({ type: 'update', board: queued, version: serverVersion }))
            clearOfflineQueue()
          }
        }

        // Server has data — it's the source of truth
        ignoreNextWatch = true
        store.loadBoard(msg.board)
        saveLocal()
        if (msg.version !== undefined) serverVersion = msg.version
        initialized = true
        // Use requestAnimationFrame to ensure Vue has flushed reactivity
        // before re-enabling the watcher
        requestAnimationFrame(() => { ignoreNextWatch = false })
      }

      if (msg.type === 'no-data') {
        // Server has nothing — try to restore from localStorage
        const localData = loadLocal()
        initialized = true
        if (localData && ws?.readyState === 1) {
          ws.send(JSON.stringify({ type: 'update', board: store.exportBoard() }))
        }
      }

      if (msg.type === 'users') {
        users.value = msg.users
      }
    }

    ws.onclose = () => {
      const wasUp = connected.value
      connected.value = false
      ws = null
      if (wasUp && initialized) {
        toast.show('Connection lost', 'error')
      }
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(connect, 3000)
  }

  function sendUpdate() {
    const board = store.exportBoard()
    saveLocal()
    if (!initialized) return // Don't push until we know server state
    if (!board.zones?.length) return // Never push empty board
    syncing.value = true
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type: 'update', board, version: serverVersion }))
    } else {
      // Offline — queue for later
      saveOfflineQueue(board)
      toast.show('Working offline', 'warning', 2000)
    }
    setTimeout(() => { syncing.value = false }, 200)
  }

  function debouncedSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(sendUpdate, SAVE_DEBOUNCE_MS)
  }

  // Presence
  const users = ref([])

  // Export / Import
  function exportJson() {
    const data = JSON.stringify(store.exportBoard(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mood-board-${boardId.value}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importJson(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          store.loadBoard(data)
          debouncedSave()
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  onMounted(() => {
    loadLocal()
    connect()
    // Register service worker for PWA + share target
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  })

  onUnmounted(() => {
    clearTimeout(saveTimer)
    clearTimeout(reconnectTimer)
    ws?.close()
  })

  watch(
    () => store.exportBoard(),
    () => {
      if (ignoreNextWatch) return
      if (store.isUndoRedoInProgress()) return
      debouncedSave()
    },
    { deep: true }
  )

  return { boardId, connected, syncing, users, isOffline, exportJson, importJson, debouncedSave }
}
