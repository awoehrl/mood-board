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

function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
function onKeyDown(e) { if (e.code === 'Space' && !e.repeat) spaceHeld.value = true }
function onKeyUp(e) { if (e.code === 'Space') spaceHeld.value = false }
function onPasteEvent(e) {
  if (!viewport.value) return
  handlePaste(e, viewport.value.getBoundingClientRect())
}

onMounted(() => {
  viewport.value?.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  document.addEventListener('paste', onPasteEvent)
})
onUnmounted(() => {
  viewport.value?.removeEventListener('wheel', onWheel)
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
