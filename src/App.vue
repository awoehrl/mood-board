<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from './stores/board.js'
import { useSync } from './composables/useSync.js'
import BoardCanvas from './components/canvas/BoardCanvas.vue'
import MainToolbar from './components/toolbar/MainToolbar.vue'
import ElementToolbar from './components/toolbar/ElementToolbar.vue'
import ImageSourceModal from './components/modals/ImageSourceModal.vue'
import ColorPickerModal from './components/modals/ColorPickerModal.vue'
import OnboardingModal from './components/modals/OnboardingModal.vue'

const store = useBoardStore()
const { boardId, connected, syncing, users, exportJson, importJson } = useSync()

const boardCanvas = ref(null)
const showColorPicker = ref(false)
const imageSourceModal = ref(null)
const linkCopied = ref(false)

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
    alert('Failed to import: ' + e.message)
  }
}

function onShowImageSourceModal({ zoneId, elementId }) {
  imageSourceModal.value = { zoneId, elementId }
}

function onCopyLink() {
  navigator.clipboard.writeText(window.location.href)
  linkCopied.value = true
  setTimeout(() => { linkCopied.value = false }, 2000)
}

function onKeyDown(e) {
  if (e.key === 'Delete' || (e.key === 'Backspace' && !isEditing())) {
    if (store.selectedElementId && store.selectedZoneId) {
      store.deleteElement(store.selectedZoneId, store.selectedElementId)
    }
  }
  if (e.key === 'Escape') {
    store.clearSelection()
    showColorPicker.value = false
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
      @import="onImport"
      @copy-link="onCopyLink"
    />

    <ElementToolbar @show-color-picker="showColorPicker = true" />

    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="linkCopied"
        class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 text-[13px] rounded-lg shadow-lg"
        style="background: var(--text); color: white;"
      >
        Link copied to clipboard
      </div>
    </Transition>

    <ImageSourceModal
      v-if="imageSourceModal"
      :zone-id="imageSourceModal.zoneId"
      :element-id="imageSourceModal.elementId"
      @close="imageSourceModal = null"
    />

    <ColorPickerModal v-if="showColorPicker" @close="showColorPicker = false" />
  </div>
</template>

<style>
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
