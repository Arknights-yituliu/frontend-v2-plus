// Port of generate_plan_by_drom and merge_release_dorm, default Mower alpha.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
import {MOWER_TASK_TYPES as T,MowerTask,toMowerMicros,type MowerTaskPlan} from './mowerTaskQueue'
import type {MowerDormState,MowerSchedulingData} from './mowerSchedulingData'
export interface MowerDormBatch {timeMicros:number;dorms:MowerDormState[];restInFull:boolean|null}
export type MowerReturnTargets=Record<string,[string,number]>
export function mergeMowerReleaseDorm(tasks:MowerTask[],intervalMinutes:number):void {
 for(let idx=2;idx<=tasks.length;idx++){
  const index=tasks.length-idx,task=tasks[index]!;if(task.type!==T.RELEASE_DORM||task.strictMoodLimit)continue
  let lastNotRelease:MowerTask|undefined
  for(let previous=idx+1;previous<=tasks.length;previous++){const other=tasks[tasks.length-previous]!;if(other.type!==T.RELEASE_DORM&&other.timeMicros>task.timeMicros-toMowerMicros(1/60))lastNotRelease=other}
  if(lastNotRelease)continue
  const next=tasks[index+1]!;if(task.timeMicros+toMowerMicros(intervalMinutes/60)>next.timeMicros){task.timeMicros=next.timeMicros+toMowerMicros(1/3600);tasks[index]=next;tasks[index+1]=task}
 }
}
export function generateMowerDormTasks(batches:MowerDormBatch[],data:MowerSchedulingData,existingTargets:MowerReturnTargets={}):MowerTask[] {
 if(!batches.length)return []
 if(data.policy.experimentalDormLogic)throw new Error('Experimental deferred arrangements require their source port')
 const ordered=[...batches].sort((a,b)=>a.timeMicros-b.timeMicros),result:MowerTask[]=[],planned=new Set<string>(),now=data.nowMicros
 for(const batch of ordered){
  let time=batch.timeMicros,exhaustExists=false;const plan:MowerTaskPlan={}
  for(const bed of batch.dorms){
   if(!bed.name||!data.operators[bed.name]||planned.has(bed.name))continue
   const op=data.operators[bed.name]!;if(op.exhaustRequire)exhaustExists=true
   if(!op.isHigh()){
    if(batch.restInFull===null&&data.skipIdleDormRelease(op.name))continue
    if(!data.plan[op.currentRoom]||op.currentIndex<0||op.currentIndex>=data.plan[op.currentRoom]!.length)continue
    ;(plan[op.currentRoom]??=Array(data.plan[op.currentRoom]!.length).fill('Current'))[op.currentIndex]='Free'
   }else{
    const agents=op.group?data.group(op.group):[op.name]
    for(const agent of agents){
     const member=data.operators[agent]!;let room=member.room,index=member.index
     const old=existingTargets[agent]
     if(old){const [oldRoom,oldIndex]=old;const slots=data.plan[oldRoom];if(slots&&oldIndex<slots.length&&(!plan[oldRoom]||['Current',agent].includes(plan[oldRoom]![oldIndex]!))){const native=slots[oldIndex];if(native===agent||!batch.dorms.some(d=>d.name===native)){room=oldRoom;index=oldIndex}}}
     const slots=plan[room]??=Array(data.plan[room]!.length).fill('Current')
     if(!['Current',agent].includes(slots[index]!)){room=member.room;index=member.index;plan[room]??=Array(data.plan[room]!.length).fill('Current')}
     plan[room]![index]=agent;planned.add(agent)
    }
   }
  }
  if(!Object.keys(plan).length)continue
  // rebalance_closing_dorm_slots is an identity operation in the default branch.
  if(batch.restInFull){time=exhaustExists?Math.max(time,now):Math.max(time-toMowerMicros(8/60),now);const task=new MowerTask({plan,type:T.SHIFT_ON});task.timeMicros=time;result.push(task)}
  else{
   if(batch.restInFull===null&&!data.freeRoom)continue
   const kind=batch.restInFull===null?T.RELEASE_DORM:T.SHIFT_ON;let added=false
   for(let index=result.length-1;index>=0;index--){const other=result[index]!;if(other.timeMicros<time)break;if(other.type===kind){const task=new MowerTask({plan,type:kind});task.timeMicros=Math.max(other.timeMicros,now-toMowerMicros(1/3600));result.splice(index,0,task);added=true;break}}
   if(!added){const task=new MowerTask({plan,type:kind});task.timeMicros=Math.max(batch.restInFull===null?time:time-toMowerMicros(8/60),now-toMowerMicros(1/3600));result.push(task)}
  }
 }
 mergeMowerReleaseDorm(result,data.mergeIntervalMinutes);return result
}
