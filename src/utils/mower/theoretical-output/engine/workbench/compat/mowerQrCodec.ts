// Derived from arknights-mower (https://github.com/ArkMowers/arknights-mower)
// Copyright (c) 2021 Nano
// MIT License

import { deflate, inflate } from 'pako'
import jsQR from 'jsqr'
import QRCode from 'qrcode'
import { encodeBase45, decodeBase45 } from './base45'
import {
  QRCODE_SIZE,
  QR_COUNT,
  QR_SLOT_POSITIONS,
  MIN_CANVAS_WIDTH,
  MIN_CANVAS_HEIGHT,
  REFERENCE_IMAGE_WIDTH,
  REFERENCE_IMAGE_HEIGHT,
  MIN_DECODE_WIDTH,
  MIN_DECODE_HEIGHT,
  MAX_WINDOW_ATTEMPTS,
  MAX_GLOBAL_ATTEMPTS,
  THEME_COLOR_MAP,
  type QrTheme,
} from './mowerQrConstants'

function validateDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(
      `Invalid image dimensions: width (${width}) and height (${height}) must be positive integers`
    )
  }
}

function validateDecodeDimensions(width: number, height: number): void {
  validateDimensions(width, height)
  if (width < MIN_DECODE_WIDTH || height < MIN_DECODE_HEIGHT) {
    throw new Error(
      `Image dimensions ${width}x${height} are too small to contain QR codes (minimum ${MIN_DECODE_WIDTH}x${MIN_DECODE_HEIGHT})`
    )
  }
}

function validateRenderDimensions(width: number, height: number): void {
  validateDimensions(width, height)
  if (width < MIN_CANVAS_WIDTH || height < MIN_CANVAS_HEIGHT) {
    throw new Error(
      `Image dimensions ${width}x${height} are insufficient (minimum ${MIN_CANVAS_WIDTH}x${MIN_CANVAS_HEIGHT})`
    )
  }
}

function validateRgbaBuffer(
  buffer: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  name: string
): void {
  const expected = width * height * 4
  if (buffer.length !== expected) {
    throw new Error(
      `Invalid ${name} buffer length: expected ${expected} bytes for ${width}x${height} image, but got ${buffer.length}`
    )
  }
}

/**
 * Splits a payload string into 16 chunks using strict floor stepping:
 * start = floor(length / 16) * i
 * end = length (if i === 15) else floor(length / 16) * (i + 1)
 */
export function splitPayloadInto16Chunks(payload: string, n = QR_COUNT): string[] {
  const length = payload.length
  const step = Math.floor(length / n)
  const chunks: string[] = []

  for (let i = 0; i < n; i++) {
    const start = step * i
    const end = i === n - 1 ? length : step * (i + 1)
    chunks.push(payload.slice(start, end))
  }

  return chunks
}

/**
 * Encodes a JSON roster string into 16 Base45 QR code payload chunks:
 * 1. UTF-8 encode JSON string
 * 2. zlib compress with level 9 (via pako deflate)
 * 3. Base45 encode compressed bytes (RFC 9285)
 * 4. Split into 16 chunks with floor step (no header/index)
 */
export function encodeRosterTo16QrChunks(jsonText: string): string[] {
  const utf8Bytes = new TextEncoder().encode(jsonText)
  const compressed = deflate(utf8Bytes, { level: 9 })
  const base45Str = encodeBase45(compressed)
  return splitPayloadInto16Chunks(base45Str, QR_COUNT)
}

/**
 * Decodes 16 Base45 QR code payload chunks back into the original JSON text:
 * 1. Concatenate 16 chunks
 * 2. Base45 decode into compressed zlib bytes
 * 3. zlib decompress (via pako inflate)
 * 4. UTF-8 decode into JSON string
 */
export function decodeRosterFrom16QrChunks(chunks: readonly string[] | string): string {
  let payload: string
  if (Array.isArray(chunks)) {
    if (chunks.length !== QR_COUNT) {
      throw new Error(
        `Failed to decode roster chunks: expected exactly ${QR_COUNT} chunks, but got ${chunks.length}`
      )
    }
    for (let i = 0; i < chunks.length; i++) {
      if (typeof chunks[i] !== 'string') {
        throw new Error(
          `Failed to decode roster chunks: chunk at index ${i} is not a string`
        )
      }
    }
    payload = chunks.join('')
  } else if (typeof chunks === 'string') {
    payload = chunks
  } else {
    throw new Error('Invalid input: chunks must be an array of strings or a string')
  }

  let compressed: Uint8Array
  try {
    compressed = decodeBase45(payload)
  } catch (err: unknown) {
    throw new Error(`Corrupted payload: Base45 decode failed: ${(err as Error).message}`)
  }

  let decompressed: Uint8Array
  try {
    decompressed = inflate(compressed)
  } catch (err: unknown) {
    throw new Error(`Corrupted payload: zlib decompression failed: ${(err as Error).message}`)
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(decompressed)
  } catch (err: unknown) {
    throw new Error(`Corrupted payload: UTF-8 decode failed: ${(err as Error).message}`)
  }
}

/**
 * Internal interface for detected QR codes.
 */
interface FoundQr {
  readonly data: string
  readonly rectTop: number
  readonly rectLeft: number
}

/**
 * Scans an RGBA buffer using jsQR with repeated scanning and masking.
 * Follows mower's algorithm:
 * 1. Checks if pixel (0, 0) is dark; if so, inverts the entire image.
 * 2. Repeatedly locates QR codes, masks each found region with white, until no more QR codes.
 * 3. Sorts found chunks by: (rectTop * 2 > imageHeight, rectLeft)
 * 4. Returns exactly 16 chunks or throws a descriptive error.
 */
interface SlotWindow {
  readonly x0: number
  readonly y0: number
  readonly w: number
  readonly h: number
}

function getScaledSlotWindows(width: number, height: number): SlotWindow[] {
  const scaleX = width / REFERENCE_IMAGE_WIDTH
  const scaleY = height / REFERENCE_IMAGE_HEIGHT
  const minScale = Math.min(scaleX, scaleY)
  const pad = Math.max(12, Math.round(35 * minScale))

  return QR_SLOT_POSITIONS.map((slot) => {
    const sx = slot.x * scaleX
    const sy = slot.y * scaleY
    const sw = QRCODE_SIZE * scaleX
    const sh = QRCODE_SIZE * scaleY

    const x0 = Math.max(0, Math.floor(sx - pad))
    const y0 = Math.max(0, Math.floor(sy - pad))
    const w = Math.ceil(sw + pad * 2)
    const h = Math.ceil(sh + pad * 2)

    return { x0, y0, w, h }
  })
}

function getFixedSlotWindows(): SlotWindow[] {
  const pad = 35
  const w = QRCODE_SIZE + pad * 2
  const h = QRCODE_SIZE + pad * 2
  return QR_SLOT_POSITIONS.map((slot) => {
    const x0 = Math.max(0, slot.x - pad)
    const y0 = Math.max(0, slot.y - pad)
    return { x0, y0, w, h }
  })
}

/**
 * Scans an RGBA buffer using jsQR with repeated scanning and masking.
 * Follows mower's algorithm:
 * 1. Checks if pixel (0, 0) is dark; if so, inverts the entire image.
 * 2. Repeatedly locates QR codes, masks each found region with white, until no more QR codes.
 * 3. Sorts found chunks by: (rectTop * 2 > imageHeight, rectLeft)
 * 4. Returns exactly 16 chunks or throws a descriptive error.
 */
function scanRgbaFor16Qrs(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): FoundQr[] {
  const data = new Uint8ClampedArray(rgba)

  // In Python: if img.getpixel((0, 0)) == BLACK: img = ImageChops.invert(img)
  // Check if pixel (0, 0) is dark (luminance < 128)
  const r0 = data[0] ?? 0
  const g0 = data[1] ?? 0
  const b0 = data[2] ?? 0
  if ((r0 + g0 + b0) / 3 < 128) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - (data[i] ?? 0)
      data[i + 1] = 255 - (data[i + 1] ?? 0)
      data[i + 2] = 255 - (data[i + 2] ?? 0)
    }
  }

  const found: FoundQr[] = []

  const scaleX = width / REFERENCE_IMAGE_WIDTH
  const scaleY = height / REFERENCE_IMAGE_HEIGHT
  const minScale = Math.min(scaleX, scaleY)
  const dupThreshold = Math.max(15, Math.min(40, Math.round(40 * minScale)))

  function maskRegion(left: number, top: number, right: number, bottom: number) {
    const pad = Math.max(3, Math.round(6 * minScale))
    const x0 = Math.max(0, Math.floor(left) - pad)
    const y0 = Math.max(0, Math.floor(top) - pad)
    const x1 = Math.min(width - 1, Math.ceil(right) + pad)
    const y1 = Math.min(height - 1, Math.ceil(bottom) + pad)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const idx = (y * width + x) * 4
        data[idx] = 255
        data[idx + 1] = 255
        data[idx + 2] = 255
      }
    }
  }

  function isDuplicate(rectLeft: number, rectTop: number): boolean {
    return found.some(
      (f) => Math.abs(f.rectLeft - rectLeft) < dupThreshold && Math.abs(f.rectTop - rectTop) < dupThreshold
    )
  }

  function tryScanWindow(x0: number, y0: number, w: number, h: number): boolean {
    if (found.length >= QR_COUNT) return false
    const cropW = Math.min(width - x0, w)
    const cropH = Math.min(height - y0, h)
    if (cropW < 40 || cropH < 40) return false

    const sub = new Uint8ClampedArray(cropW * cropH * 4)
    for (let y = 0; y < cropH; y++) {
      for (let x = 0; x < cropW; x++) {
        const s = ((y0 + y) * width + (x0 + x)) * 4
        const t = (y * cropW + x) * 4
        sub[t] = data[s] ?? 0
        sub[t + 1] = data[s + 1] ?? 0
        sub[t + 2] = data[s + 2] ?? 0
        sub[t + 3] = 255
      }
    }

    const code = jsQR(sub, cropW, cropH, { inversionAttempts: 'attemptBoth' })
    if (!code) return false

    const loc = code.location
    const codeLeft = x0 + Math.min(loc.topLeftCorner.x, loc.bottomLeftCorner.x)
    const codeTop = y0 + Math.min(loc.topLeftCorner.y, loc.topRightCorner.y)
    const codeRight = x0 + Math.max(loc.topRightCorner.x, loc.bottomRightCorner.x)
    const codeBottom = y0 + Math.max(loc.bottomLeftCorner.y, loc.bottomRightCorner.y)

    maskRegion(codeLeft, codeTop, codeRight, codeBottom)

    if (!isDuplicate(codeLeft, codeTop)) {
      found.push({ data: code.data, rectTop: codeTop, rectLeft: codeLeft })
    }
    return true
  }

  // Phase 1: Search expected slot windows (scaled candidates first unless dimensions match original)
  const isNearOriginal =
    Math.abs(width - REFERENCE_IMAGE_WIDTH) <= 100 &&
    Math.abs(height - REFERENCE_IMAGE_HEIGHT) <= 50
  const primarySlots = isNearOriginal ? getFixedSlotWindows() : getScaledSlotWindows(width, height)
  const secondarySlots = isNearOriginal ? getScaledSlotWindows(width, height) : getFixedSlotWindows()

  for (const slot of primarySlots) {
    if (found.length >= QR_COUNT) break
    let attempts = 0
    while (
      found.length < QR_COUNT &&
      attempts < MAX_WINDOW_ATTEMPTS &&
      tryScanWindow(slot.x0, slot.y0, slot.w, slot.h)
    ) {
      attempts++
    }
  }

  if (found.length < QR_COUNT) {
    for (const slot of secondarySlots) {
      if (found.length >= QR_COUNT) break
      let attempts = 0
      while (
        found.length < QR_COUNT &&
        attempts < MAX_WINDOW_ATTEMPTS &&
        tryScanWindow(slot.x0, slot.y0, slot.w, slot.h)
      ) {
        attempts++
      }
    }
  }

  // Phase 2: If fewer than 16 codes found, scan top and bottom bands with sliding window
  if (found.length < QR_COUNT) {
    const winSize = Math.max(80, Math.round(300 * minScale))
    const step = Math.max(40, Math.round(150 * minScale))
    const bottomY0 = Math.max(0, height - Math.round(400 * scaleY))
    const yBands = [0, bottomY0]
    for (const y0 of yBands) {
      if (found.length >= QR_COUNT) break
      for (let x0 = 0; x0 <= width - winSize; x0 += step) {
        if (found.length >= QR_COUNT) break
        let attempts = 0
        while (
          found.length < QR_COUNT &&
          attempts < MAX_WINDOW_ATTEMPTS &&
          tryScanWindow(x0, y0, winSize, winSize)
        ) {
          attempts++
        }
      }
    }
  }

  // Phase 3: Global image scan loop fallback until no QR code is left or attempt limit reached
  let globalAttempts = 0
  while (found.length < QR_COUNT && globalAttempts < MAX_GLOBAL_ATTEMPTS) {
    globalAttempts++
    const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
    if (!code) break

    const loc = code.location
    const codeLeft = Math.min(loc.topLeftCorner.x, loc.bottomLeftCorner.x)
    const codeTop = Math.min(loc.topLeftCorner.y, loc.topRightCorner.y)
    const codeRight = Math.max(loc.topRightCorner.x, loc.bottomRightCorner.x)
    const codeBottom = Math.max(loc.bottomLeftCorner.y, loc.bottomRightCorner.y)

    maskRegion(codeLeft, codeTop, codeRight, codeBottom)

    if (!isDuplicate(codeLeft, codeTop)) {
      found.push({ data: code.data, rectTop: codeTop, rectLeft: codeLeft })
    }
  }

  return found
}

/**
 * Decodes 16 QR codes from a raw RGBA/ImageData buffer into the original JSON text.
 */
export function decode16QrFromRgba(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): string {
  validateDecodeDimensions(width, height)
  validateRgbaBuffer(rgba, width, height, 'rgba')

  const found = scanRgbaFor16Qrs(rgba, width, height)
  if (found.length !== QR_COUNT) {
    throw new Error(
      `Failed to decode roster: expected exactly ${QR_COUNT} QR codes, but found ${found.length}`
    )
  }

  // Sort strictly by (rectTop * 2 > height, rectLeft)
  found.sort((a, b) => {
    const aBottom = a.rectTop * 2 > height ? 1 : 0
    const bBottom = b.rectTop * 2 > height ? 1 : 0
    if (aBottom !== bBottom) {
      return aBottom - bBottom
    }
    return a.rectLeft - b.rectLeft
  })

  const combinedBase45 = found.map((f) => f.data).join('')
  return decodeRosterFrom16QrChunks(combinedBase45)
}

/**
 * Renders 16 QR codes onto a pure RGBA buffer for Node and headless testing.
 */
export function render16QrToRgba(
  width: number,
  height: number,
  jsonText: string,
  theme: QrTheme = 'light',
  baseRgba?: Uint8Array | Uint8ClampedArray
): Uint8ClampedArray {
  validateRenderDimensions(width, height)
  if (baseRgba) {
    validateRgbaBuffer(baseRgba, width, height, 'baseRgba')
  }

  const out = new Uint8ClampedArray(width * height * 4)
  if (baseRgba) {
    out.set(baseRgba)
  } else {
    const bg = THEME_COLOR_MAP[theme].backgroundColor
    for (let i = 0; i < out.length; i += 4) {
      out[i] = bg[0]
      out[i + 1] = bg[1]
      out[i + 2] = bg[2]
      out[i + 3] = 255
    }
  }

  const chunks = encodeRosterTo16QrChunks(jsonText)
  const colors = THEME_COLOR_MAP[theme]
  const fgRgb = colors.moduleColor
  const bgRgb = colors.backgroundColor

  for (let i = 0; i < QR_COUNT; i++) {
    const chunk = chunks[i]!
    const slot = QR_SLOT_POSITIONS[i]!
    const qr = QRCode.create(chunk, { errorCorrectionLevel: 'L' })
    const modSize = qr.modules.size

    for (let py = 0; py < QRCODE_SIZE; py++) {
      const row = Math.floor((py * modSize) / QRCODE_SIZE)
      const targetY = slot.y + py
      for (let px = 0; px < QRCODE_SIZE; px++) {
        const col = Math.floor((px * modSize) / QRCODE_SIZE)
        const targetX = slot.x + px
        const bit = qr.modules.get(row, col)
        const rgb = bit ? fgRgb : bgRgb
        const idx = (targetY * width + targetX) * 4
        out[idx] = rgb[0]
        out[idx + 1] = rgb[1]
        out[idx + 2] = rgb[2]
        out[idx + 3] = 255
      }
    }
  }

  return out
}

/**
 * Overlays 16 QR codes onto an existing browser HTMLCanvasElement without
 * clearing the middle roster UI, then exports to a JPEG Blob.
 * In-place modifies the canvas by overwriting the 16 QR code slot regions (background and modules),
 * while strictly preserving the central base/roster image content without clearing it.
 * 就地覆盖 16 个二维码区域（背景色与二维码模块），但严格保留中间底图 UI 内容不被清除或修改。
 */
export async function exportRosterTo16Qr(
  canvas: HTMLCanvasElement,
  jsonText: string,
  theme: QrTheme = 'light'
): Promise<Blob> {
  validateRenderDimensions(canvas.width, canvas.height)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to obtain 2D rendering context from canvas')
  }

  const chunks = encodeRosterTo16QrChunks(jsonText)
  const fg = theme === 'light' ? '#000000' : '#ffffff'
  const bg = theme === 'light' ? '#ffffff' : '#000000'

  for (let i = 0; i < QR_COUNT; i++) {
    const chunk = chunks[i]!
    const slot = QR_SLOT_POSITIONS[i]!
    const qr = QRCode.create(chunk, { errorCorrectionLevel: 'L' })
    const modSize = qr.modules.size

    // Draw background for this QR code slot without clearing other canvas areas
    ctx.fillStyle = bg
    ctx.fillRect(slot.x, slot.y, QRCODE_SIZE, QRCODE_SIZE)

    // Draw foreground modules
    ctx.fillStyle = fg
    for (let py = 0; py < QRCODE_SIZE; py++) {
      const row = Math.floor((py * modSize) / QRCODE_SIZE)
      for (let px = 0; px < QRCODE_SIZE; px++) {
        const col = Math.floor((px * modSize) / QRCODE_SIZE)
        if (qr.modules.get(row, col)) {
          ctx.fillRect(slot.x + px, slot.y + py, 1, 1)
        }
      }
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to export canvas to JPEG blob'))
        }
      },
      'image/jpeg',
      0.95
    )
  })
}

/**
 * Decodes 16 QR codes from a browser HTMLCanvasElement.
 */
export function decode16QrFromCanvas(canvas: HTMLCanvasElement): string {
  validateDecodeDimensions(canvas.width, canvas.height)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to obtain 2D rendering context from canvas')
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return decode16QrFromRgba(imgData.data, canvas.width, canvas.height)
}

