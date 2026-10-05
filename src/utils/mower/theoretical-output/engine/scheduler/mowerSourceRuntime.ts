import {executeMowerReload} from './mowerReload'
import {MowerExitError,MowerRecognizeError,rethrowMowerInfraFatal} from './mowerNativeErrors'
import {executeMowerTodoTask,type MowerTodoTaskState} from './mowerTodoTask'
import {executeMowerClueNew,runMowerClueFlow,setMowerPartyTime,type MowerClueLifecycleState} from './mowerClueLifecycle'
import {collectMowerInfraNotification,collectMowerTodoList} from './mowerNotification'
import {bridgeMowerNativeIO,type MowerNativeIOYield} from './mowerRunOrderBridge'
import {runDefaultTradeSegment,dispatchDefaultRefreshTime,type RunOrderPlanningState,type RunOrderPlanningSeam} from './mowerRunOrderPlanning'
// Headless adapter for pinned default Mower task decisions.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
// Physical room reads come from the RIIC simulation; reservations and observations stay separate.
// Trade runner recognition extends the pinned source list with U-Official for this app.
import {mowerPlanEntries} from './mowerPlanOrder'
import {scheduleMowerTasks,protectMowerSupportSwaps} from './mowerTaskScheduling'
import {mowerRefreshTradingSpec,refreshMowerRunOrderTime} from './mowerRunOrderRefresh'
import {MowerArrangementError} from './mowerArrangementError'
import {OPERATOR_MAP} from '../domain/operators'
import {isTradeRunOrderOperator} from '../domain/shiftRunPolicy'
import type {BackupTiming} from './backupPlans'
import type {RuntimeState,RuntimeRates,RuntimeConfig} from './rosterRuntime'
import {MowerOperatorState} from './mowerOperatorState'
import {MowerSchedulingData,MowerDormState} from './mowerSchedulingData'
import {MowerTask,MowerTaskQueue,MOWER_TASK_TYPES as T,toMowerMicros,type MowerTaskPlan} from './mowerTaskQueue'
import {executeMowerTaskArrangementSteps,type MowerRoomReturn,type MowerBackupResult} from './mowerTaskExecutor'
import {mowerUpdateDetail,mowerRefreshDormTime,mowerCorrectDorm,mowerRoomReadIndexes,shouldMowerReadMood} from './mowerObservations'
import {mowerIsDormReplacement,planMowerCorrection} from './mowerCorrection'
import {planMowerOrdinary,mowerGetRestingPlan,mowerTryReorder,mowerPlanningHasNearTask} from './mowerOrdinaryPlanning'
import {planMowerMetadata,mowerRestUnitKey} from './mowerMetadata'
import {planMowerExhaustSupport} from './mowerExhaustPlanning'
import {selectMowerFiaTarget,mowerFiaReadyMicros} from './mowerFiammetta'
import {prepareMowerDormSelection,mowerArrangementReadIndexes,mowerDormReplacementForSlot} from './mowerSelection'
import {prepareMowerRunEntry} from './mowerRunLifecycle'
import {ensureMowerDormRecovery} from './mowerDormRecovery'
import {prepareMowerRelease} from './mowerRelease'
export interface MowerBackupContext {appendEmptyTask:boolean;restoreOnDeactivate:boolean;customTimeMicros?:number}
export interface MowerSourceRuntime {
 data:MowerSchedulingData;queue:MowerTaskQueue;config:RuntimeConfig;initial:boolean;firstInit:boolean;error?:boolean
 activeTask?:MowerTask;lastTodoMicros?:number|null;lastClueMicros?:number|null;partyTimeMicros?:number|null;droneTimeMicros?:number|null;reloadTimeMicros?:number|null;baseRunAborted?:boolean
 runFlags?:{planned:boolean;todoTask:boolean;collectNotification:boolean}
 execution?:{task:MowerTask;steps:Generator<MowerRoomReturn,boolean,void>;wakeMicros:number;intent:MowerTaskPlan;data:MowerSchedulingData;lastBoundary?:MowerRoomReturn}
 phaseExecution?:{steps:Generator<MowerRoomReturn,void,void>;wakeMicros:number;skipPlanning:boolean}
 runReturn?:{wakeMicros:number;finishFallback:boolean}
 lastTrainMoodReadMicros?:number;lastWakeMicros?:number;lastFiaNoopMicros?:number;trace:{timeMicros:number;type:string;plan:MowerTaskPlan;metadata:string}[]
}
const slotIndex=(id:string)=>Number(id.slice(id.lastIndexOf('_')+1))
const isConfiguredTradeRoom=(config:RuntimeConfig,room:string)=>config.runOrderPolicies?.some(policy=>policy.roomId===room)??false
function makeData(s:RuntimeState,previous?:MowerSourceRuntime):MowerSchedulingData {
 const config=s.config,source=Object.fromEntries(mowerPlanEntries(config.mowerSourcePlan!)),rules=config.mowerSourceRules!,operators:Record<string,MowerOperatorState>={}
 const primary=new Set(Object.values(source).flatMap(slots=>slots.map(p=>p.agent)).filter(n=>!['Free','Current',''].includes(n)))
 const create=(name:string,room='',index=-1,group='',replacement:string[]=[])=>{
  if(['Free','Current',''].includes(name)||operators[name])return
  s.morale[name]??=config.initialMorale?.[name]??24
  const old=previous?.data.operators[name],position=config.positions.find(p=>p.primary===name)
  const op=new MowerOperatorState({name,nativeName:OPERATOR_MAP.get(name)?.name??name,room,index,group,replacement,operatorType:primary.has(name)&&!!room?'high':'low',restingPriority:rules.lowPriority.includes(name)||!room?'low':'high',workaholic:rules.workaholic.includes(name),exhaustRequire:rules.exhaustRequire.includes(name),restInFull:rules.restInFull.includes(name),lowerLimit:position?.lowerLimit??0,upperLimit:position?.upperLimit??config.mowerPolicy?.restMoodLimits?.[name]??24,restMoodLimit:!!config.mowerPolicy?.restMoodLimits?.[name],mood:old?.mood??24,timeStampMicros:old?.timeStampMicros,depletionRate:old?.depletionRate,currentRoom:old?.currentRoom??'',currentIndex:old?.currentIndex??-1,dormPositionVersion:old?.dormPositionVersion,dormRecoveryRoom:old?.dormRecoveryRoom,dormRecoveryIndex:old?.dormRecoveryIndex,dormRecoveryFixed:old?.dormRecoveryFixed,restingFromTrain:old?.restingFromTrain,idleRestCheck:old?.idleRestCheck})
  op.refreshOrderRooms=mowerRefreshTradingSpec(op.nativeName,(rules.refreshTrading??[]).map(entry=>OPERATOR_MAP.get(entry)?.name??entry))
  op.workshop=['年','司霆惊蛰','九色鹿'].includes(op.nativeName)
  // operators.py:add applies standby only after group and mandatory-rest flags.
  if(rules.standby?.includes(name)&&op.isHigh()&&op.group&&!op.room.startsWith('dorm')&&!op.workaholic&&!op.exhaustRequire&&!op.restInFull&&!op.workshop)op.restingPriority='standby'
  operators[name]=op
 }
 for(const [room,slots] of Object.entries(source))slots.forEach((p,index)=>create(p.agent,room,index,p.group,[...p.replacement]))
 for(const slots of Object.values(source))for(const p of slots)if(OPERATOR_MAP.get(p.agent)?.name!=='菲亚梅塔')p.replacement.forEach(name=>create(name))
 config.idleOperators?.forEach(name=>create(name))
 if(previous)Object.keys(previous.data.operators).forEach(name=>create(name))
 const managerNames=new Set(Object.entries(source).filter(([room])=>room.startsWith('dorm')).flatMap(([,slots])=>slots.slice(0,2).flatMap(p=>[p.agent,...p.replacement])))
 for(const op of Object.values(operators)){
  const record=OPERATOR_MAP.get(op.name),skills=record?.skillSlots?.flat()??record?.skills??[]
  op.singleRecoveryManager=managerNames.has(op.name)&&skills.some(skill=>skill.description.replace(/<[^>]*>/g,'').includes('进驻宿舍时，使该宿舍内除自身以外心情未满的某个干员每小时恢复'))
 }
 const runOrderRooms=config.mowerRunOrderEnabled===false?{}:previous?.data.runOrderRooms??{}
 if(config.mowerRunOrderEnabled!==false)for(const [room,slots] of Object.entries(source))if(room.startsWith('room')&&slots.some(slot=>slot.replacement.some(id=>isTradeRunOrderOperator(id)&&((OPERATOR_MAP.get(id)?.name??id)!=='U-Official'||isConfiguredTradeRoom(config,room)))))runOrderRooms[room]={}
 const dorms=previous?.data.dorms??config.beds.filter(b=>b.managedRecovery!==false).sort((a,b)=>Number(b.vip)-Number(a.vip)).map(b=>new MowerDormState([b.roomId,slotIndex(b.id)]))
 return new MowerSchedulingData({plan:Object.fromEntries(Object.entries(source).map(([room,slots])=>[room,slots.map(p=>p.agent)])),operators,dorms,runOrderRooms,nowMicros:toMowerMicros(s.time),policy:{restingThreshold:config.mowerPolicy!.restingThreshold,rescueThreshold:config.mowerPolicy?.rescueThreshold??.75},freeRoom:config.mowerPolicy?.freeRoom,groupRestInFullOnMoodGap:config.mowerPolicy?.groupRestInFullOnMoodGap,groupMoodGapMaxExtraWaitHours:config.mowerPolicy?.groupMoodGapMaxExtraWaitHours,mergeIntervalMinutes:config.mowerPolicy?.mergeIntervalMinutes,powerPlantCount:config.mowerPolicy?.powerPlantCount,planConditions:previous?.data.planConditions,partyTime:config.mowerServices?.enableParty===false?undefined:previous?.data.partyTime,restingPriorityNames:config.mowerPolicy?.opeRestingPriority,freeBlacklist:config.freeBlacklist,excludedCandidates:new Set(config.excludedCandidates),recentShiftOnByRestUnit:previous?.data.recentShiftOnByRestUnit})
}
export function getMowerSourceRuntime(s:RuntimeState):MowerSourceRuntime {
 if(!s.mowerSource){const data=makeData(s);s.mowerSource={data,queue:new MowerTaskQueue(),config:s.config,initial:true,firstInit:true,trace:[]};s.mowerSource.queue.tasks.push(new MowerTask({time:s.time}))}
 const source=s.mowerSource
 if(source.config!==s.config){
  source.data=makeData(s,source);source.config=s.config;source.firstInit=false
  if(s.config.mowerServices?.enableParty===false){
   source.partyTimeMicros=null
   source.queue.tasks=source.queue.tasks.filter(task=>![T.CLUE,T.CLUE_PARTY].includes(task.type))
  }
 }
 source.data.nowMicros=toMowerMicros(s.time);return source
}
function physicalRoom(s:RuntimeState,room:string,length:number):string[] {
 const names=Array(length).fill('')
 for(const [slot,name] of Object.entries({...s.occupants,...s.bedOccupants}))if(slot.startsWith(room+'_')){const index=slotIndex(slot);if(index<length)names[index]=name}
 return names
}
function physicalRate(s:RuntimeState,rates:RuntimeRates,name:string,room:string):number {
 if(room.startsWith('dorm'))return name===s.config.fiammetta?.operatorId?2:rates.recoveryRate(name,room,s)
 return -rates.workRate(name,room,s)
}
/** Operator.current_room setter calls this before index/mood assignment, also on cleanup. */
function currentRoomChanged(s:RuntimeState,op:MowerOperatorState):void {
 const source=getMowerSourceRuntime(s),{data,queue}=source
 if(source.firstInit||data.operators[op.name]!==op)return
 if(s.config.mowerRunOrderEnabled!==false&&op.refreshOrderRooms[0])for(const room of op.refreshOrderRooms[1].length?op.refreshOrderRooms[1]:Object.keys(data.runOrderRooms))refreshMowerRunOrderTime(queue,data.nowMicros,room)
 if(!s.config.mowerSourceRules!.refreshDrained.includes(op.name))return
 const solved=new Set<string>()
 for(const exhaust of Object.values(data.operators).filter(o=>o.exhaustRequire)){
  if(solved.has(exhaust.name))continue
  const queued=queue.find({time:s.time+1/60,type:T.EXHAUST_OFF,metadata:exhaust.name,comparison:'>'})
  if(queued){queue.consume(queued);queued.metadata.split(',').forEach(n=>{solved.add(n);if(data.operators[n])data.operators[n]!.timeStampMicros=undefined})}
  else exhaust.timeStampMicros=undefined
 }
 if(solved.size)queue.tasks.push(new MowerTask({time:s.time}))
}
function observeRoom(s:RuntimeState,rates:RuntimeRates,room:string,task?:MowerTask,readTimes:number[]=[]):void {
 const {data,queue}=getMowerSourceRuntime(s),names=physicalRoom(s,room,data.plan[room]?.length??5),recognized=new Set(names.filter(Boolean))
 readTimes=mowerRoomReadIndexes(data,room,task,readTimes)
 const trueExhaustRooms=new Set(['central'])
 for(const [index,name] of names.entries()){
  let op=data.operators[name]
  if(!op&&s.config.availableIdleOperators?.includes(name)&&OPERATOR_MAP.has(name)){
   const rules=s.config.mowerSourceRules!
   s.morale[name]??=s.config.initialMorale?.[name]??24
   op=new MowerOperatorState({name,nativeName:OPERATOR_MAP.get(name)!.name,room:'',index:-1,operatorType:'low',restingPriority:'low',mood:24,lowerLimit:0,upperLimit:s.config.mowerPolicy?.restMoodLimits?.[name]??24,restMoodLimit:s.config.mowerPolicy?.restMoodLimits?.[name]!==undefined,workaholic:rules.workaholic.includes(name),exhaustRequire:rules.exhaustRequire.includes(name),restInFull:rules.restInFull.includes(name)})
   op.refreshOrderRooms=mowerRefreshTradingSpec(op.nativeName,(rules.refreshTrading??[]).map(entry=>OPERATOR_MAP.get(entry)?.name??entry))
   op.workshop=['年','司霆惊蛰','九色鹿'].includes(op.nativeName)
   data.operators[name]=op
  }
  if(!op)continue
  const read=shouldMowerReadMood(data,name,room,index,readTimes,task,queue.tasks[0])
  const displayedMood=read?s.morale[name]!:op.currentMood(data.nowMicros)
  const missing=mowerUpdateDetail(data,name,read?s.morale[name]!:op.mood,room,index,read,trueExhaustRooms,changed=>currentRoomChanged(s,changed))
  if(missing!==undefined&&!readTimes.includes(missing))readTimes.push(missing)
  if(readTimes.includes(index)){
   const mood=s.morale[name]!,rate=physicalRate(s,rates,name,room),remaining=room.startsWith('dorm')?24-mood:mood
   const due=displayedMood===24||['meeting','factory'].includes(room)&&!read?data.nowMicros:rate!==0?data.nowMicros+toMowerMicros(Math.max(0,remaining/Math.abs(rate))):data.nowMicros
   mowerRefreshDormTime(data,room,index,name,due,trueExhaustRooms)
  }
 }
 for(const op of Object.values(data.operators))if(op.currentRoom===room&&!recognized.has(op.name)){
  const bed=data.getDormByName(op.name)?.[1];if(bed?.name===op.name)bed.reset()
  op.currentRoom='';currentRoomChanged(s,op);op.currentIndex=-1
  if(data.freeRoom&&task&&task.type!==T.SHIFT_OFF){const release=queue.find({type:T.RELEASE_DORM,metadata:op.name});if(release&&release!==task)queue.consume(release)}
 }
}
function readAgentMood(s:RuntimeState,rates:RuntimeRates):void {
 const {data}=getMowerSourceRuntime(s)
 const rooms=new Set(Object.values(data.operators).filter(o=>o.room&&o.needToRefresh(data.nowMicros)).map(o=>o.room))
 if(data.plan.train)rooms.add('train')
 for(const room of rooms){
  if(room==='train'){const last=getMowerSourceRuntime(s).lastTrainMoodReadMicros;if(last!==undefined&&data.nowMicros-last<toMowerMicros(2.5))continue}
  const current=Object.values(data.operators).filter(o=>o.currentRoom===room)
  if(current.length&&current.every(o=>o.timeStampMicros!==undefined&&o.timeStampMicros>data.nowMicros-toMowerMicros(['歌蕾蒂娅','见行者'].includes(o.nativeName)?.5:2.5)))continue
  if(room==='train')getMowerSourceRuntime(s).lastTrainMoodReadMicros=data.nowMicros
  observeRoom(s,rates,room,undefined,room==='central'?data.plan[room]!.map((_,i)=>i):[])
 }
}
function projectPublicState(s:RuntimeState):void {
 const {data,queue}=getMowerSourceRuntime(s)
 const resting=new Set(Object.values(s.bedOccupants)),present=new Set(Object.values(s.occupants))
 s.completedRest=Object.values(data.operators).filter(o=>o.isHigh()&&!o.currentRoom&&!o.workaholic&&o.timeStampMicros!==undefined&&o.mood>=o.upperLimit).map(o=>o.name)
 s.standbyWorkaholics=Object.values(data.operators).filter(o=>o.isHigh()&&o.workaholic&&!o.currentRoom).map(o=>o.name)
 s.pendingRest=Object.values(data.operators).filter(o=>o.isHigh()&&!o.room.startsWith('dorm')&&!o.workaholic&&!present.has(o.name)&&!resting.has(o.name)&&!s.completedRest!.includes(o.name)&&!data.isStandby(o.name)).map(o=>o.name)
 s.returnDeadlines={}
 for(const task of queue.tasks)if(task.type===T.SHIFT_ON)for(const name of Object.values(task.plan).flat()){
  const op=data.operators[name];if(op&&op.room&&!op.room.startsWith('dorm'))s.returnDeadlines[op.group?'group:'+op.group:'slot:'+op.room+'_'+op.index]=task.time
 }
 s.nextPlanningTime=queue.tasks.filter(t=>t.type===T.NOT_SPECIFIC&&!Object.keys(t.plan).length).reduce((t,task)=>Math.min(t,task.time),Infinity)
 s.nextFiammettaCheckTime=queue.tasks.filter(t=>t.type===T.FIAMMETTA).reduce((t,task)=>Math.min(t,task.time),Infinity)
}
/** Concrete game confirmation seam: a partial list leaves trailing slots empty. */
function confirmPhysicalRoom(s:RuntimeState,room:string,names:string[]):void {
 const explicit=new Set(names.filter(n=>!['Free','Current',''].includes(n)))
 for(const [slot,name] of Object.entries(s.occupants))if(explicit.has(name))delete s.occupants[slot]
 for(const [slot,name] of Object.entries(s.bedOccupants))if(explicit.has(name))delete s.bedOccupants[slot]
 for(const slot of Object.keys(s.occupants))if(slot.startsWith(room+'_'))delete s.occupants[slot]
 for(const slot of Object.keys(s.bedOccupants))if(slot.startsWith(room+'_'))delete s.bedOccupants[slot]
 for(const [index,name] of names.entries()){
  const slot=room+'_'+index;delete s.occupants[slot];delete s.bedOccupants[slot]
  if(name!=='Free'){
   if(s.config.beds.some(b=>b.id===slot))s.bedOccupants[slot]=name
   else s.occupants[slot]=name
  }
 }

}
/** Native get_free_list includes both registered idle operators and unregistered catalog cards. */
function freeCandidateNames(s:RuntimeState,data:MowerSchedulingData,forbidden:Set<string>):string[]{
 let known=Object.values(data.operators).filter(op=>!forbidden.has(op.name)&&(!op.isHigh()||data.isStandby(op.name))&&!op.currentRoom&&!data.restMoodComplete(op.name))
 if(known.some(op=>!op.workshop&&op.currentMood(data.nowMicros)<=22))known=known.filter(op=>!op.workshop)
 const unseen=(s.config.availableIdleOperators??[]).filter(name=>OPERATOR_MAP.has(name)&&!data.operators[name]&&!forbidden.has(name))
 return [...known.map(op=>op.name),...unseen].sort((a,b)=>(s.morale[a]??24)-(s.morale[b]??24))
}
function selectConcreteNames(s:RuntimeState,room:string,names:string[],task:MowerTask,preserve=false):string[] {
 const {data}=getMowerSourceRuntime(s),selected=[...names]
 prepareMowerDormSelection(data,selected,room,preserve)
 const forbidden=new Set([...selected,...Object.values(task.plan).flat(),...(s.config.freeBlacklist??[])])
 const trainee=data.currentOperator('train',0)?.name;if(trainee)forbidden.add(trainee)
 const free=freeCandidateNames(s,data,forbidden)
 for(const [index,name] of selected.entries())if(name==='Free'){
  const card=free.shift();if(!card)throw new MowerArrangementError('Mower Free selection needs an owned idle operator: '+room+'_'+index)
  selected[index]=card
 }
 return selected
}
function* arrangeRoom(s:RuntimeState,rates:RuntimeRates,room:string,names:string[],getTime:boolean,task:MowerTask,chooseError=0,sharedRestoration:MowerTaskPlan={}):Generator<MowerRoomReturn,MowerTaskPlan|void,void> {
 const {data}=getMowerSourceRuntime(s)
 // refresh_current_room uses cached positions when all requested slots are known.
 const requested=names.flatMap((name,index)=>name==='Current'?[index]:[])
 const cached=()=>data.currentRoom(room,true)!
 if(data.currentRoom(room,false,requested)===undefined)observeRoom(s,rates,room,task)
 const current=cached(),resolved=names.map((name,index)=>name==='Current'?current[index]||'Free':name||'Free'),fia=s.config.fiammetta?.operatorId
 // Moving an explicit operator vacates their old Current slot before dorm recovery ordering.
 const explicit=new Set(names.filter(name=>name!=='Current'&&name!=='Free'&&name!==''))
 for(const [index,name] of names.entries())if(name==='Current'&&explicit.has(resolved[index]!))resolved[index]='Free'
 const seen=new Set<string>()
 for(const [index,name] of resolved.entries())if(name!=='Free'&&name!==''){if(seen.has(name))resolved[index]='Free';else seen.add(name)}
 names.splice(0,names.length,...resolved)
 // Restoration is reserved for Fiammetta; ideal runners never enter a trade room.
 let restoration:MowerTaskPlan|undefined,fiammettaCharge=false
 if(room in getMowerSourceRuntime(s).data.runOrderRooms&&task.type!==T.RUN_ORDER&&
   (resolved.length!==current.length||resolved.some((name,index)=>name!==current[index])))
  refreshMowerRunOrderTime(getMowerSourceRuntime(s).queue,data.nowMicros,room)
 // Native captures both Fia restoration rooms before exact-noop detection (7525-7533).
 if(fia&&resolved.length===2&&resolved.includes(fia)&&chooseError===0){
  const target=data.operators[resolved[0]!]!
  restoration={[room]:[...current],[target.room]:data.currentRoom(target.room,true)!}
  Object.assign(sharedRestoration,restoration)
 }
 // Native recovery ordering runs even when the requested final roster is an exact no-op.
 const recoveryOrdered=ensureMowerDormRecovery(data,getMowerSourceRuntime(s).queue,task,room,resolved,{
  arrangeTemporary:retained=>{confirmPhysicalRoom(s,room,selectConcreteNames(s,room,retained,task,true));observeRoom(s,rates,room,task)}
 })
 const afterRecovery=cached()
 if(resolved.length===afterRecovery.length&&resolved.every((name,index)=>name===afterRecovery[index]))return restoration
 if(task.type===T.FIAMMETTA&&fia&&resolved.length===2&&resolved.includes(fia)){
  fiammettaCharge=true
  restoration=sharedRestoration

 }
 const readTimes=recoveryOrdered?data.plan[room]!.flatMap((name,index)=>name==='Free'?[index]:[]):mowerArrangementReadIndexes(data,room,resolved,getTime,task)
 // Default get_free_list; the UI chooses eligible idle cards in ascending physical mood.
 // Account-specific tie order is the provided roster registration order.
 const forbidden=new Set([...resolved,...Object.values(task.plan).flat(),...(s.config.freeBlacklist??[])])
 const trainee=data.currentOperator('train',0)?.name;if(trainee)forbidden.add(trainee)
 let free=freeCandidateNames(s,data,forbidden)
 if(room.startsWith('dorm')){
  const ordinary=free.map(name=>data.operators[name]).filter((op):op is MowerOperatorState=>!!op&&!op.workshop&&op.currentMood(data.nowMicros)<=22).sort((a,b)=>a.currentMood(data.nowMicros)-b.currentMood(data.nowMicros))
  for(const [index,name] of resolved.entries())if(name==='Free'){
   const current=data.currentOperator(room,index)
   if(current?.workshop&&current.currentMood(data.nowMicros)<current.upperLimit&&!resolved.includes(current.name)){
    const next=ordinary.shift()??current;resolved[index]=next.name;free=free.filter(name=>name!==next.name)
   }
  }
 }
 // choose_agent mutates the list shared with task.plan after no-op detection.
 prepareMowerDormSelection(data,resolved,room,recoveryOrdered)
 names.splice(0,names.length,...resolved)
 const refreshedForbidden=new Set([...resolved,...Object.values(task.plan).flat(),...(s.config.freeBlacklist??[])])
 if(trainee)refreshedForbidden.add(trainee)
 free=freeCandidateNames(s,data,refreshedForbidden)
 for(const [index,name] of resolved.entries())if(name==='Free'){
  const card=free.shift()
  if(!card)throw new MowerArrangementError('Mower Free selection needs an owned idle operator: '+room+'_'+index)
  resolved[index]=card
 }
 names.splice(0,names.length,...resolved)
 if(fiammettaCharge&&fia){
  const target=resolved[0]!,old=s.morale[target]!
  s.morale[target]=24;s.morale[fia]=old;s.lastFiammettaTime=s.time
  s.events.push({time:s.time,type:'fiammetta',operators:[fia,target],moraleBefore:[24,old],moraleAfter:[old,24]})
  data.operators[fia]!.timeStampMicros=undefined;data.operators[target]!.timeStampMicros=undefined
 }
 confirmPhysicalRoom(s,room,resolved)

 observeRoom(s,rates,room,task,readTimes)
 return restoration
}
/** Actual agent_arrange_room: four attempts, three back(0.5) retry boundaries. */
function* arrangeRoomSteps(s:RuntimeState,rates:RuntimeRates,room:string,names:string[],getTime:boolean,task:MowerTask,restoration:MowerTaskPlan={}):Generator<MowerRoomReturn,MowerTaskPlan|void,void>{
 for(let attempt=0;;attempt++){
  try {
   if(attempt){
    // Reconcile a successfully confirmed selection before attempting another arrangement.
    observeRoom(s,rates,room,task)
    const actual=getMowerSourceRuntime(s).data.currentRoom(room,true)!
    if(actual.length===names.length&&actual.every((name,index)=>name===names[index]||names[index]==='Free'))return restoration
   }
   return yield* arrangeRoom(s,rates,room,names,getTime,task,attempt,restoration)
  }catch(error){
   if(error instanceof MowerExitError||attempt>=3)throw error
   yield {room,delayMicros:500_000}
  }
 }
}
function scheduleFiaAndExhaust(s:RuntimeState,rates:RuntimeRates):void {
 const source=getMowerSourceRuntime(s),{data,queue}=source,fia=s.config.fiammetta
 if(fia&&!queue.find({type:T.FIAMMETTA})){
  const op=data.operators[fia.operatorId]
  if(op?.room.startsWith('dorm')){
   const ready=mowerFiaReadyMicros(op,data.nowMicros,()=>{
    const index=op.currentIndex===-1?op.index:op.currentIndex
    observeRoom(s,rates,op.room,undefined,[index])
    return data.nowMicros+toMowerMicros(Math.max(0,(24-s.morale[fia.operatorId]!)/2))
   })
   // Source Mower can repeatedly select a full worker when fool protection is
   // disabled. Dorm selection releases that worker and charges an idle Free
   // card instead. Recheck later when the observed roster or morale can differ.
   const threshold=(fia.threshold??21.6)/24
   const planned=selectMowerFiaTarget(data,fia.orderedTargets,fia.fool??true,threshold)
   const target=planned?data.operators[planned]:undefined
   const released=!!target&&target.mood===target.upperLimit&&!target.room.startsWith('dorm')&&
    !mowerDormReplacementForSlot(data,planned!,op.room,0)
   const trainee=data.currentOperator('train',0)?.name
   const free=released?freeCandidateNames(s,data,new Set([planned!,fia.operatorId,...(s.config.freeBlacklist??[]),...(trainee?[trainee]:[])]))[0]:undefined
   const effectiveTarget=released?free:planned
   const fullNoop=effectiveTarget!==undefined&&(s.morale[effectiveTarget]??0)>=24-1e-8&&
    ((s.morale[fia.operatorId]??0)>=24-1e-8||ready>data.nowMicros)
   if(fullNoop){
    if(!s.diagnostics.some(d=>d.code==='mower-fia-full-noop-skipped'))s.diagnostics.push({code:'mower-fia-full-noop-skipped',message:'跳过双方满心情的无收益充能；五分钟后重新检查。此优化精简了 Mower 原版的空操作事件。'})
    const retry=ready>data.nowMicros?ready:data.nowMicros+toMowerMicros(5/60)
    if(!queue.tasks.some(t=>t.type===T.NOT_SPECIFIC&&t.timeMicros>data.nowMicros&&t.timeMicros<=retry)){
     const task=new MowerTask({type:T.NOT_SPECIFIC});task.timeMicros=retry;queue.tasks.push(task)
    }
   }else{const task=new MowerTask({type:T.FIAMMETTA});task.timeMicros=ready;queue.tasks.push(task)}
  }
 }
 for(const op of Object.values(data.operators)){
  if(!op.exhaustRequire||op.isResting()||!op.isHigh()||!data.plan[op.currentRoom]||op.currentMood(data.nowMicros)>op.lowerLimit+2||queue.find({type:T.EXHAUST_OFF,metadata:op.name}))continue
  observeRoom(s,rates,op.currentRoom,undefined,[op.currentIndex])
  const rate=-physicalRate(s,rates,op.name,op.currentRoom),mood=s.morale[op.name]!,group=op.group?data.group(op.group).map(n=>data.operators[n]!):[]
  const fullGroups=new Set(Object.values(data.operators).filter(p=>p.restInFull&&p.group&&!p.room.startsWith('dorm')).map(p=>p.group))
  const margin=fullGroups.has(op.name)?10:30
  let due=data.nowMicros
  if(rate>0&&mood>0)due=data.nowMicros+toMowerMicros(mood/rate-margin/60)
  else if(op.currentMood(data.nowMicros)>op.lowerLimit+.25&&op.depletionRate!==0)due=data.nowMicros+toMowerMicros((op.currentMood(data.nowMicros)-op.lowerLimit-.25)/op.depletionRate-margin/60)
  const exhaustedTime=due<data.nowMicros
  due=Math.max(data.nowMicros,due)
  let shared=false
  if(op.group)for(const peer of group.filter(p=>p.exhaustRequire)){const old=queue.find({type:T.EXHAUST_OFF,metadata:peer.name});if(old){old.timeMicros=Math.min(old.timeMicros,due);old.metadata+=','+op.name;shared=true}}
  if(!shared){const task=new MowerTask({type:T.EXHAUST_OFF,metadata:op.name});task.timeMicros=due;queue.tasks.push(task)}
  if(exhaustedTime)break
 }
}
/** Read live native room data; primary-only data.plan loses replacement lists. */
export function mowerRunOrderContext(s:RuntimeState):[RunOrderPlanningState,RunOrderPlanningSeam]{
 const source=getMowerSourceRuntime(s)
 const state:RunOrderPlanningState={
  plan:Object.fromEntries(mowerPlanEntries(s.config.mowerSourcePlan!)),
  runOrderRooms:Object.keys(source.data.runOrderRooms),queue:source.queue,
  configuredDelayMinutes:s.config.mowerTaskScheduling?.configuredDelayMinutes??3,
  droneRoom:s.config.mowerDroneRoom??null,flags:source.runFlags!,
 }
 const seam:RunOrderPlanningSeam={
  nowMicros:()=>toMowerMicros(s.time),
  currentDormOccupants:room=>getMowerSourceRuntime(s).data.currentRoom(room),
  scheduling:{enableMastery:s.config.mowerTaskScheduling?.enableMastery,maintenance:s.config.mowerTaskScheduling?.maintenance},
 }
 return [state,seam]
}
function mowerClueState(s:RuntimeState):MowerClueLifecycleState {
 const source=getMowerSourceRuntime(s)
 return {
  queue:source.queue,flags:source.runFlags!,
  get partyTimeMicros(){return source.partyTimeMicros??null},
  set partyTimeMicros(value){source.partyTimeMicros=value},
  get dataPartyTime(){const value=getMowerSourceRuntime(s).data.partyTime;return typeof value==='boolean'?value:value?.timeMicros??null},
  set dataPartyTime(value){getMowerSourceRuntime(s).data.partyTime=typeof value==='number'?{timeMicros:value}:value},
  get lastClueMicros(){return source.lastClueMicros??null},
  set lastClueMicros(value){source.lastClueMicros=value},
  leifengMode:s.config.mowerServices?.leifengMode??true,clueCount:s.config.mowerClueObservations?.clueCount??0,clueCountLimit:9,
  mall:{maaMallEnable:true,maaMallMode:'maa'},waitingScenes:[],
 }
}
export function settleMowerSource(s:RuntimeState,rates:RuntimeRates,onPhase?:(phase:BackupTiming)=>boolean):void {
 const source=getMowerSourceRuntime(s),queue=source.queue
 const skip=()=>{Object.assign(source.runFlags??={planned:false,todoTask:false,collectNotification:false}, {planned:true,todoTask:true,collectNotification:true})}
 const options=()=>({onException:(error:unknown)=>s.diagnostics.push({code:'mower-plan-solver-exception',message:error instanceof Error?error.message:String(error)}),fiaTargets:s.config.fiammetta?.orderedTargets??[],isDormReplacement:(n:string)=>mowerIsDormReplacement(getMowerSourceRuntime(s).data,n),isMasteryBusy:(n:string)=>getMowerSourceRuntime(s).data.busyRestingNames.has(n),onBlocked:(names:string[])=>{
  const op=getMowerSourceRuntime(s).data.operators[names[0]!]!,key=op.group?'group:'+op.group:'slot:'+op.room+'_'+op.index,message=key+': insufficient available candidates or beds; original occupants retained'
  if(!s.diagnostics.some(d=>d.code==='group-blocked'&&d.message===message))s.diagnostics.push({code:'group-blocked',message})
 }})
 const backup=(phase:BackupTiming,_task?:MowerTask,context:MowerBackupContext={appendEmptyTask:true,restoreOnDeactivate:false}):MowerBackupResult=>{
  if(_task?.type===T.FIAMMETTA||queue.tasks.some(t=>t.type===T.FIAMMETTA&&t.timeMicros<=toMowerMicros(s.time)))return {changed:false,generated:[]}
  const previousConfig=s.config
  s.mowerBackupContext=context;s.mowerBackupGenerated=[]
  const changed=onPhase?.(phase)??false
  const generated=s.mowerBackupGenerated??[];delete s.mowerBackupContext;getMowerSourceRuntime(s)
  for(const task of generated)if(!queue.tasks.includes(task))queue.tasks.push(task)
  if(previousConfig!==s.config&&queue.tasks.some(t=>t.type===T.SHIFT_ON||t.type===T.RELEASE_DORM))planMowerMetadata(getMowerSourceRuntime(s).data,queue)
  if(getMowerSourceRuntime(s).config!==source.config)throw new Error('Mower source config identity lost')
  return {changed,generated}
 }

 function* clueSteps(flow:boolean):Generator<MowerNativeIOYield,null,void>{
  if(!rates.mowerClueIO)throw new Error('Native clue lifecycle requires explicit observations')
  const generator=(flow?runMowerClueFlow:executeMowerClueNew)(mowerClueState(s),{nowMicros:()=>toMowerMicros(s.time)})
  return yield* bridgeMowerNativeIO(generator,request=>{
   if(request.kind!=='backup-plan')return rates.mowerClueIO!(request,s)
   return {delayMicros:0,observe:()=>({kind:request.kind,observedAtMicros:toMowerMicros(s.time),value:backup('END')})}
  },()=> 'meeting')
 }
 if(source.initial){for(const room of Object.keys(source.data.plan))observeRoom(s,rates,room,undefined,room==='central'?source.data.plan[room]!.map((_,i)=>i):[]);source.initial=false}
 const clock=s.config.mowerRunLoopClock
 if(clock&&(!Number.isSafeInteger(clock.minimumClockStepMicros)||clock.minimumClockStepMicros<1||!Number.isSafeInteger(clock.notificationSleepMicros)||clock.notificationSleepMicros<0))throw new Error('Invalid Mower outer clock')
 if(source.runReturn){
  if(source.runReturn.wakeMicros>source.data.nowMicros){projectPublicState(s);return}
  if(source.runReturn.finishFallback){source.runFlags!.collectNotification=true;queue.ensureFallback(s.time)}
  delete source.runReturn;queue.sort()
  if(!queue.tasks[0]||queue.tasks[0].timeMicros>source.data.nowMicros){projectPublicState(s);return}
 }
 if(!source.execution&&!source.phaseExecution){
  source.runFlags={planned:false,todoTask:false,collectNotification:false};source.error=false
  if(source.partyTimeMicros!==undefined&&source.partyTimeMicros!==null&&source.partyTimeMicros<source.data.nowMicros)setMowerPartyTime(mowerClueState(s),null,{nowMicros:()=>toMowerMicros(s.time)})
  if(clock)prepareMowerRunEntry(queue,source.data.nowMicros)
 }
 let pass=0
 for(;pass<256;pass++){
  const running=source.execution,runningPhase=source.phaseExecution
  if(runningPhase&&runningPhase.wakeMicros>getMowerSourceRuntime(s).data.nowMicros)break
  if(running&&running.wakeMicros>getMowerSourceRuntime(s).data.nowMicros)break
  if(!running&&!runningPhase){
   const scheduling={...s.config.mowerTaskScheduling,experimental:getMowerSourceRuntime(s).data.policy.experimentalDormLogic}
   scheduleMowerTasks(queue.tasks,getMowerSourceRuntime(s).data.nowMicros,scheduling)
   protectMowerSupportSwaps(queue.tasks,getMowerSourceRuntime(s).data.nowMicros,scheduling)
  }
  const selected=runningPhase?undefined:running?.task??queue.tasks[0]
  const task=selected&&(running||selected.timeMicros<=getMowerSourceRuntime(s).data.nowMicros)?selected:undefined
  if(!task&&!runningPhase)break
  if(!running&&!runningPhase){mowerCorrectDorm(getMowerSourceRuntime(s).data);backup('BEGINNING',task)}
  const data=getMowerSourceRuntime(s).data
  // infra_main must not execute a task removed by entry metadata rebuilding.
  if(task&&!running&&(!queue.tasks.includes(task)||task.timeMicros>data.nowMicros)){skip();break}
  let skipPlanning=runningPhase?.skipPlanning??false
  if(task){
   try {
   source.activeTask=task
   if(!running){source.trace.push({timeMicros:data.nowMicros,type:task.type.key,plan:structuredClone(task.plan),metadata:task.metadata});if(source.trace.length>300)source.trace.shift()}
   if([T.CLUE,T.CLUE_PARTY].includes(task.type)){
    const steps=running?.steps??(function*():Generator<MowerRoomReturn,boolean,void>{
     yield* clueSteps(true);queue.consume(task);return true
    })()
    let next=steps.next()
    while(!next.done&&next.value.delayMicros===0)next=steps.next()
    if(!next.done){source.execution={task,steps,wakeMicros:data.nowMicros+next.value.delayMicros,intent:running?.intent??{},data:running?.data??data};break}
    delete source.execution
   }else if(task.type===T.REFRESH_TIME&&rates.mowerRunOrderIO){
    const [state,seam]=mowerRunOrderContext(s)
    const steps=running?.steps??(function*():Generator<MowerRoomReturn,boolean,void>{
     yield* bridgeMowerNativeIO(dispatchDefaultRefreshTime(state,seam,task),request=>rates.mowerRunOrderIO!(request,s))
     return true
    })()
    let next=steps.next()
    while(!next.done&&next.value.delayMicros===0)next=steps.next()
    if(!next.done){source.execution={task,steps,wakeMicros:data.nowMicros+next.value.delayMicros,intent:running?.intent??{},data:running?.data??data};break}
    delete source.execution
   }else if(!running&&task.type===T.RUN_ORDER){
    // Keep the native pre-order wake, then recheck at the observed completion time.
    // The queued task suppresses repeated reads of this still-pending order.
    if(task.wakeOnlyCompletion)queue.consume(task)
    else {
     if(task.observedOrderDueMicros===undefined)throw new Error('Wake-only order has no observed completion deadline')
     task.wakeOnlyCompletion=true;task.plan={}
     task.timeMicros=Math.max(data.nowMicros+1,task.observedOrderDueMicros)
     queue.sort()
    }
   }else if(!running&&task.type===T.FIAMMETTA&&!Object.keys(task.plan).length){
    const fia=s.config.fiammetta,target=fia?selectMowerFiaTarget(data,fia.orderedTargets,fia.fool??true,(fia.threshold??21.6)/24):undefined
    if(target&&fia){
     queue.tasks.push(new MowerTask({time:task.time,type:T.FIAMMETTA,plan:{[data.operators[fia.operatorId]!.room]:[target,fia.operatorId]},metadata:target}));for(const old of queue.tasks)if(old.type===T.SHIFT_ON&&Object.values(old.plan).flat().includes(target)){old.time=task.time+1/3600;queue.sort();break}
    }else if(fia)queue.tasks.push(new MowerTask({time:task.time+(24-(fia.threshold??21.6))/2,type:T.FIAMMETTA}))
    queue.consume(task)
   }else if(!running&&task.type===T.EXHAUST_OFF&&!Object.keys(task.plan).length){
    const first=data.operators[task.metadata.split(',')[0]!],members=first?.group?data.group(first.group):first?[first.name]:[],plan:MowerTaskPlan={}
    mowerGetRestingPlan(data,[...members],[],plan,options())
    if(Object.keys(plan).length){
     const reorder=mowerTryReorder(data,plan);if(reorder)Object.assign(plan,reorder)
     queue.tasks.push(new MowerTask({time:s.time,type:T.SHIFT_OFF,plan}))
    }else{
     const support=planMowerExhaustSupport(data,members,options())
     if(support&&Object.keys(support).length){queue.tasks.push(new MowerTask({time:s.time,type:T.SELF_CORRECTION,plan:support}),new MowerTask({time:s.time,type:T.EXHAUST_OFF,metadata:task.metadata}));skipPlanning=true}
     else {options().onBlocked(members);skipPlanning=true}
    }
    queue.consume(task)
    if(queue.tasks[0]?.type===T.SHIFT_ON)backup('AFTER_PLANNING',task)
   }else{
    const intent=running?.intent??structuredClone(task.plan),steps=running?.steps??executeMowerTaskArrangementSteps(task,queue,{
     backup,
     arrangeRoom:(room,names,getTime,current,restoration)=>arrangeRoomSteps(s,rates,room,names,getTime,current,restoration),
     metadata:()=>planMowerMetadata(getMowerSourceRuntime(s).data,queue),
     corrections:()=>{readAgentMood(s,rates);const correction=planMowerCorrection(getMowerSourceRuntime(s).data,queue,true,task,false,skip);return correction?[correction]:[]},
     prepareRelease:current=>prepareMowerRelease(getMowerSourceRuntime(s).data,queue,current),
     skip
    })
    let lastBoundary=running?.lastBoundary
    const resume=()=>{
     if(lastBoundary&&(!lastBoundary.nativeRunOrderIO||lastBoundary.returnsInfraMain)&&s.mowerUI)s.mowerUI.scene='INFRA_MAIN'
     const next=steps.next();lastBoundary=next.done?undefined:next.value
     return next
    }
    let next=resume()
    const boundaryDelay=()=>next.done?0:next.value.nativeRunOrderIO?next.value.delayMicros:s.config.mowerDeviceTiming?.roomReturnMicros??0
    let delay=boundaryDelay()
    if(!Number.isSafeInteger(delay)||delay<0)throw new Error('Invalid Mower device clock')
    while(!next.done&&delay===0){next=resume();delay=boundaryDelay()}
    if(!next.done){source.execution={task,steps,wakeMicros:data.nowMicros+delay,intent,data:running?.data??data,lastBoundary:next.value};break}
    delete source.execution
    const success=next.value,eventData=running?.data??data
    skipPlanning=!success||task.type===T.RE_ORDER
    if(success&&[T.SHIFT_OFF,T.SHIFT_ON,T.SELF_CORRECTION].includes(task.type)){
     const names=task.type===T.SHIFT_OFF?Object.values(eventData.operators).filter(op=>op.isHigh()&&!op.room.startsWith('dorm')&&Object.entries(intent).some(([room,slots])=>op.room===room&&slots[op.index]!=='Current'&&slots[op.index]!==op.name)).map(o=>o.name):Object.values(intent).flat().filter(n=>eventData.operators[n]?.isHigh()&&!eventData.operators[n]!.room.startsWith('dorm'))
     if(task.type===T.SHIFT_ON)for(const name of names){
      const op=eventData.operators[name]!
      if(op.currentRoom===op.room&&op.currentIndex===op.index)eventData.recentShiftOnByRestUnit.set(mowerRestUnitKey(op),eventData.nowMicros)
     }
     if(names.length)s.events.push({time:s.time,type:task.type===T.SHIFT_OFF?'shift-off':'shift-on',operators:names,...(task.type===T.SELF_CORRECTION?{reason:'position-correction' as const}:{})})
    }
   }
   }catch(error){
    rethrowMowerInfraFatal(error)
    s.diagnostics.push({code:'mower-task-exception',message:error instanceof Error?error.message:String(error)})
    delete source.execution
    source.error=true;skip();skipPlanning=true
   }
  }
  delete source.activeTask // Native infra_main clears self.task before planning (1169).
  // Native planning stays in the same run through real order I/O continuations.
  function* returnToInfraMain():Generator<MowerRoomReturn,void,void>{
   if(!s.mowerUI||['INFRA_MAIN','INFRA_TODOLIST'].includes(s.mowerUI.scene))return
   if(s.mowerUI.scene!=='INFRA_DETAILS')throw new Error('Native scene graph input is unavailable for '+s.mowerUI.scene)
   // graph.py infra_back directly calls BaseSolver.back(), whose default sleep is one second.
   yield {room:s.mowerUI.lastRoom,delayMicros:1_000_000,nativeRunOrderIO:true}
   s.mowerUI.scene='INFRA_MAIN';s.mowerUI.lastRoom=''
  }
  function* planningSteps():Generator<MowerRoomReturn,void,void>{
   yield* returnToInfraMain()
   if(skipPlanning||queue.find({time:s.time+1/60}))skip()
   if(!source.runFlags!.planned){
    try {
    readAgentMood(s,rates)
    if(!planMowerCorrection(getMowerSourceRuntime(s).data,queue,false,undefined,true,skip)){
     let tailShouldRun=true
     if(rates.mowerRunOrderIO){
      const [state,seam]=mowerRunOrderContext(s)
      const result=yield* bridgeMowerNativeIO(runDefaultTradeSegment(state,seam),request=>rates.mowerRunOrderIO!(request,s))
      tailShouldRun=result.tailShouldRun
     }else if(Object.keys(getMowerSourceRuntime(s).data.runOrderRooms).length&&!s.diagnostics.some(d=>d.code==='mower-run-order-io-unavailable')){
      s.diagnostics.push({code:'mower-run-order-io-unavailable',message:'Native run-order lifecycle observations are absent; full Mower parity is unavailable'})
     }
     if(tailShouldRun)scheduleFiaAndExhaust(s,rates)
     planMowerOrdinary(getMowerSourceRuntime(s).data,queue,options())
     if(!mowerPlanningHasNearTask(getMowerSourceRuntime(s).data,queue)){
      readAgentMood(s,rates);if(!planMowerCorrection(getMowerSourceRuntime(s).data,queue,false,undefined,false,skip))backup('END')
     }
    }else skip()
    }catch(error){
     rethrowMowerInfraFatal(error)
     s.diagnostics.push({code:'mower-planning-exception',message:error instanceof Error?error.message:String(error)})
     source.error=true
    }
    source.runFlags!.planned=true
   }
   yield* returnToInfraMain()
   let retryTimes=3
   while(!source.runFlags!.todoTask){
    try {
    if(rates.mowerTodoTaskIO&&rates.mowerClueIO){
     const settings=s.config.mowerServices
     const todoState:MowerTodoTaskState={
      queue,flags:source.runFlags!,enableParty:settings?.enableParty??true,
      get lastClueMicros(){return source.lastClueMicros??null},set lastClueMicros(value){source.lastClueMicros=value},
      get droneRoom(){return s.config.mowerDroneRoom??null},get runOrderRooms(){return []},
      get droneTimeMicros(){return source.droneTimeMicros??null},set droneTimeMicros(value){source.droneTimeMicros=value},
      droneIntervalHours:settings?.droneIntervalHours??3,reloadRooms:settings?.reloadRooms??null,
      get reloadTimeMicros(){return source.reloadTimeMicros??null},set reloadTimeMicros(value){source.reloadTimeMicros=value},
      maaGapHours:settings?.maaGapHours??3,
     }
     yield* bridgeMowerNativeIO(executeMowerTodoTask(todoState,{nowMicros:()=>toMowerMicros(s.time)}),request=>{
      if(request.kind==='reload')return (function*(){
       const reloadState={rooms:request.rooms,reloadTimeMicros:source.reloadTimeMicros??null,width:1920,height:1080,waitingScenes:[]}
       const value=yield* bridgeMowerNativeIO(executeMowerReload(reloadState,{nowMicros:()=>toMowerMicros(s.time),isMowerExit:error=>error instanceof MowerExitError}),step=>{
        if(!rates.mowerReloadIO)throw new Error('Native nonempty reload lifecycle observations are unavailable')
        return rates.mowerReloadIO(step,s)
       })
       return {kind:request.kind,observedAtMicros:toMowerMicros(s.time),value:{result:value,reloadTimeMicros:reloadState.reloadTimeMicros}}
      })()
      if(request.kind!=='clue-new')return rates.mowerTodoTaskIO!(request,s)
      return (function*(){const value=yield* clueSteps(false);return {kind:request.kind,observedAtMicros:toMowerMicros(s.time),value}})()
     })
    }else{
     if(!s.diagnostics.some(d=>d.code==='mower-todo-io-unavailable'))s.diagnostics.push({code:'mower-todo-io-unavailable',message:'Native clue/drone/reload lifecycle input is unavailable in this decision-only run'})
     source.runFlags!.todoTask=true
    }
    }catch(error){
     if(!(error instanceof MowerRecognizeError))throw error
     s.diagnostics.push({code:'mower-todo-recognize-retry',message:error.message})
     --retryTimes
     yield {room:'',delayMicros:3_000_000,nativeRunOrderIO:true}
     if(retryTimes===0){source.baseRunAborted=true;return}
    }
   }
   if(rates.mowerNotificationIO){
    const notificationState={queue,flags:source.runFlags!,
     get lastTodoMicros(){return source.lastTodoMicros??null},set lastTodoMicros(value:number|null){source.lastTodoMicros=value}}
    retryTimes=3
    while(!source.runFlags!.collectNotification||rates.mowerTodoListVisible?.()){
    try {
    const seam={nowMicros:()=>toMowerMicros(s.time)}
    yield* returnToInfraMain()
    if(!source.runFlags!.collectNotification){
     yield* bridgeMowerNativeIO(collectMowerInfraNotification(notificationState,seam),request=>rates.mowerNotificationIO!(request,s),()=> '')
     // BaseSolver.run resets its budget after each successful transition.
     retryTimes=3
    }
    while(rates.mowerTodoListVisible?.()){
     yield* bridgeMowerNativeIO(collectMowerTodoList(notificationState,seam),request=>rates.mowerNotificationIO!(request,s),()=> '')
     retryTimes=3
    }
    break
    }catch(error){
     if(!(error instanceof MowerRecognizeError))throw error
     s.diagnostics.push({code:'mower-notification-recognize-retry',message:error.message})
     --retryTimes
     yield {room:'',delayMicros:3_000_000,nativeRunOrderIO:true}
     if(retryTimes===0){source.baseRunAborted=true;return}
    }
    }
   }
  }
  const phaseSteps=runningPhase?.steps??planningSteps()
  let phaseNext=phaseSteps.next()
  while(!phaseNext.done&&phaseNext.value.delayMicros===0)phaseNext=phaseSteps.next()
  if(!phaseNext.done){
   source.phaseExecution={steps:phaseSteps,wakeMicros:toMowerMicros(s.time)+phaseNext.value.delayMicros,skipPlanning}
   break
  }
  delete source.phaseExecution
  if(source.baseRunAborted){
   delete source.baseRunAborted
   source.runReturn={wakeMicros:toMowerMicros(s.time)+(clock?.minimumClockStepMicros??1),finishFallback:false}
   break
  }
  if(clock){
   // Source notification branch with no notification detected advances one second.
   // Recognition/transport are separate zero-time seams; near tasks skip this branch.
   if(source.error)prepareMowerRunEntry(queue,data.nowMicros)
   const notification=!source.runFlags?.collectNotification&&!skipPlanning&&!queue.find({time:s.time+1/60})?clock.notificationSleepMicros:0
   if(notification>0)source.runReturn={wakeMicros:data.nowMicros+notification,finishFallback:true}
   else {
    source.runFlags!.collectNotification=true
    queue.ensureFallback(s.time)
    if(queue.tasks.some(t=>t.timeMicros<=data.nowMicros))source.runReturn={wakeMicros:data.nowMicros+clock.minimumClockStepMicros,finishFallback:false}
   }
   break
  }
  source.runFlags!.collectNotification=true
  if(source.error)prepareMowerRunEntry(queue,data.nowMicros)
  else queue.ensureFallback(s.time)
 }
 if(pass===256)throw new Error('Mower source task chain did not converge '+JSON.stringify({queue:queue.tasks.slice(0,4).map(t=>({type:t.type.key,plan:t.plan,time:t.time})),trace:source.trace.slice(-5)}))
 queue.sort();projectPublicState(s);source.lastWakeMicros=toMowerMicros(s.time)
}
export function nextMowerSourceActionHours(s:RuntimeState):number {
 const source=getMowerSourceRuntime(s);source.queue.sort()
 return Math.max(0,((source.execution?.wakeMicros??source.phaseExecution?.wakeMicros??source.runReturn?.wakeMicros??source.queue.tasks[0]?.timeMicros??Infinity)-source.data.nowMicros)/3_600_000_000)
}
