export const ZONE_PAD = 12
export const ZONE_MAX_WIDTH = 700
export const ZONE_HEADER = 36
export const CELL_W = 200
export const CELL_H = 150
export const ZONE_GAP = 60
export const NOTES_CARD_PADDING = 20 // 6px top + 6px bottom padding + 8px margin-bottom

// Estimate rendered height of notes card based on text content
export function estimateNotesHeight(description) {
  if (!description?.trim()) return 0
  const text = description.trim()
  const lines = text.split('\n').length
  // Headings (#) render taller, count them for extra height
  const headings = (text.match(/^#{1,4}\s/gm) || []).length
  const lineHeight = 18 // ~11px font * 1.6 line-height
  return NOTES_CARD_PADDING + Math.max(lines, 1) * lineHeight + headings * 8 + 20 // +20 buffer
}
