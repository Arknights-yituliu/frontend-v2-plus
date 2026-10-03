export type IncomeObjective='lmd'|'exp'|'composite'
export interface ProductionScore {exp:number;goldValue:number;orderValue:number;weightedExp:number;weightedGold:number;weightedOrders:number;total:number}
/** User-defined conventional output, distinct from inventory value or cash settlement. */
export function scoreProduction(completed:{exp:number;gold:number;orderLmd:number},hours:number):ProductionScore {
 if(!Number.isFinite(hours)||hours<=0||Object.values(completed).some(v=>!Number.isFinite(v)||v<0))throw new Error('无效的完成产出或采样时长')
 const exp=completed.exp*24/hours,goldValue=completed.gold*500*24/hours,orderValue=completed.orderLmd*24/hours
 const weightedGold=.8*goldValue,weightedOrders=.2*orderValue
 return {exp,goldValue,orderValue,weightedExp:exp,weightedGold,weightedOrders,total:exp+weightedGold+weightedOrders}
}
