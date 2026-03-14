<script setup>
import { useToast } from '../../composables/useToast.js'
const { toasts, dismiss } = useToast()

const borderColors = {
  info: '#3b82f6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
}
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="toast-container">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast-item"
      :style="{ borderLeftColor: borderColors[t.type] || borderColors.info }"
      @click="dismiss(t.id)"
    >
      {{ t.message }}
    </div>
  </TransitionGroup>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}
.toast-item {
  pointer-events: auto;
  cursor: pointer;
  background: var(--bg, #fff);
  color: var(--text, #1a1a1a);
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
  box-shadow: 0 0 0 1px var(--border, #e5e5e5), 0 4px 12px rgba(0,0,0,0.08);
  white-space: nowrap;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
