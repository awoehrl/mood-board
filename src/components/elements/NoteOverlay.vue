<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'

const props = defineProps({ element: Object, zoneId: String })
const store = useBoardStore()
const showNote = ref(false)
const isEditing = ref(false)
const editNote = ref('')

function toggleNote() {
  if (!props.element.note && !isEditing.value) {
    editNote.value = ''; isEditing.value = true; showNote.value = true
  } else {
    showNote.value = !showNote.value
  }
}
function startEdit() { editNote.value = props.element.note || ''; isEditing.value = true }
function saveNote() {
  store.updateElement(props.zoneId, props.element.id, { note: editNote.value || null })
  isEditing.value = false
  if (!editNote.value) showNote.value = false
}
</script>

<template>
  <div class="note-root">
    <button
      class="note-btn"
      :class="{ 'has-note': element.note, 'no-note': !element.note }"
      @pointerdown.stop @click.stop="toggleNote"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    </button>

    <div v-if="showNote" class="note-popover" @pointerdown.stop>
      <textarea v-if="isEditing" v-model="editNote" class="note-textarea" placeholder="Write a note..."
        @blur="saveNote" @keydown.escape="saveNote" autofocus />
      <template v-else>
        <p class="note-text">{{ element.note }}</p>
        <button class="note-edit-btn" @click="startEdit">Edit</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.note-root { position: absolute; top: -4px; right: -4px; z-index: 10; }

.note-btn {
  width: 18px; height: 18px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.15s;
}
.note-btn.has-note {
  background: #f6d365;
  color: #5c4813;
  opacity: 1;
}
.note-btn.no-note {
  background: var(--bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
  opacity: 0;
}
.group:hover .note-btn.no-note { opacity: 1; }
.note-btn.no-note:hover { background: var(--canvas-bg); }

.note-popover {
  position: absolute;
  right: 0; top: 22px;
  width: 200px;
  padding: 8px;
  background: var(--bg);
  border-radius: 4px;
  box-shadow: 0 0 0 1px var(--border), 0 3px 6px rgba(0,0,0,0.08), 0 9px 24px rgba(0,0,0,0.06);
}
.note-textarea {
  width: 100%; height: 64px;
  font-size: 12px; line-height: 1.5;
  color: var(--text);
  resize: none; outline: none; padding: 4px;
  border: 1px solid var(--border);
  border-radius: 3px;
}
.note-textarea:focus { border-color: var(--accent); }
.note-text {
  font-size: 12px; line-height: 1.5;
  color: var(--text);
  white-space: pre-wrap;
  margin: 0;
}
.note-edit-btn {
  font-size: 11px;
  color: var(--accent);
  margin-top: 4px;
}
.note-edit-btn:hover { text-decoration: underline; }
</style>
