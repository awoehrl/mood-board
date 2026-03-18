<script setup>
import { ref, onMounted } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const props = defineProps({ zoneId: String, elementId: String })
const emit = defineEmits(['close'])
const store = useBoardStore()
const url = ref('')

onMounted(() => {
  const zone = store.zones.find(z => z.id === props.zoneId)
  const el = zone?.elements.find(e => e.id === props.elementId)
  url.value = el?.data?.sourceUrl || el?.item?.productUrl || ''
})

function save() {
  const zone = store.zones.find(z => z.id === props.zoneId)
  const el = zone?.elements.find(e => e.id === props.elementId)
  if (el) {
    store.updateElement(props.zoneId, props.elementId, {
      data: { ...el.data, sourceUrl: url.value.trim() || null },
      item: { productUrl: url.value.trim() || '', vendor: '' },
    })
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
.card { background: var(--bg); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 24px; width: min(380px, calc(100vw - 32px)); }
.heading { font-size: 15px; font-weight: 600; color: var(--text); margin: 0 0 4px; letter-spacing: -0.01em; }
.desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; }
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
