import assert from 'node:assert/strict'
import QRCode from 'qrcode'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { encodePlanQrChunks, decodePlanQrFromRgba } = await server.ssrLoadModule('/src/utils/mower/plan_qr.js')
  const { planImageLayout } = await server.ssrLoadModule('/src/utils/mower/plan_image.js')
  const { encodeRosterTo16QrChunks, render16QrToRgba } = await server.ssrLoadModule(
    '/src/utils/mower/theoretical-output/engine/workbench/compat/mowerQrCodec.ts',
  )
  const payload = {
    default: 'plan1',
    plan1: { room_1_1: { name: '制造站', product: 'gold', plans: [{ agent: '阿米娅', group: '制造组', replacement: ['砾'] }] } },
    conf: { resting_standby: '阿米娅' },
    backup_plans: [{ name: '测试副表', plan: {}, conf: {}, trigger: { left: 'True', operator: '==', right: 'True' } }],
    advanced_settings: { drone_threshold: 175, product_switching: { enable: true } },
  }
  const text = JSON.stringify(payload)
  const layout = planImageLayout(2844, 1230, 1605, 246, 954)
  assert.equal(layout.height, 1230)
  assert.equal(layout.positions.length, 14)
  for (const [index, position] of layout.positions.entries()) {
    assert.ok(position.x >= 0 && position.x + layout.size < 1605, 'QR stays left of central/right facilities')
    assert.ok(index < 7 ? position.y + layout.size < 246 : position.y > 954, 'QR never covers production rows')
    assert.ok(position.y + layout.size < layout.height, 'QR stays within the image')
  }
  assert.throws(() => planImageLayout(1000, 1000, 600, 100, 500), /区域过小/)
  console.log('✓ 14 码布局避开生产设施、中枢与右侧设施，无额外整行留白')

  function render(chunks, dark = false, { width = 1800, height = 1200, offsetX = 0, offsetY = 0, positions, size = 120 } = {}) {
    const pixels = new Uint8ClampedArray(width * height * 4)
    const bg = dark ? 0 : 255,
      fg = dark ? 255 : 0
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = pixels[i + 1] = pixels[i + 2] = bg
      pixels[i + 3] = 255
    }
    chunks.forEach((chunk, index) => {
      const qr = QRCode.create(chunk, { errorCorrectionLevel: 'L' })
      const x0 = positions?.[index].x ?? offsetX + 30 + (index < 14 ? index % 7 : index - 7) * 150
      const y0 = positions?.[index].y ?? offsetY + (index < 7 ? 30 : 500)
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const color = qr.modules.get(Math.floor((y * qr.modules.size) / size), Math.floor((x * qr.modules.size) / size)) ? fg : bg
          const i = ((y0 + y) * width + x0 + x) * 4
          pixels[i] = pixels[i + 1] = pixels[i + 2] = color
        }
    })
    return { pixels, width, height }
  }
  const chunks = encodePlanQrChunks(payload)
  assert.equal(chunks.length, 14)
  for (const dark of [false, true]) {
    const image = render(chunks, dark, { ...layout })
    assert.equal(decodePlanQrFromRgba(image.pixels, image.width, image.height), text)
    console.log(`✓ alpha 14 码完整主副表与高级设置往返（${dark ? '暗色' : '亮色'}）`)
  }
  const oldChunks = encodeRosterTo16QrChunks(text)
  const original = render16QrToRgba(3012, 1236, text)
  assert.equal(decodePlanQrFromRgba(original, 3012, 1236), text)
  console.log('✓ 原版 16 码固定位置与右下角双码兼容')
  const old = render(oldChunks, false, { width: 1800, height: 1700, offsetX: 50, offsetY: 100 })
  assert.equal(decodePlanQrFromRgba(old.pixels, old.width, old.height), text)
  console.log('✓ 旧版 16 码与整体平移、加高图片兼容，按几何行排序')
  const missing = render(oldChunks.slice(0, 14))
  assert.throws(
    () => decodePlanQrFromRgba(missing.pixels, missing.width, missing.height),
    'missing two legacy chunks must not be accepted as alpha 14',
  )
  assert.throws(() => decodePlanQrFromRgba(new Uint8ClampedArray(10), 100, 100), /尺寸无效/)
  console.log('✓ 残缺旧图与无效尺寸不能被误认为有效的 14 码图片')
} finally {
  await server.close()
}
