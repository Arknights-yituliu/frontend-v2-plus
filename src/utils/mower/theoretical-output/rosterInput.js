import { containsRetiredRescueCondition } from './engine/workbench/compat/mowerAlphaMigration.ts'
export const MOWER_INCOME_STORAGE_KEY = 'mower-income-plan-v1'
const MAX_JSON_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_IMAGE_PIXELS = 12 * 1024 * 1024
let displayOperatorName = name => name

export async function saveMowerRosterForIncome(payload, fileName, storage) {
  const candidate = await parseMowerRosterText(JSON.stringify(payload))
  try {
    storage.setItem(MOWER_INCOME_STORAGE_KEY, JSON.stringify({ payload: candidate, fileName }))
  } catch {
    throw new Error('浏览器无法保存排班，请检查存储权限或可用空间')
  }
}

export async function parseMowerRosterText(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_JSON_BYTES) {
    throw new Error('排班 JSON 不能超过 2 MB')
  }
  let payload
  try { payload = JSON.parse(text.replace(/^\uFEFF/, '')) } catch {
    throw new Error('排班 JSON 格式不正确，请导入完整的 Mower 排班文件')
  }
  const { inspectTheoreticalPlan } = await import('./calculate.ts')
  inspectTheoreticalPlan(payload)
  const { restoreOperatorMowerName } = await import('./engine/workbench/compat/mowerJson.ts')
  displayOperatorName = restoreOperatorMowerName
  return payload
}

export async function readMowerRosterFile(file) {
  const image = /\.(png|jpe?g)$/i.test(file.name)
  if (!image && !/\.json$/i.test(file.name)) throw new Error('请选择 JSON、JPEG 或 PNG 排班文件')
  if (file.size > (image ? MAX_IMAGE_BYTES : MAX_JSON_BYTES)) {
    throw new Error(image ? '排班图片不能超过 8 MB' : '排班 JSON 不能超过 2 MB')
  }
  if (!image) return parseMowerRosterText(await file.text())
  const url = URL.createObjectURL(file)
  try {
    const picture = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('图片无法读取，请使用原始 Mower 排班图片'))
      element.src = url
    })
    if (picture.naturalWidth * picture.naturalHeight > MAX_IMAGE_PIXELS ||
        picture.naturalWidth > 8192 || picture.naturalHeight > 8192) {
      throw new Error('图片尺寸过大，请使用不超过 1200 万像素的原始排班图片')
    }
    const canvas = document.createElement('canvas')
    canvas.width = picture.naturalWidth
    canvas.height = picture.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('当前浏览器无法读取排班图片，请改用 JSON 文件')
    context.drawImage(picture, 0, 0)
    const { decodePlanQrFromCanvas } = await import('../plan_qr.js')
    let text
    try { text = decodePlanQrFromCanvas(canvas) } catch {
      throw new Error('未能识别完整的 14 或 16 个排班二维码，请使用未裁剪的原始图片或 JSON 文件')
    }
    return await parseMowerRosterText(text)
  } finally { URL.revokeObjectURL(url) }
}

const ROOM_LABELS = {
  central: '控制中枢', meeting: '会客室', factory: '加工站', contact: '办公室', train: '训练室', recycle: '回收站',
  dormitory_1: '宿舍 1', dormitory_2: '宿舍 2', dormitory_3: '宿舍 3', dormitory_4: '宿舍 4',
  gaming_1: '协助位 1', gaming_2: '协助位 2', gaming_3: '协助位 3',
}
const PRODUCTS = { exp3: '作战记录', exp: '作战记录', gold: '赤金', lmd: '龙门币', money: '龙门币', orirock: '源石碎片', fragment: '源石碎片', orundum: '合成玉' }

/** Active previews retain every slot; source-retired backups remain visibly archived. */
export function summarizeMowerRoster(payload) {
  const names = new Set()
  let archivedBackupCount = 0
  function rooms(plan) {
    return Object.entries(plan ?? {}).map(([roomId, room]) => ({
      roomId,
      label: ROOM_LABELS[roomId] ?? roomId.replace(/^room_(\d)_(\d)$/, 'B$10$2'),
      name: room.name || ROOM_LABELS[roomId] || '未设置',
      product: PRODUCTS[room.product] ?? room.product ?? '',
      slots: (room.plans ?? []).map((slot, index) => {
        const agent = slot.agent?.trim() || '空位'
        const bindings = [slot, ...(Array.isArray(slot.group_bindings) ? slot.group_bindings : [])]
        const replacements = [...new Set(bindings.flatMap(binding => binding.replacement ?? []))]
        for (const name of [agent, ...replacements]) {
          if (name && name !== '空位' && !['free', 'current'].includes(name.toLowerCase())) names.add(name)
        }
        const label = /^free$/i.test(agent) ? 'Free（自动选人）' : /^current$/i.test(agent) ? 'Current（沿用当前）' : displayOperatorName(agent)
        return { index, agent: label, group: bindings.map(binding => binding.group).filter(Boolean).join(' / '), replacements: replacements.map(displayOperatorName) }
      }),
    }))
  }
  const mainKey = typeof payload.default === 'string' && payload.default.trim() ? payload.default.trim() : 'plan1'
  const plans = [{ name: '主表', rooms: rooms(payload[mainKey]), trigger: '', task: '' }]
  for (const [index, backup] of (payload.backup_plans ?? []).entries()) {
    if (containsRetiredRescueCondition(backup.trigger)) {
      archivedBackupCount++
      const archivedSource = JSON.stringify(backup)
      plans.push({
        name: `${typeof backup.name === 'string' && backup.name ? backup.name : `副表 ${index + 1}`}（已归档 / 不参与模拟）`,
        archived: true,
        archivedSource,
        rooms: [],
        trigger: `原始归档数据（仅保留，不执行）：${archivedSource}`,
        task: '',
      })
      continue
    }
    plans.push({
      name: backup.name || `副表 ${index + 1}`,
      rooms: rooms(backup.plan),
      trigger: backup.trigger ? JSON.stringify(backup.trigger) : '无触发条件',
      task: backup.task ? JSON.stringify(backup.task) : '',
    })
  }
  const backupCount = plans.length - 1
  return { plans, mainKey, operatorCount: names.size, backupCount,
    activeBackupCount: backupCount - archivedBackupCount, archivedBackupCount }
}
