import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { newId } from '../utils/ids.js'

const SAVE_DEBOUNCE_MS = 300

export function useSync() {
  const store = useBoardStore()
  const boardId = ref(null)
  const connected = ref(false)
  const syncing = ref(false)
  let ws = null
  let saveTimer = null
  let ignoreNextWatch = false
  let reconnectTimer = null
  let initialized = false // Don't send updates until we get server state

  function getBoardId() {
    let id = window.location.hash.replace('#', '')
    if (!id) {
      id = newId().split('-')[0]
      window.location.hash = id
    }
    return id
  }

  function getLocalKey() {
    return `mood-board-${boardId.value}`
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

  function getWsUrl() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const host = location.host
    const userId = localStorage.getItem('mood-board-user-id') || 'anon'
    const name = encodeURIComponent(localStorage.getItem('mood-board-user-name') || 'Anonymous')
    const color = encodeURIComponent(localStorage.getItem('mood-board-user-color') || '#2563eb')
    return `${proto}://${host}/ws?board=${boardId.value}&user=${userId}&name=${name}&color=${color}`
  }

  function connect() {
    if (!boardId.value) return
    try {
      ws = new WebSocket(getWsUrl())
    } catch {
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      connected.value = true
      // Don't push state yet — wait for server to tell us what it has
    }

    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }

      if (msg.type === 'sync' && msg.board) {
        ignoreNextWatch = true
        store.loadBoard(msg.board)
        saveLocal()
        initialized = true
        setTimeout(() => { ignoreNextWatch = false }, 50)
      }

      if (msg.type === 'no-data') {
        // Server has no board — push our local state
        initialized = true
        const board = store.exportBoard()
        if (board.zones?.length && ws?.readyState === 1) {
          ws.send(JSON.stringify({ type: 'update', board }))
        }
      }

      if (msg.type === 'users') {
        users.value = msg.users
      }
    }

    ws.onclose = () => {
      connected.value = false
      ws = null
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
    saveLocal()
    if (!initialized) return // Don't push until we know server state
    syncing.value = true
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type: 'update', board: store.exportBoard() }))
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
    boardId.value = getBoardId()
    loadLocal()
    connect()
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
      debouncedSave()
    },
    { deep: true }
  )

  return { boardId, connected, syncing, users, exportJson, importJson }
}
