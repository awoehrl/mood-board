<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import { useCanvas } from '../../composables/useCanvas.js'
import { useDragDrop } from '../../composables/useDragDrop.js'
import CanvasLayer from './CanvasLayer.vue'

const store = useBoardStore()
const canvas = useCanvas()
const viewport = ref(null)
const isPanning = ref(false)
const spaceHeld = ref(false)
let panStart = null

// Touch handling for mobile
let lastTouches = null
let touchPanStart = null

const emit = defineEmits(['show-image-source-modal'])

const { handleFileDrop, handlePaste } = useDragDrop(canvas, (zoneId, elId) => {
  emit('show-image-source-modal', { zoneId, elementId: elId })
})

function onWheel(e) {
  e.preventDefault()
  if (e.ctrlKey || e.metaKey) {
    canvas.zoomAtPoint(e.deltaY, e.clientX - viewport.value.offsetLeft, e.clientY - viewport.value.offsetTop)
  } else {
    canvas.panX.value -= e.deltaX
    canvas.panY.value -= e.deltaY
  }
}

function onPointerDown(e) {
  if (e.button === 1 || (e.button === 0 && spaceHeld.value)) {
    isPanning.value = true
    panStart = { x: e.clientX - canvas.panX.value, y: e.clientY - canvas.panY.value }
    viewport.value.setPointerCapture(e.pointerId)
    e.preventDefault()
  } else if (e.button === 0 && e.target === viewport.value) {
    store.clearSelection()
  }
}

function onPointerMove(e) {
  if (!isPanning.value || !panStart) return
  canvas.panX.value = e.clientX - panStart.x
  canvas.panY.value = e.clientY - panStart.y
}

function onPointerUp() { isPanning.value = false; panStart = null }

function onDrop(e) {
  if (!viewport.value) return
  handleFileDrop(e, viewport.value.getBoundingClientRect())
}

function onTouchStart(e) {
  if (e.touches.length === 2) {
    e.preventDefault()
    lastTouches = [...e.touches]
    touchPanStart = { x: canvas.panX.value, y: canvas.panY.value }
  }
}

function onTouchMove(e) {
  if (e.touches.length === 2 && lastTouches) {
    e.preventDefault()
    const t = e.touches

    // Calculate pinch distance change for zoom
    const prevDist = Math.hypot(lastTouches[1].clientX - lastTouches[0].clientX, lastTouches[1].clientY - lastTouches[0].clientY)
    const curDist = Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY)
    const scaleDelta = curDist / prevDist

    // Calculate pan from midpoint movement
    const prevMid = { x: (lastTouches[0].clientX + lastTouches[1].clientX) / 2, y: (lastTouches[0].clientY + lastTouches[1].clientY) / 2 }
    const curMid = { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 }

    // Apply pan
    canvas.panX.value += curMid.x - prevMid.x
    canvas.panY.value += curMid.y - prevMid.y

    // Apply zoom at midpoint
    if (Math.abs(scaleDelta - 1) > 0.01) {
      const rect = viewport.value.getBoundingClientRect()
      const px = curMid.x - rect.left
      const py = curMid.y - rect.top
      const newZoom = Math.max(0.1, Math.min(5, canvas.zoom.value * scaleDelta))
      const factor = newZoom / canvas.zoom.value
      canvas.panX.value = px - factor * (px - canvas.panX.value)
      canvas.panY.value = py - factor * (py - canvas.panY.value)
      canvas.zoom.value = newZoom
    }

    lastTouches = [...t]
  }
}

function onTouchEnd() {
  lastTouches = null
  touchPanStart = null
}

function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
function onKeyDown(e) { if (e.code === 'Space' && !e.repeat) spaceHeld.value = true }
function onKeyUp(e) { if (e.code === 'Space') spaceHeld.value = false }
function onPasteEvent(e) {
  if (!viewport.value) return
  handlePaste(e, viewport.value.getBoundingClientRect())
}

onMounted(() => {
  viewport.value?.addEventListener('wheel', onWheel, { passive: false })
  viewport.value?.addEventListener('touchstart', onTouchStart, { passive: false })
  viewport.value?.addEventListener('touchmove', onTouchMove, { passive: false })
  viewport.value?.addEventListener('touchend', onTouchEnd)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  document.addEventListener('paste', onPasteEvent)
})
onUnmounted(() => {
  viewport.value?.removeEventListener('wheel', onWheel)
  viewport.value?.removeEventListener('touchstart', onTouchStart)
  viewport.value?.removeEventListener('touchmove', onTouchMove)
  viewport.value?.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  document.removeEventListener('paste', onPasteEvent)
})

defineExpose({ canvas })
</script>

<template>
  <div
    ref="viewport"
    class="viewport"
    :class="{ 'cursor-grab': spaceHeld && !isPanning, 'cursor-grabbing': isPanning }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @drop="onDrop"
    @dragover="onDragOver"
  >
    <!-- Dot grid -->
    <div
      class="dots"
      :style="{
        backgroundSize: `${24 * canvas.zoom.value}px ${24 * canvas.zoom.value}px`,
        backgroundPosition: `${canvas.panX.value}px ${canvas.panY.value}px`,
      }"
    />
    <CanvasLayer :transform="canvas.transform.value" />
  </div>
</template>

<style scoped>
.viewport {
  position: absolute;
  top: 45px;
  left: 0; right: 0; bottom: 0;
  overflow: hidden;
  background: var(--canvas-bg);
}
.dots {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, var(--canvas-dot) 1px, transparent 1px);
}
</style>
