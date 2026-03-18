const ITEM_STATUSES = ['idea', 'shortlist', 'selected', 'ordered', 'installed', 'rejected']

const ITEM_STATUS_LABELS = {
  idea: 'Idea',
  shortlist: 'Shortlist',
  selected: 'Selected',
  ordered: 'Ordered',
  installed: 'Installed',
  rejected: 'Rejected',
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanUrl(value) {
  const text = cleanText(value)
  if (!text) return ''
  try {
    const url = new URL(text)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
  } catch {
    return ''
  }
  return ''
}

function normalizePrice(value) {
  if (value === '' || value == null) return null
  const next = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(next) ? next : null
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => cleanText(tag))
      .filter(Boolean)
      .filter((tag, index, items) => items.indexOf(tag) === index)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => cleanText(tag))
      .filter(Boolean)
      .filter((tag, index, items) => items.indexOf(tag) === index)
  }
  return []
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function inferTitle(type, data = {}) {
  if (type === 'image') return cleanText(data.alt) || 'Untitled image'
  if (type === 'link') return cleanText(data.label) || getDomain(data.url) || 'Untitled link'
  if (type === 'color-swatch') return cleanText(data.label) || cleanText(data.color) || 'Color swatch'
  return ''
}

function inferProductUrl(type, data = {}) {
  if (type === 'link') return cleanUrl(data.url)
  if (type === 'image') return cleanUrl(data.sourceUrl)
  return ''
}

function inferVendor(type, data = {}, item = {}) {
  return cleanText(item.vendor) || getDomain(item.productUrl || inferProductUrl(type, data))
}

export function supportsItemMetadata(type) {
  return type === 'image' || type === 'link' || type === 'color-swatch'
}

export function normalizeItem(type, data = {}, item = {}) {
  if (!supportsItemMetadata(type)) return null
  const source = item && typeof item === 'object' ? item : {}
  const price = normalizePrice(source.price)
  const currency = cleanText(source.currency).toUpperCase() || 'EUR'
  const productUrl = cleanUrl(source.productUrl) || inferProductUrl(type, data)
  const status = ITEM_STATUSES.includes(source.status) ? source.status : 'idea'
  const title = cleanText(source.title) || inferTitle(type, data)
  return {
    title,
    vendor: inferVendor(type, data, { ...source, productUrl }),
    productUrl,
    price,
    currency,
    sku: cleanText(source.sku),
    dimensions: cleanText(source.dimensions),
    finish: cleanText(source.finish),
    tags: normalizeTags(source.tags),
    status,
  }
}

export function ensureElementMetadata(element) {
  if (!element || typeof element !== 'object') return element
  if (!supportsItemMetadata(element.type)) return { ...element, item: null }
  return {
    ...element,
    item: normalizeItem(element.type, element.data, element.item),
  }
}

export function getItemStatusLabel(status) {
  return ITEM_STATUS_LABELS[status] || ITEM_STATUS_LABELS.idea
}

export function getItemStatuses() {
  return [...ITEM_STATUSES]
}

export function getElementTitle(element) {
  if (!element) return ''
  if (supportsItemMetadata(element.type)) {
    return normalizeItem(element.type, element.data, element.item).title
  }
  if (element.type === 'text') return cleanText(element.data?.content) || 'Text note'
  return 'Untitled'
}

export function formatItemPrice(item) {
  if (!item || item.price == null) return ''
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: item.currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(item.price)
  } catch {
    return `${item.price} ${item.currency || ''}`.trim()
  }
}

export function formatTagsInput(tags) {
  return normalizeTags(tags).join(', ')
}

export function parseTagsInput(value) {
  return normalizeTags(value)
}
