<script setup>
import { computed } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import {
  supportsItemMetadata,
  getItemStatuses,
  getItemStatusLabel,
  formatItemPrice,
  formatTagsInput,
  parseTagsInput,
} from '../../utils/itemMetadata.js'

const store = useBoardStore()
const statuses = getItemStatuses()

const zone = computed(() => store.selectedZone)
const element = computed(() => store.selectedElement)
const item = computed(() => element.value?.item || null)
const isVisible = computed(() => !!element.value && supportsItemMetadata(element.value.type))

function updateItem(field, value) {
  if (!zone.value || !element.value) return
  const updates = { item: { [field]: value } }
  if (field === 'title') {
    if (element.value.type === 'link') updates.data = { label: value }
    if (element.value.type === 'image') updates.data = { alt: value }
    if (element.value.type === 'color-swatch') updates.data = { label: value }
  }
  if (field === 'productUrl') {
    if (element.value.type === 'link') updates.data = { url: value }
    if (element.value.type === 'image') updates.data = { sourceUrl: value }
  }
  store.updateElement(zone.value.id, element.value.id, updates)
}

function updateNote(value) {
  if (!zone.value || !element.value) return
  store.updateElement(zone.value.id, element.value.id, { note: value || null })
}

function renderPreviewStyle() {
  if (!element.value) return {}
  if (element.value.type === 'color-swatch') {
    return { background: element.value.data.color || '#d4d4d4' }
  }
  if (element.value.type === 'image') {
    return { backgroundImage: `url(${element.value.data.src})` }
  }
  return {}
}
</script>

<template>
  <aside v-if="isVisible" class="inspector">
    <div class="inspector-header">
      <div>
        <p class="inspector-eyebrow">{{ zone?.name }}</p>
        <h2 class="inspector-title">{{ item?.title || 'Item details' }}</h2>
      </div>
      <button class="inspector-close" @click="store.clearSelection()" title="Close inspector">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="inspector-preview" :class="element.type" :style="renderPreviewStyle()">
      <div v-if="element.type === 'image'" class="inspector-preview-scrim" />
      <span v-if="element.type === 'link'" class="inspector-preview-link">{{ item?.vendor || 'Link' }}</span>
      <span v-if="element.type === 'color-swatch'" class="inspector-preview-hex">{{ element.data.color }}</span>
      <div class="inspector-preview-meta">
        <span class="inspector-status-pill">{{ getItemStatusLabel(item?.status) }}</span>
        <span v-if="formatItemPrice(item)" class="inspector-price-pill">{{ formatItemPrice(item) }}</span>
      </div>
    </div>

    <div class="inspector-status-grid">
      <button
        v-for="status in statuses"
        :key="status"
        class="status-chip"
        :class="{ active: item?.status === status }"
        @click="updateItem('status', status)"
      >
        {{ getItemStatusLabel(status) }}
      </button>
    </div>

    <div class="inspector-form">
      <label class="field">
        <span class="field-label">Title</span>
        <input class="field-input" :value="item?.title || ''" @input="updateItem('title', $event.target.value)" />
      </label>

      <label class="field">
        <span class="field-label">Vendor</span>
        <input class="field-input" :value="item?.vendor || ''" @input="updateItem('vendor', $event.target.value)" />
      </label>

      <label class="field field--full">
        <span class="field-label">Product URL</span>
        <input class="field-input" type="url" :value="item?.productUrl || ''" @input="updateItem('productUrl', $event.target.value)" />
      </label>

      <label class="field">
        <span class="field-label">Price</span>
        <input class="field-input" type="number" step="0.01" :value="item?.price ?? ''" @change="updateItem('price', $event.target.value)" />
      </label>

      <label class="field">
        <span class="field-label">Currency</span>
        <input class="field-input" maxlength="3" :value="item?.currency || 'EUR'" @input="updateItem('currency', $event.target.value)" />
      </label>

      <label class="field">
        <span class="field-label">SKU</span>
        <input class="field-input" :value="item?.sku || ''" @input="updateItem('sku', $event.target.value)" />
      </label>

      <label class="field">
        <span class="field-label">Dimensions</span>
        <input class="field-input" :value="item?.dimensions || ''" @input="updateItem('dimensions', $event.target.value)" />
      </label>

      <label class="field">
        <span class="field-label">Finish</span>
        <input class="field-input" :value="item?.finish || ''" @input="updateItem('finish', $event.target.value)" />
      </label>

      <label class="field field--full">
        <span class="field-label">Tags</span>
        <input class="field-input" :value="formatTagsInput(item?.tags)" @change="updateItem('tags', parseTagsInput($event.target.value))" placeholder="kitchen, brass, sample" />
      </label>

      <label class="field field--full">
        <span class="field-label">Notes</span>
        <textarea class="field-textarea" :value="element.note || ''" @input="updateNote($event.target.value)" placeholder="Why this works, tradeoffs, install notes..." />
      </label>
    </div>
  </aside>
</template>

<style scoped>
.inspector {
  position: fixed;
  top: 60px;
  right: 16px;
  bottom: 16px;
  width: min(360px, calc(100vw - 32px));
  z-index: 35;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px);
  overflow: auto;
}

.inspector-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.inspector-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.inspector-title {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
  color: var(--text);
}

.inspector-close {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.inspector-close:hover {
  background: var(--hover);
  color: var(--text);
}

.inspector-preview {
  position: relative;
  min-height: 136px;
  border-radius: 14px;
  border: 1px solid var(--border);
  overflow: hidden;
  background: linear-gradient(135deg, #f7f2eb, #efe9df);
  background-size: cover;
  background-position: center;
  padding: 14px;
  display: flex;
  align-items: flex-end;
}

.inspector-preview.link {
  background: linear-gradient(135deg, #eaf1ff, #eef8f4);
}

.inspector-preview-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.35));
}

.inspector-preview-link,
.inspector-preview-hex {
  position: relative;
  z-index: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  background: rgba(255, 255, 255, 0.75);
  padding: 6px 10px;
  border-radius: 999px;
}

.inspector-preview-meta {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  z-index: 1;
}

.inspector-status-pill,
.inspector-price-pill {
  height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
}

.inspector-status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.status-chip {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.status-chip.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.inspector-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field--full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.field-input,
.field-textarea {
  width: 100%;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  font-size: 13px;
  color: var(--text);
  outline: none;
}

.field-input:focus,
.field-textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.field-textarea {
  min-height: 120px;
  padding: 10px 12px;
  resize: vertical;
}

@media (max-width: 900px) {
  .inspector {
    top: auto;
    left: 12px;
    right: 12px;
    bottom: 12px;
    width: auto;
    max-height: min(72vh, 620px);
  }
}

@media (max-width: 640px) {
  .inspector-status-grid,
  .inspector-form {
    grid-template-columns: 1fr;
  }
}
</style>
