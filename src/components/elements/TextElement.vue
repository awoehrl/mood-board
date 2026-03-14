<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const props = defineProps({ element: Object, zoneId: String })
const store = useBoardStore()
const isEditing = ref(false)
const editContent = ref('')

function startEdit() { editContent.value = props.element.data.content || ''; isEditing.value = true }
function saveContent() {
  store.updateElement(props.zoneId, props.element.id, { data: { ...props.element.data, content: editContent.value } })
  isEditing.value = false
}
</script>

<template>
  <div class="text-el">
    <textarea
      v-if="isEditing" v-model="editContent"
      class="text-el-edit"
      @blur="saveContent" @keydown.escape="saveContent" @pointerdown.stop autofocus
    />
    <div v-else class="text-el-display" :class="{ empty: !element.data.content }" @dblclick.stop="startEdit">
      {{ element.data.content || 'Type something...' }}
    </div>
  </div>
</template>

<style scoped>
.text-el {
  width: 100%; height: 100%;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--bg);
  padding: 8px 10px;
}
.text-el-edit {
  width: 100%; height: 100%;
  font-size: 13px; line-height: 1.6;
  color: var(--text);
  resize: none; outline: none; padding: 0;
}
.text-el-display {
  width: 100%; height: 100%;
  font-size: 13px; line-height: 1.6;
  color: var(--text);
  overflow: auto;
  cursor: text;
  white-space: pre-wrap;
  word-break: break-word;
}
.text-el-display.empty { color: var(--text-muted); }
</style>
