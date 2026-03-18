<script setup>
import { ref, computed } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import { getDomain } from '../../utils/clipboard.js'
import { formatItemPrice, getItemStatusLabel } from '../../utils/itemMetadata.js'

const props = defineProps({ element: Object, zoneId: String })
const emit = defineEmits(['open-viewer'])
const store = useBoardStore()
const isEditingUrl = ref(false)
const editUrl = ref('')
const imgError = ref(false)
const isRepositioning = ref(false)
const dragStart = ref(null)

const focalX = computed(() => props.element.data.focalX ?? 50)
const focalY = computed(() => props.element.data.focalY ?? 50)
const objectPos = computed(() => `${focalX.value}% ${focalY.value}%`)

function startEditUrl() { editUrl.value = props.element.data.sourceUrl || ''; isEditingUrl.value = true }
function saveUrl() {
  store.updateElement(props.zoneId, props.element.id, {
    data: { ...props.element.data, sourceUrl: editUrl.value.trim() || null },
    item: { productUrl: editUrl.value.trim() || '', vendor: '' },
  })
  isEditingUrl.value = false
}

function startReposition(e) {
  isRepositioning.value = true
  dragStart.value = { x: e.clientX, y: e.clientY, fx: focalX.value, fy: focalY.value }
  document.addEventListener('pointermove', onRepoMove)
  document.addEventListener('pointerup', onRepoUp)
}

function onRepoMove(e) {
  if (!dragStart.value) return
  const dx = e.clientX - dragStart.value.x
  const dy = e.clientY - dragStart.value.y
  // Invert: dragging right moves focal point left (moves visible area right)
  const newFx = Math.max(0, Math.min(100, dragStart.value.fx - dx * 0.5))
  const newFy = Math.max(0, Math.min(100, dragStart.value.fy - dy * 0.5))
  store.updateElement(props.zoneId, props.element.id, {
    data: { ...props.element.data, focalX: Math.round(newFx), focalY: Math.round(newFy) },
  })
}

function onRepoUp() {
  dragStart.value = null
  isRepositioning.value = false
  document.removeEventListener('pointermove', onRepoMove)
  document.removeEventListener('pointerup', onRepoUp)
}
</script>

<template>
  <div class="img-el group" :class="{ 'is-repositioning': isRepositioning }">
    <div v-if="element.item" class="img-el-badges">
      <span class="img-el-badge">{{ getItemStatusLabel(element.item.status) }}</span>
      <span v-if="formatItemPrice(element.item)" class="img-el-badge img-el-badge--price">{{ formatItemPrice(element.item) }}</span>
    </div>

    <img
      v-if="element.data.src && !imgError"
      :src="element.data.src" :alt="element.data.alt || ''"
      class="img-el-img"
      :style="{ objectPosition: objectPos }"
      draggable="false"
      @dblclick.stop="startEditUrl"
      @error="imgError = true"
    />
    <div v-else class="img-el-empty">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
    </div>

    <!-- Expand button -->
    <button class="img-el-expand" @pointerdown.stop @click.stop="emit('open-viewer')" title="View full image">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 2H12v3.5M5.5 12H2V8.5M12 2L8 6M2 12l4-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>

    <!-- Reposition button -->
    <button
      v-if="element.data.src && !imgError"
      class="img-el-reposition"
      title="Drag to reposition image"
      @pointerdown.stop.prevent="startReposition"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
      </svg>
    </button>

    <div v-if="element.data.sourceUrl && !isEditingUrl" class="img-el-bar">
      <a :href="element.data.sourceUrl" target="_blank" rel="noopener" class="img-el-link" @pointerdown.stop @click.stop>
        {{ getDomain(element.data.sourceUrl) }}
      </a>
    </div>
    <div v-else-if="!isEditingUrl" class="img-el-bar img-el-bar--hint" @pointerdown.stop @click.stop="startEditUrl">
      Add source...
    </div>

    <div v-if="isEditingUrl" class="img-el-editor" @pointerdown.stop>
      <input v-model="editUrl" type="url" placeholder="https://..." class="img-el-input"
        @blur="saveUrl" @keydown.enter="saveUrl" @keydown.escape="isEditingUrl = false" autofocus />
    </div>
  </div>
</template>

<style scoped>
.img-el {
  width: 100%; height: 100%;
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
  background: var(--canvas-bg);
  border: 1px solid var(--border);
}
.img-el.is-repositioning { cursor: grab; }
.img-el-badges {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.img-el-badge {
  height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(8px);
  font-size: 10px;
  font-weight: 700;
  color: var(--text);
}
.img-el-badge--price { color: #7a4e16; }
.img-el-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.img-el-empty {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted);
}
.img-el-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 20px 8px 6px;
  background: linear-gradient(transparent, rgba(0,0,0,0.45));
  font-size: 11px;
  color: rgba(255,255,255,0.7);
  opacity: 0;
  transition: opacity 0.15s;
}
.group:hover .img-el-bar { opacity: 1; }
.img-el-bar--hint { cursor: pointer; }
.img-el-link { color: inherit; text-decoration: none; }
.img-el-link:hover { color: white; }
.img-el-editor {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 6px;
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.img-el-input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
}
.img-el-input:focus { border-color: var(--accent); }
.img-el-expand {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: opacity 0.15s;
  backdrop-filter: blur(4px);
}
.group:hover .img-el-expand { opacity: 1; }
.img-el-expand:hover { background: rgba(0, 0, 0, 0.7); }
.img-el-reposition {
  position: absolute;
  top: 6px;
  right: 38px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: opacity 0.15s;
  backdrop-filter: blur(4px);
  cursor: grab;
  z-index: 3;
}
.group:hover .img-el-reposition { opacity: 1; }
.img-el-reposition:hover { background: rgba(0, 0, 0, 0.7); }
</style>
