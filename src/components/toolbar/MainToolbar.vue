<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import { arrangeAllZones } from '../../utils/colorSort.js'
import UserAvatars from '../UserAvatars.vue'

defineProps({
  zoomPercent: Number,
  users: Array,
  syncing: Boolean,
  connected: Boolean,
  boardId: String,
})
const emit = defineEmits(['zoom-in', 'zoom-out', 'fit-all', 'pan-to-zone', 'export', 'export-markdown', 'import', 'copy-link'])

const commitHash = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'
const store = useBoardStore()
const isEditingName = ref(false)
const editName = ref('')
const fileInput = ref(null)
const showMenu = ref(false)
const menuWrap = ref(null)

// Click-outside handler for dropdown (works on both desktop and mobile)
let removeClickOutside = null
watch(showMenu, (open) => {
  if (removeClickOutside) { removeClickOutside(); removeClickOutside = null }
  if (open) {
    const handler = (e) => {
      if (menuWrap.value && !menuWrap.value.contains(e.target)) {
        showMenu.value = false
      }
    }
    // Use setTimeout so the opening click doesn't immediately close it
    setTimeout(() => document.addEventListener('pointerdown', handler, true), 0)
    removeClickOutside = () => document.removeEventListener('pointerdown', handler, true)
  }
})
onUnmounted(() => { if (removeClickOutside) removeClickOutside() })

const showNewZone = ref(false)
const newZoneName = ref('')
function startAddZone() { newZoneName.value = ''; showNewZone.value = true }
function saveNewZone() {
  if (newZoneName.value.trim()) store.addZone({ name: newZoneName.value.trim() })
  showNewZone.value = false
}

const renamingZoneId = ref(null)
const renameZoneName = ref('')
function startRenameZone(zone) {
  renamingZoneId.value = zone.id
  renameZoneName.value = zone.name
}
function saveRenameZone() {
  if (renameZoneName.value.trim() && renamingZoneId.value) {
    store.updateZone(renamingZoneId.value, { name: renameZoneName.value.trim() })
  }
  renamingZoneId.value = null
}

function startEditName() { editName.value = store.name; isEditingName.value = true }
function saveName() {
  if (editName.value.trim()) store.name = editName.value.trim()
  isEditingName.value = false
}
const arranging = ref(false)
async function autoArrange() {
  if (!store.zones.length) return
  store.pushUndo()
  arranging.value = true
  try {
    await arrangeAllZones(store.zones)
    // After Vue renders, measure actual DOM heights and fix positions
    await nextTick()
    await nextTick() // double nextTick to ensure DOM is fully updated
    fixZonePositionsFromDOM()
  } finally { arranging.value = false }
}

function fixZonePositionsFromDOM() {
  const zoneEls = document.querySelectorAll('[data-zone]')
  if (!zoneEls.length) return
  // Build a map of zone id -> actual rendered height
  const heightMap = new Map()
  for (const el of zoneEls) {
    // Find which zone this element belongs to by matching position
    const rect = el.getBoundingClientRect()
    // We need to account for canvas scale
    const layer = document.querySelector('[data-canvas-layer]')
    const scale = layer ? (new DOMMatrix(getComputedStyle(layer).transform).a || 1) : 1
    const actualHeight = rect.height / scale
    // Match zone by x/y position
    const style = el.style
    const x = parseFloat(style.left)
    const y = parseFloat(style.top)
    const zone = store.zones.find(z => Math.abs(z.x - x) < 1 && Math.abs(z.y - y) < 1)
    if (zone) heightMap.set(zone.id, actualHeight)
  }
  // Re-position zones in 2 columns using actual heights
  const ZONE_GAP = 60
  const ZONE_MAX_WIDTH = 700
  const startX = 100
  const startY = 100
  const colHeights = [startY, startY]
  for (const zone of store.zones) {
    const col = colHeights[0] <= colHeights[1] ? 0 : 1
    zone.x = startX + col * (ZONE_MAX_WIDTH + ZONE_GAP)
    zone.y = colHeights[col]
    const h = heightMap.get(zone.id) || zone.height
    colHeights[col] += h + ZONE_GAP
  }
}
function triggerImport() { fileInput.value?.click() }
function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (file) emit('import', file)
  e.target.value = ''
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <input
        v-if="isEditingName"
        v-model="editName"
        class="name-input"
        @blur="saveName"
        @keydown.enter="saveName"
        @keydown.escape="isEditingName = false"
        autofocus
      />
      <button v-else class="name-btn" @click="startEditName">
        {{ store.name }}
      </button>

    </div>

    <div class="zone-bar">
      <template v-for="zone in store.zones" :key="zone.id">
        <div v-if="renamingZoneId === zone.id" class="zone-chip active">
          <span class="chip-dot" :style="{ background: zone.color }" />
          <input
            v-model="renameZoneName"
            class="zone-rename-input"
            @blur="saveRenameZone"
            @keydown.enter="saveRenameZone"
            @keydown.escape="renamingZoneId = null"
            autofocus
          />
        </div>
        <button
          v-else
          class="zone-chip"
          :class="{ active: store.selectedZoneId === zone.id }"
          @click="emit('pan-to-zone', zone)"
          @dblclick.stop="startRenameZone(zone)"
        >
          <span class="chip-dot" :style="{ background: zone.color }" />
          <span class="chip-label">{{ zone.name }}</span>
        </button>
      </template>

      <input
        v-if="showNewZone"
        v-model="newZoneName"
        class="new-zone-input"
        placeholder="Room name..."
        @blur="saveNewZone"
        @keydown.enter="saveNewZone"
        @keydown.escape="showNewZone = false"
        autofocus
      />
      <button v-else class="icon-btn add-zone-btn" @click="startAddZone" title="New zone">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div class="topbar-right">
      <span class="conn-dot" :class="connected ? 'on' : 'off'" />

      <UserAvatars
        :users="users" :syncing="syncing" :connected="connected" :board-id="boardId"
        @copy-link="emit('copy-link')"
      />

      <div class="divider" />

      <div class="zoom-group">
        <button class="icon-btn" @click="emit('zoom-out')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <span class="zoom-pct">{{ zoomPercent }}%</span>
        <button class="icon-btn" @click="emit('zoom-in')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <button class="text-btn" @click="emit('fit-all')">Fit</button>
      </div>

      <div class="divider" />

      <div ref="menuWrap" class="menu-wrap">
        <button class="icon-btn" @click="showMenu = !showMenu" title="More">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="3" r="1" fill="currentColor"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="11" r="1" fill="currentColor"/></svg>
        </button>
        <Transition name="dropdown">
          <div v-if="showMenu" class="dropdown">
            <button class="dropdown-item" @click="emit('fit-all'); showMenu = false">Fit to screen</button>
            <button class="dropdown-item" :disabled="arranging || !store.zones.length" @click="autoArrange(); showMenu = false">{{ arranging ? 'Sorting...' : 'Auto-arrange all' }}</button>
            <div class="dropdown-sep" />
            <a class="dropdown-item" href="https://www.icloud.com/shortcuts/4bd8d647a043454d9bc9833508fb9a85" target="_blank" @click="showMenu = false">Install iOS Shortcut</a>
            <div class="dropdown-sep" />
            <button class="dropdown-item" @click="emit('export-markdown'); showMenu = false">Export Markdown</button>
            <button class="dropdown-item" @click="emit('export'); showMenu = false">Export JSON</button>
            <button class="dropdown-item" @click="triggerImport(); showMenu = false">Import JSON</button>
            <div class="dropdown-sep" />
            <div class="dropdown-version">{{ commitHash }}</div>
          </div>
        </Transition>
      </div>
      <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFileSelected" />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 30;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.topbar-left, .topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.name-btn {
  height: 30px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  letter-spacing: -0.02em;
}
.name-btn:hover { background: var(--hover); }
.name-input {
  height: 30px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 600;
  outline: none;
  border-radius: var(--radius-sm);
  background: var(--hover);
  letter-spacing: -0.02em;
}

.zone-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 1;
  min-width: 0;
}

.zone-chip {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: background 0.1s;
}
.zone-chip:hover { background: var(--hover); }
.zone-chip.active {
  background: var(--active);
  color: var(--text);
}
.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.zone-rename-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  width: 80px;
  padding: 0;
}

.new-zone-input {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--bg);
  color: var(--text);
  min-width: 100px;
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.conn-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 4px;
}
.conn-dot.on { background: #34d399; }
.conn-dot.off { background: var(--red); }

.icon-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: background 0.1s;
}
.icon-btn:hover { background: var(--hover); color: var(--text); }

.text-btn {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: background 0.1s;
}
.text-btn:hover { background: var(--hover); }

.zoom-pct {
  font-size: 11px;
  color: var(--text-muted);
  width: 38px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  user-select: none;
}
.zoom-group {
  display: flex;
  align-items: center;
}

.divider {
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 6px;
}

.menu-wrap { position: relative; }
.dropdown {
  position: absolute;
  right: 0;
  top: 38px;
  width: 180px;
  padding: 4px;
  background: var(--bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
.dropdown-item {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--text);
  border-radius: var(--radius-sm);
  text-align: left;
  display: flex;
  align-items: center;
  transition: background 0.1s;
}
.dropdown-item:hover { background: var(--hover); }
.dropdown-sep { height: 1px; background: var(--border); margin: 4px 0; }
a.dropdown-item { text-decoration: none; }
.dropdown-version {
  padding: 4px 10px;
  font-size: 10px;
  color: var(--text-muted);
  font-family: monospace;
  text-align: center;
}

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 640px) {
  .topbar { flex-wrap: wrap; height: auto; min-height: 48px; }
  .zone-bar {
    order: 3;
    width: 100%;
    height: 40px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding: 4px 12px;
    border-top: 1px solid var(--border);
    background: var(--bg);
  }
  .zone-chip { height: 32px; padding: 0 10px; flex-shrink: 0; }
  .add-zone-btn { flex-shrink: 0; }
}
@media (max-width: 480px) {
  .zoom-group { display: none; }
}
@media (pointer: coarse) {
  .icon-btn { min-width: 44px; min-height: 44px; }
  .zone-chip { height: 32px; padding: 0 10px; }
}
</style>
