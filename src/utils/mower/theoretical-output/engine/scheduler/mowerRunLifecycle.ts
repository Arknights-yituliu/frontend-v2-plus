// Port of handle_error(force=True), Mower alpha c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88.
// MIT, Copyright 2021 Nano. Clock advancement belongs to the device/controller adapter.
import {MowerTask,MowerTaskQueue,MOWER_TASK_TYPES as T,fromMowerMicros} from './mowerTaskQueue'
export function prepareMowerRunEntry(queue:MowerTaskQueue,nowMicros:number):void {
 const now=fromMowerMicros(nowMicros)
 if(!queue.find({time:now})&&!queue.find({type:T.SKILL_UPGRADE})){const task=new MowerTask();task.timeMicros=nowMicros;queue.tasks.push(task)}
 if(queue.find({time:fromMowerMicros(nowMicros-900_000_000)})){
  queue.tasks=queue.tasks.filter(task=>[T.SKILL_UPGRADE,T.SWAP_SUPPORT,T.REFRESH_TIME,T.SWITCH_PRODUCT].includes(task.type))
  const task=new MowerTask();task.timeMicros=nowMicros;queue.tasks.push(task)
 }
}