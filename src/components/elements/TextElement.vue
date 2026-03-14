<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const props = defineProps({ element: Object, zoneId: String })
const store = useBoardStore()
const isEditing = ref(false)
const editContent = ref('')
const textarea = ref(null)

function startEdit() {
  editContent.value = props.element.data.content || ''
  isEditing.value = true
  nextTick(() => autoGrow())
}

function saveContent() {
  store.updateElement(props.zoneId, props.element.id, { data: { ...props.element.data, content: editContent.value } })
  isEditing.value = false
}

function autoGrow() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  const newHeight = el.scrollHeight
  el.style.height = newHeight + 'px'
  // Update parent element height if textarea grew beyond current
  const minH = newHeight + 18 // padding
  if (minH > props.element.height) {
    store.updateElement(props.zoneId, props.element.id, { height: minH })
  }
}

// Scroll textarea into view when virtual keyboard appears
let vvHandler = null
onMounted(() => {
  if (window.visualViewport) {
    vvHandler = () => {
      if (isEditing.value && textarea.value) {
        textarea.value.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
    window.visualViewport.addEventListener('resize', vvHandler)
  }
})
onUnmounted(() => {
  if (vvHandler && window.visualViewport) {
    window.visualViewport.removeEventListener('resize', vvHandler)
  }
})
</script>

<template>
  <div class="text-el">
    <textarea
      v-if="isEditing" ref="textarea" v-model="editContent"
      class="text-el-edit"
      @blur="saveContent" @keydown.escape="saveContent" @input="autoGrow" @pointerdown.stop autofocus
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
  width: 100%;
  min-height: 100%;
  font-size: 13px; line-height: 1.6;
  color: var(--text);
  resize: none; outline: none; padding: 0;
  overflow: hidden;
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
