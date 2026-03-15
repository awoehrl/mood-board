<script setup>
import { useBoardStore } from '../../stores/board.js'
import ZoneCard from './ZoneCard.vue'

defineProps({ transform: String })
const emit = defineEmits(['open-viewer'])

const store = useBoardStore()
</script>

<template>
  <div
    data-canvas-layer
    class="absolute top-0 left-0 origin-top-left"
    :style="{ transform }"
  >
    <ZoneCard
      v-for="zone in store.zones"
      :key="zone.id"
      :zone="zone"
      @open-viewer="emit('open-viewer', $event)"
    />
  </div>
</template>
