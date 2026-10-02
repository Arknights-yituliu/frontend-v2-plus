/**
 * Pinned agent_arrange finishing tail (7895-7970), including temporary order restoration.
 * Source c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
 * Earlier room arrangements provide restoration/lastRoom and the original plan snapshot.
 * Device observations are explicit; this core neither estimates income nor consumes the task.
 */
import {MOWER_TASK_TYPES as T,MowerTask,type MowerTaskPlan,type MowerTaskQueue} from './mowerTaskQueue'

export interface MowerRunOrderFinishingState {
  task:MowerTask
  queue:MowerTaskQueue
  restoration:MowerTaskPlan
  /** Last room processed by agent_arrange, not necessarily the restoration key. */
  lastRoom:string
  /** Captured before the first physical arrangement. RUN_ORDER requires a snapshot. */
  originalPlan:MowerTaskPlan|null
  activePlan:Readonly<Record<string,readonly string[]>>
  runOrderRooms:readonly string[]
  runOrderBufferSeconds:number
  configuredDelayMinutes:number
  droneRoom:string|null
  droneCountLimit:number
  waitingScenes:readonly unknown[]
  flags:{planned:boolean;todoTask:boolean;collectNotification:boolean}
}
export type MowerRunOrderFinishingRequest=
  |{kind:'read-remaining'}
  |{kind:'sleep';seconds:number}
  |{kind:'scene'}
  |{kind:'waiting-solver'}
  |{kind:'accept-order'}
  |{kind:'read-drone-count'}
  |{kind:'drone';room:string;notCustomize:true;notReturn?:true;skipEnter?:true}
  |{kind:'find-bill-accelerate';name:'bill_accelerate'}
  |{kind:'back';intervalSeconds:.5|1}
  |{kind:'turn-on-room-detail';room:string}
  |{kind:'reset-room-time';room:string}
  |{kind:'restore-room';room:string;plan:MowerTaskPlan;skipEnter:true}
  |{kind:'save-missed-order'}
  |{kind:'notify-missed-order';message:'检测到漏单！';level:'WARNING'}
export interface MowerRunOrderFinishingObservation {
  kind:MowerRunOrderFinishingRequest['kind']
  observedAtMicros:number
  /** Required, including explicit null when the native return value is unused or None. */
  value:unknown
  /** Mandatory successful restore-room result; caller performs real room arrangements. */
  planAfter?:MowerTaskPlan
}
export interface MowerRunOrderFinishingSeam {
  nowMicros():number
  nativeName(operatorId:string):string
}
export type MowerRunOrderFinishingGenerator=Generator<MowerRunOrderFinishingRequest,void,MowerRunOrderFinishingObservation>
const TRADE_ORDER_AGENTS=['但书','龙舌兰','佩佩','可露希尔'] as const
function* observed(
  seam:MowerRunOrderFinishingSeam,request:MowerRunOrderFinishingRequest,
):Generator<MowerRunOrderFinishingRequest,MowerRunOrderFinishingObservation,MowerRunOrderFinishingObservation>{
  const observation=yield request
  if(!observation||observation.kind!==request.kind||!Object.prototype.hasOwnProperty.call(observation,'value'))
    throw new Error('An explicit matching native finishing observation is required')
  if(!Number.isSafeInteger(observation.observedAtMicros)||observation.observedAtMicros!==seam.nowMicros())
    throw new Error('Finishing observation must describe the advanced scheduler wall clock')
  return observation
}
function finite(value:unknown,label:string):number{
  if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Explicit '+label+' observation is required')
  return value
}
function boolean(value:unknown,label:string):boolean{
  if(typeof value!=='boolean')throw new Error('Explicit '+label+' observation is required')
  return value
}
function firstQueuedTime(state:MowerRunOrderFinishingState):number{
  const first=state.queue.tasks[0]
  if(!first)throw new Error('Native finishing requires the first queued task')
  return first.timeMicros
}
function skipAll(state:MowerRunOrderFinishingState):void{
  state.flags.planned=true;state.flags.todoTask=true;state.flags.collectNotification=true
}
export function* finishMowerRunOrderArrangement(
  state:MowerRunOrderFinishingState,seam:MowerRunOrderFinishingSeam,
):MowerRunOrderFinishingGenerator{
  if((state.task.type===T.RUN_ORDER)!==(state.originalPlan!==null))
    throw new Error('Original plan snapshot must match the native RUN_ORDER pre-arrangement phase')
  const rooms=Object.keys(state.restoration)
  if(rooms.length===1&&state.lastRoom!=='train'){
    if(state.runOrderBufferSeconds<=0||state.task.adjusted){
      try{
        // Native finishing ignores False/None returns; only exceptions restore the original plan.
        yield* observed(seam,{kind:'drone',room:state.lastRoom,notCustomize:true})
      }catch(error){
        if(state.originalPlan!==null)state.task.plan=state.originalPlan
        throw error
      }
    }else{
      const remaining=finite((yield* observed(seam,{kind:'read-remaining'})).value,'remaining-seconds')
      if(0<remaining&&remaining<state.configuredDelayMinutes*60){
        yield* observed(seam,{kind:'sleep',seconds:remaining})
        const scene=(yield* observed(seam,{kind:'scene'})).value
        if(state.waitingScenes.includes(scene)){
          const succeeded=boolean((yield* observed(seam,{kind:'waiting-solver'})).value,'waiting-solver')
          // Native None return is completed at the infra_main boundary, not a False deferral.
          if(!succeeded)return
        }
      }else{
        yield* observed(seam,{kind:'save-missed-order'})
        yield* observed(seam,{kind:'notify-missed-order',message:'检测到漏单！',level:'WARNING'})
      }
      yield* observed(seam,{kind:'accept-order'})
      if(state.droneRoom===null||(state.droneRoom===state.lastRoom&&state.runOrderRooms.includes(state.lastRoom))){
        const count=finite((yield* observed(seam,{kind:'read-drone-count'})).value,'drone-count')
        if(count>=state.droneCountLimit)
          yield* observed(seam,{kind:'drone',room:state.lastRoom,notReturn:true,notCustomize:true,skipEnter:true})
      }
      // The observed find value follows Python "is not None", including False if supplied.
      while(true){
        const found=(yield* observed(seam,{kind:'find-bill-accelerate',name:'bill_accelerate'})).value
        if(found===undefined)throw new Error('Explicit find result is required; native None is null')
        if(found===null)break
        yield* observed(seam,{kind:'back',intervalSeconds:.5})
      }
    }
    const restoreRoom=Object.keys(state.restoration)[0]!
    if(state.restoration[restoreRoom]!.some(id=>TRADE_ORDER_AGENTS.some(agent=>seam.nativeName(id).includes(agent)))){
      const active=state.activePlan[state.lastRoom]
      if(!active)throw new Error('Explicit active primary plan is required for native restoration normalization')
      state.restoration[restoreRoom]=[...active]
    }
    if(state.runOrderBufferSeconds>0){
      const result=yield* observed(seam,{kind:'restore-room',room:restoreRoom,plan:state.restoration,skipEnter:true})
      if(!result.planAfter)throw new Error('Explicit restore-room plan mutation is required')
      const after=structuredClone(result.planAfter)
      for(const room of Object.keys(state.restoration))delete state.restoration[room]
      Object.assign(state.restoration,after)
    }else{
      const task=new MowerTask({type:T.RUN_ORDER,plan:state.restoration})
      task.timeMicros=firstQueuedTime(state)
      state.queue.tasks.push(task)
      skipAll(state)
    }
  }else if(rooms.length>1){
    const task=new MowerTask({type:T.FIAMMETTA,plan:state.restoration})
    task.timeMicros=firstQueuedTime(state)
    state.queue.tasks.push(task)
    skipAll(state)
  }
}
