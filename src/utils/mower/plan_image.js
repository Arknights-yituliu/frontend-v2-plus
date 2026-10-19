import { toCanvas } from 'html-to-image'
import QRCode from 'qrcode'
import { encodePlanQrChunks, decodePlanQrFromCanvas } from './plan_qr.js'

export function planImageLayout(width, height, leftWidth, topSpace, leftBottom, left = 0) {
  const margin = 24,
    gap = 16
  const size = Math.floor(Math.min(215, (leftWidth - margin * 2 - gap * 6) / 7, topSpace - margin * 2))
  if (size < 100) throw new Error('排班图片的二维码区域过小，请使用完整排班表导出')
  const bottom = leftBottom + margin
  return {
    width,
    height: Math.max(height, bottom + size + margin),
    size,
    positions: Array.from({ length: 14 }, (_, index) => ({
      x: left + margin + (index % 7) * (size + gap),
      y: index < 7 ? margin : bottom,
    })),
  }
}

export async function exportPlanImage(element, payload, theme = 'light') {
  const node = element?.querySelector('.outer')
  if (!node) throw new Error('排班表尚未加载，请稍后重试')
  const bounds = node.getBoundingClientRect()
  const left = node.querySelector('.left_box').getBoundingClientRect()
  const rows = node.querySelectorAll('.left_contain')
  const first = rows[0].getBoundingClientRect()
  const last = rows[rows.length - 1].getBoundingClientRect()
  const background = theme === 'dark' ? '#000000' : '#ffffff'
  const foreground = theme === 'dark' ? '#ffffff' : '#000000'
  await document.fonts?.ready
  const options = { pixelRatio: 3, backgroundColor: background, style: { margin: '0' } }
  // WebKit needs a first render to populate embedded image resources.
  if (/AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent)) await toCanvas(node, options)
  const board = await toCanvas(node, options)
  const scale = board.width / bounds.width
  const layout = planImageLayout(
    board.width,
    board.height,
    left.width * scale,
    (first.top - bounds.top) * scale,
    (last.bottom - bounds.top) * scale,
    (left.left - bounds.left) * scale,
  )
  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法生成排班图片')
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(board, 0, 0)
  const chunks = encodePlanQrChunks(payload)
  for (let index = 0; index < chunks.length; index++) {
    const qr = document.createElement('canvas')
    await QRCode.toCanvas(qr, chunks[index], {
      errorCorrectionLevel: 'L',
      width: layout.size,
      margin: 0,
      color: { dark: foreground, light: background },
    })
    const { x, y } = layout.positions[index]
    context.imageSmoothingEnabled = false
    context.drawImage(qr, x, y, layout.size, layout.size)
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('图片生成失败'))), 'image/jpeg', 0.95),
  )
}

export async function importPlanImage(file) {
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width * bitmap.height > 12 * 1024 * 1024 || bitmap.width > 8192 || bitmap.height > 8192)
      throw new Error('图片尺寸过大，请使用不超过 1200 万像素的原始排班图片')
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器无法读取排班图片')
    context.drawImage(bitmap, 0, 0)
    return JSON.parse(decodePlanQrFromCanvas(canvas))
  } finally {
    bitmap.close()
  }
}
