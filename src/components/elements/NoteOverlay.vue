<script setup>
const props = defineProps({ element: Object })
</script>

<template>
  <div v-if="element.note" class="note-dot" :title="element.note" />
</template>

<style scoped>
.note-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  z-index: 10;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fbbf24;
  border: 1.5px solid white;
  box-shadow: 0 0 3px rgba(0,0,0,0.15);
  pointer-events: none;
}

@media (pointer: coarse) {
  .note-dot { width: 10px; height: 10px; }
}
</style>
