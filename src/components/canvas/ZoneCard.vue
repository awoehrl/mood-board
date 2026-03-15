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
const showNotes = ref(false)
const isEditingNotes = ref(false)
const editNotesText = ref('')
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

  // On touch, only allow dragging from the header
  if (e.pointerType === 'touch' && !e.target.closest('.zone-header')) return

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
function toggleNotes(e) {
  e.stopPropagation()
  showNotes.value = !showNotes.value
  isEditingNotes.value = false
}
function startEditNotes(e) {
  e.stopPropagation()
  editNotesText.value = props.zone.description || ''
  isEditingNotes.value = true
}
function saveNotes() {
  store.pushUndo()
  store.updateZone(props.zone.id, { description: editNotesText.value })
  isEditingNotes.value = false
}

function onElementPointerDown(e, el) {
  const additive = e.shiftKey
  store.selectElement(props.zone.id, el.id, additive)
  e.stopPropagation()
}

const hasNotes = computed(() => !!(props.zone.description?.trim()))

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
      <button class="notes-toggle" :class="{ active: showNotes, 'has-notes': hasNotes }" @pointerdown.stop="toggleNotes" title="Room notes">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3h8M3 6h8M3 9h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      </button>
      <span class="zone-count">{{ zone.elements.length }}</span>
    </div>

    <!-- Collapsible notes -->
    <div v-if="showNotes" class="zone-notes" @pointerdown.stop>
      <textarea
        v-if="isEditingNotes"
        v-model="editNotesText"
        class="notes-editor"
        @blur="saveNotes"
        @keydown.escape="isEditingNotes = false"
        placeholder="Add notes for this room..."
        autofocus
      />
      <div v-else class="notes-display" @dblclick="startEditNotes" @click="startEditNotes">
        <pre v-if="zone.description?.trim()" class="notes-text">{{ zone.description }}</pre>
        <span v-else class="notes-placeholder">Click to add notes...</span>
      </div>
    </div>

    <!-- Elements container -->
    <div class="zone-body" :style="{ height: showNotes ? 'auto' : undefined }">
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
  border-radius: var(--radius-md);
  transition: box-shadow 0.15s, border-color 0.15s;
}
.zone-bg.selected {
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 8%, transparent);
}
.zone:hover .zone-bg:not(.selected) {
  box-shadow: var(--shadow-sm);
}

.zone-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  height: 36px;
}
.zone-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.zone-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  cursor: text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}
.zone-name-input {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  outline: none;
  padding: 0;
  letter-spacing: -0.01em;
}
.zone-count {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.notes-toggle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.15s, background 0.1s;
  flex-shrink: 0;
}
.zone:hover .notes-toggle,
.notes-toggle.active,
.notes-toggle.has-notes { opacity: 1; }
.notes-toggle.has-notes { color: var(--text-secondary); }
.notes-toggle.active { background: var(--active); color: var(--text); }
.notes-toggle:hover { background: var(--hover); color: var(--text); }

.zone-notes {
  position: relative;
  padding: 0 12px 8px;
  max-height: 200px;
  overflow-y: auto;
}
.notes-editor {
  width: 100%;
  min-height: 80px;
  max-height: 180px;
  padding: 6px 8px;
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.5;
  color: var(--text);
  background: var(--hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  resize: vertical;
}
.notes-editor:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
.notes-display {
  cursor: text;
  min-height: 28px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background 0.1s;
}
.notes-display:hover { background: var(--hover); }
.notes-text {
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.5;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}
.notes-placeholder {
  font-size: 11px;
  color: var(--text-muted);
}

.zone-body {
  position: relative;
  overflow: hidden;
  height: calc(100% - 36px);
}

.element-wrap {
  position: absolute;
  cursor: pointer;
}
.element-wrap.selected {
  z-index: 10;
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.zone-resize {
  position: absolute;
  bottom: 0; right: 0;
  width: 18px; height: 18px;
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
  opacity: 0.4;
}
.zone-resize:hover { opacity: 1; }

@media (pointer: coarse) {
  .zone-header { height: 44px; }
  .zone-body { height: calc(100% - 44px); }
  .zone-resize { width: 32px; height: 32px; }
}
</style>
