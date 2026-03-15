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
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'images'

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

// Image upload via Supabase Storage
app.post('/api/upload', async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }
  try {
    const { image } = req.body
    if (!image) return res.status(400).json({ error: 'No image provided' })
    const url = await uploadToSupabase(image)
    res.json({ url })
  } catch (e) {
    console.error('Supabase upload failed:', e.message)
    res.status(500).json({ error: 'Upload failed' })
  }
})

// One-time migration: upload all base64 images to Supabase
async function uploadToSupabase(base64) {
  const raw = base64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(raw, 'base64')
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const upload = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'image/jpeg',
      },
      body: buffer,
    }
  )
  if (!upload.ok) throw new Error(await upload.text())
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`
}

app.post('/api/migrate-images/:id', async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }
  try {
    const room = await getRoom(req.params.id)
    if (!room.board?.zones) return res.status(404).json({ error: 'Board not found' })

    let migrated = 0, failed = 0
    for (const zone of room.board.zones) {
      for (const el of zone.elements) {
        if (el.type === 'image' && el.data?.src?.startsWith('data:')) {
          try {
            el.data.src = await uploadToSupabase(el.data.src)
            migrated++
          } catch (e) {
            console.error('Migration failed for element', el.id, e.message)
            failed++
          }
        }
      }
    }

    // Save and broadcast updated board
    room.version = (room.version || 0) + 1
    broadcast(room, { type: 'sync', board: room.board, version: room.version })
    await redisSet(`board:${req.params.id}`, { ...room.board, _version: room.version })

    res.json({ ok: true, migrated, failed })
  } catch (e) {
    console.error('Migration error:', e.message)
    res.status(500).json({ error: e.message })
  }
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

// Grid-based positioning: find next open slot in a zone
function findNextSlot(zone, w, h) {
  const pad = 12
  const cols = Math.max(1, Math.floor((zone.width - pad) / (w + pad)))
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < cols; col++) {
      const x = pad + col * (w + pad)
      const y = pad + row * (h + pad)
      const overlaps = zone.elements.some(el =>
        x < el.x + el.width && x + w > el.x &&
        y < el.y + el.height && y + h > el.y
      )
      if (!overlaps) return { x, y }
    }
  }
  return { x: pad, y: pad + zone.elements.length * (h + pad) }
}

// API: Add a single element to a board zone
// Accepts: { url, text, title, image (base64), zoneName/zoneId }
app.post('/api/board/:id/add', async (req, res) => {
  const boardId = req.params.id
  const room = await getRoom(boardId)
  if (!room.board?.zones?.length) {
    return res.status(404).json({ error: 'Board has no zones yet. Open the app and create a zone first.' })
  }
  const { zoneId, zoneName, url, text, title, image } = req.body
  const zone = zoneId
    ? room.board.zones.find(z => z.id === zoneId)
    : zoneName
      ? room.board.zones.find(z => z.name.toLowerCase() === zoneName.toLowerCase())
      : room.board.zones[0]
  if (!zone) return res.status(404).json({ error: 'Zone not found', available: room.board.zones.map(z => z.name) })

  const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
  let element

  // Base64 image upload
  if (image) {
    let src = image
    try {
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) src = await uploadToSupabase(image)
    } catch { /* keep base64 */ }
    const w = 200, h = 150
    const pos = findNextSlot(zone, w, h)
    element = {
      id, type: 'image', ...pos, width: w, height: h, note: null,
      data: { src, sourceUrl: url || null, alt: title || 'Shared image' }
    }
  }
  // Text + URL together: save text as note on a link element
  else if (text && url) {
    const isImageUrl = /\.(jpe?g|png|gif|webp|svg|avif)(\?|$)/i.test(url)
    if (isImageUrl) {
      const w = 200, h = 150
      const pos = findNextSlot(zone, w, h)
      element = {
        id, type: 'image', ...pos, width: w, height: h, note: text || null,
        data: { src: url, sourceUrl: url, alt: title || '' }
      }
    } else {
      const w = 240, h = 56
      const pos = findNextSlot(zone, w, h)
      element = {
        id, type: 'link', ...pos, width: w, height: h, note: text || null,
        data: { url, label: title || text || url }
      }
    }
  }
  // URL only
  else if (url) {
    const isImageUrl = /\.(jpe?g|png|gif|webp|svg|avif)(\?|$)/i.test(url)
    if (isImageUrl) {
      const w = 200, h = 150
      const pos = findNextSlot(zone, w, h)
      element = {
        id, type: 'image', ...pos, width: w, height: h, note: null,
        data: { src: url, sourceUrl: url, alt: title || '' }
      }
    } else {
      const w = 240, h = 56
      const pos = findNextSlot(zone, w, h)
      element = {
        id, type: 'link', ...pos, width: w, height: h, note: null,
        data: { url, label: title || url }
      }
    }
  }
  // Text only
  else {
    const content = text || title || ''
    const w = 200, h = 80
    const pos = findNextSlot(zone, w, h)
    element = {
      id, type: 'text', ...pos, width: w, height: h, note: null,
      data: { content }
    }
  }

  zone.elements.push(element)
  room.version = (room.version || 0) + 1
  broadcast(room, { type: 'sync', board: room.board, version: room.version })
  debouncedSave(boardId, { ...room.board, _version: room.version })
  res.json({ ok: true, zone: zone.name, type: element.type })
})

// API: List zones
app.get('/api/board/:id/zones', async (req, res) => {
  const room = rooms.get(req.params.id)
  const board = room?.board || await redisGet(`board:${req.params.id}`)
  if (!board?.zones) return res.status(404).json({ error: 'Board not found' })
  res.json(board.zones.map(z => ({ id: z.id, name: z.name })))
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
