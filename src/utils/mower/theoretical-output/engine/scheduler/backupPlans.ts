import {mowerPlanEntries} from './mowerPlanOrder'
// Mower compatibility semantics: ArkMowers/arknights-mower (MIT, Copyright 2021 Nano).
// See validation/mower-backup-2026-09-22/implementation-report.md for source contracts.
import { OPERATOR_MAP } from '../domain/operators'
import {MowerTask} from './mowerTaskQueue'
import { resolveOperatorCharId as resolveId } from '../workbench/compat/mowerJson'
import type { MowerRoomId, RosterWorkspace } from '../workbench/model'
import { compileRosterSchedule } from './compileRosterSchedule'
import { compiledScheduleToRuntimeConfig } from './scheduleAdapter'
import {normalizeMowerRecoveryBeds} from './mowerRecoveryBeds'
import type { CompiledSchedule } from './types'
import type { RuntimeState } from './rosterRuntime'
import { compileBackupExpression } from './backupExpression'
import {getMowerSourceRuntime,makeMowerSchedulingData} from './mowerSourceRuntime'
import {projectMowerArrangements} from './mowerObservations'
import type {MowerSchedulingData} from './mowerSchedulingData'
import {MOWER_TASK_TYPES as T} from './mowerTaskQueue'
import {alphaCorrectGroupDorms,alphaRebalanceDorms,alphaPosition} from './mowerAlphaDorm'
import {mergeMowerPlanOverlay,mergeMowerShiftTransition,coalesceMowerBackupTransition,stripMowerCurrent,type MowerShiftModel} from './mowerShiftCycle'
export { actualRoom } from './backupExpression'

export const BACKUP_TIMINGS = { BEGINNING: 0, BEFORE_WORK: 100, BEFORE_DORM: 200, BEFORE_PLANNING: 300, AFTER_PLANNING: 600, END: 999 } as const
export type BackupTiming = keyof typeof BACKUP_TIMINGS
type Expression = ReturnType<typeof compileBackupExpression>['evaluate']
const lists = ['rest_in_full', 'exhaust_require', 'workaholic', 'resting_priority', 'resting_priority_replacement', 'free_room_exclusions', 'resting_standby', 'free_blacklist', 'refresh_trading', 'refresh_drained', 'ope_resting_priority'] as const
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const fail = (message: string): never => { throw new Error(`副表：${message}`) }
function operator(value: unknown): string {
  if (typeof value !== 'string' || !OPERATOR_MAP.has(resolveId(value))) return fail(`未知干员 ${String(value)}`)
  return resolveId(value)
}
export function evaluateBackupExpression(source: unknown, state: RuntimeState) {
  return compileBackupExpression(source, new Set()).evaluate(state)
}
export interface BackupDiagnostic { code: string; message: string }
interface BackupPlan {
  conf:Record<string,unknown>
  usesCurrentMood:boolean
  name: string; timing: BackupTiming; exitTiming: BackupTiming; condition: Expression
  slots: { room: MowerRoomId; index: number; agent: string; group: string | null; replacements: string[] }[]
  policies: Partial<Record<typeof lists[number], string[]>>
  task: Record<string, string[]>
}
function parsePlans(workspace: RosterWorkspace, participants: Set<string>, diagnostics: BackupDiagnostic[] = []): BackupPlan[] {
  const known = (value: unknown) => { const id = operator(value); participants.add(id); return id }
  return workspace.compatibility.backupPlans.map((raw, index) => {
    if (!record(raw)) return fail(`#${index + 1} 格式错误`)
    const name = typeof raw.name === 'string' ? raw.name : `#${index + 1}`
    try {
      const compiledCondition = compileBackupExpression(raw.trigger, participants)
      const condition = compiledCondition.evaluate
      const usesCurrentMood = compiledCondition.usesCurrentMood
      if (compiledCondition.skipped) {
        diagnostics.push({ code: 'BACKUP_EXTERNAL_CONDITION_SKIPPED', message: `副表 ${name}（#${index + 1}）：跳过依赖 ${compiledCondition.skipped} 的整张副表；未执行其岗位、策略与任务` })
        return { name, timing: 'AFTER_PLANNING' as const, exitTiming: 'AFTER_PLANNING' as const, condition, usesCurrentMood, slots: [], policies: {}, task: {},conf:{} }
      }
      const timing = typeof raw.trigger_timing === 'string' ? raw.trigger_timing.toUpperCase() : ''
      const slots: BackupPlan['slots'] = [], task: BackupPlan['task'] = {}, policies: BackupPlan['policies'] = {}
      if (raw.plan !== undefined && !record(raw.plan) || raw.task !== undefined && !record(raw.task) || raw.conf !== undefined && !record(raw.conf)) fail('plan/task/conf 格式错误')
      for (const [room, data] of mowerPlanEntries(record(raw.plan) ? raw.plan : {})) {
        const facility = workspace.mainPlan.facilities[room as MowerRoomId]
        if (!facility || !record(data) || !Array.isArray(data.plans) || data.plans.length > facility.slots.length) fail(`计划房间/槽位错误 ${room}`)
        ;(data as { plans: unknown[] }).plans.forEach((slot, i) => {
          if (!record(slot) || typeof slot.agent !== 'string' || !Array.isArray(slot.replacement ?? [])) return fail(`计划槽位错误 ${room}.${i}`)
          if (slot.agent === 'Current') return
          if (slot.agent === 'Free' && facility.type !== 'dormitory') fail(`Free 只能用于宿舍 ${room}`)
          slots.push({ room: room as MowerRoomId, index: i, agent: slot.agent === 'Free' ? 'Free' : known(slot.agent), group: typeof slot.group === 'string' ? slot.group : null, replacements: (slot.replacement as unknown[] ?? []).map(value=>value==='Free'?'Free':known(value)) })
        })
      }
      for (const key of lists) {
        const value = (raw.conf as Record<string, unknown> | undefined)?.[key] ?? ''
        const values = typeof value === 'string' ? value.replace(/，/g, ',').split(',').map(v => v.trim()).filter(Boolean) : Array.isArray(value) ? value : fail(`策略格式错误 ${key}`)
        policies[key] = values.map(known)
      }
      for (const [room, values] of mowerPlanEntries(record(raw.task) ? raw.task : {})) {
        const facility = workspace.mainPlan.facilities[room as MowerRoomId]
        if (!facility || !Array.isArray(values) || values.length > facility.slots.length) fail(`任务房间/槽位错误 ${room}`)
        task[room] = (values as unknown[]).map(value => value === 'Current' || value === 'Free' ? value : known(value))
        if (facility.type !== 'dormitory' && task[room]!.includes('Free')) fail(`任务 Free 只能用于宿舍 ${room}`)
      }
      const entry = timing in BACKUP_TIMINGS ? timing as BackupTiming : 'AFTER_PLANNING'
      const exit = typeof raw.exit_trigger_timing === 'string' && raw.exit_trigger_timing ? raw.exit_trigger_timing.toUpperCase() : undefined
      return { name, timing: entry, exitTiming: exit ? exit in BACKUP_TIMINGS ? exit as BackupTiming : 'AFTER_PLANNING' : entry, condition, usesCurrentMood, slots, policies, task,conf:record(raw.conf)?raw.conf:{} }
    } catch (error) { return fail(`${name}：${error instanceof Error ? error.message : String(error)}`) }
  })
}
export function backupParticipants(workspace: RosterWorkspace): string[] {
  const participants = new Set<string>(); parsePlans(workspace, participants); return [...participants]
}

/** Keeps planned roles separate from physical occupancy; no morale/production reset. */
export function createBackupPlanController(base: CompiledSchedule, state: RuntimeState, options: { virtualRunners?: boolean; canUseFiammetta?: (id: string) => boolean } = {}) {
  base = structuredClone(base)
  const recoveryBeds = new Map(compiledScheduleToRuntimeConfig(base).beds.map(bed => [bed.id,bed]))
  const diagnostics: BackupDiagnostic[] = []
  const participants = new Set<string>(), plans = parsePlans(base.sourceWorkspace, participants, diagnostics)
  const active = plans.map(() => false)
  for (const id of participants) state.morale[id] ??= base.assumptions.operatorMorale[id] ?? base.assumptions.initialMorale
  const displaced = new Set<string>()
  let effective = base
  const alphaConfigs=new Map<string,{compiled:CompiledSchedule;config:RuntimeState['config']}>()
  // Keep the caller's compiled base constraints (including an intentionally empty
  // recovery pool) when a preview refreshes the unchanged base plan.
  if(!plans.length)alphaConfigs.set(JSON.stringify(active),{compiled:base,config:state.config})
  function alphaConfiguration(conditions:boolean[]){
    const key=JSON.stringify(conditions),cached=alphaConfigs.get(key);if(cached)return cached
    const workspace=structuredClone(base.sourceWorkspace);workspace.compatibility.backupPlans=[]
    let dormOrder=typeof base.rawConf.dorm_order==='string'?base.rawConf.dorm_order:base.assumptions.dormOrder??''
    conditions.forEach((enabled,i)=>{
      if(!enabled)return
      const p=plans[i]!
      for(const slot of p.slots)workspace.mainPlan.facilities[slot.room].slots[slot.index]={occupant:slot.agent==='Free'?{kind:'free'}:{kind:'operator',operatorId:slot.agent},groupId:slot.group,replacements:[...slot.replacements]}
      for(const list of lists){const original=workspace.mainPlan.conf[list],values=Array.isArray(original)?original.map(v=>resolveId(String(v))):typeof original==='string'?original.split(',').filter(Boolean).map(resolveId):[];workspace.mainPlan.conf[list]=[...new Set([...values,...(p.policies[list]??[])])]}
      if(typeof p.conf.dorm_order==='string'&&(p.conf.dorm_order_override===true||p.conf.dorm_order_override===undefined&&p.conf.dorm_order.split(',').filter(Boolean).some((r,i)=>r!=='dormitory_'+(i+1))))dormOrder=p.conf.dorm_order
      for(const field of ['mood_limits','operator_mood_limits'])if(record(p.conf[field]))workspace.mainPlan.conf[field]=field==='operator_mood_limits'?{...(record(workspace.mainPlan.conf[field])?workspace.mainPlan.conf[field]:{}),...p.conf[field]}:structuredClone(p.conf[field])
    })
    // Alpha folds legacy bed order into a room order, and rebuilds the bed pool.
    const rooms=Object.entries(workspace.mainPlan.facilities).filter(([,f])=>f.type==='dormitory'&&f.level>0).map(([room])=>room)
    const roomOrder:string[]=[]
    for(const entry of dormOrder.split(',').filter(Boolean)){const room=rooms.includes(entry)?entry:entry.replace(/_\d+$/,'');if(rooms.includes(room)&&!roomOrder.includes(room))roomOrder.push(room)}
    rooms.forEach(room=>{if(!roomOrder.includes(room))roomOrder.push(room)})
    const compiled=compileRosterSchedule(workspace,{...base.assumptions,dormOrder:''});compiled.assumptions.defaultsApplied=[...base.assumptions.defaultsApplied]
    if(compiled.diagnostics.some(d=>d.severity==='error'||d.code==='UNKNOWN_OPERATOR'))fail(compiled.diagnostics.map(d=>d.message).join('；'))
    const config=compiledScheduleToRuntimeConfig(compiled);config.mowerAlpha=true;config.mowerDormOrder=roomOrder;config.availableIdleOperators=state.config.availableIdleOperators
    if(state.config.mowerTaskScheduling?.adjustForRunOrders!==undefined)config.mowerTaskScheduling={...config.mowerTaskScheduling,adjustForRunOrders:state.config.mowerTaskScheduling.adjustForRunOrders}
    if(options.virtualRunners)config.runOrderPolicies=[]
    if(config.fiammetta&&options.canUseFiammetta&&!options.canUseFiammetta(config.fiammetta.operatorId))config.fiammetta=undefined
    const primaries=config.positions.map(p=>p.primary);if(new Set(primaries).size!==primaries.length)fail('副表生效组合重复主班')
    normalizeMowerRecoveryBeds(config)
    for(const bed of config.beds)bed.managedRecovery=true
    const snapshot={compiled,config};alphaConfigs.set(key,snapshot);return snapshot
  }
  const alphaModel:MowerShiftModel={
    count:plans.length,
    // This preserves the source's one-second observation capability; it does
    // not claim exact roots for arbitrary imported comparison expressions.
    nextConditionWakeMicros:data=>plans.some(plan=>plan.usesCurrentMood)?data.nowMicros+1_000_000:undefined,
    evaluate(data){return plans.map(p=>Boolean(p.condition({...state,time:data.nowMicros/3_600_000_000,mowerSource:{...getMowerSourceRuntime(state),data}})))},
    swap(data,conditions){const {config}=alphaConfiguration(conditions);const next=makeMowerSchedulingData({...state,config,morale:{...state.morale}},{data});next.planConditions=[...conditions];return next},
    transition(previous,next,original,conditions,recovery=previous){
      const transition:Record<string,string[]>={},groupPositions=new Set<string>()
      for(const [room,names] of Object.entries(next.plan))names.forEach((name,index)=>{
        if(room.startsWith('dorm')&&name==='Free')return
        const oldName=previous.plan[room]?.[index],old=previous.operators[oldName??''],op=next.operators[name]
        if(oldName===name&&old?.group===op?.group&&JSON.stringify(old?.replacement??[])===JSON.stringify(op?.replacement??[]))return
        if(room.startsWith('dorm')&&op?.group){groupPositions.add(alphaPosition(room,index));return}
        const actual=next.currentOperator(room,index)
        if(actual&&(actual.name===name||op?.replacement.includes(actual.name)&&!next.excludedCandidates.has(actual.name)))return
        ;(transition[room]??=Array(names.length).fill('Current'))[index]=name
      })
      plans.forEach((p,i)=>{if(!original[i]||conditions[i])return;for(const [room,names] of Object.entries(p.task))names.forEach((name,index)=>{if(name!=='Current'&&next.plan[room]?.[index]!==undefined)(transition[room]??=Array(next.plan[room]!.length).fill('Current'))[index]=next.plan[room]![index]!})})
      plans.forEach((p,i)=>{if(original[i]||!conditions[i])return;mergeMowerPlanOverlay(transition,p.task,next);for(const [room,names] of Object.entries(p.task))names.forEach((name,index)=>{if(name!=='Current')groupPositions.delete(alphaPosition(room,index))})})
      if(groupPositions.size)alphaCorrectGroupDorms(next,transition,groupPositions)
      const signature=(data:MowerSchedulingData)=>JSON.stringify([data.dormOrder,data.dorms.map(b=>[b.position,data.plan[b.position[0]]?.[b.position[1]],data.operators[data.plan[b.position[0]]?.[b.position[1]]??'']?.group,data.effectiveFreeSlot(b),b.name])])
      if(signature(recovery)!==signature(next)){
        const migration=projectMowerArrangements(next,[transition]),reserved=new Set(Object.entries(transition).flatMap(([room,names])=>room.startsWith('dorm')?[]:names.filter(n=>!['Current','Free',''].includes(n))))
        const plan=alphaRebalanceDorms(migration,recovery.dorms,reserved);next.dorms=migration.dorms;mergeMowerShiftTransition(transition,plan,next)
      }
      for(const [room,names] of Object.entries(transition))if(room.startsWith('dorm'))names.forEach((name,index)=>{if(!['Current','Free',''].includes(name)&&next.restMoodComplete(name)&&next.currentOperator(room,index)?.name!==name)names[index]='Current'})
      return stripMowerCurrent(transition)
    },
    activate(conditions){
      const snapshot=alphaConfiguration(conditions)
      conditions.forEach((value,i)=>{if(value!==active[i])state.events.push({time:state.time,type:'backup-plan',operators:[],backupIndex:i,backupName:plans[i]!.name,active:value,timing:'END'});active[i]=value})
      state.config=snapshot.config;effective=snapshot.compiled;getMowerSourceRuntime(state).data.planConditions=[...active]
    },
  }
  if(state.config.mowerAlpha){state.mowerShiftModel=alphaModel;getMowerSourceRuntime(state).data.planConditions=[...active]}
  function evaluateAlpha(timing:BackupTiming):boolean{
    const source=getMowerSourceRuntime(state),queue=source.queue,data=source.data
    if(queue.tasks.some(t=>t.backupShiftActive||t.type===T.FIAMMETTA&&t.timeMicros<=data.nowMicros)||source.activeTask?.type===T.FIAMMETTA)return false
    const original=[...active],seen=new Set([JSON.stringify(original)]);let current=data,conditions=alphaModel.evaluate(data)
    for(let pass=0;pass<64;pass++){
      if(conditions.every((v,i)=>v===current.planConditions[i])){
        if(conditions.every((v,i)=>v===original[i]))return false
        const transition=alphaModel.transition(data,current,original,conditions),merged=coalesceMowerBackupTransition(current,transition,queue.tasks)
        const generated:MowerTask[]=[]
        if(Object.keys(merged.plan).length){const task=new MowerTask({time:state.time,type:Object.keys(merged.plan).some(room=>room.startsWith('dorm'))?T.RE_ORDER:T.SELF_CORRECTION,plan:merged.plan,metadata:'副表内存收敛'});if(state.mowerBackupContext?.customTimeMicros!==undefined)task.timeMicros=state.mowerBackupContext.customTimeMicros;generated.push(task);queue.tasks.push(task);queue.tasks=queue.tasks.filter(t=>!merged.consumed.includes(t))}
        alphaModel.activate(conditions);getMowerSourceRuntime(state).data.dorms=current.dorms
        for(const event of state.events.slice(-plans.length))if(event.type==='backup-plan'&&event.time===state.time)event.timing=timing
        const followup=new MowerTask({time:state.time});if(state.mowerBackupContext?.customTimeMicros!==undefined)followup.timeMicros=state.mowerBackupContext.customTimeMicros;generated.push(followup)
        state.mowerBackupGenerated=generated
        return Object.keys(merged.plan).length>0
      }
      const key=JSON.stringify(conditions)
      if(seen.has(key)){state.diagnostics.push({code:'mower-backup-cycle',message:'副表条件在内存演算中出现循环，保持切换前状态'});return false}
      seen.add(key);current=alphaModel.swap(current,conditions);conditions=alphaModel.evaluate(current)
    }
    state.diagnostics.push({code:'mower-backup-cycle',message:'副表条件在 64 次演算内未收敛，保持切换前状态'});return false
  }
  const remove = (id: string, occupants: Record<string, string>, beds: Record<string, string>) => {
    for (const [key, value] of Object.entries(occupants)) if (value === id) delete occupants[key]
    for (const [key, value] of Object.entries(beds)) if (value === id) delete beds[key]
  }
  const unique = (occupants: Record<string, string>, beds: Record<string, string>) => {
    const ids = [...Object.values(occupants), ...Object.values(beds)]
    if (new Set(ids).size !== ids.length) fail('任务造成重复占岗')
  }
  function evaluate(timing: BackupTiming): boolean {
    if(state.config.mowerAlpha)return evaluateAlpha(timing)
    if(state.mowerSource?.queue.tasks.some(task=>task.backupShiftActive))return false
    const next = plans.map((p, i) => {
      const enabled = Boolean(p.condition(state))
      return BACKUP_TIMINGS[enabled ? p.timing : p.exitTiming] <= BACKUP_TIMINGS[timing] ? enabled : active[i]!
    })
    if (next.every((value, i) => value === active[i])) return false
    const workspace = structuredClone(base.sourceWorkspace)
    workspace.compatibility.backupPlans = []
    next.forEach((enabled, i) => {
      if (!enabled) return
      const plan = plans[i]!
      for (const slot of plan.slots) workspace.mainPlan.facilities[slot.room].slots[slot.index] = {
        occupant: slot.agent === 'Free' ? { kind: 'free' } : { kind: 'operator', operatorId: slot.agent },
        groupId: slot.group, replacements: [...slot.replacements],
      }
      for (const key of lists) {
        const original = workspace.mainPlan.conf[key]
        const values = Array.isArray(original) ? original.map(value => resolveId(String(value))) : typeof original === 'string' ? original.split(',').filter(Boolean).map(resolveId) : []
        workspace.mainPlan.conf[key] = [...new Set([...values, ...(plan.policies[key] ?? [])])]
      }
    })
    const compiled = compileRosterSchedule(workspace, base.assumptions)
    // A backup changes the roster; resolved values keep their original input provenance.
    compiled.assumptions.defaultsApplied = [...base.assumptions.defaultsApplied]
    if (compiled.diagnostics.some(d => d.severity === 'error' || d.code === 'UNKNOWN_OPERATOR')) fail(compiled.diagnostics.map(d => d.message).join('；'))
    const config = compiledScheduleToRuntimeConfig(compiled)
    if(state.config.mowerTaskScheduling?.adjustForRunOrders!==undefined)config.mowerTaskScheduling={...config.mowerTaskScheduling,adjustForRunOrders:state.config.mowerTaskScheduling.adjustForRunOrders}
    config.availableIdleOperators = state.config.availableIdleOperators
    // Default alpha init_and_validate(update=True) keeps the original recovery pool.
    // Newly exposed Free slots remain real idle positions, without a group timer.
    for (const bed of config.beds) {
      const original = recoveryBeds.get(bed.id)
      bed.managedRecovery = Boolean(original)
      bed.vip = original?.vip ?? false
    }
    // Preserve exclusions applied by the simulator (virtual runners / locked skill stages).
    if (options.virtualRunners) config.runOrderPolicies = []
    if (config.fiammetta && options.canUseFiammetta && !options.canUseFiammetta(config.fiammetta.operatorId)) config.fiammetta = undefined
    const primaries = config.positions.map(p => p.primary)
    if (new Set(primaries).size !== primaries.length) fail(`激活组合 ${next.map((v, i) => v ? plans[i]!.name : '').filter(Boolean).join('、')} 重复主班`)
    // alpha init validates the full group's effective Free-bed capacity.
    const groups = new Map<string, number>()
    for (const p of config.positions) if (p.group && !p.dormitory && !p.permanent) groups.set(p.group,(groups.get(p.group) ?? 0)+1)
    for (const [group,count] of groups) if (count > config.beds.filter(b => b.managedRecovery !== false).length) fail(group+' 分组需要 '+count+' 个休息床位，副表仅提供 '+config.beds.filter(b => b.managedRecovery !== false).length+' 个')
    if(state.config.mowerSourcePlan){
      const generated:MowerTask[]=[],context=state.mowerBackupContext??{appendEmptyTask:true,restoreOnDeactivate:false}
      const restored:Record<string,Set<number>>={}
      for(const [i,plan] of plans.entries()){
        if(next[i]===active[i])continue
        if(next[i]&&Object.keys(plan.task).length){
          const task=new MowerTask({time:state.time,plan:structuredClone(plan.task)})
          if(context.customTimeMicros!==undefined)task.timeMicros=context.customTimeMicros
          generated.push(task)
        }else if(Object.keys(plan.task).length&&context.restoreOnDeactivate){
          for(const [room,names] of Object.entries(plan.task))names.forEach((name,index)=>{if(name!=='Current')(restored[room]??=new Set()).add(index)})
        }
      }
      const restore:Record<string,string[]>={}
      for(const [room,indexes] of Object.entries(restored)){
        const slots=config.mowerSourcePlan?.[room];if(!slots)continue
        const names=slots.map(()=> 'Current');for(const index of indexes)if(slots[index])names[index]=slots[index]!.agent
        if(names.some(name=>name!=='Current'))restore[room]=names
      }
      if(Object.keys(restore).length){const task=new MowerTask({time:state.time,plan:restore});if(context.customTimeMicros!==undefined)task.timeMicros=context.customTimeMicros;generated.push(task)}
      state.config=config;effective=compiled
      next.forEach((value,i)=>{
        if(value!==active[i])state.events.push({time:state.time,type:'backup-plan',operators:[],backupIndex:i,backupName:plans[i]!.name,active:value,timing})
        active[i]=value
      })
      if(state.mowerSource)state.mowerSource.data.planConditions=[...active]
      if(context.appendEmptyTask&&!generated.length)state.mowerBackupGenerated=[new MowerTask({time:state.time})]
      else state.mowerBackupGenerated=generated
      return generated.length>0
    }
    const previous = { ...state.occupants, ...state.bedOccupants }
    const resting = new Set([...Object.values(state.bedOccupants), ...state.config.positions.filter(p => p.dormitory).map(p => state.occupants[p.id]).filter(Boolean)])
    const occupants: Record<string, string> = {}, beds: Record<string, string> = {}
    for (const bed of config.beds) if (previous[bed.id]) beds[bed.id] = previous[bed.id]!
    for (const p of config.positions) {
      const old = previous[p.id]
      if (old) occupants[p.id] = old
    }
    // Reconcile the new plan for working primaries and fixed dormitory keepers.
    const assignments = config.positions.filter(p => state.config.positions.find(old => old.id === p.id)?.primary !== p.primary
      && (p.dormitory || !resting.has(p.primary) && Object.values(state.occupants).includes(p.primary)))
    for (const p of assignments) remove(p.primary, occupants, beds)
    for (const p of assignments) occupants[p.id] = p.primary
    const taskEvents: { index: number; operators: string[] }[] = []
    for (const [i, plan] of plans.entries()) {
      if (!next[i] || active[i] || !Object.keys(plan.task).length) continue
      const before = { ...occupants, ...beds }, targets: Record<string, string> = {}
      const explicit = Object.values(plan.task).flat().filter(agent => agent !== 'Current' && agent !== 'Free')
      if (new Set(explicit).size !== explicit.length) fail(`${plan.name} 任务重复干员`)
      for (const [room, slots] of Object.entries(plan.task)) slots.forEach((agent, index) => {
        const key = `${room}_${index}`
        // Moving an explicitly named operator necessarily vacates its old Current slot.
        const id = agent === 'Current' ? (before[key] && !explicit.includes(before[key]!) ? before[key] : undefined) : agent === 'Free' ? undefined : agent
        if (id) targets[key] = id
      })
      if (new Set(Object.values(targets)).size !== Object.values(targets).length) fail(`${plan.name} 任务重复干员`)
      for (const id of Object.values(targets)) remove(id, occupants, beds)
      for (const [room, slots] of Object.entries(plan.task)) slots.forEach((_, index) => {
        const key = `${room}_${index}`; delete occupants[key]; delete beds[key]
        if (!targets[key]) return
        if (config.beds.some(b => b.id === key)) beds[key] = targets[key]!
        else if (config.positions.some(p => p.id === key)) occupants[key] = targets[key]!
        else fail(`${plan.name} 任务目标没有有效岗位 ${key}`)
      })
      taskEvents.push({ index: i, operators: Object.values(targets) })
    }
    // A forced rest may vacate a work slot; reserve only an eligible real substitute.
    for (const p of config.positions.filter(p => !p.dormitory)) if (!occupants[p.id]) {
      const candidate = p.candidates.find(id => !primaries.includes(id) && !Object.values(occupants).includes(id) && !config.excludedCandidates?.includes(id))
      if (candidate) { remove(candidate, occupants, beds); occupants[p.id] = candidate }
    }
    // Tasks and plan changes may evict working or resting primaries. Preserve
    // every displaced member and queue a real bed without inventing capacity.
    const present = new Set([...Object.values(occupants), ...Object.values(beds)])
    for (const id of [...Object.values(state.occupants), ...resting, ...(state.pendingRest ?? [])]) if (id && !present.has(id)) displaced.add(id)
    for (const id of present) displaced.delete(id)
    const pendingRest = [...new Set([...(state.pendingRest ?? []), ...resting, ...displaced])].filter((id): id is string => Boolean(id) && primaries.includes(id!) && !Object.values(occupants).includes(id!) && !Object.values(beds).includes(id!))
    const activeBackupBeds = new Set<string>()
    for (const [i, plan] of plans.entries()) {
      if (next[i] && Object.keys(plan.task).length) {
        for (const [room, slots] of Object.entries(plan.task)) {
          if (room.startsWith('dormitory')) {
            slots.forEach((agent, index) => {
              if (agent !== 'Current' && agent !== 'Free') {
                activeBackupBeds.add(agent)
                const key = `${room}_${index}`
                if (config.beds.some(b => b.id === key) && !beds[key]) {
                  remove(agent, occupants, beds)
                  beds[key] = agent
                }
              }
            })
          }
        }
      }
    }
    unique(occupants, beds)
    state.backupBedOccupants = activeBackupBeds
    state.config = config; state.occupants = occupants; state.bedOccupants = beds; state.pendingRest = pendingRest
    state.returnDeadlines = {}; state.timingSignature = undefined
    effective = compiled
    next.forEach((value, i) => {
      if (value !== active[i]) state.events.push({ time: state.time, type: 'backup-plan', operators: [], backupIndex: i, backupName: plans[i]!.name, active: value, timing })
      active[i] = value
    })
    for (const task of taskEvents) state.events.push({ time: state.time, type: 'backup-task', operators: task.operators, backupIndex: task.index, backupName: plans[task.index]!.name, timing })
    return true
  }
  return { active, evaluate, diagnostics, get schedule() { return effective }, count: plans.length }
}
