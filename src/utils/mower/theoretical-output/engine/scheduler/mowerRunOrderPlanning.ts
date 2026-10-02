/**
 * Default Mower plan/read/adjust helpers and run_order_solver trade orchestration.
 * Source c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
 * Clock/deadline observations come from explicit I/O seams; no income fitting.
 * The candidate names extend the pinned Mower list with U-Official for this app.
 * Experimental paths, native drone internals, Fia/exhaust tails and RUN_ORDER finishing
 * remain caller responsibilities; this core does not assert full scheduler parity.
 */
import {MOWER_TASK_TYPES as T,MowerTask,MowerTaskQueue,toMowerMicros} from './mowerTaskQueue'
import {scheduleMowerTasks,type MowerTaskSchedulingOptions} from './mowerTaskScheduling'
import {TRADE_RUN_ORDER_NAMES} from '../domain/shiftRunPolicy'

export interface RunOrderPlanSlot {replacement:readonly string[]}
export interface RunOrderPlanningState {
  plan:Readonly<Record<string,readonly RunOrderPlanSlot[]>>
  /** App extension: any dedicated replacement may run, regardless of list position. */
  preferSpecialReplacement?:boolean
  /** Preserve native insertion order; not a lexicographically sorted list. */
  runOrderRooms:readonly string[]
  queue:MowerTaskQueue
  configuredDelayMinutes:number
  droneRoom:string|null
  wakeOnly?:boolean
  /** These three flags are intentionally independent. */
  flags:{planned:boolean;todoTask:boolean;collectNotification:boolean}
}
export type RunOrderIORequest=
  |{kind:'enter-room';room:string}
  |{kind:'wait-interface';room:string;requestedIntervalMicros:1_000_000}
  |{kind:'read-order';room:string;useDigitReader:true}
  |{kind:'return-main';room:string}
  |{kind:'drone';room:string;adjustTime:true}
export interface RunOrderIOObservation {
  /** Caller advances RuntimeRates/production and wall clock before resuming. */
  observedAtMicros:number
  /** The absolute time returned by native double_read_time, frozen at read time. */
  absoluteDueMicros?:number
  /** null corresponds to Python None; false is distinct and causes early return. */
  droneResult?:boolean|null
  /** Explicit observations from native drone time refresh, retaining task identity. */
  taskTimeUpdates?:readonly {task:MowerTask;timeMicros:number}[]
}
export interface RunOrderPlanningSeam {
  nowMicros():number
  nativeName(operatorId:string):string
  /** undefined corresponds to native get_current_room returning None. */
  currentDormOccupants(room:string):readonly string[]|undefined
  /**
   * No scheduling argument delay override here: native scheduling(self.tasks)
   * uses 5 minutes; configuredDelayMinutes belongs to native global config (3).
   */
  scheduling:Pick<MowerTaskSchedulingOptions,'grandet'|'enableMastery'|'maintenance'>
  /** Validation instrumentation only, not a product-facing event. */
  onScheduling?(conflict:[MowerTask,MowerTask]|undefined):void
}
export type RunOrderGenerator<T>=Generator<RunOrderIORequest,T,RunOrderIOObservation>
function acceptObservation(seam:RunOrderPlanningSeam,observation:RunOrderIOObservation):void {
  if(!Number.isSafeInteger(observation.observedAtMicros)||observation.observedAtMicros!==seam.nowMicros())
    throw new Error('Observation must describe the advanced scheduler wall clock')
  for(const update of observation.taskTimeUpdates??[]){
    if(!Number.isSafeInteger(update.timeMicros))throw new Error('Invalid observed task deadline')
    update.task.timeMicros=update.timeMicros
  }
}
function* step(seam:RunOrderPlanningSeam,request:RunOrderIORequest):RunOrderGenerator<RunOrderIOObservation>{
  const observation=yield request
  acceptObservation(seam,observation)
  return observation
}
export function* observeNativeRunOrderTime(
  state:RunOrderPlanningState,seam:RunOrderPlanningSeam,room:string,
):RunOrderGenerator<number>{
  yield* step(seam,{kind:'enter-room',room})
  yield* step(seam,{kind:'wait-interface',room,requestedIntervalMicros:1_000_000})
  const read=yield* step(seam,{kind:'read-order',room,useDigitReader:true})
  if(read.absoluteDueMicros===undefined||!Number.isSafeInteger(read.absoluteDueMicros))
    throw new Error('Native absolute order deadline observation is required')
  const executeTime=read.absoluteDueMicros-toMowerMicros(state.configuredDelayMinutes/60)
  // Returning to INFRA_MAIN takes observed time; never recompute due from the return clock.
  yield* step(seam,{kind:'return-main',room})
  return executeTime
}
export function* planDefaultRunOrder(
  state:RunOrderPlanningState,seam:RunOrderPlanningSeam,room:string,
):RunOrderGenerator<MowerTask|undefined>{
  if(state.queue.find({type:T.RUN_ORDER,metadata:room}))return
  const slots=state.plan[room]
  if(!slots)throw new Error('Native run-order room is absent from the plan: '+room)
  const names=slots.map(slot=>selectRunOrderReplacement(slot.replacement,seam.nativeName,state.preferSpecialReplacement===true))
  const timeMicros=yield* observeNativeRunOrderTime(state,seam,room)
  const task=new MowerTask({type:T.RUN_ORDER,metadata:room,plan:{[room]:names}})
  task.timeMicros=timeMicros
  task.observedOrderDueMicros=timeMicros+toMowerMicros(state.configuredDelayMinutes/60)
  state.queue.tasks.push(task)
  return task
}
/** Keep pinned Mower selection for oracle tests; app schedules opt into any-position recognition. */
export function selectRunOrderReplacement(replacements:readonly string[],nativeName:(id:string)=>string,preferSpecial=false):string{
  const dedicated=replacements.find(id=>TRADE_RUN_ORDER_NAMES.some(name=>nativeName(id).includes(name)))
  return dedicated?(preferSpecial?dedicated:replacements[0]!):'Current'
}
/** Corresponds to native default branch; experimental reconciliation is not ported here. */
export function getDefaultRunOrderAdjustRoom(
  state:RunOrderPlanningState,pair:readonly [MowerTask,MowerTask]|null|undefined,
):string|undefined{
  if(!pair)return
  const tasks=pair.filter(task=>task.type===T.RUN_ORDER&&task.metadata)
  if(tasks.length!==2)return tasks.length===1?tasks[0]!.metadata:undefined
  if(state.droneRoom&&tasks.some(task=>task.metadata===state.droneRoom))return state.droneRoom
  let room=tasks[0]!.metadata
  const first=state.plan[room]!.length,second=state.plan[tasks[1]!.metadata]!.length
  if(first===3&&second!==1)return room
  if(first>second)room=tasks[1]!.metadata
  return room
}
function schedule(state:RunOrderPlanningState,seam:RunOrderPlanningSeam):[MowerTask,MowerTask]|undefined{
  const conflict=scheduleMowerTasks(state.queue.tasks,seam.nowMicros(),{
    ...seam.scheduling,configuredDelayMinutes:state.configuredDelayMinutes,experimental:false,
  })
  seam.onScheduling?.(conflict)
  return conflict
}
export interface RunOrderTradeResult {
  /** The caller runs existing Fia/exhaust tails only when true, preserving native early returns. */
  tailShouldRun:boolean
  reason:'completed'|'adjust-room-none'|'drone-false'
  droneCount:number
}
export function* runDefaultTradeSegment(
  state:RunOrderPlanningState,seam:RunOrderPlanningSeam,
):RunOrderGenerator<RunOrderTradeResult>{
  let droneCount=0
  if(state.runOrderRooms.length){
    const valid=Object.keys(state.plan).filter(room=>room.includes('dormitory')).every(room=>{
      const occupants=seam.currentDormOccupants(room)
      return occupants!==undefined&&occupants.length===5
    })
    if(valid){
      for(const room of state.runOrderRooms)yield* planDefaultRunOrder(state,seam,room)
      let conflict=schedule(state,seam),maxExecution=3
      if(state.wakeOnly)return {tailShouldRun:true,reason:'completed',droneCount:0}
      if(state.runOrderRooms.length>=3){
        const n=state.runOrderRooms.length,dp:number[]=[0,0,1]
        for(let i=3;i<=n;i++)dp[i]=3*dp[i-1]!+2*dp[i-2]!
        maxExecution=Math.min(dp[n]!*1.25,15)
      }
      // <= is native; two or three rooms permit four executions, maximum cap permits sixteen.
      while(conflict!==undefined&&droneCount<=maxExecution){
        const room=getDefaultRunOrderAdjustRoom(state,conflict)
        if(room===undefined)return {tailShouldRun:false,reason:'adjust-room-none',droneCount}
        const observation=yield* step(seam,{kind:'drone',room,adjustTime:true})
        if(observation.droneResult===undefined)throw new Error('Native drone result observation is required')
        conflict=schedule(state,seam)
        droneCount++
        if(observation.droneResult!==null&&!observation.droneResult)
          return {tailShouldRun:false,reason:'drone-false',droneCount}
      }
    }
  }
  return {tailShouldRun:true,reason:'completed',droneCount}
}
/**
 * Only the selected default infra_main REFRESH_TIME branch plus completion removal.
 * Its pre-dispatch scene checks/support-swap protection remain caller responsibilities.
 */
export function* dispatchDefaultRefreshTime(
  state:RunOrderPlanningState,seam:RunOrderPlanningSeam,task:MowerTask,
):RunOrderGenerator<void>{
  yield* planDefaultRunOrder(state,seam,task.metadata)
  state.flags.todoTask=true
  state.flags.collectNotification=true
  state.queue.consume(task)
}
