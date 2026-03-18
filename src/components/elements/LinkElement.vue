<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import { getDomain, getFaviconUrl } from '../../utils/clipboard.js'
import { formatItemPrice, getItemStatusLabel } from '../../utils/itemMetadata.js'

const props = defineProps({ element: Object, zoneId: String })
const store = useBoardStore()
const isEditing = ref(false)
const editLabel = ref('')
const faviconError = ref(false)

function startEdit() { editLabel.value = props.element.item?.title || props.element.data.label || ''; isEditing.value = true }
function saveLabel() {
  const nextTitle = editLabel.value.trim()
  store.updateElement(props.zoneId, props.element.id, {
    data: { ...props.element.data, label: nextTitle },
    item: { title: nextTitle },
  })
  isEditing.value = false
}
</script>

<template>
  <div class="link-el group">
    <div class="link-icon">
      <img v-if="getFaviconUrl(element.data.url) && !faviconError" :src="getFaviconUrl(element.data.url)" width="14" height="14" @error="faviconError = true" />
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
    </div>
    <div class="link-body">
      <input v-if="isEditing" v-model="editLabel" class="link-input" placeholder="Link title..."
        @blur="saveLabel" @keydown.enter="saveLabel" @keydown.escape="isEditing = false" @pointerdown.stop autofocus />
      <template v-else>
        <div class="link-meta">
          <span class="link-status">{{ getItemStatusLabel(element.item?.status) }}</span>
          <span v-if="formatItemPrice(element.item)" class="link-price">{{ formatItemPrice(element.item) }}</span>
        </div>
        <a :href="element.data.url" target="_blank" rel="noopener" class="link-title" @pointerdown.stop @click.stop @dblclick.stop.prevent="startEdit">
          {{ element.item?.title || element.data.label || getDomain(element.data.url) }}
        </a>
        <span class="link-domain">{{ getDomain(element.data.url) }}</span>
      </template>
    </div>
    <svg class="link-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
  </div>
</template>

<style scoped>
.link-el {
  width: 100%; height: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
  transition: background 0.1s;
}
.link-el:hover { background: var(--bg-raised); }
.link-icon {
  width: 20px; height: 20px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted);
}
.link-body { flex: 1; min-width: 0; }
.link-meta {
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
  flex-wrap: wrap;
}
.link-status,
.link-price {
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
.link-price { color: #7a4e16; }
.link-input {
  width: 100%; font-size: 13px; color: var(--text); outline: none; padding: 0;
}
.link-title {
  display: block;
  font-size: 13px;
  color: var(--text);
  text-decoration: none;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.link-title:hover { color: var(--accent); }
.link-domain {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.link-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.15s;
}
.group:hover .link-arrow { opacity: 1; }
</style>
