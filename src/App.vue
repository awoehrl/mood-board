<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from './stores/board.js'
import { useSync } from './composables/useSync.js'
import { useToast } from './composables/useToast.js'
import BoardCanvas from './components/canvas/BoardCanvas.vue'
import DecisionView from './components/decision/DecisionView.vue'
import MainToolbar from './components/toolbar/MainToolbar.vue'
import ElementToolbar from './components/toolbar/ElementToolbar.vue'
import ImageSourceModal from './components/modals/ImageSourceModal.vue'
import ColorPickerModal from './components/modals/ColorPickerModal.vue'
import OnboardingModal from './components/modals/OnboardingModal.vue'
import LinkInputModal from './components/modals/LinkInputModal.vue'
import ConfirmModal from './components/modals/ConfirmModal.vue'
import ImageViewer from './components/modals/ImageViewer.vue'
import CompareModal from './components/modals/CompareModal.vue'
import ItemInspector from './components/panels/ItemInspector.vue'
import ToastContainer from './components/ui/ToastContainer.vue'
import { enrichUrlMetadata } from './utils/clipboard.js'
import { supportsItemMetadata } from './utils/itemMetadata.js'

const store = useBoardStore()
const { boardId, connected, syncing, users, exportJson, importJson, debouncedSave } = useSync()
const toast = useToast()

const boardCanvas = ref(null)
const showColorPicker = ref(false)
const showLinkInput = ref(false)
const showDeleteConfirm = ref(false)
const imageSourceModal = ref(null)
const imageViewer = ref(null)
const currentView = ref('canvas')
const showCompare = ref(false)

const compareItems = computed(() => {
  if (!store.selectedZone) return []
  return store.selectedElements
    .filter((element) => supportsItemMetadata(element.type))
    .map((element) => ({
      zoneId: store.selectedZone.id,
      zoneName: store.selectedZone.name,
      element,
    }))
})

const canCompare = computed(() =>
  compareItems.value.length >= 2 &&
  compareItems.value.length <= 4 &&
  compareItems.value.length === store.selectedElements.length
)

const needsOnboarding = computed(() => !localStorage.getItem('mood-board-user-name'))
const showOnboarding = ref(needsOnboarding.value)

function onOnboardingDone(name) {
  const userId = crypto.randomUUID()
  localStorage.setItem('mood-board-user-id', userId)
  localStorage.setItem('mood-board-user-name', name)
  showOnboarding.value = false
  // Reconnect WebSocket with the new user info
  window.location.reload()
}

function onZoomIn() { boardCanvas.value?.canvas.zoomIn() }
function onZoomOut() { boardCanvas.value?.canvas.zoomOut() }

function withVisibleCanvas(callback) {
  if (currentView.value === 'canvas') {
    const el = boardCanvas.value?.$el
    if (el) callback(el)
    return
  }
  currentView.value = 'canvas'
  requestAnimationFrame(() => {
    const el = boardCanvas.value?.$el
    if (el) callback(el)
  })
}

function onFitAll() {
  withVisibleCanvas((el) => {
    boardCanvas.value.canvas.fitAll(store.zones, el.clientWidth, el.clientHeight)
  })
}

function onPanToZone(zone) {
  withVisibleCanvas((el) => {
    boardCanvas.value.canvas.panToZone(zone, el.clientWidth, el.clientHeight)
    store.selectZone(zone.id)
  })
}

async function onImport(file) {
  try {
    await importJson(file)
  } catch (e) {
    toast.show('Failed to import: ' + e.message, 'error')
  }
}

function onShowImageSourceModal({ zoneId, elementId }) {
  imageSourceModal.value = { zoneId, elementId }
}

async function onAddLink(url) {
  if (!url || !store.selectedZoneId) return
  store.pushUndo()
  let item = null
  try {
    const enriched = await enrichUrlMetadata(url)
    item = enriched.item || null
  } catch {
    toast.show('Added link without page metadata', 'warning')
  }
  store.addElement(store.selectedZoneId, {
    type: 'link', width: 240, height: 56,
    data: { url: item?.productUrl || url, label: '' },
    item,
  })
}

function onConfirmDeleteZone() {
  if (store.selectedZoneId) {
    store.pushUndo()
    store.deleteZone(store.selectedZoneId)
  }
  showDeleteConfirm.value = false
}

function onExportMarkdown() {
  const md = store.exportMarkdown()
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.name}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function onCopyLink() {
  navigator.clipboard.writeText(window.location.href)
  toast.show('Link copied to clipboard', 'success')
}

function onSetView(view) {
  currentView.value = view
}

function onOpenCompare() {
  if (!canCompare.value) return
  showCompare.value = true
}

function onShowOnBoard(row) {
  currentView.value = 'canvas'
  requestAnimationFrame(() => {
    const zone = store.zones.find((candidate) => candidate.id === row.zoneId)
    if (!zone) return
    onPanToZone(zone)
    store.selectElement(row.zoneId, row.element.id)
  })
}

function onKeyDown(e) {
  // Undo/Redo
  if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.undo()
    debouncedSave()
    return
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
    e.preventDefault()
    store.redo()
    debouncedSave()
    return
  }

  if (e.key === 'Delete' || (e.key === 'Backspace' && !isEditing())) {
    if (store.selectedElementIds.size > 0 && store.selectedZoneId) {
      store.pushUndo()
      store.deleteSelectedElements()
    }
  }
  if (e.key === 'Escape') {
    if (showCompare.value) { showCompare.value = false; return }
    if (imageViewer.value) { imageViewer.value = null; return }
    store.clearSelection()
    showColorPicker.value = false
    showLinkInput.value = false
    showDeleteConfirm.value = false
    imageSourceModal.value = null
  }
}

function isEditing() {
  const active = document.activeElement
  return active && (
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    active.isContentEditable
  )
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <div class="w-full h-full relative">
    <OnboardingModal v-if="showOnboarding" @done="onOnboardingDone" />

    <BoardCanvas
      ref="boardCanvas"
      v-show="currentView === 'canvas'"
      @show-image-source-modal="onShowImageSourceModal"
      @open-viewer="imageViewer = $event"
    />

    <DecisionView
      v-if="currentView === 'decision'"
      @show-on-board="onShowOnBoard"
    />

    <MainToolbar
      :zoom-percent="boardCanvas?.canvas?.zoomPercent?.value ?? 100"
      :users="users"
      :syncing="syncing"
      :connected="connected"
      :board-id="boardId"
      :current-view="currentView"
      @zoom-in="onZoomIn"
      @zoom-out="onZoomOut"
      @fit-all="onFitAll"
      @set-view="onSetView"
      @pan-to-zone="onPanToZone"
      @export="exportJson"
      @export-markdown="onExportMarkdown"
      @import="onImport"
      @copy-link="onCopyLink"
    />

    <ElementToolbar
      @show-color-picker="showColorPicker = true"
      @show-link-input="showLinkInput = true"
      @show-delete-confirm="showDeleteConfirm = true"
      @open-compare="onOpenCompare"
    />

    <ItemInspector />

    <ToastContainer />

    <ImageSourceModal
      v-if="imageSourceModal"
      :zone-id="imageSourceModal.zoneId"
      :element-id="imageSourceModal.elementId"
      @close="imageSourceModal = null"
    />

    <ColorPickerModal v-if="showColorPicker" @close="showColorPicker = false" />

    <LinkInputModal v-if="showLinkInput" @submit="onAddLink" @close="showLinkInput = false" />

    <ImageViewer
      v-if="imageViewer"
      :zone-id="imageViewer.zoneId"
      :element-id="imageViewer.elementId"
      @close="imageViewer = null"
    />

    <CompareModal
      v-if="showCompare"
      :items="compareItems"
      @close="showCompare = false"
    />

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="Delete zone"
      message="Delete this zone and all its elements?"
      confirm-label="Delete"
      :danger="true"
      @confirm="onConfirmDeleteZone"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
