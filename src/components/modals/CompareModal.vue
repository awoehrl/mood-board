<script setup>
import { useBoardStore } from '../../stores/board.js'
import { formatItemPrice, getItemStatusLabel } from '../../utils/itemMetadata.js'

defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close'])
const store = useBoardStore()

function setStatus(item, status) {
  store.updateElement(item.zoneId, item.element.id, { item: { status } })
}
</script>

<template>
  <div class="compare-backdrop" @pointerdown.self="emit('close')">
    <div class="compare-card">
      <div class="compare-header">
        <div>
          <p class="compare-eyebrow">Compare</p>
          <h2 class="compare-title">Side-by-side decision pass</h2>
        </div>
        <button class="compare-close" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="compare-columns">
        <article v-for="item in items" :key="item.element.id" class="compare-item">
          <div class="compare-preview" :class="item.element.type">
            <img v-if="item.element.type === 'image'" :src="item.element.data.src" :alt="item.element.item?.title || ''" />
            <div v-else-if="item.element.type === 'color-swatch'" class="compare-swatch" :style="{ background: item.element.data.color || '#d4d4d4' }" />
            <div v-else class="compare-link-pill">{{ item.element.item?.vendor || 'Link' }}</div>

            <div class="compare-meta-pills">
              <span class="compare-pill">{{ getItemStatusLabel(item.element.item?.status) }}</span>
              <span v-if="formatItemPrice(item.element.item)" class="compare-pill compare-pill--price">{{ formatItemPrice(item.element.item) }}</span>
            </div>
          </div>

          <div class="compare-copy">
            <span class="compare-zone">{{ item.zoneName }}</span>
            <h3 class="compare-item-title">{{ item.element.item?.title }}</h3>
            <dl class="compare-specs">
              <div class="spec-row">
                <dt>Vendor</dt>
                <dd>{{ item.element.item?.vendor || '—' }}</dd>
              </div>
              <div class="spec-row">
                <dt>Finish</dt>
                <dd>{{ item.element.item?.finish || '—' }}</dd>
              </div>
              <div class="spec-row">
                <dt>Dimensions</dt>
                <dd>{{ item.element.item?.dimensions || '—' }}</dd>
              </div>
              <div class="spec-row">
                <dt>SKU</dt>
                <dd>{{ item.element.item?.sku || '—' }}</dd>
              </div>
              <div class="spec-row">
                <dt>Tags</dt>
                <dd>{{ item.element.item?.tags?.join(', ') || '—' }}</dd>
              </div>
            </dl>

            <p class="compare-note">{{ item.element.note || 'No item note yet.' }}</p>
          </div>

          <div class="compare-actions">
            <button class="action-btn" @click="setStatus(item, 'shortlist')">Shortlist</button>
            <button class="action-btn action-btn--primary" @click="setStatus(item, 'selected')">Mark selected</button>
            <button class="action-btn action-btn--ghost" @click="setStatus(item, 'rejected')">Reject</button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(17, 15, 11, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.compare-card {
  width: min(1180px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  border-radius: 24px;
  background: linear-gradient(180deg, #faf7f1 0%, #f5f0e7 100%);
  box-shadow: 0 28px 80px rgba(24, 18, 11, 0.28);
  padding: 24px;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.compare-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b7f71;
  font-weight: 700;
}

.compare-title {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.04em;
  color: #2d241a;
}

.compare-close {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  color: var(--text-secondary);
}

.compare-close:hover {
  background: rgba(255, 255, 255, 0.65);
}

.compare-columns {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.compare-item {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(128, 116, 96, 0.14);
}

.compare-preview {
  position: relative;
  min-height: 170px;
  border-radius: 16px;
  overflow: hidden;
  background: #ece6dc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compare-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.compare-swatch {
  width: 100%;
  height: 100%;
}

.compare-link-pill {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.compare-meta-pills {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.compare-pill {
  height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  font-size: 11px;
  font-weight: 700;
  color: #2d241a;
}

.compare-pill--price {
  color: #6a4f2b;
}

.compare-copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compare-zone {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b7f71;
}

.compare-item-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.15;
  color: #2d241a;
}

.compare-specs {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}

.spec-row dt {
  color: #8b7f71;
}

.spec-row dd {
  margin: 0;
  color: #47382b;
  text-align: right;
}

.compare-note {
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  background: #f4eee4;
  font-size: 12px;
  line-height: 1.5;
  color: #5a4b3d;
  white-space: pre-wrap;
}

.compare-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.action-btn {
  flex: 1;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  background: #efe6d7;
  color: #47382b;
  font-size: 12px;
  font-weight: 700;
}

.action-btn--primary {
  background: var(--accent);
  color: white;
}

.action-btn--ghost {
  background: #f7f3eb;
}

@media (max-width: 640px) {
  .compare-backdrop {
    padding: 12px;
  }

  .compare-card {
    width: calc(100vw - 24px);
    padding: 18px;
  }

  .compare-title {
    font-size: 22px;
  }

  .compare-actions {
    flex-direction: column;
  }
}
</style>
