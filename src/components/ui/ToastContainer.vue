<script setup>
import { useToast } from '../../composables/useToast.js'
const { toasts, dismiss } = useToast()

const borderColors = {
  info: '#0066ff',
  success: '#30a46c',
  error: '#e5484d',
  warning: '#e07c49',
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
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border-left: 3px solid;
  box-shadow: var(--shadow-lg);
  white-space: nowrap;
}
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
