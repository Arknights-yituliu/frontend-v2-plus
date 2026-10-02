// Port of Mower alpha agent_arrange_room preselection (7623-7648).
// c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88, MIT Copyright 2021 Nano.
import {toMowerMicros,type MowerTask} from './mowerTaskQueue'
import type {MowerRunOrderFinishingGenerator,MowerRunOrderFinishingRequest,MowerRunOrderFinishingObservation} from './mowerRunOrderFinishing'
export interface MowerRunSelectionState {task:MowerTask;room:string;same:boolean;chooseError:number;restorationCount:number;bufferSeconds:number;configuredDelayMinutes:number}
export function* calibrateMowerRunSelection(state:MowerRunSelectionState,seam:{nowMicros():number}):Generator<MowerRunOrderFinishingRequest,boolean,MowerRunOrderFinishingObservation>{
 if(state.same||state.restorationCount!==1||state.bufferSeconds<=0||state.chooseError>0)return true
 function* observed(request:MowerRunOrderFinishingRequest):MowerRunOrderFinishingGenerator{
  const observation=yield request
  if(!observation||observation.kind!==request.kind||!Object.prototype.hasOwnProperty.call(observation,'value')||observation.observedAtMicros!==seam.nowMicros())throw new Error('Explicit current preselection observation is required')
 }
 // Read uses the same native get_order_remaining_time as the finishing phase.
 const request={kind:'read-remaining'} as const,observation=yield request
 if(!observation||observation.kind!==request.kind||!Object.prototype.hasOwnProperty.call(observation,'value')||observation.observedAtMicros!==seam.nowMicros()||typeof observation.value!=='number'||!Number.isFinite(observation.value))throw new Error('Explicit current preselection countdown is required')
 const remaining=observation.value
 if(remaining>0&&remaining<(state.configuredDelayMinutes+10)*60){
  state.task.timeMicros=seam.nowMicros()+toMowerMicros(remaining/3600)-toMowerMicros(state.configuredDelayMinutes/60)
 }else if(!state.task.adjusted){
  yield* observed({kind:'notify-missed-order',message:'检测到漏单！',level:'WARNING'})
  yield* observed({kind:'reset-room-time',room:state.room})
  return false
 }
 yield* observed({kind:'back',intervalSeconds:1})
 yield* observed({kind:'turn-on-room-detail',room:state.room})
 return true
}
/** Native inner handler returns an empty new_plan while leaving the room plan intact. */
export class MowerMissedSelection {readonly kind='native-missed-selection' as const}
