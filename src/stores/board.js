import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { newId } from '../utils/ids.js'

const DEFAULT_ZONE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

const MAX_UNDO = 50

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

  function pushUndo() {
    undoStack.value.push(JSON.stringify(exportBoard()))
    if (undoStack.value.length > MAX_UNDO) undoStack.value.shift()
    redoStack.value = []
  }

  function undo() {
    if (!undoStack.value.length) return
    redoStack.value.push(JSON.stringify(exportBoard()))
    const snapshot = undoStack.value.pop()
    loadBoard(JSON.parse(snapshot))
  }

  function redo() {
    if (!redoStack.value.length) return
    undoStack.value.push(JSON.stringify(exportBoard()))
    const snapshot = redoStack.value.pop()
    loadBoard(JSON.parse(snapshot))
  }

  function clearUndoHistory() {
    undoStack.value = []
    redoStack.value = []
  }

  let colorIndex = 0

  function addZone(opts = {}) {
    const zone = {
      id: newId(),
      name: opts.name || 'New Room',
      color: opts.color || DEFAULT_ZONE_COLORS[colorIndex++ % DEFAULT_ZONE_COLORS.length],
      x: opts.x ?? 100 + zones.value.length * 50,
      y: opts.y ?? 100 + zones.value.length * 50,
      width: opts.width ?? 500,
      height: opts.height ?? 400,
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

  function addElement(zoneId, element) {
    const zone = zones.value.find((z) => z.id === zoneId)
    if (!zone) return null
    const el = {
      id: newId(),
      x: element.x ?? 20,
      y: element.y ?? 40 + zone.elements.length * 30,
      width: element.width ?? 150,
      height: element.height ?? 100,
      type: element.type,
      note: element.note ?? null,
      data: element.data ?? {},
    }
    zone.elements.push(el)
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
    selectedElementIds.value.delete(elementId)
    selectedElementIds.value = new Set(selectedElementIds.value)
  }

  function deleteSelectedElements() {
    if (!selectedZoneId.value) return
    const zone = zones.value.find((z) => z.id === selectedZoneId.value)
    if (!zone) return
    if (selectedElementIds.value.size === 0) return
    zone.elements = zone.elements.filter((e) => !selectedElementIds.value.has(e.id))
    selectedElementIds.value = new Set()
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
    pushUndo,
    undo,
    redo,
    clearUndoHistory,
  }
})
