import { normalizeProductionWeights, type ProductionWeights } from '../domain/productionWeights'
import type { ScheduleSimulationReport } from '../simulator/scheduleSimulation'
import { virtualGoldEquivalent } from '../rules/orderValue'
export type IncomeObjective='lmd'|'exp'|'composite'
export interface ProductionScore {exp:number;goldValue:number;orderValue:number;weightedExp:number;weightedGold:number;weightedOrders:number;weightedFragments:number;weightedOrundum:number;total:number}
export interface CompletedProduction {exp:number;gold:number;orderLmd:number;virtualGold?:number;fragments?:number;orundum?:number}
/** User-defined conventional output, distinct from inventory value or cash settlement. */
export function scoreProduction(completed:CompletedProduction,hours:number,weights?:Partial<ProductionWeights>):ProductionScore {
 if(!Number.isFinite(hours)||hours<=0||Object.values(completed).some(v=>!Number.isFinite(v)||v<0))throw new Error('无效的完成产出或采样时长')
 const exp=completed.exp*24/hours,goldValue=completed.gold*500*24/hours,orderValue=completed.orderLmd*24/hours
 const w=normalizeProductionWeights(weights),factor=24/hours
 const weightedExp=w.exp*exp,weightedGold=w.gold*(goldValue+(completed.virtualGold??0)*500*factor),weightedOrders=w.orders*orderValue
 const weightedFragments=w.fragments*(completed.fragments??0)*factor,weightedOrundum=w.orundum*(completed.orundum??0)*factor
 const total=weightedExp+weightedGold+weightedOrders+weightedFragments+weightedOrundum
 if(!Number.isFinite(total))throw new Error('加权产出超出有效数值范围')
 return {exp,goldValue,orderValue,weightedExp,weightedGold,weightedOrders,weightedFragments,weightedOrundum,total}
}

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
