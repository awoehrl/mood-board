<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import { getDomain } from '../../utils/clipboard.js'

const props = defineProps({ element: Object, zoneId: String })
const store = useBoardStore()
const isEditingUrl = ref(false)
const editUrl = ref('')
const imgError = ref(false)

function startEditUrl() { editUrl.value = props.element.data.sourceUrl || ''; isEditingUrl.value = true }
function saveUrl() {
  store.updateElement(props.zoneId, props.element.id, {
    data: { ...props.element.data, sourceUrl: editUrl.value.trim() || null },
  })
  isEditingUrl.value = false
}
</script>

<template>
  <div class="img-el group">
    <img
      v-if="element.data.src && !imgError"
      :src="element.data.src" :alt="element.data.alt || ''"
      class="img-el-img"
      draggable="false"
      @dblclick.stop="startEditUrl"
      @error="imgError = true"
    />
    <div v-else class="img-el-empty">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
    </div>

    <div v-if="element.data.sourceUrl && !isEditingUrl" class="img-el-bar">
      <a :href="element.data.sourceUrl" target="_blank" rel="noopener" class="img-el-link" @pointerdown.stop @click.stop>
        {{ getDomain(element.data.sourceUrl) }}
      </a>
    </div>
    <div v-else-if="!isEditingUrl" class="img-el-bar img-el-bar--hint" @pointerdown.stop @click.stop="startEditUrl">
      Add source...
    </div>

    <div v-if="isEditingUrl" class="img-el-editor" @pointerdown.stop>
      <input v-model="editUrl" type="url" placeholder="https://..." class="img-el-input"
        @blur="saveUrl" @keydown.enter="saveUrl" @keydown.escape="isEditingUrl = false" autofocus />
    </div>
  </div>
</template>

<style scoped>
.img-el {
  width: 100%; height: 100%;
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
  background: var(--canvas-bg);
  border: 1px solid var(--border);
}
.img-el-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.img-el-empty {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted);
}
.img-el-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 20px 8px 6px;
  background: linear-gradient(transparent, rgba(0,0,0,0.45));
  font-size: 11px;
  color: rgba(255,255,255,0.7);
  opacity: 0;
  transition: opacity 0.15s;
}
.group:hover .img-el-bar { opacity: 1; }
.img-el-bar--hint { cursor: pointer; }
.img-el-link { color: inherit; text-decoration: none; }
.img-el-link:hover { color: white; }
.img-el-editor {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 6px;
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.img-el-input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
}
.img-el-input:focus { border-color: var(--accent); }
</style>
