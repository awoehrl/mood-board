<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import { compressImage, uploadImage, isUrl, isImageUrl, loadImageAsBase64, enrichUrlMetadata } from '../../utils/clipboard.js'
import { useToast } from '../../composables/useToast.js'
import { supportsItemMetadata } from '../../utils/itemMetadata.js'

const emit = defineEmits(['show-color-picker', 'show-link-input', 'show-delete-confirm', 'open-compare'])
const store = useBoardStore()
const toast = useToast()

const compareCount = computed(() =>
  store.selectedElements.filter((element) => supportsItemMetadata(element.type)).length
)
const canCompare = computed(() =>
  compareCount.value >= 2 &&
  compareCount.value <= 4 &&
  compareCount.value === store.selectedElements.length
)

function addImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !store.selectedZoneId) return
    store.pushUndo()
    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file)
      const compressed = await compressImage(dataUrl)
      let src = compressed
      try {
        src = await uploadImage(compressed)
      } catch {
        toast.show('Image upload failed — saved locally', 'warning')
      }
      store.addElement(store.selectedZoneId, {
        type: 'image', width: 200, height: 150,
        data: { src, sourceUrl: null, alt: file.name },
      })
    }
    if (files.length > 1) toast.show(`Added ${files.length} images`, 'success')
  }
  input.click()
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function addText() {
  if (!store.selectedZoneId) return
  store.pushUndo()
  store.addElement(store.selectedZoneId, { type: 'text', width: 200, height: 80, data: { content: '' } })
}

async function pasteFromClipboard() {
  if (!store.selectedZoneId) return
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      // Image blob
      const imageType = item.types.find(t => t.startsWith('image/'))
      if (imageType) {
        const blob = await item.getType(imageType)
        const dataUrl = await blobToDataUrl(blob)
        const compressed = await compressImage(dataUrl)
        let src = compressed
        try { src = await uploadImage(compressed) } catch { toast.show('Upload failed — saved locally', 'warning') }
        store.pushUndo()
        store.addElement(store.selectedZoneId, {
          type: 'image', width: 200, height: 150,
          data: { src, sourceUrl: null, alt: 'Pasted image' },
        })
        return
      }
      // Text (URL or plain text)
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain')
        const text = (await blob.text()).trim()
        if (!text) continue
        store.pushUndo()
        if (isImageUrl(text)) {
          let item = null
          try {
            const enriched = await enrichUrlMetadata(text)
            item = enriched.item || null
          } catch {
            // Fall through with a basic item if metadata fetch fails.
          }
          const base64 = await loadImageAsBase64(text)
          let src = base64 || text
          if (base64) { try { src = await uploadImage(base64) } catch {} }
          store.addElement(store.selectedZoneId, { type: 'image', width: 220, height: 160, data: { src, sourceUrl: item?.productUrl || text, alt: 'Image from URL' }, item })
        } else if (isUrl(text)) {
          let item = null
          try {
            const enriched = await enrichUrlMetadata(text)
            item = enriched.item || null
          } catch {
            // Fall through with a basic item if metadata fetch fails.
          }
          store.addElement(store.selectedZoneId, { type: 'link', width: 240, height: 56, data: { url: item?.productUrl || text, label: '' }, item })
        } else {
          store.addElement(store.selectedZoneId, { type: 'text', width: 200, height: 80, data: { content: text } })
        }
        return
      }
    }
    toast.show('Nothing to paste', 'warning')
  } catch {
    toast.show('Clipboard access denied', 'warning')
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function deleteSelected() {
  if (store.selectedElementIds.size > 0 && store.selectedZoneId) {
    store.pushUndo()
    store.deleteSelectedElements()
  } else if (store.selectedZoneId) {
    emit('show-delete-confirm')
  }
}

const showNote = ref(false)
const editNote = ref('')

const singleSelected = computed(() => {
  if (store.selectedElementIds.size !== 1 || !store.selectedZone) return null
  const id = [...store.selectedElementIds][0]
  return store.selectedZone.elements.find(e => e.id === id) ?? null
})

function toggleNote() {
  if (!singleSelected.value) return
  if (showNote.value) {
    saveNote()
  } else {
    editNote.value = singleSelected.value.note || ''
    showNote.value = true
  }
}
function saveNote() {
  if (singleSelected.value && store.selectedZoneId) {
    store.updateElement(store.selectedZoneId, singleSelected.value.id, { note: editNote.value || null })
  }
  showNote.value = false
}

watch(() => store.selectedElementIds, () => { showNote.value = false }, { deep: true })

const showMobileMenu = ref(false)
const fabWrap = ref(null)

// Click-outside handler for FAB menu
let removeClickOutside = null
watch(showMobileMenu, (open) => {
  if (removeClickOutside) { removeClickOutside(); removeClickOutside = null }
  if (open) {
    const handler = (e) => {
      if (fabWrap.value && !fabWrap.value.contains(e.target)) {
        showMobileMenu.value = false
      }
    }
    setTimeout(() => document.addEventListener('pointerdown', handler, true), 0)
    removeClickOutside = () => document.removeEventListener('pointerdown', handler, true)
  }
})
onUnmounted(() => { if (removeClickOutside) removeClickOutside() })
</script>

<template>
  <div v-if="store.selectedZoneId" class="el-bar">
    <div class="el-desktop">
      <button class="el-btn" title="Add image" @click="addImage">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        <span class="el-label">Image</span>
      </button>
      <button class="el-btn" title="Add link" @click="emit('show-link-input')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        <span class="el-label">Link</span>
      </button>
      <button class="el-btn" title="Add text" @click="addText">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
        <span class="el-label">Text</span>
      </button>
      <button class="el-btn" title="Add color" @click="emit('show-color-picker')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.5-4.5-9.99-10-9.99z"/><circle cx="7.5" cy="11.5" r="1.5" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="11.5" r="1.5" fill="currentColor"/><circle cx="13.5" cy="7.5" r="1.5" fill="currentColor"/></svg>
        <span class="el-label">Color</span>
      </button>
      <button class="el-btn" title="Paste from clipboard" @click="pasteFromClipboard">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
        <span class="el-label">Paste</span>
      </button>
      <button v-if="canCompare" class="el-btn" title="Compare selected" @click="emit('open-compare')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 6h14M5 12h14M5 18h14"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></svg>
        <span class="el-label">Compare</span>
      </button>
      <span class="el-sep" />
      <div class="el-note-wrap">
        <button v-if="singleSelected" class="el-btn" :class="{ 'el-btn--active': singleSelected?.note }" title="Add/edit note" @click="toggleNote">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </button>
        <Transition name="popup">
          <div v-if="showNote" class="el-note-popover" @pointerdown.stop>
            <textarea v-model="editNote" class="el-note-textarea" placeholder="Write a note..."
              @keydown.escape="saveNote" autofocus />
            <div class="el-note-actions">
              <button class="el-note-save" @click="saveNote">Done</button>
            </div>
          </div>
        </Transition>
      </div>
      <button class="el-btn el-btn--danger" title="Delete selected" @click="deleteSelected">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>
      </button>
    </div>

    <!-- Mobile: creation FAB (bottom-right) -->
    <div ref="fabWrap" class="el-mobile-create">
      <button class="el-fab" @click="showMobileMenu = !showMobileMenu">
        <svg width="18" height="18" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <Transition name="popup">
        <div v-if="showMobileMenu" class="el-mobile-menu">
          <button class="el-mobile-item" @click="addImage(); showMobileMenu = false">Image</button>
          <button class="el-mobile-item" @click="emit('show-link-input'); showMobileMenu = false">Link</button>
          <button class="el-mobile-item" @click="addText(); showMobileMenu = false">Text</button>
          <button class="el-mobile-item" @click="emit('show-color-picker'); showMobileMenu = false">Color</button>
          <button class="el-mobile-item" @click="pasteFromClipboard(); showMobileMenu = false">Paste</button>
        </div>
      </Transition>
    </div>

    <!-- Mobile: selection action bar (only when elements are selected) -->
    <div v-if="store.selectedElementIds.size > 0" class="el-mobile-actions">
      <span class="el-action-count">{{ store.selectedElementIds.size }} selected</span>
      <button v-if="canCompare" class="el-action-btn" @click="emit('open-compare')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 6h14M5 12h14M5 18h14"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></svg>
        <span>Compare</span>
      </button>
      <button v-if="singleSelected" class="el-action-btn" :class="{ 'el-btn--active': singleSelected?.note }" @click="toggleNote">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span>Note</span>
      </button>
      <button class="el-action-btn el-action-btn--danger" @click="deleteSelected">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>
        <span>Delete</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.el-bar {
  position: fixed;
  bottom: 16px;
  left: 50%; transform: translateX(-50%);
  z-index: 30;
}

.el-desktop {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 4px;
  background: var(--bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.el-btn {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.1s;
}
.el-btn:hover { background: var(--hover); color: var(--text); }
.el-btn--danger { color: var(--red); padding: 0 8px; }
.el-btn--danger:hover { background: var(--red-soft); }
.el-sep {
  width: 1px; height: 18px;
  background: var(--border);
  margin: 0 2px;
}

.el-mobile-create { display: none; }
.el-mobile-actions { display: none; }

.el-fab {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 102, 255, 0.3);
}
.el-mobile-menu {
  position: absolute;
  bottom: 56px;
  right: 0;
  width: 150px;
  padding: 4px;
  background: var(--bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
.el-mobile-item {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--text);
  border-radius: var(--radius-sm);
  text-align: left;
}
.el-mobile-item:hover { background: var(--hover); }

.el-action-btn {
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.1s;
}
.el-action-btn--danger { color: var(--red); }
.el-action-btn--danger:hover { background: var(--red-soft); }
.el-action-count {
  font-size: 12px;
  color: var(--text-muted);
  padding: 0 8px;
  white-space: nowrap;
}


.el-note-wrap { position: relative; }
.el-btn--active { color: #fbbf24; }
.el-btn--active:hover { color: #f59e0b; }
.el-note-popover {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  padding: 10px;
  background: var(--bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
.el-note-textarea {
  width: 100%;
  height: 72px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text);
  resize: none;
  outline: none;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: border-color 0.15s;
}
.el-note-textarea:focus { border-color: var(--accent); }
.el-note-actions { display: flex; justify-content: flex-end; margin-top: 6px; }
.el-note-save {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.el-note-save:hover { background: var(--accent-soft); }

.popup-enter-active, .popup-leave-active { transition: all 0.15s ease; }
.popup-enter-from, .popup-leave-to { opacity: 0; transform: translateY(4px); }

@media (max-width: 640px) {
  .el-label { display: none; }
  .el-btn { padding: 0 8px; }
}
@media (max-width: 480px) {
  .el-desktop { display: none; }
  .el-bar {
    left: auto; right: 16px;
    transform: none;
  }
  .el-mobile-create { display: block; }
  .el-mobile-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    background: var(--bg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    position: fixed;
    bottom: 16px;
    left: 50%; transform: translateX(-50%);
  }
}
@media (pointer: coarse) {
  .el-btn { min-height: 44px; padding: 0 12px; }
  .el-action-btn { min-height: 44px; }
}
</style>
