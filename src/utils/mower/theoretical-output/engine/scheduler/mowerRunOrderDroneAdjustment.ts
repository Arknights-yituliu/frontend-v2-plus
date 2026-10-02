/**
 * Native trade/manufacture drone normal/adjust_time branches and trade adjust_order_time.
 * Source c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
 * Observed absolute deadlines/counts and device timing come from I/O; no production fitting.
 * The outer trade solver owns its call limit. Native inner adjustment has no added limit.
 */
import {MOWER_TASK_TYPES as T,toMowerMicros,type MowerTask} from './mowerTaskQueue'
import {getDefaultRunOrderAdjustRoom,type RunOrderPlanningState} from './mowerRunOrderPlanning'
import {scheduleMowerTasks,type MowerTaskSchedulingOptions} from './mowerTaskScheduling'
export interface MowerTradeDroneAdjustmentState {
  planning:RunOrderPlanningState
  room:string
  width:number
  height:number
  skipEnter:boolean
  /** Native default args are retained; neither changes the trade adjust-time early return. */
  notCustomize:boolean
  notReturn:boolean
  droneCountLimit:number
  waitingScenes:readonly unknown[]
}
export type MowerTradeDroneAdjustmentRequest=
  |{kind:'enter-room';room:string}
  |{kind:'tap';action:'detail'|'open-acceleration'|'choose-one'|'confirm-one'|'all-in'|'confirm-all'|'minus-reserve'|'confirm-manufacture';target:unknown;intervalSeconds?:3|0.1;yRate?:1}
  |{kind:'wait-interface';intervalSeconds:1|3;accelerateTemplate?:'bill_accelerate'}
  |{kind:'find';name:'manufacture_accelerate'|'bill_accelerate'}
  |{kind:'tap-drone-accelerate';template:'bill_accelerate'|'manufacture_accelerate';control:'all_in'}
  |{kind:'cache-facility-page';room:string;facility:'manufacture'}
  |{kind:'recog-update'}
  |{kind:'accept-order'}
  |{kind:'return-main'}
  |{kind:'read-drone-count'}
  |{kind:'scene'}
  |{kind:'waiting-solver'}
  |{kind:'read-order';region:[[number,number],[number,number]];useDigitReader:true}
export interface MowerTradeDroneAdjustmentObservation {
  kind:MowerTradeDroneAdjustmentRequest['kind']
  observedAtMicros:number
  /** Explicit value for every step; None is null. read-order is native absolute due in micros. */
  value:unknown
}
export interface MowerTradeDroneAdjustmentSeam {
  nowMicros():number
  scheduling:Pick<MowerTaskSchedulingOptions,'grandet'|'enableMastery'|'maintenance'>
  onScheduling?(conflict:[MowerTask,MowerTask]|undefined):void
  onAdjustTarget?(room:string|undefined):void
}
export type MowerTradeDroneAdjustmentGenerator=Generator<MowerTradeDroneAdjustmentRequest,false|null,MowerTradeDroneAdjustmentObservation>
function* observed(
  seam:MowerTradeDroneAdjustmentSeam,request:MowerTradeDroneAdjustmentRequest,
):Generator<MowerTradeDroneAdjustmentRequest,unknown,MowerTradeDroneAdjustmentObservation>{
  const observation=yield request
  if(!observation||observation.kind!==request.kind||!Object.prototype.hasOwnProperty.call(observation,'value')||observation.value===undefined)
    throw new Error('Explicit matching native drone observation is required; None is null')
  if(!Number.isSafeInteger(observation.observedAtMicros)||observation.observedAtMicros!==seam.nowMicros())
    throw new Error('Drone observation must describe the advanced scheduler wall clock')
  return observation.value
}
function finite(value:unknown,label:string):number{
  if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Explicit '+label+' observation is required')
  return value
}
function nativeTruthy(value:unknown):boolean{
  if(value===null||value===false||value===0||value==='')return false
  if(Array.isArray(value))return value.length!==0
  if(typeof value==='object')return Object.keys(value).length!==0
  return true
}
function schedule(state:MowerTradeDroneAdjustmentState,seam:MowerTradeDroneAdjustmentSeam):[MowerTask,MowerTask]|undefined{
  const result=scheduleMowerTasks(state.planning.queue.tasks,seam.nowMicros(),{
    ...seam.scheduling,configuredDelayMinutes:state.planning.configuredDelayMinutes,experimental:false,
  })
  seam.onScheduling?.(result);return result
}
function adjustTarget(
  state:MowerTradeDroneAdjustmentState,seam:MowerTradeDroneAdjustmentSeam,pair:[MowerTask,MowerTask]|undefined,
):string|undefined{
  const room=getDefaultRunOrderAdjustRoom(state.planning,pair)
  seam.onAdjustTarget?.(room);return room
}
function* waitingAfterTap(
  state:MowerTradeDroneAdjustmentState,seam:MowerTradeDroneAdjustmentSeam,
):Generator<MowerTradeDroneAdjustmentRequest,boolean,MowerTradeDroneAdjustmentObservation>{
  const scene=yield* observed(seam,{kind:'scene'})
  if(state.waitingScenes.includes(scene)){
    const result=yield* observed(seam,{kind:'waiting-solver'})
    if(typeof result!=='boolean')throw new Error('Explicit waiting-solver result is required')
    return result
  }
  return true
}
export function* adjustMowerTradeOrderTime(
  state:MowerTradeDroneAdjustmentState,seam:MowerTradeDroneAdjustmentSeam,accelerate:unknown,
):MowerTradeDroneAdjustmentGenerator{
  let conflict=schedule(state,seam)
  // Native logger.debug eagerly evaluates this call, even when conflict is None.
  adjustTarget(state,seam,conflict)
  while(conflict!==undefined&&adjustTarget(state,seam,conflict)===state.room){
    const count=finite(yield* observed(seam,{kind:'read-drone-count'}),'drone-count')
    // Hard-coded native adjustment reserve, distinct from config.drone_count_limit.
    if(count<=20)return false
    yield* observed(seam,{kind:'tap',action:'open-acceleration',target:accelerate})
    if(!(yield* waitingAfterTap(state,seam)))return null
    yield* observed(seam,{kind:'tap',action:'choose-one',target:[Math.floor(state.width*1320/1920),Math.floor(state.height*502/1080)]})
    if(!(yield* waitingAfterTap(state,seam)))return null
    yield* observed(seam,{kind:'tap',action:'confirm-one',target:[Math.floor(state.width*3/4),Math.floor(state.height*4/5)]})
    if(!(yield* waitingAfterTap(state,seam)))return null
    yield* observed(seam,{kind:'wait-interface',intervalSeconds:1,accelerateTemplate:'bill_accelerate'})
    const due=finite(yield* observed(seam,{
      kind:'read-order',region:[
        [Math.floor(state.width*650/2496),Math.floor(state.height*660/1404)],
        [Math.floor(state.width*815/2496),Math.floor(state.height*710/1404)],
      ],useDigitReader:true,
    }),'absolute order deadline')
    if(!Number.isSafeInteger(due))throw new Error('Observed absolute order deadline must have native microsecond resolution')
    const task=state.planning.queue.find({type:T.RUN_ORDER,metadata:state.room})
    if(!task)break
    // Only the actual first matching task object is updated; no replacement or all-room rewrite.
    task.timeMicros=due-toMowerMicros(state.planning.configuredDelayMinutes/60)
    conflict=schedule(state,seam)
  }
  return null
}
/** Full native drone facility branch. Selected quantity remains a device observation/action effect. */
export function* executeMowerTradeDrone(
  state:MowerTradeDroneAdjustmentState,seam:MowerTradeDroneAdjustmentSeam,adjustTime=false,
):MowerTradeDroneAdjustmentGenerator{
  const allIn=state.notCustomize?0:state.planning.runOrderRooms.length
  if(!state.skipEnter)yield* observed(seam,{kind:'enter-room',room:state.room})
  yield* observed(seam,{kind:'tap',action:'detail',target:[state.width*.05,state.height*.95],intervalSeconds:3})
  yield* observed(seam,{kind:'wait-interface',intervalSeconds:3})
  const manufacture=yield* observed(seam,{kind:'find',name:'manufacture_accelerate'})
  if(nativeTruthy(manufacture)){
    yield* observed(seam,{kind:'cache-facility-page',room:state.room,facility:'manufacture'})
    const count=finite(yield* observed(seam,{kind:'read-drone-count'}),'drone-count')
    if(count<state.droneCountLimit)return null
    const allInScope=yield* observed(seam,{kind:'tap-drone-accelerate',template:'manufacture_accelerate',control:'all_in'})
    if(allIn>0){
      const tapTimes=count-state.droneCountLimit
      if(!Number.isSafeInteger(tapTimes))throw new Error('Native manufacture minus count must be an integer')
      for(let tap=0;tap<tapTimes;tap+=1)
        yield* observed(seam,{kind:'tap',action:'minus-reserve',target:[state.width*.7,state.height*.5],intervalSeconds:.1})
    }else yield* observed(seam,{kind:'tap',action:'all-in',target:allInScope})
    yield* observed(seam,{kind:'tap',action:'confirm-manufacture',target:manufacture,yRate:1})
  }else{
  let accelerate=yield* observed(seam,{kind:'find',name:'bill_accelerate'})
  while(nativeTruthy(accelerate)&&!adjustTime){
    const allIn=yield* observed(seam,{kind:'tap-drone-accelerate',template:'bill_accelerate',control:'all_in'})
    yield* observed(seam,{kind:'tap',action:'all-in',target:allIn})
    // Native normal branch uses floating multiplication here; adjust branch uses integer floor.
    yield* observed(seam,{kind:'tap',action:'confirm-all',target:[state.width*.75,state.height*.8]})
    if(!(yield* waitingAfterTap(state,seam)))return null
    yield* observed(seam,{kind:'recog-update'})
    yield* observed(seam,{kind:'accept-order'})
    if(!(state.planning.droneRoom===null||(state.planning.droneRoom===state.room&&state.planning.runOrderRooms.includes(state.room))))break
    if(state.notCustomize){
      const count=finite(yield* observed(seam,{kind:'read-drone-count'}),'drone-count')
      if(count<state.droneCountLimit||count===201)break
    }
    accelerate=yield* observed(seam,{kind:'find',name:'bill_accelerate'})
  }
  // Even a missing bill button is passed through. Adjust exits before any return navigation.
  if(adjustTime)return yield* adjustMowerTradeOrderTime(state,seam,accelerate)
  }
  if(state.notReturn)return null
  yield* observed(seam,{kind:'return-main'})
  return null
}
export function* executeMowerTradeDroneAdjustment(
  state:MowerTradeDroneAdjustmentState,seam:MowerTradeDroneAdjustmentSeam,
):MowerTradeDroneAdjustmentGenerator{
  return yield* executeMowerTradeDrone(state,seam,true)
}
