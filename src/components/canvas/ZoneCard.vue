<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useBoardStore } from '../../stores/board.js'
import ImageElement from '../elements/ImageElement.vue'
import LinkElement from '../elements/LinkElement.vue'
import TextElement from '../elements/TextElement.vue'
import ColorSwatch from '../elements/ColorSwatch.vue'
import NoteOverlay from '../elements/NoteOverlay.vue'

// Configure marked for safe, minimal output
marked.setOptions({ breaks: true, gfm: true })

const props = defineProps({ zone: Object })
const emit = defineEmits(['open-viewer'])
const store = useBoardStore()

const isSelected = computed(() => store.selectedZoneId === props.zone.id)
const isDragging = ref(false)
const isResizing = ref(false)
const isEditingName = ref(false)
const editName = ref('')
const isEditingNotes = ref(false)
const editNotesText = ref('')
const isEditingArea = ref(false)
const editArea = ref('')
let dragOffset = null
let resizeStart = null
let undoPushedForDrag = false

const hasNotes = computed(() => !!(props.zone.description?.trim()))

// Compute the height needed for the element grid (elements are absolutely positioned)
const gridHeight = computed(() => {
  if (!props.zone.elements.length) return 0
  let maxBottom = 0
  for (const el of props.zone.elements) {
    maxBottom = Math.max(maxBottom, el.y + el.height)
  }
  return maxBottom + 12 // ZONE_PAD
})
const renderedNotes = computed(() => {
  if (!props.zone.description?.trim()) return ''
  return DOMPurify.sanitize(marked.parse(props.zone.description))
})

function getScale() {
  const layer = document.querySelector('[data-canvas-layer]')
  if (!layer) return 1
  return new DOMMatrix(getComputedStyle(layer).transform).a || 1
}

function onZonePointerDown(e) {
  if (isResizing.value) return
  if (e.target.closest('[data-element]') || e.target.closest('[data-resize]') || e.target.closest('.zone-notes-card') || e.target.closest('[data-editable]')) return
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

function startEditArea() {
  editArea.value = props.zone.area ?? ''
  isEditingArea.value = true
}
function saveArea() {
  const val = editArea.value === '' ? null : parseFloat(editArea.value)
  store.pushUndo()
  store.updateZone(props.zone.id, { area: (val !== null && !isNaN(val)) ? val : null })
  isEditingArea.value = false
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

const componentMap = { image: ImageElement, link: LinkElement, text: TextElement, 'color-swatch': ColorSwatch }
</script>

<template>
  <div
    data-zone
    class="zone"
    :style="{ left: zone.x + 'px', top: zone.y + 'px', width: zone.width + 'px', minHeight: zone.height + 'px' }"
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
      <span v-else class="zone-name" data-editable @click.stop="startEditName">{{ zone.name }}</span>
      <input
        v-if="isEditingArea"
        v-model="editArea"
        type="number"
        step="0.1"
        class="zone-area-input"
        @blur="saveArea"
        @keydown.enter="saveArea"
        @keydown.escape="isEditingArea = false"
        autofocus
        @pointerdown.stop
      />
      <span v-else-if="zone.area" class="zone-area" data-editable @click.stop="startEditArea">{{ zone.area }} m²</span>
      <span v-else class="zone-area-empty" data-editable @click.stop="startEditArea">m²</span>
    </div>

    <!-- Pinned notes card — between header and elements -->
    <div class="zone-notes-card" @pointerdown.stop>
      <textarea
        v-if="isEditingNotes"
        v-model="editNotesText"
        class="notes-editor"
        @blur="saveNotes"
        @keydown.escape="isEditingNotes = false"
        placeholder="Add notes (markdown supported)..."
        autofocus
      />
      <div v-else-if="hasNotes" class="notes-rendered" @click="startEditNotes" v-html="renderedNotes" />
      <div v-else class="notes-empty" @click="startEditNotes">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 3h8M3 6h8M3 9h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        <span>Add notes...</span>
      </div>
    </div>

    <!-- Elements container -->
    <div class="zone-body" :style="{ height: gridHeight + 'px' }">
      <!-- Grid elements -->
      <div
        v-for="el in zone.elements" :key="el.id"
        data-element
        class="element-wrap group"
        :class="{ selected: store.selectedElementIds.has(el.id) }"
        :style="{ left: el.x + 'px', top: el.y + 'px', width: el.width + 'px', height: el.height + 'px' }"
        @pointerdown="onElementPointerDown($event, el)"
      >
        <component :is="componentMap[el.type]" :element="el" :zone-id="zone.id" @open-viewer="emit('open-viewer', { zoneId: zone.id, elementId: el.id })" />
        <NoteOverlay :element="el" />
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
  display: flex;
  flex-direction: column;
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
.zone-area {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  cursor: text;
}
.zone-area-empty {
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.4;
  cursor: pointer;
  transition: opacity 0.15s;
}
.zone-area-empty:hover { opacity: 0.7; }
.zone-area-input {
  width: 50px;
  font-size: 11px;
  color: var(--text);
  outline: none;
  padding: 0 2px;
  font-variant-numeric: tabular-nums;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: var(--bg);
}

.zone-body {
  position: relative;
  overflow: hidden;
}

/* Pinned notes card */
.zone-notes-card {
  position: relative;
  margin: 0 12px 8px;
  z-index: 5;
}
.notes-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.zone:hover .notes-empty { opacity: 1; }
.notes-empty:hover { background: var(--hover); color: var(--text-secondary); }

.notes-editor {
  width: 100%;
  min-height: 80px;
  max-height: 300px;
  padding: 8px 10px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  outline: none;
  resize: vertical;
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.notes-rendered {
  padding: 6px 10px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: text;
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-raised);
  border: 1px solid var(--border);
}
.notes-rendered:hover {
  border-color: var(--border-heavy);
}

/* Markdown rendered styles */
.notes-rendered :deep(h1),
.notes-rendered :deep(h2),
.notes-rendered :deep(h3),
.notes-rendered :deep(h4) {
  font-weight: 600;
  color: var(--text);
  margin: 8px 0 4px;
  line-height: 1.3;
}
.notes-rendered :deep(h1) { font-size: 14px; }
.notes-rendered :deep(h2) { font-size: 13px; }
.notes-rendered :deep(h3) { font-size: 12px; }
.notes-rendered :deep(h4) { font-size: 11px; }
.notes-rendered :deep(p) { margin: 4px 0; }
.notes-rendered :deep(ul) {
  margin: 4px 0;
  padding-left: 18px;
  list-style: disc;
}
.notes-rendered :deep(ol) {
  margin: 4px 0;
  padding-left: 18px;
  list-style: decimal;
}
.notes-rendered :deep(li) { margin: 2px 0; display: list-item; }
.notes-rendered :deep(li ul),
.notes-rendered :deep(li ol) { margin: 0; }
.notes-rendered :deep(strong) { color: var(--text); font-weight: 600; }
.notes-rendered :deep(code) {
  font-size: 10px;
  background: var(--hover);
  padding: 1px 4px;
  border-radius: 3px;
}
.notes-rendered :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 8px 0;
}
.notes-rendered :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-sm);
  margin: 4px 0;
}
.notes-rendered :deep(*:first-child) { margin-top: 0; }
.notes-rendered :deep(*:last-child) { margin-bottom: 0; }

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
  .zone-resize { width: 32px; height: 32px; }
  .notes-empty { opacity: 1; }
}
</style>
