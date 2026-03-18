export function extractSourceUrl(htmlString) {
  if (!htmlString) return null
  try {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html')
    const img = doc.querySelector('img[src]')
    if (img) {
      const src = img.getAttribute('src')
      if (src && src.startsWith('http')) return src
    }
    const anchor = doc.querySelector('a[href]')
    if (anchor) {
      const href = anchor.getAttribute('href')
      if (href && href.startsWith('http')) return href
    }
  } catch {
    // ignore parse errors
  }
  return null
}

export function isUrl(text) {
  try {
    const url = new URL(text.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|tiff?)(\?.*)?$/i

export function isImageUrl(text) {
  if (!isUrl(text)) return false
  return IMAGE_EXTENSIONS.test(new URL(text.trim()).pathname)
}

export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function getFaviconUrl(url) {
  try {
    const domain = new URL(url).origin
    return `${domain}/favicon.ico`
  } catch {
    return null
  }
}

export async function uploadImage(base64DataUrl) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64DataUrl }),
  })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return data.url
}

export async function enrichUrlMetadata(url, title = '', text = '') {
  const res = await fetch('/api/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, text }),
  })
  if (!res.ok) throw new Error('Metadata fetch failed')
  return await res.json()
}

export function compressImage(dataUrl, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width
      let h = img.height
      if (w > maxWidth) {
        h = (h * maxWidth) / w
        w = maxWidth
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        canvas.getContext('2d').drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      } catch {
        // CORS failure — can't convert, use URL directly
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}
