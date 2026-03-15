<script setup>
import { ref, computed, watch } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const props = defineProps({
  panX: Number,
  panY: Number,
  zoom: Number,
  viewportWidth: Number,
  viewportHeight: Number,
})
const emit = defineEmits(['navigate'])

const store = useBoardStore()
const MAP_W = 140
const MAP_H = 100
const PAD = 20

const bounds = computed(() => {
  const zones = store.zones
  if (!zones.length) return { minX: 0, minY: 0, maxX: 800, maxY: 600 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const z of zones) {
    minX = Math.min(minX, z.x)
    minY = Math.min(minY, z.y)
    maxX = Math.max(maxX, z.x + z.width)
    maxY = Math.max(maxY, z.y + z.height)
  }
  // Also include viewport bounds so the viewport rect is always visible
  const vpLeft = -props.panX / props.zoom
  const vpTop = -props.panY / props.zoom
  const vpRight = vpLeft + props.viewportWidth / props.zoom
  const vpBottom = vpTop + props.viewportHeight / props.zoom
  minX = Math.min(minX, vpLeft)
  minY = Math.min(minY, vpTop)
  maxX = Math.max(maxX, vpRight)
  maxY = Math.max(maxY, vpBottom)
  return { minX: minX - PAD, minY: minY - PAD, maxX: maxX + PAD, maxY: maxY + PAD }
})

const scale = computed(() => {
  const b = bounds.value
  const w = b.maxX - b.minX
  const h = b.maxY - b.minY
  return Math.min(MAP_W / w, MAP_H / h)
})

function toMap(x, y) {
  const b = bounds.value
  const s = scale.value
  return {
    x: (x - b.minX) * s,
    y: (y - b.minY) * s,
  }
}

const zoneRects = computed(() =>
  store.zones.map(z => {
    const pos = toMap(z.x, z.y)
    return {
      id: z.id,
      x: pos.x,
      y: pos.y,
      w: z.width * scale.value,
      h: z.height * scale.value,
      color: z.color,
      active: store.selectedZoneId === z.id,
    }
  })
)

const viewRect = computed(() => {
  const vpLeft = -props.panX / props.zoom
  const vpTop = -props.panY / props.zoom
  const vpW = props.viewportWidth / props.zoom
  const vpH = props.viewportHeight / props.zoom
  const pos = toMap(vpLeft, vpTop)
  return {
    x: pos.x,
    y: pos.y,
    w: vpW * scale.value,
    h: vpH * scale.value,
  }
})

const svgSize = computed(() => {
  const b = bounds.value
  const s = scale.value
  return {
    w: (b.maxX - b.minX) * s,
    h: (b.maxY - b.minY) * s,
  }
})

function onClick(e) {
  const svg = e.currentTarget
  const rect = svg.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const b = bounds.value
  const s = scale.value
  // Convert minimap coords to world coords (center viewport there)
  const worldX = mx / s + b.minX
  const worldY = my / s + b.minY
  emit('navigate', worldX, worldY)
}
</script>

<template>
  <div class="minimap">
    <svg
      :width="svgSize.w"
      :height="svgSize.h"
      :viewBox="`0 0 ${svgSize.w} ${svgSize.h}`"
      @click="onClick"
    >
      <!-- Zone rectangles -->
      <rect
        v-for="z in zoneRects"
        :key="z.id"
        :x="z.x" :y="z.y" :width="z.w" :height="z.h"
        :fill="z.color + '22'"
        :stroke="z.color"
        :stroke-width="z.active ? 1.5 : 0.5"
        rx="2"
      />
      <!-- Viewport indicator -->
      <rect
        :x="viewRect.x" :y="viewRect.y" :width="viewRect.w" :height="viewRect.h"
        fill="rgba(0,102,255,0.06)"
        stroke="var(--accent)"
        stroke-width="1"
        rx="1"
      />
    </svg>
  </div>
</template>

<style scoped>
.minimap {
  position: fixed;
  bottom: 12px;
  left: 12px;
  z-index: 25;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 6px;
  box-shadow: var(--shadow-md);
  cursor: crosshair;
  max-width: 160px;
  max-height: 120px;
  overflow: hidden;
}
@media (max-width: 480px) {
  .minimap { display: none; }
}
</style>
