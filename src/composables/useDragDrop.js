import { useBoardStore } from '../stores/board.js'
import { screenToCanvas, hitTestZones } from '../utils/geometry.js'
import { extractSourceUrl, isUrl, isImageUrl, compressImage, loadImageAsBase64 } from '../utils/clipboard.js'

export function useDragDrop(canvasState, showImageSourceModal) {
  const store = useBoardStore()

  async function handleFileDrop(e, viewportRect) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || [])
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    const canvasPos = screenToCanvas(
      e.clientX - viewportRect.left,
      e.clientY - viewportRect.top,
      { x: canvasState.panX.value, y: canvasState.panY.value },
      canvasState.zoom.value
    )

    const targetZone = hitTestZones(canvasPos.x, canvasPos.y, store.zones)
    if (!targetZone) return

    for (const file of imageFiles) {
      const dataUrl = await readFileAsDataUrl(file)
      const compressed = await compressImage(dataUrl)
      store.addElement(targetZone.id, {
        type: 'image',
        x: canvasPos.x - targetZone.x,
        y: canvasPos.y - targetZone.y,
        width: 200,
        height: 150,
        data: { src: compressed, sourceUrl: null, alt: file.name },
      })
    }
  }

  async function handlePaste(e, viewportRect) {
    const items = Array.from(e.clipboardData?.items || [])

    // Check if user is in an editable field
    const active = document.activeElement
    if (
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable)
    ) {
      return
    }

    const imageItem = items.find((i) => i.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const blob = imageItem.getAsFile()
      const dataUrl = await readFileAsDataUrl(blob)
      const compressed = await compressImage(dataUrl)

      const htmlItem = items.find((i) => i.type === 'text/html')
      let sourceUrl = null
      if (htmlItem) {
        const html = await getAsString(htmlItem)
        sourceUrl = extractSourceUrl(html)
      }

      const targetZone = store.selectedZone || store.zones[0]
      if (!targetZone) return

      const el = store.addElement(targetZone.id, {
        type: 'image',
        width: 200,
        height: 150,
        data: { src: compressed, sourceUrl, alt: 'Pasted image' },
      })

      if (!sourceUrl && el && showImageSourceModal) {
        showImageSourceModal(targetZone.id, el.id)
      }
      return
    }

    // Text paste
    const textItem = items.find((i) => i.type === 'text/plain')
    if (textItem) {
      const text = await getAsString(textItem)
      if (!text.trim()) return

      e.preventDefault()
      const targetZone = store.selectedZone || store.zones[0]
      if (!targetZone) return

      const trimmed = text.trim()

      // Image URL → create image element
      if (isImageUrl(trimmed)) {
        const base64 = await loadImageAsBase64(trimmed)
        store.addElement(targetZone.id, {
          type: 'image',
          width: 220,
          height: 160,
          data: {
            src: base64 || trimmed,
            sourceUrl: trimmed,
            alt: 'Image from URL',
          },
        })
        return
      }

      // Regular URL → create link with preview
      if (isUrl(trimmed)) {
        store.addElement(targetZone.id, {
          type: 'link',
          width: 240,
          height: 64,
          data: {
            url: trimmed,
            label: '',
            favicon: null,
            domain: null,
          },
        })
        return
      }

      // Plain text
      store.addElement(targetZone.id, {
        type: 'text',
        width: 200,
        height: 80,
        data: { content: text },
      })
    }
  }

  return { handleFileDrop, handlePaste }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getAsString(item) {
  return new Promise((resolve) => {
    item.getAsString(resolve)
  })
}
