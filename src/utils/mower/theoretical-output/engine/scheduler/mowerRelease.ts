// Port of default prepare_release_dorm. A source timer is not an extra physical-mood gate.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
import type {MowerSchedulingData} from './mowerSchedulingData'
import {MOWER_TASK_TYPES as T,type MowerTask,type MowerTaskQueue} from './mowerTaskQueue'
export function prepareMowerRelease(data:MowerSchedulingData,queue:MowerTaskQueue,task:MowerTask):boolean {
 let op=data.operators[task.metadata]
 if(task.strictMoodLimit&&!(op?.restMoodLimit&&(task.moodLimit===undefined||task.moodLimit===op.upperLimit))){task.plan={};return false}
 const room=Object.keys(task.plan)[0],index=room?task.plan[room]!.indexOf('Free'):-1
 if(!room||index<0){task.plan={};return false}
 if(!task.metadata&&!data.policy.experimentalDormLogic&&!task.strictMoodLimit){op=data.currentOperator(room,index);if(op)task.metadata=op.name}
 if(!op||op.currentRoom!==room||op.currentIndex!==index){task.plan={};return false}
 if(op.isHigh()&&op.mood>0){
  const dormant=data.getDormByName(op.name)
  if(dormant){
   const marker='dorm'+dormant[0],returnTask=queue.find({type:T.SHIFT_ON,metadata:marker})
   if(returnTask){const labels=returnTask.metadata.split(',');labels.splice(labels.indexOf(marker),1);returnTask.metadata=labels.join(',');op.mood=op.upperLimit;op.timeStampMicros=dormant[1].timeMicros}
  }
 }
 return true
}
