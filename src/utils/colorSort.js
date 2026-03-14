// Extract dominant color from an image element via canvas sampling
export function getDominantColor(imgSrc) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 50 // sample at small size for speed
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, size, size)

      try {
        const data = ctx.getImageData(0, 0, size, size).data
        let rTotal = 0, gTotal = 0, bTotal = 0, count = 0

        // Sample every 4th pixel
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 128) continue // skip transparent
          // Skip near-white and near-black (they're not interesting colors)
          if (r > 240 && g > 240 && b > 240) continue
          if (r < 15 && g < 15 && b < 15) continue
          rTotal += r; gTotal += g; bTotal += b; count++
        }

        if (count > 0) {
          resolve({ r: rTotal / count, g: gTotal / count, b: bTotal / count })
        } else {
          resolve({ r: 200, g: 200, b: 200 }) // neutral fallback
        }
      } catch {
        resolve({ r: 200, g: 200, b: 200 }) // CORS fallback
      }
    }
    img.onerror = () => resolve({ r: 200, g: 200, b: 200 })
    img.src = imgSrc
  })
}

// Parse hex color to RGB
export function hexToRgb(hex) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 200, g: 200, b: 200 }
}

// RGB to HSL hue (0-360)
export function rgbToHue(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const sat = max - min

  if (sat === 0) return { h: 0, s: 0, l } // achromatic

  let h
  if (max === r) h = ((g - b) / sat) % 6
  else if (max === g) h = (b - r) / sat + 2
  else h = (r - g) / sat + 4

  h = Math.round(h * 60)
  if (h < 0) h += 360

  return { h, s: sat / (1 - Math.abs(2 * l - 1)), l }
}

// Get sort color for any element type
export async function getElementColor(el) {
  if (el.type === 'color-swatch') {
    return hexToRgb(el.data.color)
  }
  if (el.type === 'image' && el.data.src) {
    return getDominantColor(el.data.src)
  }
  // Links and text get a neutral gray (sorted to the end)
  return { r: 180, g: 180, b: 180 }
}

// Sort elements by color and arrange in grid
export async function arrangeByColor(zone) {
  const elements = zone.elements
  if (elements.length === 0) return

  // Extract colors for all elements
  const colorMap = new Map()
  await Promise.all(elements.map(async (el) => {
    const rgb = await getElementColor(el)
    const hsl = rgbToHue(rgb.r, rgb.g, rgb.b)
    colorMap.set(el.id, hsl)
  }))

  // Sort: images/swatches by hue, then links/text at the end
  const sorted = [...elements].sort((a, b) => {
    const aIsVisual = a.type === 'image' || a.type === 'color-swatch'
    const bIsVisual = b.type === 'image' || b.type === 'color-swatch'
    if (aIsVisual && !bIsVisual) return -1
    if (!aIsVisual && bIsVisual) return 1

    const aHsl = colorMap.get(a.id)
    const bHsl = colorMap.get(b.id)

    // Sort by hue, then by lightness
    if (Math.abs(aHsl.h - bHsl.h) > 10) return aHsl.h - bHsl.h
    return aHsl.l - bHsl.l
  })

  // Arrange in grid layout
  const padding = 16
  const gap = 12
  const startY = 44 // below zone header
  const zoneInnerWidth = zone.width - padding * 2

  let x = padding
  let y = startY
  let rowHeight = 0

  for (const el of sorted) {
    // Wrap to next row if needed
    if (x + el.width > zone.width - padding && x > padding) {
      x = padding
      y += rowHeight + gap
      rowHeight = 0
    }

    el.x = x
    el.y = y
    rowHeight = Math.max(rowHeight, el.height)
    x += el.width + gap
  }

  // Expand zone height if needed
  const totalHeight = y + rowHeight + padding
  if (totalHeight > zone.height) {
    zone.height = totalHeight
  }

  // Replace elements with sorted order
  zone.elements = sorted
}
