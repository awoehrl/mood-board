<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const props = defineProps({ element: Object, zoneId: String })
const store = useBoardStore()
const isEditingLabel = ref(false)
const editLabel = ref('')

function startEditLabel() { editLabel.value = props.element.data.label || ''; isEditingLabel.value = true }
function saveLabel() {
  store.updateElement(props.zoneId, props.element.id, { data: { ...props.element.data, label: editLabel.value } })
  isEditingLabel.value = false
}
</script>

<template>
  <div class="swatch-el">
    <div class="swatch-color" :style="{ background: element.data.color || '#ccc' }" />
    <div class="swatch-info">
      <span class="swatch-hex">{{ element.data.color }}</span>
      <input v-if="isEditingLabel" v-model="editLabel" class="swatch-label-input" placeholder="Label..."
        @blur="saveLabel" @keydown.enter="saveLabel" @keydown.escape="isEditingLabel = false" @pointerdown.stop autofocus />
      <span v-else class="swatch-label" @dblclick.stop="startEditLabel">{{ element.data.label || 'Untitled' }}</span>
    </div>
  </div>
</template>

<style scoped>
.swatch-el {
  width: 100%; height: 100%;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.swatch-color { flex: 1; min-height: 0; }
.swatch-info {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-top: 1px solid var(--border);
}
.swatch-hex {
  font-size: 10px;
  font-family: ui-monospace, monospace;
  color: var(--text-muted);
  text-transform: uppercase;
}
.swatch-label {
  flex: 1;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.swatch-label-input {
  flex: 1;
  font-size: 11px;
  color: var(--text);
  outline: none;
  padding: 0;
}
</style>
