import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { newId } from '../utils/ids.js'

const DEFAULT_ZONE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

export const useBoardStore = defineStore('board', () => {
  const name = ref('My House Renovation')
  const zones = ref([])
  const selectedZoneId = ref(null)
  const selectedElementId = ref(null)

  const selectedZone = computed(() =>
    zones.value.find((z) => z.id === selectedZoneId.value) ?? null
  )

  const selectedElement = computed(() => {
    if (!selectedZone.value || !selectedElementId.value) return null
    return selectedZone.value.elements.find((e) => e.id === selectedElementId.value) ?? null
  })

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
    selectedElementId.value = null
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
      selectedElementId.value = null
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
    selectedElementId.value = el.id
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
    if (selectedElementId.value === elementId) {
      selectedElementId.value = null
    }
  }

  function selectZone(id) {
    selectedZoneId.value = id
    selectedElementId.value = null
  }

  function selectElement(zoneId, elementId) {
    selectedZoneId.value = zoneId
    selectedElementId.value = elementId
  }

  function clearSelection() {
    selectedZoneId.value = null
    selectedElementId.value = null
  }

  function loadBoard(data) {
    name.value = data.name || 'My House Renovation'
    zones.value = data.zones || []
    selectedZoneId.value = null
    selectedElementId.value = null
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
    selectedZone,
    selectedElement,
    addZone,
    updateZone,
    deleteZone,
    addElement,
    updateElement,
    deleteElement,
    selectZone,
    selectElement,
    clearSelection,
    loadBoard,
    exportBoard,
  }
})
