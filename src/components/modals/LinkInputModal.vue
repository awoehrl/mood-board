<script setup>
import { ref } from 'vue'

const emit = defineEmits(['submit', 'close'])
const url = ref('')

function submit() {
  if (url.value.trim()) emit('submit', url.value.trim())
  emit('close')
}
</script>

<template>
  <div class="backdrop" @pointerdown.self="emit('close')">
    <div class="card">
      <h2 class="heading">Add link</h2>
      <input v-model="url" type="url" placeholder="https://..." class="input"
        @keydown.enter="submit" @keydown.escape="emit('close')" autofocus />
      <div class="actions">
        <button class="btn-ghost" @click="emit('close')">Cancel</button>
        <button class="btn-primary" @click="submit">Add</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: var(--overlay); }
.card { background: var(--bg); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 24px; width: min(380px, calc(100vw - 32px)); }
.heading { font-size: 15px; font-weight: 600; color: var(--text); margin: 0 0 16px; letter-spacing: -0.01em; }
.input {
  width: 100%; height: 36px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 0 10px; font-size: 13px; color: var(--text); outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.btn-ghost { height: 32px; padding: 0 12px; font-size: 13px; font-weight: 500; color: var(--text-secondary); border-radius: var(--radius-sm); transition: background 0.1s; }
.btn-ghost:hover { background: var(--hover); }
.btn-primary { height: 32px; padding: 0 14px; font-size: 13px; font-weight: 500; color: white; background: var(--accent); border-radius: var(--radius-sm); transition: background 0.1s; }
.btn-primary:hover { background: var(--accent-hover); }
</style>
