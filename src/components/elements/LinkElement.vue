<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import { getDomain, getFaviconUrl } from '../../utils/clipboard.js'

const props = defineProps({ element: Object, zoneId: String })
const store = useBoardStore()
const isEditing = ref(false)
const editLabel = ref('')
const faviconError = ref(false)

function startEdit() { editLabel.value = props.element.data.label || ''; isEditing.value = true }
function saveLabel() {
  store.updateElement(props.zoneId, props.element.id, { data: { ...props.element.data, label: editLabel.value.trim() } })
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
        <a :href="element.data.url" target="_blank" rel="noopener" class="link-title" @pointerdown.stop @click.stop @dblclick.stop.prevent="startEdit">
          {{ element.data.label || getDomain(element.data.url) }}
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
  border-radius: 3px;
  background: var(--bg);
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 8px;
}
.link-el:hover { background: var(--canvas-bg); }
.link-icon {
  width: 20px; height: 20px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted);
}
.link-body { flex: 1; min-width: 0; }
.link-input {
  width: 100%; font-size: 13px; color: var(--text); outline: none; padding: 0;
}
.link-title {
  display: block;
  font-size: 13px;
  color: var(--text);
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.link-title:hover { text-decoration-color: var(--text-secondary); }
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
