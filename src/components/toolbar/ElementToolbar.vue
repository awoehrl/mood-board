<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import { compressImage, uploadImage } from '../../utils/clipboard.js'
import { arrangeByColor } from '../../utils/colorSort.js'
import { useToast } from '../../composables/useToast.js'

const emit = defineEmits(['show-color-picker'])
const store = useBoardStore()
const toast = useToast()
const arranging = ref(false)

function addImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !store.selectedZoneId) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result)
      let src = compressed
      try {
        src = await uploadImage(compressed)
      } catch {
        toast.show('Image upload failed — saved locally', 'warning')
      }
      store.pushUndo()
      store.addElement(store.selectedZoneId, {
        type: 'image', width: 200, height: 150,
        data: { src, sourceUrl: null, alt: file.name },
      })
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

function addLink() {
  const url = prompt('URL:')
  if (!url || !store.selectedZoneId) return
  store.pushUndo()
  store.addElement(store.selectedZoneId, {
    type: 'link', width: 240, height: 56,
    data: { url, label: '' },
  })
}

function addText() {
  if (!store.selectedZoneId) return
  store.pushUndo()
  store.addElement(store.selectedZoneId, { type: 'text', width: 200, height: 80, data: { content: '' } })
}

async function autoArrange() {
  const zone = store.zones.find(z => z.id === store.selectedZoneId)
  if (!zone || !zone.elements.length) return
  store.pushUndo()
  arranging.value = true
  try {
    await arrangeByColor(zone)
  } finally {
    arranging.value = false
  }
}

function deleteSelected() {
  if (store.selectedElementIds.size > 0 && store.selectedZoneId) {
    store.pushUndo()
    store.deleteSelectedElements()
  } else if (store.selectedZoneId) {
    if (confirm('Delete this zone and all its elements?')) {
      store.pushUndo()
      store.deleteZone(store.selectedZoneId)
    }
  }
}

const showMobileMenu = ref(false)
</script>

<template>
  <div v-if="store.selectedZoneId" class="el-bar">
    <!-- Desktop: full buttons -->
    <div class="el-desktop">
      <button class="el-btn" @click="addImage">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        <span class="el-label">Image</span>
      </button>
      <button class="el-btn" @click="addLink">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        <span class="el-label">Link</span>
      </button>
      <button class="el-btn" @click="addText">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
        <span class="el-label">Text</span>
      </button>
      <button class="el-btn" @click="emit('show-color-picker')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.5-4.5-9.99-10-9.99z"/><circle cx="7.5" cy="11.5" r="1.5" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="11.5" r="1.5" fill="currentColor"/><circle cx="13.5" cy="7.5" r="1.5" fill="currentColor"/></svg>
        <span class="el-label">Color</span>
      </button>
      <span class="el-sep" />
      <button class="el-btn" @click="autoArrange" :disabled="arranging">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 6h18M6 12h12M9 18h6"/></svg>
        <span class="el-label">{{ arranging ? 'Sorting...' : 'Arrange' }}</span>
      </button>
      <span class="el-sep" />
      <button class="el-btn el-btn--danger" @click="deleteSelected">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>
      </button>
    </div>

    <!-- Mobile: FAB that opens popover -->
    <div class="el-mobile">
      <button class="el-fab" @click="showMobileMenu = !showMobileMenu">
        <svg width="18" height="18" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <div v-if="showMobileMenu" class="el-mobile-menu" @click="showMobileMenu = false">
        <button class="el-mobile-item" @click="addImage">Image</button>
        <button class="el-mobile-item" @click="addLink">Link</button>
        <button class="el-mobile-item" @click="addText">Text</button>
        <button class="el-mobile-item" @click="emit('show-color-picker')">Color</button>
        <button class="el-mobile-item" @click="autoArrange">Arrange</button>
        <button class="el-mobile-item el-mobile-item--danger" @click="deleteSelected">Delete</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.el-bar {
  position: absolute;
  bottom: 12px;
  left: 50%; transform: translateX(-50%);
  z-index: 30;
}

/* Desktop layout */
.el-desktop {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 3px;
  background: var(--bg);
  border-radius: 6px;
  box-shadow: 0 0 0 1px var(--border), 0 4px 12px rgba(0,0,0,0.08);
}
.el-btn {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--text-secondary);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.el-btn:hover { background: var(--hover); color: var(--text); }
.el-btn--danger { color: var(--red); padding: 0 8px; }
.el-btn--danger:hover { background: #fef2f2; }
.el-sep {
  width: 1px; height: 16px;
  background: var(--border);
  margin: 0 2px;
}
.el-label {}

/* Mobile FAB — hidden by default */
.el-mobile { display: none; }

.el-fab {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--accent, #3b82f6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.el-mobile-menu {
  position: absolute;
  bottom: 56px;
  right: 0;
  width: 140px;
  padding: 4px;
  background: var(--bg);
  border-radius: 6px;
  box-shadow: 0 0 0 1px var(--border), 0 4px 12px rgba(0,0,0,0.08);
}
.el-mobile-item {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--text);
  border-radius: 4px;
  text-align: left;
}
.el-mobile-item:hover { background: var(--hover); }
.el-mobile-item--danger { color: var(--red); }

/* Responsive: hide labels on small screens */
@media (max-width: 640px) {
  .el-label { display: none; }
  .el-btn { padding: 0 8px; }
}

/* Collapse to FAB on very small screens */
@media (max-width: 480px) {
  .el-desktop { display: none; }
  .el-mobile { display: block; }
}

/* Touch targets */
@media (pointer: coarse) {
  .el-btn { min-height: 44px; padding: 0 12px; }
}
</style>
