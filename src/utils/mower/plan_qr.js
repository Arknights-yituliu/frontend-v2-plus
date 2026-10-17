import jsQR from 'jsqr'
import { encodeRosterTo16QrChunks, decodeRosterFrom16QrChunks } from './theoretical-output/engine/workbench/compat/mowerQrCodec.ts'

export const PLAN_QR_COUNT = 14

export function encodePlanQrChunks(payload) {
  const encoded = encodeRosterTo16QrChunks(JSON.stringify(payload)).join('')
  const step = Math.floor(encoded.length / PLAN_QR_COUNT)
  return Array.from({ length: PLAN_QR_COUNT }, (_, index) =>
    encoded.slice(step * index, index === PLAN_QR_COUNT - 1 ? undefined : step * (index + 1)),
  )
}

// Alpha orders by geometric rows, so padding or a translated image cannot reorder chunks.
function scanCodes(rgba, width, height) {
  const data = new Uint8ClampedArray(rgba)
  const found = []
  function scanWindow(x0, y0, window) {
    const w = Math.min(window, width - x0),
      h = Math.min(window, height - y0)
    if (w < 60 || h < 60) return
    const crop = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) crop.set(data.subarray(((y0 + y) * width + x0) * 4, ((y0 + y) * width + x0 + w) * 4), y * w * 4)
    const code = jsQR(crop, w, h, { inversionAttempts: 'attemptBoth' })
    if (!code) return
    const corners = Object.values(code.location).filter((point) => point && Number.isFinite(point.x))
    const left = x0 + Math.min(...corners.map((point) => point.x))
    const right = x0 + Math.max(...corners.map((point) => point.x))
    const top = y0 + Math.min(...corners.map((point) => point.y))
    const bottom = y0 + Math.max(...corners.map((point) => point.y))
    const x = (left + right) / 2,
      y = (top + bottom) / 2
    if (!found.some((item) => Math.abs(item.x - x) < (right - left) * 0.5 && Math.abs(item.y - y) < (bottom - top) * 0.5))
      found.push({ data: code.data, x, y, height: bottom - top })
    const padding = Math.max(3, Math.ceil((right - left) * 0.04))
    for (let y = Math.max(0, Math.floor(top) - padding); y < Math.min(height, Math.ceil(bottom) + padding); y++)
      for (let x = Math.max(0, Math.floor(left) - padding); x < Math.min(width, Math.ceil(right) + padding); x++) {
        const offset = (y * width + x) * 4
        data[offset] = data[offset + 1] = data[offset + 2] = data[offset + 3] = 255
      }
  }
  // Try the current export, alpha and legacy slot regions before a general image search.
  const layouts = [
    { width: 2844, height: 1230, left: 24, top: 24, bottom: 978, size: 198, gap: 16 },
    { width: 3012, height: 1236, left: 40, top: 40, bottom: 995, size: 215, gap: 16 },
  ]
  for (const layout of layouts) {
    const sx = width / layout.width,
      sy = height / layout.height
    const pad = Math.max(8, Math.round(14 * Math.min(sx, sy)))
    for (let index = 0; index < 16; index++) {
      const x = index < 14 ? layout.left + (index % 7) * (layout.size + layout.gap) : 2520 + (index - 14) * 231
      const y = index < 7 ? layout.top : layout.bottom
      scanWindow(
        Math.max(0, Math.floor(x * sx) - pad),
        Math.max(0, Math.floor(y * sy) - pad),
        Math.ceil(layout.size * Math.max(sx, sy)) + pad * 2,
      )
    }
    if ([14, 16].includes(found.length)) {
      try {
        return decodeFound()
      } catch {
        /* A legacy image with missing codes is not a complete alpha image. */
      }
    }
  }
  // Overlapping windows support translated, padded or unfamiliar layouts.
  for (const factor of [320, 400]) {
    const window = Math.max(180, Math.round((factor * width) / 3012))
    const step = Math.floor(window / 5)
    for (let y = 0; y < height && found.length < 16; y += step)
      for (let x = 0; x < width && found.length < 16; x += step) {
        const count = found.length
        scanWindow(x, y, window)
        if (found.length !== count && [14, 16].includes(found.length)) {
          try {
            return decodeFound()
          } catch {
            /* Continue looking for missing legacy codes. */
          }
        }
      }
  }
  return decodeFound()
  function decodeFound() {
    if (![14, 16].includes(found.length)) throw new Error(`未能识别完整的排班二维码（识别到 ${found.length} 个，需要 14 或 16 个）`)
    const heights = found.map((code) => code.height).sort((a, b) => a - b)
    const gap = Math.max(1, heights[Math.floor(heights.length / 2)] * 0.5)
    const rows = []
    for (const code of [...found].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const row = rows.at(-1)
      if (!row || code.y - row.at(-1).y > gap) rows.push([code])
      else row.push(code)
    }
    const text = decodeRosterFrom16QrChunks(rows.flatMap((row) => row.sort((a, b) => a.x - b.x).map((code) => code.data)).join(''))
    JSON.parse(text)
    return text
  }
}

export function decodePlanQrFromRgba(rgba, width, height) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 100 ||
    height < 100 ||
    width * height > 12 * 1024 * 1024 ||
    rgba.length !== width * height * 4
  )
    throw new Error('排班图片尺寸无效或超过 1200 万像素')
  const scale = Math.min(1, 1600 / Math.max(width, height))
  if (scale < 1) {
    const w = Math.floor(width * scale),
      h = Math.floor(height * scale)
    const resized = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const offset = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 4
        resized.set(rgba.subarray(offset, offset + 4), (y * w + x) * 4)
      }
    try {
      return scanCodes(resized, w, h)
    } catch {
      /* Retry original pixels if resizing hid a code. */
    }
  }
  return scanCodes(rgba, width, height)
}

export function decodePlanQrFromCanvas(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('当前浏览器无法读取排班图片')
  return decodePlanQrFromRgba(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
}
