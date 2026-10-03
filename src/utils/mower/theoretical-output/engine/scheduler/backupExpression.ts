// Mower logic_expression.py serializes (left operator right) before evaluation.
// This interpreter preserves that syntax without evaluating imported Python/JS.
import { OPERATOR_MAP } from '../domain/operators'
import { resolveOperatorCharId } from '../workbench/compat/mowerJson'
import type { RuntimeState } from './rosterRuntime'
import type {MowerDateTimeValue} from './mowerSchedulingData'
import {toMowerMicros} from './mowerTaskQueue'

type Value = string | number | boolean | null | MowerDateTimeValue
type Expression = (state: RuntimeState) => Value
type Token = { text: string; kind: 'operator' | 'value' | 'worker' | 'external'; value?: Value; name?: string; member?: string }
const roomName = /^(?:room_[1-3]_[1-3]|dormitory_[1-4]|central|meeting|factory|contact|train)$/
const fail = (message: string): never => { throw new Error(`副表：${message}`) }

export function actualRoom(state: RuntimeState, id: string): string {
  const position = state.config.positions.find(p => state.occupants[p.id] === id)
  return position?.roomId ?? state.config.beds.find(b => state.bedOccupants[b.id] === id)?.roomId ?? ''
}

function serialize(source: unknown, depth = 0, budget = { nodes: 0 }): string {
  if (depth > 32 || ++budget.nodes > 512) return fail('条件树超过限制')
  if (typeof source === 'string') {
    if (source.length > 20000) return fail('条件文本超过限制')
    return source
  }
  if (typeof source === 'boolean') return source ? 'True' : 'False'
  if (typeof source === 'number' && Number.isFinite(source)) return String(source)
  if (!source || typeof source !== 'object' || Array.isArray(source)) return fail('条件必须为表达式树')
  const node = source as Record<string, unknown>
  const text = `(${serialize(node.left ?? '', depth + 1, budget)} ${serialize(node.operator ?? '', depth + 1, budget)} ${serialize(node.right ?? '', depth + 1, budget)})`
  if (text.length > 20000) return fail('条件文本超过限制')
  return text
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (let rest = text.trim(); rest; rest = rest.trimStart()) {
    if (tokens.length >= 1024) return fail('条件文本超过限制')
    const worker = /^op_data\.operators\[['"]([^'"\[\]]+)['"]\]\.(is_resting\(\)|is_working\(\)|current_mood\(\)|current_room)/.exec(rest)
    const external = /^op_data\.party_time\b/.exec(rest)
    const quoted = /^(['"])((?:\\.|(?!\1)[^\\])*)\1/.exec(rest)
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)
    const word = /^(?:and|or|not|is|in|True|False|None)\b/.exec(rest)
    const symbol = /^(?:==|!=|<=|>=|[<>+*/()\-])/.exec(rest)
    const room = /^(?:room_[1-3]_[1-3]|dormitory_[1-4]|central|meeting|factory|contact|train)\b/.exec(rest)
    let token: Token
    if (worker) token = { text: worker[0], kind: 'worker', name: worker[1], member: worker[2] }
    else if (external) token = { text: external[0], kind: 'external' }
    else if (quoted) token = { text: quoted[0], kind: 'value', value: quoted[2]!.replace(/\\(['"\\nrt])/g, (_, c: string) => ({ n: '\n', r: '\r', t: '\t' }[c] ?? c)) }
    else if (number && Number.isFinite(Number(number[0]))) token = { text: number[0], kind: 'value', value: Number(number[0]) }
    else if (word) token = ['True', 'False', 'None'].includes(word[0])
      ? { text: word[0], kind: 'value', value: word[0] === 'None' ? null : word[0] === 'True' }
      : { text: word[0], kind: 'operator' }
    else if (symbol) token = { text: symbol[0], kind: 'operator' }
    else if (room) token = { text: room[0], kind: 'value', value: room[0] }
    else return fail(`不支持的条件 ${rest.slice(0, 120)}`)
    tokens.push(token); rest = rest.slice(token.text.length)
  }
  return tokens
}

export function compileBackupExpression(source: unknown, participants: Set<string>): { evaluate: Expression; skipped?: string } {
  const tokens = tokenize(serialize(source))
  let cursor = 0, nesting = 0
  const peek = () => tokens[cursor]?.text
  const take = (text: string) => peek() === text ? (++cursor, true) : false
  const numeric = (value: Value) => typeof value === 'number' ? value : typeof value === 'boolean' ? Number(value) : fail('比较/算术运算需要数字')
  const binary = (left: Expression, right: Expression, op: string): Expression => state => {
    const a = left(state)
    if (op === 'and') return a ? right(state) : a
    if (op === 'or') return a ? a : right(state)
    const b = right(state)
    if (op === 'is' || op === 'is not') return op === 'is' ? a === b : a !== b
    if (op === '==' || op === '!=') {
      const numbers=(typeof a==='boolean'||typeof a==='number')&&(typeof b==='boolean'||typeof b==='number')
      const dates=a!==null&&b!==null&&typeof a==='object'&&typeof b==='object'
      const equal=numbers?numeric(a)===numeric(b):dates?a.timeMicros===b.timeMicros:a===b
      return op==='=='?equal:!equal
    }
    if (op === 'in' || op === 'not in') {
      if (typeof a !== 'string' || typeof b !== 'string') return fail('成员比较仅支持字符串')
      return op === 'in' ? b.includes(a) : !b.includes(a)
    }
    const x = numeric(a), y = numeric(b)
    if (op === '<') return x < y
    if (op === '<=') return x <= y
    if (op === '>') return x > y
    if (op === '>=') return x >= y
    const value = op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : x / y
    if (!Number.isFinite(value)) return fail('条件运算结果不是有限数')
    return value
  }
  function atom(): Expression {
    if (++nesting > 64) return fail('条件嵌套超过限制')
    try {
      if (take('(')) {
        if (take(')')) return () => false // Mower's empty tuple is false.
        const expr = logicalOr()
        if (!take(')')) return fail('条件括号不完整')
        return expr
      }
      if (take('+')) { const expr = atom(); return state => numeric(expr(state)) }
      if (take('-')) { const expr = atom(); return state => -numeric(expr(state)) }
      const token = tokens[cursor++]
      if (token?.kind === 'value') return () => token.value!
      if (token?.kind === 'external') return state => state.mowerSource?.data.partyTime ?? null
      if (token?.kind === 'worker') {
        const id = resolveOperatorCharId(token.name!)
        if (!OPERATOR_MAP.has(id)) return fail(`未知干员 ${token.name}`)
        participants.add(id)
        return state => {
          const observed=state.mowerSource?.data.operators[id]
          const room = observed?.currentRoom??actualRoom(state, id)
          if (token.member === 'is_resting()') return room.startsWith('dormitory_')
          if (token.member === 'is_working()') return roomName.test(room) && !room.startsWith('dormitory_')
          if (token.member === 'current_room') return room
          if(observed)return observed.currentMood(toMowerMicros(state.time))
          return state.morale[id] ?? fail(`缺少 ${token.name} 的心情`)
        }
      }
      return fail(`不支持的条件 ${token?.text ?? '空操作数'}`)
    } finally { nesting-- }
  }
  function product(): Expression {
    let expr = atom()
    while (peek() === '*' || peek() === '/') { const op = tokens[cursor++]!.text; expr = binary(expr, atom(), op) }
    return expr
  }
  function sum(): Expression {
    let expr = product()
    while (peek() === '+' || peek() === '-') { const op = tokens[cursor++]!.text; expr = binary(expr, product(), op) }
    return expr
  }
  function comparison(): Expression {
    const operands = [sum()], operators: string[] = []
    while (['==', '!=', '<', '<=', '>', '>=', 'is', 'in', 'not'].includes(peek() ?? '')) {
      let op = tokens[cursor++]!.text
      if (op === 'is' && take('not')) op = 'is not'
      else if (op === 'not') { if (!take('in')) return fail('not 后缺少 in'); op = 'not in' }
      operators.push(op); operands.push(sum())
    }
    if (!operators.length) return operands[0]!
    return state => {
      let left = operands[0]!(state)
      for (let i = 0; i < operators.length; i++) {
        const right = operands[i + 1]!(state)
        if (!binary(() => left, () => right, operators[i]!)(state)) return false
        left = right
      }
      return true
    }
  }
  function negation(): Expression {
    let count = 0
    while (take('not')) count++
    const expr = comparison()
    return count ? state => count % 2 ? !expr(state) : Boolean(expr(state)) : expr
  }
  function logicalAnd(): Expression { let expr = negation(); while (take('and')) expr = binary(expr, negation(), 'and'); return expr }
  function logicalOr(): Expression { let expr = logicalAnd(); while (take('or')) expr = binary(expr, logicalAnd(), 'or'); return expr }
  const evaluate = tokens.length ? logicalOr() : () => false
  if (cursor !== tokens.length) return fail(`条件存在未解析内容 ${peek()}`)
  return { evaluate }
}
