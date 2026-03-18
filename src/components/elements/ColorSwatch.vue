<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import { formatItemPrice, getItemStatusLabel } from '../../utils/itemMetadata.js'

const props = defineProps({ element: Object, zoneId: String })
const store = useBoardStore()
const isEditingLabel = ref(false)
const editLabel = ref('')

function startEditLabel() { editLabel.value = props.element.item?.title || props.element.data.label || ''; isEditingLabel.value = true }
function saveLabel() {
  const nextTitle = editLabel.value.trim()
  store.updateElement(props.zoneId, props.element.id, {
    data: { ...props.element.data, label: nextTitle },
    item: { title: nextTitle },
  })
  isEditingLabel.value = false
}
</script>

<template>
  <div class="swatch-el">
    <div class="swatch-color" :style="{ background: element.data.color || '#ccc' }" />
    <div class="swatch-info">
      <div class="swatch-copy">
        <div class="swatch-meta">
          <span class="swatch-status">{{ getItemStatusLabel(element.item?.status) }}</span>
          <span v-if="formatItemPrice(element.item)" class="swatch-price">{{ formatItemPrice(element.item) }}</span>
        </div>
        <span class="swatch-hex">{{ element.data.color }}</span>
        <input v-if="isEditingLabel" v-model="editLabel" class="swatch-label-input" placeholder="Label..."
          @blur="saveLabel" @keydown.enter="saveLabel" @keydown.escape="isEditingLabel = false" @pointerdown.stop autofocus />
        <span v-else class="swatch-label" @dblclick.stop="startEditLabel">{{ element.item?.title || element.data.label || 'Untitled' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.swatch-el {
  width: 100%; height: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.swatch-color { flex: 1; min-height: 0; }
.swatch-info {
  padding: 6px 10px;
  display: flex;
  border-top: 1px solid var(--border);
}
.swatch-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.swatch-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.swatch-status,
.swatch-price {
  height: 18px;
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--bg-raised);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
}
.swatch-price { color: #7a4e16; }
.swatch-hex {
  font-size: 10px;
  font-family: ui-monospace, "SF Mono", monospace;
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
