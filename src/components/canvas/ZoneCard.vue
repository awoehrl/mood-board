<script setup>
import { ref, computed } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import ImageElement from '../elements/ImageElement.vue'
import LinkElement from '../elements/LinkElement.vue'
import TextElement from '../elements/TextElement.vue'
import ColorSwatch from '../elements/ColorSwatch.vue'
import NoteOverlay from '../elements/NoteOverlay.vue'

const props = defineProps({ zone: Object })
const store = useBoardStore()

const isSelected = computed(() => store.selectedZoneId === props.zone.id)
const isDragging = ref(false)
const isResizing = ref(false)
const isEditingName = ref(false)
const editName = ref('')
let dragOffset = null
let resizeStart = null
let undoPushedForDrag = false

function getScale() {
  const layer = document.querySelector('[data-canvas-layer]')
  if (!layer) return 1
  return new DOMMatrix(getComputedStyle(layer).transform).a || 1
}

function onZonePointerDown(e) {
  if (isResizing.value) return
  if (e.target.closest('[data-element]') || e.target.closest('[data-resize]')) return
  store.selectZone(props.zone.id)
  isDragging.value = true
  undoPushedForDrag = false
  dragOffset = { x: e.clientX / getScale() - props.zone.x, y: e.clientY / getScale() - props.zone.y }
  e.currentTarget.setPointerCapture(e.pointerId)
  e.stopPropagation()
}
function onZonePointerMove(e) {
  if (isDragging.value && dragOffset) {
    if (!undoPushedForDrag) { store.pushUndo(); undoPushedForDrag = true }
    const s = getScale()
    store.updateZone(props.zone.id, { x: e.clientX / s - dragOffset.x, y: e.clientY / s - dragOffset.y })
  }
  if (isResizing.value && resizeStart) {
    if (!undoPushedForDrag) { store.pushUndo(); undoPushedForDrag = true }
    const s = getScale()
    store.updateZone(props.zone.id, {
      width: Math.max(200, resizeStart.width + (e.clientX - resizeStart.clientX) / s),
      height: Math.max(150, resizeStart.height + (e.clientY - resizeStart.clientY) / s),
    })
  }
}
function onZonePointerUp() { isDragging.value = false; isResizing.value = false; dragOffset = null; resizeStart = null; undoPushedForDrag = false }
function onResizePointerDown(e) {
  isResizing.value = true
  undoPushedForDrag = false
  resizeStart = { clientX: e.clientX, clientY: e.clientY, width: props.zone.width, height: props.zone.height }
  e.stopPropagation()
  e.currentTarget.closest('[data-zone]').setPointerCapture(e.pointerId)
}
function startEditName() { editName.value = props.zone.name; isEditingName.value = true }
function saveName() {
  if (editName.value.trim()) store.updateZone(props.zone.id, { name: editName.value.trim() })
  isEditingName.value = false
}
function onElementPointerDown(e, el) {
  const additive = e.shiftKey
  store.selectElement(props.zone.id, el.id, additive)
  e.stopPropagation()

  // If the element is in the current selection, move ALL selected elements
  const selected = store.selectedElementIds
  const movingIds = selected.has(el.id) ? [...selected] : [el.id]

  const s = getScale()
  const sx = e.clientX, sy = e.clientY
  let pushed = false

  // Capture initial positions for all moving elements
  const zone = props.zone
  const initials = {}
  for (const id of movingIds) {
    const elem = zone.elements.find((x) => x.id === id)
    if (elem) initials[id] = { x: elem.x, y: elem.y }
  }

  const onMove = (ev) => {
    if (!pushed) { store.pushUndo(); pushed = true }
    const dx = (ev.clientX - sx) / s
    const dy = (ev.clientY - sy) / s
    for (const id of movingIds) {
      if (initials[id]) {
        store.updateElement(props.zone.id, id, {
          x: initials[id].x + dx,
          y: initials[id].y + dy,
        })
      }
    }
  }
  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

const componentMap = { image: ImageElement, link: LinkElement, text: TextElement, 'color-swatch': ColorSwatch }
</script>

<template>
  <div
    data-zone
    class="zone"
    :style="{ left: zone.x + 'px', top: zone.y + 'px', width: zone.width + 'px', height: zone.height + 'px' }"
    @pointerdown="onZonePointerDown" @pointermove="onZonePointerMove" @pointerup="onZonePointerUp"
  >
    <!-- Background card -->
    <div class="zone-bg" :class="{ selected: isSelected }" :style="isSelected ? { borderColor: zone.color + '66' } : {}" />

    <!-- Header -->
    <div class="zone-header">
      <span class="zone-dot" :style="{ background: zone.color }" />
      <input
        v-if="isEditingName" v-model="editName"
        class="zone-name-input"
        @blur="saveName" @keydown.enter="saveName" @keydown.escape="isEditingName = false"
        autofocus @pointerdown.stop
      />
      <span v-else class="zone-name" @dblclick.stop="startEditName">{{ zone.name }}</span>
      <span class="zone-count">{{ zone.elements.length }}</span>
    </div>

    <!-- Elements container -->
    <div class="zone-body">
      <div
        v-for="el in zone.elements" :key="el.id"
        data-element
        class="element-wrap group"
        :class="{ selected: store.selectedElementIds.has(el.id) }"
        :style="{ left: el.x + 'px', top: el.y + 'px', width: el.width + 'px', height: el.height + 'px' }"
        @pointerdown="onElementPointerDown($event, el)"
      >
        <component :is="componentMap[el.type]" :element="el" :zone-id="zone.id" />
        <NoteOverlay :element="el" :zone-id="zone.id" />
      </div>
    </div>

    <!-- Resize -->
    <div data-resize class="zone-resize" :class="{ visible: isSelected }" @pointerdown="onResizePointerDown">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M11 1L1 11M11 5L5 11M11 9L9 11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.zone {
  position: absolute;
  user-select: none;
}
.zone-bg {
  position: absolute; inset: 0;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.zone-bg.selected {
  box-shadow: 0 0 0 1px var(--border);
}
.zone:hover .zone-bg:not(.selected) {
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.zone-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  height: 32px;
}
.zone-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.zone-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  cursor: text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.zone-name-input {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  outline: none;
  padding: 0;
}
.zone-count {
  font-size: 11px;
  color: var(--text-muted);
}

.zone-body {
  position: relative;
  overflow: hidden;
  height: calc(100% - 32px);
}

.element-wrap {
  position: absolute;
  cursor: move;
}
.element-wrap.selected {
  z-index: 10;
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-radius: 4px;
}

.zone-resize {
  position: absolute;
  bottom: 0; right: 0;
  width: 16px; height: 16px;
  cursor: se-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.15s;
}
.zone-resize.visible,
.zone:hover .zone-resize {
  opacity: 0.5;
}
.zone-resize:hover { opacity: 1; }

/* Touch targets */
@media (pointer: coarse) {
  .zone-resize { width: 32px; height: 32px; }
}
</style>
