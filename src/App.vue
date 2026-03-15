<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from './stores/board.js'
import { useSync } from './composables/useSync.js'
import { useToast } from './composables/useToast.js'
import BoardCanvas from './components/canvas/BoardCanvas.vue'
import MainToolbar from './components/toolbar/MainToolbar.vue'
import ElementToolbar from './components/toolbar/ElementToolbar.vue'
import ImageSourceModal from './components/modals/ImageSourceModal.vue'
import ColorPickerModal from './components/modals/ColorPickerModal.vue'
import OnboardingModal from './components/modals/OnboardingModal.vue'
import LinkInputModal from './components/modals/LinkInputModal.vue'
import ConfirmModal from './components/modals/ConfirmModal.vue'
import ToastContainer from './components/ui/ToastContainer.vue'

const store = useBoardStore()
const { boardId, connected, syncing, users, exportJson, importJson, debouncedSave } = useSync()
const toast = useToast()

const boardCanvas = ref(null)
const showColorPicker = ref(false)
const showLinkInput = ref(false)
const showDeleteConfirm = ref(false)
const imageSourceModal = ref(null)

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

function onFitAll() {
  const el = boardCanvas.value?.$el
  if (!el) return
  boardCanvas.value.canvas.fitAll(store.zones, el.clientWidth, el.clientHeight)
}

function onPanToZone(zone) {
  const el = boardCanvas.value?.$el
  if (!el) return
  boardCanvas.value.canvas.panToZone(zone, el.clientWidth, el.clientHeight)
  store.selectZone(zone.id)
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

function onAddLink(url) {
  if (!url || !store.selectedZoneId) return
  store.pushUndo()
  store.addElement(store.selectedZoneId, {
    type: 'link', width: 240, height: 56,
    data: { url, label: '' },
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
      @show-image-source-modal="onShowImageSourceModal"
    />

    <MainToolbar
      :zoom-percent="boardCanvas?.canvas?.zoomPercent?.value ?? 100"
      :users="users"
      :syncing="syncing"
      :connected="connected"
      :board-id="boardId"
      @zoom-in="onZoomIn"
      @zoom-out="onZoomOut"
      @fit-all="onFitAll"
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
    />

    <ToastContainer />

    <ImageSourceModal
      v-if="imageSourceModal"
      :zone-id="imageSourceModal.zoneId"
      :element-id="imageSourceModal.elementId"
      @close="imageSourceModal = null"
    />

    <ColorPickerModal v-if="showColorPicker" @close="showColorPicker = false" />

    <LinkInputModal v-if="showLinkInput" @submit="onAddLink" @close="showLinkInput = false" />

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
