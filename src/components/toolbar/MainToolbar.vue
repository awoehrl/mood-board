<script setup>
import { ref } from 'vue'
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
      <!-- Board name -->
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

      <span class="breadcrumb-sep">/</span>

      <!-- Zone chips -->
      <button
        v-for="zone in store.zones"
        :key="zone.id"
        class="zone-chip"
        :class="{ 'zone-chip--active': store.selectedZoneId === zone.id }"
        @click="emit('pan-to-zone', zone)"
      >
        <span class="zone-dot" :style="{ background: zone.color }" />
        {{ zone.name }}
      </button>

      <button class="icon-btn" @click="addZone" title="New zone">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div class="topbar-right">
      <UserAvatars
        :users="users" :syncing="syncing" :connected="connected" :board-id="boardId"
        @copy-link="emit('copy-link')"
      />

      <div class="divider" />

      <!-- Zoom -->
      <button class="icon-btn" @click="emit('zoom-out')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <span class="zoom-pct">{{ zoomPercent }}%</span>
      <button class="icon-btn" @click="emit('zoom-in')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <button class="text-btn" @click="emit('fit-all')">Fit all</button>

      <div class="divider" />

      <!-- Menu -->
      <div class="menu-wrap">
        <button class="icon-btn" @click="showMenu = !showMenu" title="More">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="3" r="1" fill="currentColor"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="11" r="1" fill="currentColor"/></svg>
        </button>
        <div v-if="showMenu" class="dropdown" @mouseleave="showMenu = false">
          <button class="dropdown-item" @click="emit('export'); showMenu = false">Export JSON</button>
          <button class="dropdown-item" @click="triggerImport(); showMenu = false">Import JSON</button>
        </div>
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
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.topbar-left, .topbar-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* Board name */
.name-btn {
  height: 28px;
  padding: 0 6px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 3px;
}
.name-btn:hover { background: var(--hover); }
.name-input {
  height: 28px;
  padding: 0 6px;
  font-size: 14px;
  font-weight: 600;
  outline: none;
  border-radius: 3px;
  background: var(--hover);
}

/* Breadcrumb */
.breadcrumb-sep {
  color: var(--border-heavy);
  font-size: 14px;
  margin: 0 2px;
  font-weight: 300;
}

/* Zone chips */
.zone-chip {
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--text-secondary);
  border-radius: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.zone-chip:hover { background: var(--hover); }
.zone-chip--active {
  background: var(--active);
  color: var(--text);
}
.zone-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* Buttons */
.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--text-secondary);
}
.icon-btn:hover { background: var(--hover); }

.text-btn {
  height: 26px;
  padding: 0 6px;
  font-size: 12px;
  color: var(--text-secondary);
  border-radius: 3px;
}
.text-btn:hover { background: var(--hover); }

.zoom-pct {
  font-size: 12px;
  color: var(--text-muted);
  width: 38px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.divider {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 6px;
}

/* Dropdown */
.menu-wrap { position: relative; }
.dropdown {
  position: absolute;
  right: 0;
  top: 34px;
  width: 180px;
  padding: 4px;
  background: var(--bg);
  border-radius: 4px;
  box-shadow: 0 0 0 1px var(--border), 0 3px 6px rgba(0,0,0,0.08), 0 9px 24px rgba(0,0,0,0.06);
}
.dropdown-item {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  font-size: 13px;
  color: var(--text);
  border-radius: 3px;
  text-align: left;
  display: flex;
  align-items: center;
}
.dropdown-item:hover { background: var(--hover); }
</style>
