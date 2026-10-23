import {MORALE_EPSILON,type RuntimeEvent} from '../scheduler/rosterRuntime'

export interface DeferredShiftEpisode {
 readonly blockedAt:number
 readonly operatorIds:readonly string[]
}

/** A single later physical shift-off must confirm every deferred member. */
export function isDeferredShiftResolved(episode:DeferredShiftEpisode,events:readonly RuntimeEvent[]):boolean {
 return episode.operatorIds.length>0&&events.some(event=>event.type==='shift-off'&&event.time>episode.blockedAt+MORALE_EPSILON&&episode.operatorIds.every(id=>event.operators.includes(id)))
}
