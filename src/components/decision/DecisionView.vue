<script setup>
import { computed, ref } from 'vue'
import { useBoardStore } from '../../stores/board.js'
import {
  supportsItemMetadata,
  getElementTitle,
  formatItemPrice,
  getItemStatuses,
  getItemStatusLabel,
} from '../../utils/itemMetadata.js'

const emit = defineEmits(['show-on-board'])
const store = useBoardStore()

const search = ref('')
const zoneFilter = ref('all')
const statusFilter = ref('all')
const vendorFilter = ref('all')
const tagFilter = ref('all')
const pricedOnly = ref(false)
const sortBy = ref('zone')

const statuses = getItemStatuses()

const rows = computed(() =>
  store.allElements
    .filter((row) => supportsItemMetadata(row.element.type))
    .map((row) => ({
      ...row,
      title: getElementTitle(row.element),
      priceLabel: formatItemPrice(row.element.item),
      vendor: row.element.item?.vendor || '',
      status: row.element.item?.status || 'idea',
      tags: row.element.item?.tags || [],
    }))
)

const zones = computed(() => [...new Set(rows.value.map((row) => row.zoneName))].sort())
const vendors = computed(() => [...new Set(rows.value.map((row) => row.vendor).filter(Boolean))].sort())
const tags = computed(() => [...new Set(rows.value.flatMap((row) => row.tags))].sort())

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const filtered = rows.value.filter((row) => {
    if (zoneFilter.value !== 'all' && row.zoneName !== zoneFilter.value) return false
    if (statusFilter.value !== 'all' && row.status !== statusFilter.value) return false
    if (vendorFilter.value !== 'all' && row.vendor !== vendorFilter.value) return false
    if (tagFilter.value !== 'all' && !row.tags.includes(tagFilter.value)) return false
    if (pricedOnly.value && row.element.item?.price == null) return false
    if (!query) return true
    const haystack = [
      row.title,
      row.zoneName,
      row.vendor,
      row.element.item?.sku || '',
      row.element.item?.finish || '',
      row.element.note || '',
      row.tags.join(' '),
    ].join(' ').toLowerCase()
    return haystack.includes(query)
  })

  const sorted = [...filtered]
  sorted.sort((a, b) => {
    if (sortBy.value === 'price-desc') return (b.element.item?.price ?? -1) - (a.element.item?.price ?? -1)
    if (sortBy.value === 'price-asc') return (a.element.item?.price ?? Number.MAX_SAFE_INTEGER) - (b.element.item?.price ?? Number.MAX_SAFE_INTEGER)
    if (sortBy.value === 'vendor') return a.vendor.localeCompare(b.vendor)
    if (sortBy.value === 'status') return a.status.localeCompare(b.status)
    if (sortBy.value === 'title') return a.title.localeCompare(b.title)
    if (a.zoneName === b.zoneName) return a.title.localeCompare(b.title)
    return a.zoneName.localeCompare(b.zoneName)
  })
  return sorted
})

const summary = computed(() => {
  return filteredRows.value.reduce((acc, row) => {
    acc.count += 1
    acc[row.status] += 1
    if (row.status === 'selected' && row.element.item?.price != null) acc.selectedBudget += row.element.item.price
    if (row.status === 'ordered' && row.element.item?.price != null) acc.orderedBudget += row.element.item.price
    if (row.status === 'installed' && row.element.item?.price != null) acc.installedBudget += row.element.item.price
    return acc
  }, {
    count: 0,
    idea: 0,
    shortlist: 0,
    selected: 0,
    ordered: 0,
    installed: 0,
    rejected: 0,
    selectedBudget: 0,
    orderedBudget: 0,
    installedBudget: 0,
  })
})

function updateStatus(row, status) {
  store.updateElement(row.zoneId, row.element.id, { item: { status } })
}

function selectRow(event, row) {
  store.selectElement(row.zoneId, row.element.id, event.shiftKey)
}

function previewStyle(row) {
  if (row.element.type === 'image') return { backgroundImage: `url(${row.element.data.src})` }
  if (row.element.type === 'color-swatch') return { background: row.element.data.color || '#d4d4d4' }
  return {}
}

function currency(value) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}
</script>

<template>
  <section class="decision-view">
    <div class="decision-header">
      <div>
        <p class="decision-eyebrow">Decision view</p>
        <h2 class="decision-title">Turn inspiration into a shortlist</h2>
      </div>
      <div class="decision-stats">
        <article class="stat-card">
          <span class="stat-label">Visible items</span>
          <strong class="stat-value">{{ summary.count }}</strong>
        </article>
        <article class="stat-card">
          <span class="stat-label">Selected budget</span>
          <strong class="stat-value">{{ currency(summary.selectedBudget) }}</strong>
        </article>
        <article class="stat-card">
          <span class="stat-label">Ordered / Installed</span>
          <strong class="stat-value">{{ summary.ordered }} / {{ summary.installed }}</strong>
        </article>
      </div>
    </div>

    <div class="decision-filters">
      <input v-model="search" class="filter-input filter-input--search" placeholder="Search titles, vendors, tags..." />
      <select v-model="zoneFilter" class="filter-input">
        <option value="all">All rooms</option>
        <option v-for="zone in zones" :key="zone" :value="zone">{{ zone }}</option>
      </select>
      <select v-model="statusFilter" class="filter-input">
        <option value="all">All statuses</option>
        <option v-for="status in statuses" :key="status" :value="status">{{ getItemStatusLabel(status) }}</option>
      </select>
      <select v-model="vendorFilter" class="filter-input">
        <option value="all">All vendors</option>
        <option v-for="vendor in vendors" :key="vendor" :value="vendor">{{ vendor }}</option>
      </select>
      <select v-model="tagFilter" class="filter-input">
        <option value="all">All tags</option>
        <option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option>
      </select>
      <select v-model="sortBy" class="filter-input">
        <option value="zone">Sort by room</option>
        <option value="title">Sort by title</option>
        <option value="vendor">Sort by vendor</option>
        <option value="status">Sort by status</option>
        <option value="price-asc">Price low to high</option>
        <option value="price-desc">Price high to low</option>
      </select>
      <label class="priced-toggle">
        <input v-model="pricedOnly" type="checkbox" />
        <span>Priced only</span>
      </label>
    </div>

    <div v-if="filteredRows.length" class="decision-table">
      <div class="decision-table-head">
        <span>Item</span>
        <span>Room</span>
        <span>Vendor</span>
        <span>Price</span>
        <span>Status</span>
        <span>Board</span>
      </div>

      <div
        v-for="row in filteredRows"
        :key="row.element.id"
        class="decision-row"
        :class="{ active: store.selectedElementIds.has(row.element.id) }"
        @click="selectRow($event, row)"
      >
        <div class="decision-item-cell">
          <div class="item-thumb" :class="row.element.type" :style="previewStyle(row)">
            <span v-if="row.element.type === 'link'" class="item-thumb-link">{{ row.vendor || 'Link' }}</span>
          </div>
          <div class="item-copy">
            <strong class="item-title">{{ row.title }}</strong>
            <span class="item-subtitle">
              {{ row.element.item?.finish || row.element.item?.dimensions || row.element.data.color || 'No finish notes yet' }}
            </span>
            <div v-if="row.tags.length" class="tag-row">
              <span v-for="tag in row.tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
          </div>
        </div>

        <span class="cell-secondary">{{ row.zoneName }}</span>
        <span class="cell-secondary">{{ row.vendor || '—' }}</span>
        <span class="cell-secondary">{{ row.priceLabel || '—' }}</span>
        <select class="row-status" :value="row.status" @click.stop @change="updateStatus(row, $event.target.value)">
          <option v-for="status in statuses" :key="status" :value="status">{{ getItemStatusLabel(status) }}</option>
        </select>
        <button class="show-btn" @click.stop="emit('show-on-board', row)">Show</button>
      </div>
    </div>

    <div v-else class="decision-empty">
      No decision items match the current filters.
    </div>
  </section>
</template>

<style scoped>
.decision-view {
  position: fixed;
  inset: 48px 0 0 0;
  z-index: 20;
  overflow: auto;
  background:
    radial-gradient(circle at top left, rgba(0, 102, 255, 0.08), transparent 30%),
    linear-gradient(180deg, #f8f7f3 0%, #f4f1ea 100%);
  padding: 24px 24px 120px;
}

.decision-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.decision-eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
}

.decision-title {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.1;
  letter-spacing: -0.04em;
  color: #2d241a;
}

.decision-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: min(520px, 100%);
}

.stat-card {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(128, 116, 96, 0.14);
  box-shadow: 0 12px 30px rgba(74, 56, 32, 0.08);
}

.stat-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #857766;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 20px;
  line-height: 1;
  color: #2d241a;
}

.decision-filters {
  margin-top: 20px;
  display: grid;
  grid-template-columns: minmax(220px, 2fr) repeat(5, minmax(120px, 1fr)) auto;
  gap: 10px;
  align-items: center;
}

.filter-input {
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(128, 116, 96, 0.14);
  background: rgba(255, 255, 255, 0.84);
  color: var(--text);
  outline: none;
}

.filter-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.priced-toggle {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(128, 116, 96, 0.14);
  font-size: 13px;
  color: var(--text-secondary);
}

.decision-table {
  margin-top: 20px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(128, 116, 96, 0.14);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px);
}

.decision-table-head,
.decision-row {
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1fr) 92px;
  gap: 12px;
  align-items: center;
  padding: 14px 18px;
}

.decision-table-head {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b7f71;
  border-bottom: 1px solid rgba(128, 116, 96, 0.14);
}

.decision-row {
  border-bottom: 1px solid rgba(128, 116, 96, 0.12);
  cursor: pointer;
}

.decision-row:last-child {
  border-bottom: none;
}

.decision-row:hover,
.decision-row.active {
  background: rgba(255, 255, 255, 0.92);
}

.decision-item-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.item-thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 16px;
  border: 1px solid rgba(128, 116, 96, 0.14);
  background: #f2ede4;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  overflow: hidden;
}

.item-thumb.link {
  background: linear-gradient(135deg, #dfe9ff, #e8f4ec);
  padding: 10px;
}

.item-thumb-link {
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
}

.item-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-title {
  font-size: 14px;
  color: #2d241a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-subtitle,
.cell-secondary {
  font-size: 12px;
  color: #6f6355;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-chip {
  height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(0, 102, 255, 0.08);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
}

.row-status {
  height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(128, 116, 96, 0.14);
  background: rgba(255, 255, 255, 0.92);
  color: var(--text);
}

.show-btn {
  height: 34px;
  border-radius: 10px;
  background: #f0ebe1;
  color: #47382b;
  font-size: 12px;
  font-weight: 600;
}

.show-btn:hover {
  background: #e8dfd0;
}

.decision-empty {
  margin-top: 20px;
  padding: 40px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(128, 116, 96, 0.14);
  color: #6f6355;
  text-align: center;
}

@media (max-width: 1080px) {
  .decision-header,
  .decision-stats {
    grid-template-columns: 1fr;
  }

  .decision-header {
    flex-direction: column;
  }

  .decision-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .decision-table-head {
    display: none;
  }

  .decision-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .cell-secondary {
    white-space: normal;
  }
}

@media (max-width: 640px) {
  .decision-view {
    inset: 88px 0 0 0;
    padding: 16px 16px 120px;
  }

  .decision-filters {
    grid-template-columns: 1fr;
  }

  .decision-stats {
    width: 100%;
  }
}
</style>
