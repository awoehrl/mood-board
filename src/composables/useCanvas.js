import { ref, computed } from 'vue'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

export function useCanvas() {
  const panX = ref(0)
  const panY = ref(0)
  const zoom = ref(1)

  const transform = computed(
    () => `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`
  )

  const zoomPercent = computed(() => Math.round(zoom.value * 100))

  function zoomAtPoint(delta, clientX, clientY) {
    const factor = delta > 0 ? 0.9 : 1.1
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * factor))
    const ratio = newZoom / zoom.value
    panX.value = clientX - (clientX - panX.value) * ratio
    panY.value = clientY - (clientY - panY.value) * ratio
    zoom.value = newZoom
  }

  function zoomIn() {
    zoom.value = Math.min(MAX_ZOOM, zoom.value * 1.2)
  }

  function zoomOut() {
    zoom.value = Math.max(MIN_ZOOM, zoom.value / 1.2)
  }

  function fitAll(zones, viewportWidth, viewportHeight) {
    if (!zones.length) {
      panX.value = 0
      panY.value = 0
      zoom.value = 1
      return
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const z of zones) {
      minX = Math.min(minX, z.x)
      minY = Math.min(minY, z.y)
      maxX = Math.max(maxX, z.x + z.width)
      maxY = Math.max(maxY, z.y + z.height)
    }
    const padding = 80
    const contentW = maxX - minX + padding * 2
    const contentH = maxY - minY + padding * 2
    const newZoom = Math.min(
      1.5,
      Math.min(viewportWidth / contentW, viewportHeight / contentH)
    )
    zoom.value = newZoom
    panX.value = (viewportWidth - contentW * newZoom) / 2 - (minX - padding) * newZoom
    panY.value = (viewportHeight - contentH * newZoom) / 2 - (minY - padding) * newZoom
  }

  function panToZone(zone, viewportWidth, viewportHeight) {
    const centerX = zone.x + zone.width / 2
    const centerY = zone.y + zone.height / 2
    const targetZoom = Math.min(
      1.5,
      Math.min(viewportWidth / (zone.width + 100), viewportHeight / (zone.height + 100))
    )
    zoom.value = targetZoom
    panX.value = viewportWidth / 2 - centerX * targetZoom
    panY.value = viewportHeight / 2 - centerY * targetZoom
  }

  return {
    panX,
    panY,
    zoom,
    transform,
    zoomPercent,
    zoomAtPoint,
    zoomIn,
    zoomOut,
    fitAll,
    panToZone,
  }
}
