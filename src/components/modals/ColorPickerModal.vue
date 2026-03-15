<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const emit = defineEmits(['close'])
const store = useBoardStore()
const color = ref('#0066ff')
const label = ref('')
const presets = ['#1a1a1a', '#e5484d', '#e07c49', '#eab308', '#30a46c', '#0066ff', '#6e56cf', '#e93d82', '#8b8b8b', '#d4d4d4']

function save() {
  if (!store.selectedZoneId) return
  store.addElement(store.selectedZoneId, {
    type: 'color-swatch', width: 100, height: 100,
    data: { color: color.value, label: label.value || color.value },
  })
  emit('close')
}
</script>

<template>
  <div class="backdrop" @pointerdown.self="emit('close')">
    <div class="card">
      <h2 class="heading">Add color swatch</h2>

      <div class="preview-row">
        <div class="preview-swatch">
          <div class="preview-fill" :style="{ background: color }" />
          <input type="color" v-model="color" class="preview-input" />
        </div>
        <span class="preview-hex">{{ color }}</span>
      </div>

      <div class="presets">
        <button v-for="c in presets" :key="c" class="preset" :class="{ active: color === c }"
          :style="{ background: c }" @click="color = c" />
      </div>

      <input v-model="label" placeholder="Label (e.g., Wall paint)" class="input" @keydown.enter="save" />

      <div class="actions">
        <button class="btn-ghost" @click="emit('close')">Cancel</button>
        <button class="btn-primary" @click="save">Add</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: var(--overlay); }
.card { background: var(--bg); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 24px; width: min(300px, calc(100vw - 32px)); }
.heading { font-size: 15px; font-weight: 600; color: var(--text); margin: 0 0 16px; letter-spacing: -0.01em; }
.preview-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.preview-swatch { position: relative; }
.preview-fill { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border); }
.preview-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.preview-hex { font-size: 13px; font-family: ui-monospace, "SF Mono", monospace; color: var(--text-secondary); }
.presets { display: flex; gap: 6px; margin-bottom: 16px; }
.preset {
  width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent;
  transition: transform 0.1s;
}
.preset:hover { transform: scale(1.15); }
.preset.active { border-color: var(--text); transform: scale(1.15); }
.input {
  width: 100%; height: 36px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 0 10px; font-size: 13px; color: var(--text); outline: none; margin-bottom: 16px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn-ghost { height: 32px; padding: 0 12px; font-size: 13px; font-weight: 500; color: var(--text-secondary); border-radius: var(--radius-sm); transition: background 0.1s; }
.btn-ghost:hover { background: var(--hover); }
.btn-primary { height: 32px; padding: 0 14px; font-size: 13px; font-weight: 500; color: white; background: var(--accent); border-radius: var(--radius-sm); transition: background 0.1s; }
.btn-primary:hover { background: var(--accent-hover); }
</style>
