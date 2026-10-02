// Decision state for the pinned Mower port. Reservations do not imply physical occupancy.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
import {MowerOperatorState,hasRestingMood,restingMood,type MowerMoodPolicy} from './mowerOperatorState'
export interface MowerDateTimeValue {timeMicros:number}
export class MowerDormState {
 constructor(public position:[string,number],public name='',public timeMicros?:number,public autoFree=false){}
 reset(){this.name='';this.timeMicros=undefined}
}
export interface MowerSchedulingDataOptions {
 plan:Record<string,string[]>;operators:Record<string,MowerOperatorState>;dorms:MowerDormState[];nowMicros:number;partyTime?:MowerDateTimeValue|boolean|null;runOrderRooms?:Record<string,Record<string,never>>
 policy?:Partial<MowerMoodPolicy>;freeRoom?:boolean;powerPlantCount?:number;planConditions?:boolean[]
 groupRestInFullOnMoodGap?:boolean;groupMoodGapMaxExtraWaitHours?:number;mergeIntervalMinutes?:number
 busyRestingNames?:Set<string>;excludedCandidates?:Set<string>;restingPriorityNames?:string[];freeBlacklist?:string[]
 recentShiftOnByRestUnit?:Map<string,number>
}
export class MowerSchedulingData {
 plan:Record<string,string[]>;operators:Record<string,MowerOperatorState>;dorms:MowerDormState[];nowMicros:number;partyTime?:MowerDateTimeValue|boolean|null;runOrderRooms:Record<string,Record<string,never>>
 recoveryOrderVersion=0
 policy:MowerMoodPolicy;freeRoom:boolean;powerPlantCount:number;planConditions:boolean[]
 groupRestInFullOnMoodGap:boolean;groupMoodGapMaxExtraWaitHours:number;mergeIntervalMinutes:number
 busyRestingNames:Set<string>;excludedCandidates:Set<string>;restingPriorityNames:string[];freeBlacklist:string[]
 recentShiftOnByRestUnit:Map<string,number>
 constructor(o:MowerSchedulingDataOptions){
  this.plan=o.plan;this.operators=o.operators;this.dorms=o.dorms;this.nowMicros=o.nowMicros;this.partyTime=o.partyTime;this.runOrderRooms=o.runOrderRooms??{}
  this.policy={restingThreshold:.65,rescueThreshold:.75,experimentalDormLogic:false,...o.policy}
  this.freeRoom=o.freeRoom??false;this.powerPlantCount=o.powerPlantCount??2;this.planConditions=o.planConditions??[]
  this.groupRestInFullOnMoodGap=o.groupRestInFullOnMoodGap??true
  this.groupMoodGapMaxExtraWaitHours=o.groupMoodGapMaxExtraWaitHours??0;this.mergeIntervalMinutes=o.mergeIntervalMinutes??10
  this.busyRestingNames=o.busyRestingNames??new Set();this.excludedCandidates=o.excludedCandidates??new Set()
  this.restingPriorityNames=o.restingPriorityNames??[];this.freeBlacklist=o.freeBlacklist??[]
  this.recentShiftOnByRestUnit=o.recentShiftOnByRestUnit??new Map()
 }
 dynamicDormPosition(room:string,index:number):boolean{return this.plan[room]?.[index]==='Free'||!!this.policy.experimentalDormLogic&&this.dorms.some(b=>b.position[0]===room&&b.position[1]===index&&b.autoFree)}
 dormReplacementForSlot(name:string,room:string,index:number):boolean {const owner=this.operators[this.plan[room]?.[index]??''];return !!owner?.group&&owner.replacement.includes(name)}
 group(name:string):string[]{return Object.values(this.operators).filter(op=>op.group===name).map(op=>op.name)}
 currentOperator(room:string,index:number):MowerOperatorState|undefined{return Object.values(this.operators).find(op=>op.currentRoom===room&&op.currentIndex===index)}
 /** Native get_current_room uses a last-write map; get_current_operator remains first-match. */
 currentRoom(room:string,bypass=false,indexes?:number[]):string[]|undefined {
  const coordinates=new Map(Object.values(this.operators).filter(op=>op.currentRoom===room).map(op=>[op.currentIndex,op.name]))
  const names=Array.from({length:room==='train'?2:this.plan[room]!.length},(_,index)=>coordinates.get(index)??'')
  return !bypass&&names.some((name,index)=>!name&&(indexes===undefined||indexes.includes(index)))?undefined:names
 }
 canStandby(op:MowerOperatorState):boolean{return op.isHigh()&&!!(op.group||this.policy.experimentalDormLogic)&&op.restingPriority==='standby'&&!op.standbyLowPriority&&!op.room.startsWith('dorm')&&!op.workaholic&&!op.exhaustRequire&&!op.restInFull&&!!(this.policy.experimentalDormLogic||!op.workshop)}
 getDormByName(name:string):[number,MowerDormState]|undefined {
  const op=this.operators[name];if(!op)return undefined
  const index=this.dorms.findIndex(bed=>bed.position[0]===op.currentRoom&&bed.position[1]===op.currentIndex&&this.recoveryDorm(bed,name))
  return index<0?undefined:[index,this.dorms[index]!]
 }
 isStandby(name:string):boolean {
  const op=this.operators[name];if(!op||!this.canStandby(op)||op.currentRoom)return false
  const cover=this.currentOperator(op.room,op.index);if(!cover||!op.replacement.includes(cover.name)||this.excludedCandidates.has(cover.name))return false
  const anchors=op.group?this.group(op.group).map(name=>this.operators[name]!):Object.values(this.operators)
  return anchors.some(other=>other.isHigh()&&other.restingPriority==='high'&&!other.room.startsWith('dorm')&&!other.workaholic&&(this.policy.experimentalDormLogic||!other.workshop)&&other.isResting()&&!!this.getDormByName(other.name))
 }
 groupIsResting(group:string):boolean{return this.group(group).some(name=>{const op=this.operators[name]!;return !op.room.startsWith('dorm')&&!op.workaholic&&op.isResting()})}
 effectiveFreeSlot(bed:MowerDormState):boolean {
  const [room,index]=bed.position,slots=this.plan[room];if(!slots||index<0||index>=slots.length)return false
  const name=slots[index];if(name==='Free')return true;if(!bed.autoFree)return false
  const resident=name?this.operators[name]:undefined;return !!resident&&(this.groupIsResting(resident.group)||!!bed.name&&bed.name!==resident.name)
 }
 recoveryDorm(bed:MowerDormState,name:string):boolean {if(!this.dorms.includes(bed))return false;const [room,index]=bed.position,native=this.plan[room]?.[index];return native==='Free'||bed.autoFree&&name!==native}
 restMoodComplete(name:string):boolean {const op=this.operators[name];return !!op&&op.restMoodLimit&&hasRestingMood(op,this.nowMicros)&&restingMood(op,this.nowMicros)>=op.upperLimit}
 skipIdleDormRelease(_name:string):boolean {if(this.policy.experimentalDormLogic)throw new Error('Experimental dorm exclusions are not yet ported');return false}
}
