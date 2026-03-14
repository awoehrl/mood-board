<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const emit = defineEmits(['close'])
const store = useBoardStore()
const color = ref('#2eaadc')
const label = ref('')
const presets = ['#37352f', '#eb5757', '#e07c49', '#eab308', '#0f9d58', '#2eaadc', '#6940a5', '#e03e8e', '#9b9a97', '#d9d9d7']

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
.card { background: var(--bg); border-radius: 4px; box-shadow: 0 0 0 1px var(--border), 0 8px 24px rgba(0,0,0,0.12); padding: 20px; width: 300px; }
.heading { font-size: 15px; font-weight: 600; color: var(--text); margin: 0 0 14px; }
.preview-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.preview-swatch { position: relative; }
.preview-fill { width: 40px; height: 40px; border-radius: 4px; border: 1px solid var(--border); }
.preview-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.preview-hex { font-size: 13px; font-family: ui-monospace, monospace; color: var(--text-secondary); }
.presets { display: flex; gap: 4px; margin-bottom: 14px; }
.preset { width: 20px; height: 20px; border-radius: 4px; border: 1.5px solid transparent; transition: transform 0.1s; }
.preset:hover { transform: scale(1.15); }
.preset.active { border-color: var(--text); transform: scale(1.15); }
.input { width: 100%; height: 32px; border: 1px solid var(--border); border-radius: 4px; padding: 0 10px; font-size: 13px; color: var(--text); outline: none; margin-bottom: 14px; }
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(46,170,220,0.15); }
.actions { display: flex; justify-content: flex-end; gap: 6px; }
.btn-ghost { height: 28px; padding: 0 10px; font-size: 13px; color: var(--text-secondary); border-radius: 4px; }
.btn-ghost:hover { background: var(--hover); }
.btn-primary { height: 28px; padding: 0 10px; font-size: 13px; color: white; background: var(--accent); border-radius: 4px; }
.btn-primary:hover { background: var(--accent-hover); }
</style>
