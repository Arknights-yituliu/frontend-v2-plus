// Port of default update_detail, refresh_dorm_time, correct_dorm and project_arrangements.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
import {MowerOperatorState} from './mowerOperatorState'
import {MowerSchedulingData,MowerDormState} from './mowerSchedulingData'
import {toMowerMicros,fromMowerMicros,roundMowerMicros,MOWER_TASK_TYPES as T,type MowerTask,type MowerTaskPlan} from './mowerTaskQueue'
/** Actual get_agent_from_room input expansion; FIA reads only explicitly passed indexes. */
export function mowerRoomReadIndexes(data:MowerSchedulingData,room:string,task?:MowerTask,requested:number[]=[]):number[] {
 const indexes=[...requested]
 if(room.startsWith('dorm')&&task?.type!==T.FIAMMETTA)for(const [index,name] of (data.plan[room]??[]).entries())if(name==='Free'||data.operators[name]?.nativeName==='菲亚梅塔')indexes.push(index)
 return [...new Set(indexes)]
}
export function shouldMowerReadMood(data:MowerSchedulingData,name:string,room:string,index:number,indexes:number[],task?:MowerTask,firstTask?:MowerTask):boolean {
 const op=data.operators[name]!
 if(room.startsWith('dorm')&&task?.type===T.FIAMMETTA)return (op.nativeName==='菲亚梅塔'||task.metadata===name)&&indexes.includes(index)
 return op.needToRefresh(data.nowMicros,2,room)||firstTask?.type===T.SHIFT_ON||indexes.includes(index)
}
/** The native SQLite decorator discards the inner return when update_time is false. */
export function mowerUpdateDetail(data:MowerSchedulingData,name:string,mood:number,room:string,index:number,updateTime=false,trueExhaustRooms=new Set<string>(),onRoomChanged?:(op:MowerOperatorState)=>void):number|undefined {
 const op=data.operators[name]!
 if(updateTime){
  if(op.timeStampMicros!==undefined&&op.mood>mood){
   const elapsed=data.nowMicros-op.timeStampMicros
   if(elapsed>toMowerMicros(29/60))op.depletionRate=(op.mood-mood)/fromMowerMicros(elapsed)
  }
  op.timeStampMicros=data.nowMicros
 }
 if(op.isResting()&&!room.startsWith('dorm'))op.depletionRate=0
 if(op.isResting()){const previous=data.getDormByName(name)?.[1];if(previous?.name===name)previous.reset()}
 if(!trueExhaustRooms.has(room))op.exhaustTimeMicros=undefined
 if(op.currentRoom!==room){op.currentRoom=room;onRoomChanged?.(op)}
 op.currentIndex=index;op.mood=mood
 if(room==='train'&&index===0)op.restingFromTrain=true
 else if(room&&!room.startsWith('dorm')||mood>=24)op.restingFromTrain=false
 if(mood>=24)op.clearDormRecovery()
 if(room.startsWith('dorm')){
  const bed=data.getDormByName(name)?.[1]
  if(bed){bed.name=name;if(bed.timeMicros===undefined)return updateTime?index:undefined}
 }
 if(op.nativeName==='菲亚梅塔'&&(op.timeStampMicros===undefined||op.timeStampMicros<data.nowMicros))return updateTime?index:undefined
 return undefined
}
export function mowerRefreshDormTime(data:MowerSchedulingData,room:string,index:number,name:string,timeMicros:number,trueExhaustRooms=new Set<string>()):void {
 const op=data.operators[name];if(!op)return
 const bed=data.dorms.find(b=>b.position[0]===room&&b.position[1]===index&&data.recoveryDorm(b,name))
 if(bed){
  bed.name=name
  bed.timeMicros=op.mood!==24&&op.timeStampMicros!==undefined?op.timeStampMicros+roundMowerMicros((op.upperLimit-op.mood)*(timeMicros-op.timeStampMicros)/(24-op.mood)):timeMicros
 }
 if(trueExhaustRooms.has(room))op.exhaustTimeMicros=Math.max(data.nowMicros,op.mood>0&&op.lowerLimit>0?data.nowMicros+roundMowerMicros((timeMicros-data.nowMicros)*(op.mood-op.lowerLimit)/op.mood):timeMicros)
}
export function mowerCorrectDorm(data:MowerSchedulingData):void {
 for(const bed of data.dorms){
  const op=data.operators[bed.name];if(!bed.name||!op)continue
  if(!data.recoveryDorm(bed,bed.name)||op.currentRoom!==bed.position[0]||op.currentIndex!==bed.position[1])bed.reset()
  else if(bed.timeMicros!==undefined&&bed.timeMicros<data.nowMicros){op.mood=op.upperLimit;op.timeStampMicros=bed.timeMicros;op.depletionRate=0}
 }
}
export function projectMowerArrangements(data:MowerSchedulingData,plans:MowerTaskPlan[]):MowerSchedulingData {
 const projected=new MowerSchedulingData({...data,operators:Object.fromEntries(Object.entries(data.operators).map(([n,o])=>[n,new MowerOperatorState({...o,replacement:[...o.replacement]})])),dorms:data.dorms.map(b=>new MowerDormState([...b.position],b.name,b.timeMicros,b.autoFree))})
 for(const plan of plans){
  const changed=new Set(Object.entries(plan).flatMap(([room,names])=>names.flatMap((name,index)=>name!=='Current'?[room+'\0'+index]:[])))
  const timers=new Map(projected.dorms.filter(b=>b.name).map(b=>[b.name,{position:b.position,time:b.timeMicros}]))
  for(const op of Object.values(projected.operators))if(changed.has(op.currentRoom+'\0'+op.currentIndex)){op.currentRoom='';op.currentIndex=-1}
  for(const [room,names] of Object.entries(plan))for(const [index,name] of names.entries()){const op=projected.operators[name];if(op){op.currentRoom=room;op.currentIndex=index}}
  for(const bed of projected.dorms){
   const op=projected.currentOperator(...bed.position)
   if(op&&projected.recoveryDorm(bed,op.name)){bed.name=op.name;bed.timeMicros=timers.get(op.name)?.time}else bed.reset()
  }
 }
 return projected
}
