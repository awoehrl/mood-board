import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const PORT = process.env.PORT || 3000
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

// --- Redis persistence ---
async function redisGet(key) {
  if (!REDIS_URL) return null
  try {
    const res = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    })
    const data = await res.json()
    if (!data.result) return null
    // Handle both string (old double-encoded) and object results
    let parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result
    if (typeof parsed === 'string') parsed = JSON.parse(parsed) // unwrap double-encoding
    return parsed
  } catch (e) {
    console.error('Redis GET failed:', e.message)
    return null
  }
}

async function redisSet(key, value) {
  if (!REDIS_URL) return
  try {
    await fetch(`${REDIS_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    })
  } catch (e) {
    console.error('Redis SET failed:', e.message)
  }
}

// Debounced saves per board
const saveTimers = new Map()
function debouncedSave(boardId, board) {
  clearTimeout(saveTimers.get(boardId))
  saveTimers.set(boardId, setTimeout(() => redisSet(`board:${boardId}`, board), 500))
}

// JSON body parsing
app.use(express.json({ limit: '10mb' }))

// CORS for API
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
app.get('/api/board/:id', async (req, res) => {
  const room = rooms.get(req.params.id)
  const board = room?.board || await redisGet(`board:${req.params.id}`)
  if (board) {
    res.json(board)
  } else {
    res.status(404).json({ error: 'Board not found' })
  }
})

// API: Push board data (overwrites)
app.post('/api/board/:id', async (req, res) => {
  const boardId = req.params.id
  const room = await getRoom(boardId)
  room.board = req.body
  broadcast(room, { type: 'sync', board: room.board })
  debouncedSave(boardId, room.board)
  res.json({ ok: true })
})

// API: Add a single element to a board zone
app.post('/api/board/:id/add', async (req, res) => {
  const boardId = req.params.id
  const room = await getRoom(boardId)
  if (!room.board?.zones?.length) {
    return res.status(404).json({ error: 'Board has no zones yet. Open the app and create a zone first.' })
  }
  const { zoneId, zoneName, url, text, title } = req.body
  const zone = zoneId
    ? room.board.zones.find(z => z.id === zoneId)
    : zoneName
      ? room.board.zones.find(z => z.name.toLowerCase() === zoneName.toLowerCase())
      : room.board.zones[0]
  if (!zone) return res.status(404).json({ error: 'Zone not found', available: room.board.zones.map(z => z.name) })

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

// API: List zones
app.get('/api/board/:id/zones', async (req, res) => {
  const room = rooms.get(req.params.id)
  const board = room?.board || await redisGet(`board:${req.params.id}`)
  if (!board?.zones) return res.status(404).json({ error: 'Board not found' })
  res.json(board.zones.map(z => ({ id: z.id, name: z.name })))
})

// Serve .shortcut file
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

// Board rooms
const rooms = new Map()

async function getRoom(boardId) {
  if (!rooms.has(boardId)) {
    const data = await redisGet(`board:${boardId}`)
    const version = data?._version || 0
    if (data) delete data._version
    rooms.set(boardId, { clients: new Set(), board: data, version })
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

function countContent(b) {
  const zones = b?.zones || []
  return zones.reduce((n, z) => n + (z.elements?.length || 0), 0)
}

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const boardId = url.searchParams.get('board') || 'main'
  const userId = url.searchParams.get('user') || 'anon'
  const name = decodeURIComponent(url.searchParams.get('name') || 'Anonymous')
  const color = url.searchParams.get('color') || '#2563eb'

  const room = await getRoom(boardId)
  const client = { ws, userId, name, color }
  room.clients.add(client)

  // Always send what we have — Redis is source of truth
  if (room.board) {
    ws.send(JSON.stringify({ type: 'sync', board: room.board, version: room.version }))
  } else {
    ws.send(JSON.stringify({ type: 'no-data' }))
  }

  broadcastUsers(room)

  ws.on('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.type === 'update' && msg.board) {
      // Only accept updates that reference the current version (or if server has nothing)
      // This prevents stale clients from overwriting after a deploy
      if (room.board && msg.version !== undefined && msg.version < room.version) {
        console.log(`Rejected stale update: client v${msg.version} < server v${room.version}`)
        ws.send(JSON.stringify({ type: 'sync', board: room.board, version: room.version }))
        return
      }

      room.board = msg.board
      room.version = (room.version || 0) + 1
      broadcast(room, { type: 'sync', board: msg.board, version: room.version }, ws)
      debouncedSave(boardId, { ...msg.board, _version: room.version })
    }
  })

  ws.on('close', () => {
    room.clients.delete(client)
    broadcastUsers(room)
    if (room.clients.size === 0 && room.board) {
      redisSet(`board:${boardId}`, room.board)
    }
  })
})

server.listen(PORT, () => {
  const db = REDIS_URL ? 'Upstash Redis' : 'in-memory only (no UPSTASH_REDIS_REST_URL set)'
  console.log(`Mood Board running at http://localhost:${PORT} — storage: ${db}`)
})
