// Port of default agent_arrange / infra_main arrangement handling in Mower alpha.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
import {MowerMissedSelection} from './mowerRunSelection'
import type {BackupTiming} from './backupPlans'
import {MOWER_TASK_TYPES as T,MowerTask,type MowerTaskQueue,type MowerTaskPlan} from './mowerTaskQueue'
export interface MowerBackupResult {changed:boolean;generated:MowerTask[]}
export interface MowerTaskExecutionHooks {
 /** changed is the source solver's new_task result, not any plan-condition change. */
 backup:(phase:BackupTiming,task:MowerTask,context:{appendEmptyTask:boolean;restoreOnDeactivate:boolean;customTimeMicros?:number})=>MowerBackupResult
 /** Physical I/O adapter; this core removes the successfully committed room from the task. */
 arrangeRoom:(room:string,names:string[],getTime:boolean,task:MowerTask,restoration:MowerTaskPlan)=>MowerTaskPlan|void|MowerMissedSelection|Generator<MowerRoomReturn,MowerTaskPlan|void|MowerMissedSelection,void>
 /** prepare_release_dorm validates identity/cap and clears stale plans. */
 prepareRelease?:(task:MowerTask)=>boolean
 metadata:()=>void
 corrections?:()=>MowerTask[]
 skip?:()=>void
 runOrderBufferSeconds?:number
 runOrderFinishing?:(restoration:MowerTaskPlan,lastRoom:string,task:MowerTask,originalPlan:MowerTaskPlan|null)=>void|Generator<MowerRoomReturn,void,void>
}
function enqueueGenerated(queue:MowerTaskQueue,generated:MowerTask[]):void {for(const task of generated)if(!queue.tasks.includes(task))queue.tasks.push(task)}
function enterPhase(phase:'BEFORE_WORK'|'BEFORE_DORM',task:MowerTask,queue:MowerTaskQueue,hooks:MowerTaskExecutionHooks):boolean {
 const result=hooks.backup(phase,task,{appendEmptyTask:false,restoreOnDeactivate:true,customTimeMicros:task.timeMicros-1})
 enqueueGenerated(queue,result.generated)
 if(!result.changed)return false
 const generated=new Set(result.generated),others=queue.tasks.filter(t=>!generated.has(t))
 const anchor=others.length?Math.min(...others.map(t=>t.timeMicros)):task.timeMicros
 // Reverse enumeration gives the first generated task the earliest microsecond.
 for(const [offset,t] of [...result.generated].reverse().entries())t.timeMicros=anchor-offset-1
 if(phase==='BEFORE_WORK'){
  for(const generated of result.generated)for(const [room,names] of Object.entries(generated.plan)){
   const pending=task.plan[room];if(!pending)continue
   for(const [index,name] of names.entries())if(index<pending.length&&name!=='Current')pending[index]='Current'
  }
  for(const [room,names] of Object.entries(task.plan))if(names.every(name=>name==='Current'))delete task.plan[room]
 }else{
  for(const generated of result.generated)for(const room of Object.keys(generated.plan))if(room.startsWith('dormitory_')&&room in task.plan)delete task.plan[room]
 }
 return true
}
/** Returns false only for a deferred original task. Its identity and remaining plan survive. */
export interface MowerRoomReturn {room:string;delayMicros:number;nativeRunOrderIO?:true;returnsInfraMain?:true}
/** Device back(0.5) is a source I/O boundary, including an exact Current no-op. */
export function* executeMowerTaskArrangementSteps(task:MowerTask,queue:MowerTaskQueue,hooks:MowerTaskExecutionHooks):Generator<MowerRoomReturn,boolean,void> {
 if(!Object.keys(task.plan).length){queue.consume(task);if(queue.tasks[0]?.type===T.SHIFT_ON){const result=hooks.backup('AFTER_PLANNING',task,{appendEmptyTask:true,restoreOnDeactivate:false});enqueueGenerated(queue,result.generated)}return true}
 const originalPlan=task.type===T.RUN_ORDER?structuredClone(task.plan):null
 let getTime=task.type===T.SHIFT_OFF
 if(task.type===T.RELEASE_DORM){if(!hooks.prepareRelease)throw new Error('Mower release requires the identity and mood-limit validation adapter');getTime=hooks.prepareRelease(task)}
 const rooms=Object.keys(task.plan).sort((a,b)=>Number(a.startsWith('dormitory_'))-Number(b.startsWith('dormitory_'))||(a.startsWith('dormitory_')&&b.startsWith('dormitory_')?Number(a.split('_')[1])-Number(b.split('_')[1]):0))
 let beforeWork=false,beforeDorm=false,lastRoom='';const restoration:MowerTaskPlan={}
 for(const room of rooms){
  if(!room.startsWith('dormitory_')&&!beforeWork){beforeWork=true;if(enterPhase('BEFORE_WORK',task,queue,hooks)){if(!Object.keys(task.plan).length)queue.consume(task);return false}}
  if(room.startsWith('dormitory_')&&!beforeDorm){beforeDorm=true;if(enterPhase('BEFORE_DORM',task,queue,hooks)){if(!Object.keys(task.plan).length)queue.consume(task);return false}}
  const names=task.plan[room];if(!names)continue
  const arrangement=hooks.arrangeRoom(room,names,getTime,task,restoration)
  const additional=arrangement&&'next' in arrangement&&typeof arrangement.next==='function'?yield* (arrangement as Generator<MowerRoomReturn,MowerTaskPlan|void|MowerMissedSelection,void>):arrangement
  if(additional instanceof MowerMissedSelection){for(const key of Object.keys(restoration))delete restoration[key];lastRoom=room;continue}
  if(additional)Object.assign(restoration,additional)
  delete task.plan[room];task.dormRecoveryRestore=task.dormRecoveryRestore.filter(r=>r!==room);lastRoom=room;if(Object.keys(restoration).length!==1||(hooks.runOrderBufferSeconds??0)<=0)yield {room,delayMicros:500_000}
 }
 const restoreRooms=Object.keys(restoration)
 if(restoreRooms.length===1&&lastRoom!=='train'){
  if(!hooks.runOrderFinishing)throw new Error('Mower temporary-order restoration requires the run-order adapter')
  const finishing=hooks.runOrderFinishing(restoration,lastRoom,task,originalPlan)
  if(finishing)yield* finishing
 }else if(restoreRooms.length>1){
  queue.tasks.push(new MowerTask({time:queue.tasks[0]?.time??task.time,plan:restoration,type:T.FIAMMETTA}))
  hooks.skip?.()
 }
 if(getTime){
  const result=hooks.backup('BEFORE_PLANNING',task,{appendEmptyTask:true,restoreOnDeactivate:false});enqueueGenerated(queue,result.generated)
  if(!result.changed)hooks.metadata()
  else if(result.generated.length){
   if(!hooks.corrections)throw new Error('Mower backup after a downshift requires the correction adapter')
   const previous=new Set(queue.tasks),created=hooks.corrections();enqueueGenerated(queue,created)
   const corrections=queue.tasks.filter(t=>!previous.has(t)&&t.type===T.SELF_CORRECTION)
   const anchor=Math.min(...result.generated.map(t=>t.timeMicros))
   for(const [offset,correction] of corrections.entries())correction.timeMicros=anchor-offset-1
  }
 }
 queue.consume(task)
 // infra_main tests the first retained task, without inventing an extra phase.
 if(queue.tasks[0]?.type===T.SHIFT_ON){const result=hooks.backup('AFTER_PLANNING',task,{appendEmptyTask:true,restoreOnDeactivate:false});enqueueGenerated(queue,result.generated)}
 return true
}

/** Pure decision replay: the caller owns its clock and may drain all device boundaries. */
export function executeMowerTaskArrangement(task:MowerTask,queue:MowerTaskQueue,hooks:MowerTaskExecutionHooks):boolean {
 const steps=executeMowerTaskArrangementSteps(task,queue,hooks)
 let next=steps.next();while(!next.done)next=steps.next()
 return next.value
}
