import { scoreProduction, type ProductionScore } from '../domain/productionScore'
import type { ScheduleSimulationReport } from './scheduleSimulation'
import { virtualGoldEquivalent } from '../rules/orderValue'

/** Use completed production, including report-only order premiums, in every simulation consumer. */
export function scoreSimulationProduction(report:ScheduleSimulationReport):ProductionScore {
 const p=report.production
 if(!p?.success||!report.success||report.observedHours<=0)throw new Error('模拟未完成，无法评分')
 const events=p.events.filter(e=>e.type==='order-completed'&&e.time>report.assumptions.warmupHours&&e.time<=report.elapsedHours)
 const virtualGold=events.reduce((n,e)=>n+(e.order?virtualGoldEquivalent(e.order):0),0)
 // Completed items include potential output that has not yet been collected.
 const fragments=p.manufacturing.filter(r=>r.product==='fragment').reduce((n,r)=>n+r.sampleCompletedItems,0)
 const orundum=events.reduce((n,e)=>n+(e.order?.orundumReward??0),0)
 return scoreProduction({...p.sample.completed,virtualGold,fragments,orundum},report.observedHours,report.inputs.options.productionWeights)
}
