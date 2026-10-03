// Port of default prepare_dorm_selection, called by actual choose_agent after no-op checks.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
import type {MowerSchedulingData} from './mowerSchedulingData'
export function mowerDormReplacementForSlot(data:MowerSchedulingData,name:string,room:string,index:number):boolean {
 const resident=data.operators[data.plan[room]?.[index]??'']
 return room.startsWith('dorm')&&!!resident?.group&&resident.nativeName!=='菲亚梅塔'&&resident.replacement.includes(name)
}
export function prepareMowerDormSelection(data:MowerSchedulingData,names:string[],room:string,preserve=false,moodProbe=false):void {
 if(data.policy.experimentalDormLogic)throw new Error('Experimental selection and recovery ordering require their source port')
 const seen=new Set<string>()
 for(const [index,name] of names.entries()){
  if(!seen.has(name))seen.add(name)
  else if(!['','Free','Current'].includes(name))names[index]='Free'
  const op=data.operators[names[index]!]
  if(!room.startsWith('dorm')||!op)continue
  const limited=!moodProbe&&data.restMoodComplete(op.name)&&data.plan[room]?.[index]==='Free'
  const full=!preserve&&op.mood===op.upperLimit&&!op.room.startsWith('dorm')&&!mowerDormReplacementForSlot(data,op.name,room,index)
  if(limited||full){names[index]='Free';op.depletionRate=0}
 }
}

/** agent_arrange_room captures timer indexes before choose_agent mutates shared names. */
export function mowerArrangementReadIndexes(data:MowerSchedulingData,room:string,names:string[],getTime:boolean,task:import('./mowerTaskQueue').MowerTask):number[] {
 if(task.type.key==='FIAMMETTA'&&names.some(n=>data.operators[n]?.nativeName==='菲亚梅塔'))return names.flatMap((name,index)=>data.operators[name]?.nativeName==='菲亚梅塔'||name===task.metadata?[index]:[])
 if(!getTime)return []
 if(room.startsWith('dorm')&&data.freeRoom)return (data.plan[room]??[]).flatMap((name,index)=>name==='Free'?[index]:[])
 if(!data.dorms.some(b=>b.position[0]===room))return []
 return names.flatMap((name,index)=>{const op=data.operators[name];return op&&!op.room.startsWith('dorm')&&(data.freeRoom||op.isHigh())?[index]:[]})
}