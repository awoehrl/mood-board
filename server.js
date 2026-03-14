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
  if (room?.board) {
    res.json(room.board)
  } else {
    res.status(404).json({ error: 'Board not found' })
  }
})

// API: Push board data (overwrites)
app.post('/api/board/:id', (req, res) => {
  const boardId = req.params.id
  const room = getRoom(boardId)
  room.board = req.body
  // Broadcast to all connected clients
  broadcast(room, { type: 'sync', board: room.board })
  res.json({ ok: true })
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
    rooms.set(boardId, { clients: new Set(), board: null })
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

    if (msg.type === 'update') {
      room.board = msg.board
      broadcast(room, { type: 'sync', board: msg.board }, ws)
    }
  })

  ws.on('close', () => {
    room.clients.delete(client)
    broadcastUsers(room)
    // Clean up empty rooms
    if (room.clients.size === 0) {
      // Keep board data for 10 minutes in case someone reconnects
      setTimeout(() => {
        if (room.clients.size === 0) rooms.delete(boardId)
      }, 600000)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Mood Board running at http://localhost:${PORT}`)
})
