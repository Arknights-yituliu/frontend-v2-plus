// Port of default plan_solver/resting/_get_resting_plan_legacy/try_reorder.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
import {MowerExitError} from './mowerNativeErrors'
import {mowerReplacementCandidates} from './mowerOperatorState'
import {MowerDormState,type MowerSchedulingData} from './mowerSchedulingData'
import {mowerActiveHighRestingCount,mowerAvailableFree,mowerAssignDorm,mowerAssignDormGroup,mowerAverageMood,mowerStandbyCandidates} from './mowerDormAssignment'
import {planMowerMetadata} from './mowerMetadata'
import {MowerTask,MOWER_TASK_TYPES as T,type MowerTaskPlan,type MowerTaskQueue,fromMowerMicros,toMowerMicros} from './mowerTaskQueue'
export interface MowerRestingOptions {
 fiaTargets?:string[];hasActiveMastery?:boolean;isMasteryBusy?:(name:string)=>boolean
 isDormReplacement?:(name:string)=>boolean;onBlocked?:(names:string[])=>void;onException?:(error:unknown)=>void
}
export function mowerGetRestingPlan(data:MowerSchedulingData,names:string[],existingReplacements:string[],plan:MowerTaskPlan,options:MowerRestingOptions={}):boolean {
 const dormAgents=names.filter(name=>data.operators[name]!.room.startsWith('dorm'))
 const agents=names.filter(name=>!dormAgents.includes(name)),fia=options.fiaTargets??[]
 agents.sort((a,b)=>{
  const x=data.operators[a]!,y=data.operators[b]!
  return Number(!fia.includes(a))-Number(!fia.includes(b))||Number(['factory','train'].includes(x.currentRoom))-Number(['factory','train'].includes(y.currentRoom))||(x.currentMood(data.nowMicros)-x.lowerLimit)-(y.currentMood(data.nowMicros)-y.lowerLimit)
 })
 agents.push(...dormAgents)
 const replacements:string[]=[],next:MowerTaskPlan={}
 for(const name of agents){
  const op=data.operators[name]!
  if(!data.plan[op.room]||data.getDormByName(name))return false
  const candidate=mowerReplacementCandidates(op,data.operators,data.policy,data.nowMicros).find(candidate=>{
   const target=data.operators[candidate]!
   return !(target.currentRoom&&!target.isResting())&&!data.excludedCandidates.has(candidate)&&!options.isMasteryBusy?.(candidate)&&!existingReplacements.includes(candidate)&&!replacements.includes(candidate)&&!options.isDormReplacement?.(candidate)&&(op.room.startsWith('dorm')||target.currentRoom!==op.room)
  })
  if(candidate===undefined)return false
  replacements.push(candidate);(next[op.room]??=Array(data.plan[op.room]!.length).fill('Current'))[op.index]=candidate
 }
 const resting=agents.filter(name=>!data.operators[name]!.workaholic&&!data.operators[name]!.room.startsWith('dorm'))
 if(mowerAssignDormGroup(data,resting)===undefined)return false
 existingReplacements.push(...replacements)
 for(const [room,names] of Object.entries(next)){
  if(!plan[room]){plan[room]=names;continue}
  for(const [index,name] of names.entries())if(plan[room]![index]==='Current'&&name!=='Current')plan[room]![index]=name
 }
 return true
}
export function mowerResting(data:MowerSchedulingData,queue:MowerTaskQueue,options:MowerRestingOptions={}):MowerTaskPlan {
 if(data.policy.experimentalDormLogic)throw new Error('Experimental ordinary resting requires its source port')
 const total=Object.values(data.operators).filter(op=>(op.isHigh()||!op.currentRoom&&!op.room)&&!op.room.startsWith('dorm')).sort((a,b)=>a.currentMood(data.nowMicros)-b.currentMood(data.nowMicros))
 total.sort((a,b)=>(a.currentMood(data.nowMicros)-a.lowerLimit)-(b.currentMood(data.nowMicros)-b.lowerLimit))
 planMowerMetadata(data,queue)
 const current=mowerActiveHighRestingCount(data),effective=data.dorms.filter(b=>data.effectiveFreeSlot(b)).length
 const ideal=mowerAverageMood(data)>data.policy.restingThreshold*data.policy.rescueThreshold?Math.min(4,effective):effective
 const replacements:string[]=[],plan:MowerTaskPlan={},used=new Set<number>();let highDone=false
 const exhaustGroups=new Set(Object.values(data.operators).filter(op=>op.exhaustRequire&&op.group).map(op=>op.group))
 for(const op of [...total.filter(op=>op.isHigh()),...total.filter(op=>!op.isHigh())]){
  if(op.isHigh()&&!op.workshop){
   const standby=mowerStandbyCandidates(data,op.group?data.group(op.group):[op.name])
   if(highDone&&!standby.size)continue
   if(!standby.size&&current+replacements.length>=ideal&&mowerAvailableFree(data)===0){highDone=true;continue}
  }else if(mowerAvailableFree(data,'low')===0)break
  if(op.workaholic||op.isResting()||data.isStandby(op.name)||op.currentRoom==='factory'||op.room==='factory'||options.hasActiveMastery&&[op.room,op.currentRoom].includes('train'))continue
  const mood=op.currentMood(data.nowMicros)
  if(op.restMoodLimit?mood>=op.upperLimit:op.upperLimit-mood<2)continue
  if(op.exhaustRequire||mood>Math.floor((op.upperLimit-op.lowerLimit)*data.policy.restingThreshold+op.lowerLimit))continue
  if(!op.isHigh()){mowerAssignDorm(data,op.name,used);continue}
  if(op.group&&exhaustGroups.has(op.group))continue
  const members=op.group?data.group(op.group):[op.name]
  if(!mowerGetRestingPlan(data,[...members],replacements,plan,options))options.onBlocked?.(members)
 }
 if(Object.keys(plan).length){const task=new MowerTask({plan,type:T.SHIFT_OFF});task.timeMicros=data.nowMicros;queue.tasks.push(task)}
 return plan
}
export function mowerTryReorder(data:MowerSchedulingData,newPlan:MowerTaskPlan):MowerTaskPlan|undefined {
 if(data.policy.experimentalDormLogic)throw new Error('Experimental recovery prioritization requires its source port')
 const assigned=new Set(Object.values(newPlan).flat())
 for(const bed of data.dorms)if(assigned.has(bed.name))bed.reset()
 const dorms=data.dorms.map(b=>new MowerDormState([...b.position],b.name,b.timeMicros,b.autoFree))
 // The room picker converts full-mood non-residents to Free, so moving one by name cannot settle.
 for(const bed of dorms){const op=data.operators[bed.name];if(op&&op.mood>=op.upperLimit&&!op.room.startsWith('dorm'))bed.reset()}
 const vip=Object.keys(data.plan).filter(room=>room.startsWith('dorm')).length;if(!vip)return undefined
 const effective=dorms.map((bed,index)=>({bed,index})).filter(({bed})=>data.effectiveFreeSlot(bed)).map(({index})=>index)
 for(const [index,bed] of dorms.entries())if(!effective.includes(index))bed.reset()
 const ranking=(name:string)=>{
  const op=data.operators[name];return op?.isHigh()?op.restingPriority==='high'?'high':op.restingPriority==='standby'?'standby':'normal':'low'
 }
 const priority=data.restingPriorityNames,rank={high:priority.length,normal:priority.length+1,standby:priority.length+2,low:priority.length+3}
 const info=effective.map(index=>({name:dorms[index]!.name,time:dorms[index]!.timeMicros,index}))
 info.sort((a,b)=>{
  const p=(name:string)=>name&&priority.includes(name)?priority.indexOf(name):rank[ranking(name)]
  return p(a.name)-p(b.name)||a.index-b.index
 })
 effective.forEach((index,i)=>{dorms[index]!.name=info[i]!.name;dorms[index]!.timeMicros=info[i]!.time})
 const result:MowerTaskPlan={}
 for(const bed of dorms)if(bed.name){
  const op=data.operators[bed.name]!,[room,index]=bed.position
  if(op.currentRoom!==room||op.currentIndex!==index)(result[room]??=Array(5).fill('Current'))[index]=bed.name
 }
 return result
}
export function planMowerOrdinary(data:MowerSchedulingData,queue:MowerTaskQueue,options:MowerRestingOptions={}):MowerTaskPlan|undefined {
 let plan:MowerTaskPlan={}
 try {
  if(queue.find({type:T.SHIFT_OFF}))return undefined
  planMowerMetadata(data,queue)
  plan=mowerResting(data,queue,options)
 }catch(error){
  // Native plan_solver catches every Exception here except MowerExit, then reorders.
  if(error instanceof MowerExitError)throw error
  options.onException?.(error)
 }
 const reorder=mowerTryReorder(data,plan)
 if(reorder&&Object.keys(reorder).length){
  if(Object.keys(plan).length)for(const [room,names] of Object.entries(reorder)){
   if(!plan[room])plan[room]=names
   else for(const [index,name] of names.entries())if(name!=='Current')plan[room]![index]=name
  }else{const task=new MowerTask({plan:reorder});task.timeMicros=data.nowMicros;queue.tasks.push(task)}
 }
 return plan
}
export function mowerPlanningHasNearTask(data:MowerSchedulingData,queue:MowerTaskQueue):boolean {return !!queue.find({time:fromMowerMicros(data.nowMicros+toMowerMicros(15/3600))})}
