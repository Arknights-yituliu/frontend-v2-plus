import { toCanvas } from 'html-to-image'
import QRCode from 'qrcode'
import { encodeRosterTo16QrChunks, decode16QrFromCanvas } from './theoretical-output/engine/workbench/compat/mowerQrCodec.ts'

export async function exportPlanImage(element, payload, theme = 'light') {
  const background = theme === 'dark' ? '#000000' : '#ffffff'
  const foreground = theme === 'dark' ? '#ffffff' : '#000000'
  const board = await toCanvas(element, { pixelRatio: 3, backgroundColor: background, style: { margin: '0', padding: '8px 0' } })
  // Leave dedicated QR strips above and below all five right-side facilities.
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(board.width, 2940)
  canvas.height = board.height + 560
  const context = canvas.getContext('2d')
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(board, (canvas.width - board.width) / 2, 280)
  const chunks = encodeRosterTo16QrChunks(JSON.stringify(payload))
  for (let index = 0; index < chunks.length; index++) {
    const qr = document.createElement('canvas')
    await QRCode.toCanvas(qr, chunks[index], { errorCorrectionLevel: 'L', width: 215, margin: 0, color: { dark: foreground, light: background } })
    const x = index < 7 ? 40 + index * 231 : index < 14 ? 40 + (index - 7) * 231 : canvas.width - 462 + (index - 14) * 231
    const y = index < 7 ? 40 : canvas.height - 255
    context.drawImage(qr, x, y)
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片生成失败')), 'image/png'))
}

export async function importPlanImage(file) {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d').drawImage(bitmap, 0, 0)
    return JSON.parse(decode16QrFromCanvas(canvas))
  } finally { bitmap.close() }
}
