import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { newId } from '../utils/ids.js'

const DEFAULT_ZONE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

const MAX_UNDO = 50
const ZONE_PAD = 12
const ZONE_MAX_WIDTH = 700
const ZONE_HEADER = 36

export const useBoardStore = defineStore('board', () => {
  const name = ref('My House Renovation')
  const zones = ref([])
  const selectedZoneId = ref(null)
  const selectedElementIds = ref(new Set())
  const readOnly = ref(false)

  // Backward compat: last selected element
  const selectedElementId = computed(() => {
    const ids = selectedElementIds.value
    if (ids.size === 0) return null
    return [...ids].at(-1)
  })

  const selectedZone = computed(() =>
    zones.value.find((z) => z.id === selectedZoneId.value) ?? null
  )

  const selectedElement = computed(() => {
    if (!selectedZone.value || !selectedElementId.value) return null
    return selectedZone.value.elements.find((e) => e.id === selectedElementId.value) ?? null
  })

  // Undo/Redo
  const undoStack = ref([])
  const redoStack = ref([])
  // Callers can check this to skip watcher-triggered syncs during undo/redo
  let _undoRedoInProgress = false

  function isUndoRedoInProgress() {
    return _undoRedoInProgress
  }

  function pushUndo() {
    undoStack.value.push(JSON.stringify(exportBoard()))
    if (undoStack.value.length > MAX_UNDO) undoStack.value.shift()
    redoStack.value = []
  }

  function undo() {
    if (!undoStack.value.length) return
    _undoRedoInProgress = true
    redoStack.value.push(JSON.stringify(exportBoard()))
    const snapshot = undoStack.value.pop()
    const data = JSON.parse(snapshot)
    // Restore board data without clearing selection
    name.value = data.name || 'My House Renovation'
    zones.value = data.zones || []
    colorIndex = zones.value.length
    _undoRedoInProgress = false
  }

  function redo() {
    if (!redoStack.value.length) return
    _undoRedoInProgress = true
    undoStack.value.push(JSON.stringify(exportBoard()))
    const snapshot = redoStack.value.pop()
    const data = JSON.parse(snapshot)
    name.value = data.name || 'My House Renovation'
    zones.value = data.zones || []
    colorIndex = zones.value.length
    _undoRedoInProgress = false
  }

  function clearUndoHistory() {
    undoStack.value = []
    redoStack.value = []
  }

  let colorIndex = 0

  function addZone(opts = {}) {
    // Start small: 2 image columns wide, 1 row tall + empty space
    const defaultW = ZONE_PAD + 2 * (200 + ZONE_PAD) // ~436px
    const defaultH = ZONE_HEADER + ZONE_PAD + 150 + ZONE_PAD // ~210px
    const zone = {
      id: newId(),
      name: opts.name || 'New Room',
      color: opts.color || DEFAULT_ZONE_COLORS[colorIndex++ % DEFAULT_ZONE_COLORS.length],
      x: opts.x ?? 100 + zones.value.length * 50,
      y: opts.y ?? 100 + zones.value.length * 50,
      width: opts.width ?? defaultW,
      height: opts.height ?? defaultH,
      elements: [],
    }
    zones.value.push(zone)
    selectedZoneId.value = zone.id
    selectedElementIds.value = new Set()
    return zone
  }

  function updateZone(id, updates) {
    const zone = zones.value.find((z) => z.id === id)
    if (zone) Object.assign(zone, updates)
  }

  function deleteZone(id) {
    zones.value = zones.value.filter((z) => z.id !== id)
    if (selectedZoneId.value === id) {
      selectedZoneId.value = null
      selectedElementIds.value = new Set()
    }
  }

  // Re-layout all elements in a zone on a clean grid, then resize zone to fit
  function relayoutZone(zone) {
    if (!zone.elements.length) return
    // Use a uniform cell size based on the most common element type (images: 200x150)
    const cellW = 200, cellH = 150
    const cols = Math.max(1, Math.floor((ZONE_MAX_WIDTH - ZONE_PAD) / (cellW + ZONE_PAD)))
    // Set zone width to fit the columns exactly
    zone.width = ZONE_PAD + cols * (cellW + ZONE_PAD)

    for (let i = 0; i < zone.elements.length; i++) {
      const el = zone.elements[i]
      const col = i % cols
      const row = Math.floor(i / cols)
      el.width = cellW
      el.height = cellH
      el.x = ZONE_PAD + col * (cellW + ZONE_PAD)
      el.y = ZONE_PAD + row * (cellH + ZONE_PAD)
    }

    const totalRows = Math.ceil(zone.elements.length / cols)
    zone.height = ZONE_HEADER + ZONE_PAD + totalRows * (cellH + ZONE_PAD)
  }

  function autoResizeZone(zone) {
    if (!zone.elements.length) return
    let maxRight = 0, maxBottom = 0
    for (const el of zone.elements) {
      maxRight = Math.max(maxRight, el.x + el.width)
      maxBottom = Math.max(maxBottom, el.y + el.height)
    }
    const neededW = maxRight + ZONE_PAD
    const neededH = ZONE_HEADER + maxBottom + ZONE_PAD
    zone.width = Math.min(ZONE_MAX_WIDTH, Math.max(zone.width, neededW))
    zone.height = Math.max(zone.height, neededH)
  }

  function findNextSlot(zone, w, h) {
    const pad = ZONE_PAD
    const maxW = Math.min(zone.width, ZONE_MAX_WIDTH)
    const cols = Math.max(1, Math.floor((maxW - pad) / (w + pad)))
    for (let row = 0; row < 200; row++) {
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

  function addElement(zoneId, element) {
    const zone = zones.value.find((z) => z.id === zoneId)
    if (!zone) return null
    const w = element.width ?? 150
    const h = element.height ?? 100
    const pos = (element.x != null && element.y != null)
      ? { x: element.x, y: element.y }
      : findNextSlot(zone, w, h)
    const el = {
      id: newId(),
      x: pos.x,
      y: pos.y,
      width: w,
      height: h,
      type: element.type,
      note: element.note ?? null,
      data: element.data ?? {},
    }
    zone.elements.push(el)
    autoResizeZone(zone)
    selectedZoneId.value = zoneId
    selectedElementIds.value = new Set([el.id])
    return el
  }

  function updateElement(zoneId, elementId, updates) {
    const zone = zones.value.find((z) => z.id === zoneId)
    if (!zone) return
    const el = zone.elements.find((e) => e.id === elementId)
    if (el) Object.assign(el, updates)
  }

  function deleteElement(zoneId, elementId) {
    const zone = zones.value.find((z) => z.id === zoneId)
    if (!zone) return
    zone.elements = zone.elements.filter((e) => e.id !== elementId)
    shrinkZoneToFit(zone)
    selectedElementIds.value.delete(elementId)
    selectedElementIds.value = new Set(selectedElementIds.value)
  }

  function deleteSelectedElements() {
    if (!selectedZoneId.value) return
    const zone = zones.value.find((z) => z.id === selectedZoneId.value)
    if (!zone) return
    if (selectedElementIds.value.size === 0) return
    zone.elements = zone.elements.filter((e) => !selectedElementIds.value.has(e.id))
    shrinkZoneToFit(zone)
    selectedElementIds.value = new Set()
  }

  function shrinkZoneToFit(zone) {
    // Re-layout fills gaps left by deleted elements and resizes
    relayoutZone(zone)
    if (!zone.elements.length) {
      const defaultW = ZONE_PAD + 2 * (200 + ZONE_PAD)
      const defaultH = ZONE_HEADER + ZONE_PAD + 150 + ZONE_PAD
      zone.width = defaultW
      zone.height = defaultH
    }
  }

  function selectZone(id) {
    selectedZoneId.value = id
    selectedElementIds.value = new Set()
  }

  function selectElement(zoneId, elementId, additive = false) {
    selectedZoneId.value = zoneId
    if (additive) {
      const next = new Set(selectedElementIds.value)
      if (next.has(elementId)) {
        next.delete(elementId)
      } else {
        next.add(elementId)
      }
      selectedElementIds.value = next
    } else {
      selectedElementIds.value = new Set([elementId])
    }
  }

  function clearSelection() {
    selectedZoneId.value = null
    selectedElementIds.value = new Set()
  }

  function loadBoard(data) {
    name.value = data.name || 'My House Renovation'
    zones.value = data.zones || []
    // Re-layout all zones to clean grid positions
    for (const zone of zones.value) {
      relayoutZone(zone)
    }
    selectedZoneId.value = null
    selectedElementIds.value = new Set()
    colorIndex = zones.value.length
  }

  function exportBoard() {
    return {
      name: name.value,
      zones: JSON.parse(JSON.stringify(zones.value)),
    }
  }

  function exportMarkdown() {
    let md = `# ${name.value}\n\n`
    for (const zone of zones.value) {
      md += `## ${zone.name}\n\n`
      for (const el of zone.elements) {
        if (el.type === 'image') {
          const src = el.data?.src || ''
          const alt = el.data?.alt || ''
          const url = el.data?.sourceUrl
          if (url) {
            md += `[![${alt}](${src})](${url})\n\n`
          } else {
            md += `![${alt}](${src})\n\n`
          }
          if (el.note) md += `> ${el.note}\n\n`
        } else if (el.type === 'link') {
          const url = el.data?.url || ''
          const label = el.data?.label || url
          md += `- [${label}](${url})\n`
          if (el.note) md += `  > ${el.note}\n`
        } else if (el.type === 'text') {
          md += `${el.data?.content || ''}\n\n`
        } else if (el.type === 'color-swatch') {
          md += `- Color: \`${el.data?.hex || ''}\`\n`
        }
      }
      md += '\n'
    }
    return md.trim() + '\n'
  }

  return {
    name,
    zones,
    selectedZoneId,
    selectedElementId,
    selectedElementIds,
    selectedZone,
    selectedElement,
    readOnly,
    addZone,
    updateZone,
    deleteZone,
    addElement,
    updateElement,
    deleteElement,
    deleteSelectedElements,
    selectZone,
    selectElement,
    clearSelection,
    loadBoard,
    exportBoard,
    exportMarkdown,
    pushUndo,
    undo,
    redo,
    clearUndoHistory,
    isUndoRedoInProgress,
  }
})
