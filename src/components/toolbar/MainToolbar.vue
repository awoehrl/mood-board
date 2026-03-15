<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import UserAvatars from '../UserAvatars.vue'

defineProps({
  zoomPercent: Number,
  users: Array,
  syncing: Boolean,
  connected: Boolean,
  boardId: String,
})
const emit = defineEmits(['zoom-in', 'zoom-out', 'fit-all', 'pan-to-zone', 'export', 'import', 'copy-link'])

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

function addZone() {
  const name = prompt('Room name:', 'New Room')
  if (name) store.addZone({ name })
}

function startEditName() { editName.value = store.name; isEditingName.value = true }
function saveName() {
  if (editName.value.trim()) store.name = editName.value.trim()
  isEditingName.value = false
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
      <button
        v-for="zone in store.zones"
        :key="zone.id"
        class="zone-chip"
        :class="{ active: store.selectedZoneId === zone.id }"
        @click="emit('pan-to-zone', zone)"
      >
        <span class="chip-dot" :style="{ background: zone.color }" />
        <span class="chip-label">{{ zone.name }}</span>
      </button>

      <button class="icon-btn add-zone-btn" @click="addZone" title="New zone">
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
            <button class="dropdown-item" @click="emit('export'); showMenu = false">Export JSON</button>
            <button class="dropdown-item" @click="triggerImport(); showMenu = false">Import JSON</button>
          </div>
        </Transition>
      </div>
      <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFileSelected" />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 30;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
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

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 640px) {
  .topbar { flex-wrap: wrap; height: auto; min-height: 48px; }
  .zone-bar {
    order: 3;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding: 4px 12px;
    border-top: 1px solid var(--border);
    background: var(--bg);
    backdrop-filter: blur(12px);
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
