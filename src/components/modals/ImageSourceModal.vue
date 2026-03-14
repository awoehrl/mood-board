<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const props = defineProps({ zoneId: String, elementId: String })
const emit = defineEmits(['close'])
const store = useBoardStore()
const url = ref('')

function save() {
  if (url.value.trim()) {
    const zone = store.zones.find(z => z.id === props.zoneId)
    const el = zone?.elements.find(e => e.id === props.elementId)
    if (el) store.updateElement(props.zoneId, props.elementId, { data: { ...el.data, sourceUrl: url.value.trim() } })
  }
  emit('close')
}
</script>

<template>
  <div class="backdrop" @pointerdown.self="emit('close')">
    <div class="card">
      <h2 class="heading">Image source</h2>
      <p class="desc">Where did this image come from?</p>
      <input v-model="url" type="url" placeholder="https://..." class="input"
        @keydown.enter="save" @keydown.escape="emit('close')" autofocus />
      <div class="actions">
        <button class="btn-ghost" @click="emit('close')">Skip</button>
        <button class="btn-primary" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: var(--overlay); }
.card { background: var(--bg); border-radius: 4px; box-shadow: 0 0 0 1px var(--border), 0 8px 24px rgba(0,0,0,0.12); padding: 20px; width: 380px; }
.heading { font-size: 15px; font-weight: 600; color: var(--text); margin: 0 0 4px; }
.desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 14px; }
.input { width: 100%; height: 32px; border: 1px solid var(--border); border-radius: 4px; padding: 0 10px; font-size: 13px; color: var(--text); outline: none; }
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(46,170,220,0.15); }
.actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 14px; }
.btn-ghost { height: 28px; padding: 0 10px; font-size: 13px; color: var(--text-secondary); border-radius: 4px; }
.btn-ghost:hover { background: var(--hover); }
.btn-primary { height: 28px; padding: 0 10px; font-size: 13px; color: white; background: var(--accent); border-radius: 4px; }
.btn-primary:hover { background: var(--accent-hover); }
</style>
