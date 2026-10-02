// Port of default available_free / _find_dorm_slot / assign_dorm(_group).
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
import {hasRestingMood,rescueMoodThreshold,restingMood,type MowerOperatorState} from './mowerOperatorState'
import type {MowerSchedulingData,MowerDormState} from './mowerSchedulingData'
function defaultOnly(data:MowerSchedulingData){if(data.policy.experimentalDormLogic)throw new Error('Experimental resting tiers require their source port')}
export function mowerStandbyCanYield(data:MowerSchedulingData,op:MowerOperatorState):boolean {
 return data.canStandby(op)&&hasRestingMood(op,data.nowMicros)&&restingMood(op,data.nowMicros)>=rescueMoodThreshold(op,data.policy)
}
export function mowerAvailableFree(data:MowerSchedulingData,type:'high'|'low'='high',now=data.nowMicros):number {
 defaultOnly(data)
 const effective=data.dorms.filter(b=>data.effectiveFreeSlot(b))
 const count=new Set(effective.map(b=>b.position[0])).size
 let high=0,low=0
 for(const bed of effective){
  const op=data.operators[bed.name];if(!op||op.workshop)continue
  if(bed.timeMicros!==undefined&&bed.timeMicros<now){
   if(op.isHigh()){op.mood=op.upperLimit;op.depletionRate=0;op.timeStampMicros=now}
   continue
  }
  if(op.restingPriority==='high')high++;else low++
 }
 return type==='high'?Math.max(0,count-high):effective.length-low-Math.max(high,count)
}
export function mowerActiveHighRestingCount(data:MowerSchedulingData,now=data.nowMicros):number {
 defaultOnly(data)
 return data.dorms.filter(b=>{
  const op=data.operators[b.name]
  return data.effectiveFreeSlot(b)&&op?.isHigh()&&!mowerStandbyCanYield(data,op)&&!op.workshop&&!(b.timeMicros!==undefined&&b.timeMicros<now)
 }).length
}
export function mowerSlotTakable(data:MowerSchedulingData,bed:MowerDormState,protectResting:boolean,requester?:string):boolean {
 defaultOnly(data)
 if(!data.effectiveFreeSlot(bed))return false
 const op=data.operators[bed.name];if(!op)return true
 if(data.skipIdleDormRelease(op.name))return false
 if(bed.timeMicros!==undefined&&bed.timeMicros<data.nowMicros)return true
 const incoming=requester?data.operators[requester]:undefined
 if(mowerStandbyCanYield(data,op)&&incoming?.isHigh()&&incoming.restingPriority==='high'&&!incoming.workshop)return true
 if(op.workshop&&incoming)return !incoming.workshop&&(incoming.isHigh()||incoming.currentMood(data.nowMicros)<=22)
 if(!op.isHigh())return !(protectResting&&op.isResting())
 return false
}
export function mowerFindDormSlot(data:MowerSchedulingData,name:string,used:Set<number>,groupResting=false):number|undefined {
 defaultOnly(data)
 if(data.restMoodComplete(name))return undefined
 const op=data.operators[name]!,high=op.restingPriority==='high'&&!op.workshop
 const takeover=high||groupResting&&data.canStandby(op)
 const vip=Object.keys(data.plan).filter(room=>room.startsWith('dorm')).length
 const indices=data.dorms.map((_,i)=>i)
 const order=high?indices:[...indices.slice(vip),...indices]
 return order.find(i=>!used.has(i)&&mowerSlotTakable(data,data.dorms[i]!,!takeover,name))
}
export function mowerStandbyCandidates(data:MowerSchedulingData,names:string[]):Set<string> {
 const anchors=new Set(names.map(n=>data.operators[n]!).filter(op=>op.group&&op.isHigh()&&op.restingPriority==='high'&&!op.workaholic&&(data.policy.experimentalDormLogic||!op.workshop)&&!op.room.startsWith('dorm')&&op.mood>=0&&op.mood<op.upperLimit&&op.currentMood(data.nowMicros)<op.upperLimit).map(op=>op.group))
 const hasAnchor=data.dorms.some(b=>{const op=data.operators[b.name];return !!op&&data.effectiveFreeSlot(b)&&op.isHigh()&&op.restingPriority==='high'})
 return new Set(names.filter(n=>{const op=data.operators[n]!;return data.canStandby(op)&&(anchors.has(op.group)||!op.group&&hasAnchor)}))
}
export function mowerAssignDormGroup(data:MowerSchedulingData,names:string[]):MowerDormState[]|undefined {
 defaultOnly(data)
 const required=names.filter(n=>!data.restMoodComplete(n)),optional=mowerStandbyCandidates(data,required)
 const ordered=[...required].sort((a,b)=>{
  const x=data.operators[a]!,y=data.operators[b]!
  return Number(x.restingPriority==='standby')-Number(y.restingPriority==='standby')||Number(x.restingPriority==='high')-Number(y.restingPriority==='high')
 })
 const used=new Set<number>(),assignments:{name:string;index:number}[]=[]
 for(const name of ordered){
  const index=mowerFindDormSlot(data,name,used,true)
  if(index===undefined){if(optional.has(name))continue;return undefined}
  used.add(index);assignments.push({name,index})
 }
 return assignments.map(({name,index})=>{const bed=data.dorms[index]!;bed.name=name;bed.timeMicros=undefined;return bed})
}
export function mowerAssignDorm(data:MowerSchedulingData,name:string,used=new Set<number>()):MowerDormState|undefined {
 const index=mowerFindDormSlot(data,name,used);if(index===undefined)return undefined
 used.add(index);const bed=data.dorms[index]!;bed.name=name;bed.timeMicros=undefined;return bed
}
export function mowerAverageMood(data:MowerSchedulingData):number {
 let current=0,total=0
 for(const op of Object.values(data.operators)){
  if(op.isResting()||op.group&&op.room.startsWith('dorm')||!op.isHigh()||op.workaholic||data.isStandby(op.name))continue
  current+=op.currentMood(data.nowMicros)-op.lowerLimit;total+=op.upperLimit-op.lowerLimit
 }
 return total?current/total:0
}
