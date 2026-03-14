import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const PORT = process.env.PORT || 3000
const DATA_DIR = join(__dirname, 'data')

// Ensure data directory exists
try { mkdirSync(DATA_DIR, { recursive: true }) } catch {}

// --- File persistence ---
function boardFile(boardId) {
  // Sanitize board ID for filesystem safety
  return join(DATA_DIR, `${boardId.replace(/[^a-zA-Z0-9-]/g, '')}.json`)
}

function saveToDisk(boardId, board) {
  try {
    writeFileSync(boardFile(boardId), JSON.stringify(board))
  } catch (e) {
    console.error('Failed to save board to disk:', e.message)
  }
}

function loadFromDisk(boardId) {
  try {
    const raw = readFileSync(boardFile(boardId), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Debounced disk saves per board
const saveTimers = new Map()
function debouncedSave(boardId, board) {
  clearTimeout(saveTimers.get(boardId))
  saveTimers.set(boardId, setTimeout(() => saveToDisk(boardId, board), 1000))
}

// JSON body parsing for API
app.use(express.json({ limit: '10mb' }))

// CORS for API endpoints (allows transfer from localhost)
app.use('/api', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// Serve built frontend
app.use(express.static(join(__dirname, 'dist')))

// API: Get board data
app.get('/api/board/:id', (req, res) => {
  const room = rooms.get(req.params.id)
  const board = room?.board || loadFromDisk(req.params.id)
  if (board) {
    res.json(board)
  } else {
    res.status(404).json({ error: 'Board not found' })
  }
})

// API: Push board data (overwrites)
app.post('/api/board/:id', (req, res) => {
  const boardId = req.params.id
  const room = getRoom(boardId)
  room.board = req.body
  broadcast(room, { type: 'sync', board: room.board })
  debouncedSave(boardId, room.board)
  res.json({ ok: true })
})

// API: Add a single element to a board zone
app.post('/api/board/:id/add', (req, res) => {
  const boardId = req.params.id
  const room = getRoom(boardId)
  // Load from disk if not in memory
  if (!room.board) room.board = loadFromDisk(boardId)
  if (!room.board?.zones?.length) {
    return res.status(404).json({ error: 'Board has no zones' })
  }
  const { zoneId, url, text, title } = req.body
  const zone = zoneId
    ? room.board.zones.find(z => z.id === zoneId)
    : room.board.zones[0]
  if (!zone) return res.status(404).json({ error: 'Zone not found' })

  const content = url || text || title || ''
  const isImage = /\.(jpe?g|png|gif|webp|svg|avif)/i.test(content)
  const isUrl = /^https?:\/\//i.test(content)

  const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
  let element

  if (isImage) {
    element = {
      id, type: 'image', x: 20, y: 40 + zone.elements.length * 30,
      width: 200, height: 150, note: null,
      data: { src: content, sourceUrl: content, alt: title || '' }
    }
  } else if (isUrl) {
    element = {
      id, type: 'link', x: 20, y: 40 + zone.elements.length * 30,
      width: 200, height: 40, note: null,
      data: { url: content, label: title || content }
    }
  } else {
    element = {
      id, type: 'text', x: 20, y: 40 + zone.elements.length * 30,
      width: 200, height: 60, note: null,
      data: { content: content || title }
    }
  }

  zone.elements.push(element)
  broadcast(room, { type: 'sync', board: room.board })
  debouncedSave(boardId, room.board)
  res.json({ ok: true, zone: zone.name, type: element.type })
})

// API: List zones for a board (used by shortcuts)
app.get('/api/board/:id/zones', (req, res) => {
  const room = rooms.get(req.params.id)
  const board = room?.board || loadFromDisk(req.params.id)
  if (!board?.zones) return res.status(404).json({ error: 'Board not found' })
  res.json(board.zones.map(z => ({ id: z.id, name: z.name })))
})

// Serve .shortcut file with correct MIME type for iOS
app.get('/add-to-mood-board.shortcut', (req, res) => {
  res.set('Content-Type', 'application/octet-stream')
  res.set('Content-Disposition', 'attachment; filename="Add to Mood Board.shortcut"')
  res.sendFile(join(__dirname, 'dist', 'Add to Mood Board.shortcut'))
})

// Share target page
app.get('/share', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'share.html'))
})

app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// Board rooms: boardId → { clients: Set<{ws, userId, name, color}>, board: object|null }
const rooms = new Map()

function getRoom(boardId) {
  if (!rooms.has(boardId)) {
    // Try loading from disk when room is first accessed
    const board = loadFromDisk(boardId)
    rooms.set(boardId, { clients: new Set(), board })
  }
  return rooms.get(boardId)
}

function broadcast(room, message, exclude) {
  const data = JSON.stringify(message)
  for (const client of room.clients) {
    if (client.ws !== exclude && client.ws.readyState === 1) {
      client.ws.send(data)
    }
  }
}

function broadcastUsers(room) {
  const users = [...room.clients].map((c) => ({
    id: c.userId,
    name: c.name,
    color: c.color,
  }))
  const msg = JSON.stringify({ type: 'users', users })
  for (const client of room.clients) {
    if (client.ws.readyState === 1) client.ws.send(msg)
  }
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const boardId = url.searchParams.get('board') || 'default'
  const userId = url.searchParams.get('user') || 'anon'
  const name = decodeURIComponent(url.searchParams.get('name') || 'Anonymous')
  const color = url.searchParams.get('color') || '#2563eb'

  const room = getRoom(boardId)
  const client = { ws, userId, name, color }
  room.clients.add(client)

  // Send current board state if server has it, otherwise tell client we have nothing
  if (room.board) {
    ws.send(JSON.stringify({ type: 'sync', board: room.board }))
  } else {
    ws.send(JSON.stringify({ type: 'no-data' }))
  }

  broadcastUsers(room)

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.type === 'update' && msg.board) {
      // Count total elements to decide if this is a real update or stale empty state
      const countElements = (b) => (b?.zones || []).reduce((n, z) => n + (z.elements?.length || 0), 0)
      const incoming = countElements(msg.board)
      const current = countElements(room.board)
      // Accept if: server has nothing, incoming has more/equal content, or incoming has zones and current doesn't
      if (!room.board || incoming >= current || (msg.board.zones?.length && !room.board.zones?.length)) {
        room.board = msg.board
        broadcast(room, { type: 'sync', board: msg.board }, ws)
        debouncedSave(boardId, msg.board)
      }
    }
  })

  ws.on('close', () => {
    room.clients.delete(client)
    broadcastUsers(room)
    // Save to disk when last client disconnects
    if (room.clients.size === 0 && room.board) {
      saveToDisk(boardId, room.board)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Mood Board running at http://localhost:${PORT}`)
})
