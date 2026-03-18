<script setup>
const props = defineProps({ element: Object })
</script>

<template>
  <div v-if="element.note" class="note-indicator" :title="element.note">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  </div>
</template>

<style scoped>
.note-indicator {
  position: absolute;
  bottom: 4px;
  left: 4px;
  z-index: 10;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fbbf24;
  filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
  pointer-events: none;
}

@media (pointer: coarse) {
  .note-indicator { width: 22px; height: 22px; }
  .note-indicator svg { width: 14px; height: 14px; }
}
</style>
