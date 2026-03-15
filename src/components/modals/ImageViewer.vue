<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const props = defineProps({
  zoneId: String,
  elementId: String,
})
const emit = defineEmits(['close'])
const store = useBoardStore()

// Build flat list of all images across all zones, grouped by zone
const imageList = computed(() => {
  const list = []
  for (const zone of store.zones) {
    for (const el of zone.elements) {
      if (el.type === 'image' && el.data?.src) {
        list.push({ zoneId: zone.id, zoneName: zone.name, zoneColor: zone.color, el })
      }
    }
  }
  return list
})

const currentIndex = ref(0)

// Set initial index based on props
watch(() => [props.zoneId, props.elementId], () => {
  const idx = imageList.value.findIndex(
    img => img.zoneId === props.zoneId && img.el.id === props.elementId
  )
  if (idx >= 0) currentIndex.value = idx
}, { immediate: true })

const current = computed(() => imageList.value[currentIndex.value])
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < imageList.value.length - 1)

function prev() { if (hasPrev.value) currentIndex.value-- }
function next() { if (hasNext.value) currentIndex.value++ }

// Keyboard nav
function onKeyDown(e) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
}
onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

// Swipe support
let touchStartX = 0
function onTouchStart(e) { touchStartX = e.touches[0].clientX }
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (dx > 60) prev()
  else if (dx < -60) next()
}
</script>

<template>
  <Teleport to="body">
    <div class="viewer-overlay" @click.self="emit('close')" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <!-- Close -->
      <button class="viewer-close" @click="emit('close')">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>

      <!-- Zone badge -->
      <div v-if="current" class="viewer-zone-badge">
        <span class="badge-dot" :style="{ background: current.zoneColor }" />
        <span class="badge-label">{{ current.zoneName }}</span>
        <span class="badge-count">{{ currentIndex + 1 }} / {{ imageList.length }}</span>
      </div>

      <!-- Nav prev -->
      <button v-if="hasPrev" class="viewer-nav viewer-nav--prev" @click="prev">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <!-- Image -->
      <div v-if="current" class="viewer-image-wrap">
        <img :src="current.el.data.src" :alt="current.el.data.alt || ''" class="viewer-image" />
        <div v-if="current.el.note" class="viewer-note">{{ current.el.note }}</div>
        <a v-if="current.el.data.sourceUrl" :href="current.el.data.sourceUrl" target="_blank" rel="noopener" class="viewer-source" @click.stop>
          {{ current.el.data.sourceUrl }}
        </a>
      </div>

      <!-- Nav next -->
      <button v-if="hasNext" class="viewer-nav viewer-nav--next" @click="next">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  z-index: 2;
}
.viewer-close:hover { color: white; background: rgba(255, 255, 255, 0.1); }

.viewer-zone-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  z-index: 2;
}
.badge-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.badge-label { font-size: 13px; font-weight: 500; color: white; }
.badge-count { font-size: 12px; color: rgba(255, 255, 255, 0.5); }

.viewer-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  z-index: 2;
}
.viewer-nav:hover { color: white; background: rgba(255, 255, 255, 0.1); }
.viewer-nav--prev { left: 16px; }
.viewer-nav--next { right: 16px; }

.viewer-image-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: calc(100vw - 120px);
  max-height: calc(100vh - 100px);
}
.viewer-image {
  max-width: 100%;
  max-height: calc(100vh - 160px);
  object-fit: contain;
  border-radius: 4px;
}
.viewer-note {
  margin-top: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  max-width: 500px;
}
.viewer-source {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-decoration: none;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.viewer-source:hover { color: rgba(255, 255, 255, 0.7); }

@media (max-width: 640px) {
  .viewer-nav { display: none; }
  .viewer-image-wrap { max-width: calc(100vw - 24px); }
}
</style>
