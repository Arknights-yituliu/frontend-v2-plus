// Port of default agent_get_mood correction and prefer_resting_replacements.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
import {mowerReplacementCandidates,type MowerOperatorState} from './mowerOperatorState'
import type {MowerSchedulingData} from './mowerSchedulingData'
import {MowerTask,MOWER_TASK_TYPES as T,fromMowerMicros,toMowerMicros,type MowerTaskPlan,type MowerTaskQueue} from './mowerTaskQueue'
const placeholders=new Set(['','Current','Free'])
const requested=(plan:MowerTaskPlan,room:string,index:number)=>plan[room]?.[index]??'Current'
export function mowerNotValid(data:MowerSchedulingData,op:MowerOperatorState):boolean {
 if(!op.isHigh())return false
 if(op.workaholic)return op.currentRoom!==op.room||op.currentIndex!==op.index
 if(!op.room.startsWith('dorm')&&op.isResting())return op.mood===-1||op.mood===24
 return op.needToRefresh(data.nowMicros,2.5)||op.currentRoom!==op.room||op.currentIndex!==op.index
}
export function mowerIsDormReplacement(data:MowerSchedulingData,name:string):boolean {
 const op=data.operators[name]!;if(!op.currentRoom.startsWith('dorm'))return false
 const residentName=data.plan[op.currentRoom]?.[op.currentIndex],resident=residentName?data.operators[residentName]:undefined
 return !!resident?.group&&resident.nativeName!=='菲亚梅塔'&&resident.replacement.includes(name)
}
export function preferMowerRestingReplacements(data:MowerSchedulingData,plan:MowerTaskPlan):void {
 if(!Object.keys(plan).length)return
 const ends=new Map(data.dorms.filter(b=>b.name).map(b=>[b.name,b.timeMicros])),resting=new Set<string>(),groups=new Set<string>()
 for(const op of Object.values(data.operators)){
  if(!op.isHigh()||op.workaholic||op.room.startsWith('dorm')||!op.isResting())continue
  const end=ends.get(op.name),unfinished=end!==undefined?end>data.nowMicros:op.mood>=0&&op.mood<op.upperLimit
  if(unfinished){resting.add(op.name);if(op.group)groups.add(op.group)}
 }
 for(const group of groups){
  const members=data.group(group).map(n=>data.operators[n]!).filter(op=>!op.room.startsWith('dorm')&&!op.workaholic)
  if(members.some(op=>!op.isResting()&&!(!op.currentRoom&&(data.canStandby(op)||op.timeStampMicros!==undefined&&op.mood>=op.upperLimit))))data.group(group).forEach(n=>resting.delete(n))
  else members.forEach(op=>resting.add(op.name))
 }
 if(!resting.size)return
 const original=structuredClone(plan),reserved=new Set(Object.values(plan).flat().filter(n=>!placeholders.has(n)&&!resting.has(n)))
 for(const op of Object.values(data.operators))if(op.currentRoom&&!op.isResting()){
  const target=requested(original,op.currentRoom,op.currentIndex)
  if(target==='Current'||target===op.name||resting.has(target)&&data.operators[target]!.replacement.includes(op.name))reserved.add(op.name)
 }
 const recall=new Set<string>()
 for(const [room,names] of Object.entries(plan)){
  if(room.startsWith('dorm'))continue
  for(const [index,name] of names.entries()){
   if(!resting.has(name))continue
   const op=data.operators[name]!;if(room!==op.room||index!==op.index)continue
   const actual=data.currentRoom(room,true)![index]
   if(actual===name||actual&&op.replacement.includes(actual)&&!data.excludedCandidates.has(actual)){names[index]='Current';continue}
   const candidate=mowerReplacementCandidates(op,data.operators,data.policy,data.nowMicros).find(n=>{
    const cover=data.operators[n];if(!cover||cover.isHigh()||reserved.has(n)||resting.has(n)||data.excludedCandidates.has(n)||mowerIsDormReplacement(data,n)||data.busyRestingNames.has(n))return false
    if(!cover.currentRoom||cover.isResting()||cover.currentRoom===room)return true
    const replacement=requested(original,cover.currentRoom,cover.currentIndex)
    return !placeholders.has(replacement)&&!resting.has(replacement)&&replacement!==cover.name
   })
   if(candidate){names[index]=candidate;reserved.add(candidate)}else if(op.group)recall.add(op.group)
  }
 }
 for(const group of recall)for(const name of data.group(group)){const op=data.operators[name]!;if(!op.room.startsWith('dorm'))(plan[op.room]??=Array(data.plan[op.room]!.length).fill('Current'))[op.index]=name}
 for(const [room,names] of Object.entries(plan)){
  names.forEach((name,index)=>{if(!placeholders.has(name)&&data.currentRoom(room,true)![index]===name)names[index]='Current'})
  if(names.every(n=>n==='Current'))delete plan[room]
 }
}
export function mowerCorrectionPlan(data:MowerSchedulingData,skipDorm=false):MowerTaskPlan {
 const plan:MowerTaskPlan={}
 const set=(room:string,index:number,name:string)=>{(plan[room]??=Array(data.plan[room]!.length).fill('Current'))[index]=name}
 for(const [room,names] of Object.entries(data.plan))for(const [index,name] of names.entries()){
  const actual=data.currentRoom(room,true)![index],op=data.operators[name]
  if(!actual){set(room,index,name);continue}
  if(name==='Free')continue
  if(actual!==name&&!(op?.replacement.includes(actual)&&!data.excludedCandidates.has(actual)))set(room,index,name)
 }
 const miss=Object.values(data.operators).filter(op=>mowerNotValid(data,op)&&!(op.group&&op.room.startsWith('dorm'))&&!data.isStandby(op.name)&&!data.busyRestingNames.has(op.name))
 for(const op of miss){
  const peers=op.group?data.group(op.group).map(n=>data.operators[n]!):[]
  if(op.group&&peers.some(peer=>!peer.room.startsWith('dorm')&&!mowerNotValid(data,peer)&&peer.isResting())&&(op.workaholic||op.timeStampMicros!==undefined&&(op.currentMood(data.nowMicros)>=op.upperLimit||op.mood>=op.upperLimit)))continue
  for(const peer of peers)if(!peer.room.startsWith('dorm')&&(peer.currentRoom!==peer.room||peer.currentIndex!==peer.index))set(peer.room,peer.index,peer.name)
  set(op.room,op.index,op.name)
  if(op.currentIndex!==-1&&op.currentIndex!==op.index||op.currentRoom&&op.currentRoom!==op.room)set(op.currentRoom,op.currentIndex,data.plan[op.currentRoom]![op.currentIndex]!)
 }
 const groups=new Set(Object.values(data.operators).map(op=>op.group).filter(Boolean))
 for(const group of groups){
  const peers=data.group(group).map(n=>data.operators[n]!).filter(op=>!op.room.startsWith('dorm'))
  if(peers.some(op=>op.currentRoom&&!op.isResting())&&peers.some(op=>!op.currentRoom||op.isResting()))for(const op of peers)if(!op.currentRoom||op.isResting())set(op.room,op.index,op.name)
 }
 for(const [room,names] of Object.entries(plan))if(skipDorm&&room.startsWith('dorm')&&names.every(n=>n==='Free'||n==='Current'))delete plan[room]
 for(const op of Object.values(data.operators))if(data.busyRestingNames.has(op.name)&&op.room==='train')delete plan.train
 preferMowerRestingReplacements(data,plan)
 for(const group of groups){
  const members=data.group(group),residents=members.map(n=>data.operators[n]!).filter(op=>op.room.startsWith('dorm'))
  const recalling=members.some(n=>{const op=data.operators[n]!;return !op.room.startsWith('dorm')&&!op.workaholic&&requested(plan,op.room,op.index)===n})
  const resting=data.groupIsResting(group)&&!recalling
  const changes:{room:string;index:number;name:string}[]=[]
  for(const op of residents){
   const actual=data.currentOperator(op.room,op.index);let desired=op.name
   if(resting){
    const candidates=mowerReplacementCandidates(op,data.operators,data.policy,data.nowMicros)
    if(actual&&candidates.includes(actual.name)){candidates.splice(candidates.indexOf(actual.name),1);candidates.unshift(actual.name)}
    const reserved=new Set([...Object.entries(plan).flatMap(([room,names])=>names.filter((_,index)=>room!==op.room||index!==op.index)),...changes.map(c=>c.name)])
    desired=candidates.find(n=>{const cover=data.operators[n]!;return !data.excludedCandidates.has(n)&&!reserved.has(n)&&!data.busyRestingNames.has(n)&&!cover.isHigh()&&(actual?.name===n||!mowerIsDormReplacement(data,n)&&(!cover.currentRoom||cover.isResting()))})??op.name
   }
   changes.push({room:op.room,index:op.index,name:desired})
  }
  for(const {room,index,name} of changes){const actual=data.currentOperator(room,index);if(!plan[room]&&actual?.name===name)continue;set(room,index,actual?.name===name?'Current':name)}
 }
 for(const [room,names] of Object.entries(plan))if(names.every(n=>n==='Current'))delete plan[room]
 return plan
}
export function planMowerCorrection(data:MowerSchedulingData,queue:MowerTaskQueue,force=false,currentTask?:MowerTask,skipDorm=false,onSkip?:()=>void):MowerTask|undefined {
 const plan=mowerCorrectionPlan(data,skipDorm);if(!Object.keys(plan).length)return undefined
 const next=queue.find(),off=queue.find({type:T.SHIFT_OFF})
 if(!force&&next&&Object.keys(plan).length*toMowerMicros(45/3600)>next.timeMicros-data.nowMicros||off&&!(force&&off===currentTask)){onSkip?.();return undefined}
 const task=new MowerTask({plan,type:T.SELF_CORRECTION,time:fromMowerMicros(data.nowMicros)});queue.tasks.push(task);return task
}
