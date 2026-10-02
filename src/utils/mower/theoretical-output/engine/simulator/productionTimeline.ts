import { hasOperatorSkill, runOrderSkillRank } from '../domain/operatorContext'
import type {AppConfig} from '../domain/types'
import {OPERATOR_MAP} from '../domain/operators'
import {evaluateManufacturingCapacity,type OperatorEfficiencyResult} from '../engine/operatorRules'
import {evaluateTradeOrderCapacity} from '../engine/orderCapacity'
import type {CompiledSchedule} from '../scheduler/types'
import type {RuntimeState} from '../scheduler/rosterRuntime'
import {getOrderDistribution,selectBaseOrder,type SpecialCapture,type OrderMode} from '../rules/orderRules'
import {startOrder,advanceOrder,finishOrder,type ActiveOrder} from './orderTimeline'
import {createLedger,type ResourceAmounts,type ResourceKind} from './resourceLedger'
import {createDroneState,generateDrones,spendDrones} from './droneTimeline'
import {MANUFACTURING_FORMULAS,startManufacturing,authorizeManufacturingBatch,advanceManufacturing,collectManufacturing,nextManufacturingEvent,updateManufacturingCapacity,type ManufacturingFormulaId,type ManufacturingState} from './manufacturingTimeline'
import {prepareRunOrderSwap,type PreparedRunOrderSwap} from './mowerRunOrder'

/** Reject legacy persisted/API options as well as typed callers. */
export function assertRunOrderMode(mode: unknown): void {
 if(mode==='natural')throw new Error('自然跑单已全面禁用，请使用理想跑单或葛朗台跑单')
 if(mode!==undefined&&mode!=='ideal'&&mode!=='grandet'&&mode!=='drone')throw new Error('Invalid run-order mode')
}

export interface ProductionOptions {
 outputMode?:'settled'|'potential'
 inventoryMode?:'unlimited'|'finite'
 seed?:number;initialResources?:ResourceAmounts;collectionIntervalHours?:number
 runOrderMode?:'ideal'|'grandet'|'drone';runOrderLeadSeconds?:number;runOrderBufferSeconds?:number
 droneTarget?:'gold'|'exp'|'none'|'trading';droneTradingRoomId?:string;droneRoomId?:string;droneReserve?:number
 fragmentFormulaByRoom?:Record<string,'fragment-orirock'|'fragment-device'>
}
export interface ProductionFrame {time:number;config:AppConfig;active:Set<string>;morale:Map<string,number>;evaluations:Record<string,OperatorEfficiencyResult>}
export interface ProductionEvent {time:number;type:string;roomId?:string;orderId?:string;amount?:number;operatorIds?:string[];delta?:ResourceAmounts;order?:CompletedOrder}
type CompletedOrder=ReturnType<typeof finishOrder>
interface ManufactureRoom {roomId:string;state:ManufacturingState;blockedHours:number;blockedMaterialHours:number;collectedItems:number}
interface TradeRoom {roomId:string;active:ActiveOrder|null;pending:CompletedOrder[];completedOrders:number;collectedOrders:number;blockedHours:number;limit:number|null;disabled:boolean;attempted:boolean;rng:number}
export interface ProductionReport {
 success:boolean;ledger:ReturnType<typeof createLedger>;sample:{completed:{exp:number;gold:number;orderLmd:number};opening:ResourceAmounts;closing:ResourceAmounts;inflows:ResourceAmounts;outflows:ResourceAmounts;net:ResourceAmounts}
 materialsConsumed:ResourceAmounts
 drones:ReturnType<typeof createDroneState>
 manufacturing:{roomId:string;product:string;completedItems:number;sampleCompletedItems:number;pendingItems:number;remainingBaseMinutes:number;blockedHours:number;blockedMaterialHours:number}[]
 trading:{roomId:string;completedOrders:number;collectedOrders:number;pendingOrders:CompletedOrder[];remainingBaseMinutes:number|null;blockedHours:number}[]
 events:ProductionEvent[];assumptions:{outputMode:'settled'|'potential';inventoryMode:'unlimited'|'finite';seed:number;runOrderMode:'ideal'|'grandet'|'drone';runOrderLeadSeconds:number;runOrderBufferSeconds:number;droneTarget:'gold'|'exp'|'none'|'trading';droneRoomId?:string;droneReserve:number;collectionIntervalHours:number;orderSnapshotPolicy:string}
}
const EPS=1e-8
const resources:ResourceKind[]=['gold','lmd','exp','fragment','orundum','drone','orirock','device']
const difference=(a:ResourceAmounts,b:ResourceAmounts)=>Object.fromEntries(resources.map(k=>[k,(a[k]??0)-(b[k]??0)])) as ResourceAmounts
function capture(frame:ProductionFrame,roomId:string):SpecialCapture {
 const room=frame.config.rooms.find(r=>r.id===roomId)!
 const skill=(id:string,buffId:string)=>frame.active.has(id)&&hasOperatorSkill(frame.config,id,buffId)
 const rank=(kind:'proviso'|'tequila')=>Math.max(0,...room.operatorIds.filter(id=>frame.active.has(id)).map(id=>runOrderSkillRank(frame.config,id,kind))) as 0|1|2
 return {proviso:rank('proviso'),tequila:rank('tequila'),uOfficial:room.operatorIds.some(id=>skill(id,'trade_ord_spd&wt[000]')),closure:room.operatorIds.some(id=>skill(id,'trade_ord_closure[000]')),pepe:room.operatorIds.some(id=>skill(id,'trade_ord_pepe[000]'))}
}
/** Shares the roster clock. Only this controller owns inventories and immutable order snapshots. */
export function createProductionTimeline(schedule:CompiledSchedule,state:RuntimeState,options:ProductionOptions,warmupHours:number,diagnostic:(code:string,message:string)=>void,onOccupancyChanged:()=>void,nativeScheduler=false){
 assertRunOrderMode(options.runOrderMode)
 const outputMode=options.outputMode??'settled',potential=outputMode==='potential',inventoryMode=options.inventoryMode??'unlimited',unlimitedMaterials=potential||inventoryMode==='unlimited'
 if(!['unlimited','finite'].includes(inventoryMode))throw new Error('Invalid inventory mode')
 if(!['settled','potential'].includes(outputMode))throw new Error('Invalid output mode')
 const seed=options.seed??1,mode=options.runOrderMode??'ideal',lead=mode==='ideal'?0:options.runOrderLeadSeconds??(schedule.assumptions.runOrderDelayMinutes??3)*60,buffer=mode==='ideal'?0:options.runOrderBufferSeconds??schedule.assumptions.runOrderBufferSeconds??15,target=options.droneTarget??'gold',reserve=options.droneReserve??0,interval=potential?0:options.collectionIntervalHours??schedule.assumptions.collectionIntervalHours
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||!['ideal','grandet','drone'].includes(mode)||!['gold','exp','none','trading'].includes(target))throw new Error('Invalid production strategy/seed')
 if(![lead,buffer,reserve,interval].every(x=>Number.isFinite(x)&&x>=0)||(mode!=='ideal'&&lead<=0)||!Number.isInteger(reserve)||reserve>=235)throw new Error('Invalid production timing/reserve')
 const initial={gold:schedule.assumptions.initialGold,fragment:schedule.assumptions.initialFragments,drone:schedule.assumptions.initialDrones,...options.initialResources,...(potential?{gold:0,fragment:0,lmd:0,exp:0,orundum:0,orirock:0,device:0}:{})}
 for(const k of Object.keys(initial))if(!resources.includes(k as ResourceKind))throw new Error(`Unknown initial resource ${k}`)
 const ledger=createLedger(initial),materialsConsumed:ResourceAmounts={}
 let drones=createDroneState(initial.drone??0),serial=0,valid=true,nextCollection=interval||Infinity
 const events:ProductionEvent[]=[],manufactures=new Map<string,ManufactureRoom>(),trades=new Map<string,TradeRoom>()
 const capacityByEvaluation=new WeakMap<ProductionFrame['evaluations'],Map<string,{moodBand:string;bonus:number}>>()
 let run:{roomId:string;swap:PreparedRunOrderSwap}|undefined
 let opening:ResourceAmounts|undefined=warmupHours===0?{...ledger.balances}:undefined,openingIn:ResourceAmounts={},openingOut:ResourceAmounts={}
 const unsupported=(code:string,message:string)=>{valid=false;diagnostic(code,message)}
 const record=(type:string,extra:Omit<ProductionEvent,'type'|'time'>={},time=state.time)=>events.push({time,type,...extra})
 // Append-only, local ownership: avoid cloning the complete ledger for every manufactured item.
 const transact=(delta:ResourceAmounts,reason:string,time=state.time)=>{
  for(const [key,n] of Object.entries(delta))if(!resources.includes(key as ResourceKind)||!Number.isFinite(n))throw new Error('Invalid production transaction')
  for(const [key,n] of Object.entries(delta))if((ledger.balances[key as ResourceKind]??0)+n<0)return false
  for(const [key,n] of Object.entries(delta)){const k=key as ResourceKind;ledger.balances[k]=(ledger.balances[k]??0)+n;const totals=n>=0?ledger.inflows:ledger.outflows;totals[k]=(totals[k]??0)+Math.abs(n)}
  const id=`${++serial}:${reason}`;ledger.entries.push({reason:id,delta:{...delta}});ledger.appliedReasons.push(id);record(reason,{delta},time);return true
 }
 const completedTotals=()=>({exp:[...manufactures.values()].filter(m=>m.state.formula.product==='exp').reduce((n,m)=>n+m.state.lifetimeItems*1000,0),gold:[...manufactures.values()].filter(m=>m.state.formula.product==='gold').reduce((n,m)=>n+m.state.lifetimeItems,0),orderLmd:events.filter(e=>e.type==='order-completed').reduce((n,e)=>n+(e.order?.lmdReward??0),0)})
 let openingCompleted={exp:0,gold:0,orderLmd:0}
 let openingManufactured=new Map<string,number>()
 const completedSample=()=>{const total=completedTotals();return {exp:total.exp-openingCompleted.exp,gold:total.gold-openingCompleted.gold,orderLmd:total.orderLmd-openingCompleted.orderLmd}}
 const markObservation=()=>{if(!opening&&state.time>=warmupHours-EPS){opening={...ledger.balances};openingIn={...ledger.inflows};openingOut={...ledger.outflows};openingCompleted=completedTotals();openingManufactured=new Map([...manufactures].map(([id,m])=>[id,m.state.lifetimeItems]))}}
 const cost=(m:ManufacturingState):ResourceAmounts=>Object.fromEntries(m.formula.costs.map(c=>[c.id==='4001'?'lmd':c.id==='30012'?'orirock':'device',-c.count]))
 const fund=(m:ManufactureRoom)=>{
  if(!m.state.awaitingPayment||m.state.storedWeight+m.state.formula.storageWeight>m.state.capacityWeight+EPS)return
  const delta=cost(m.state)
  if(!Object.keys(delta).length||unlimitedMaterials||transact(delta,`manufacture-start:${m.roomId}`)){
   for(const [key,value] of Object.entries(delta)){const k=key as ResourceKind;materialsConsumed[k]=(materialsConsumed[k]??0)-value}
   m.state=authorizeManufacturingBatch(m.state,true).state
  }
 }
 const collect=(roomId?:string,includeTrade=true,includeManufacture=true,orderLimit=Infinity)=>{
  for(const m of manufactures.values())if(includeManufacture&&(roomId===undefined||roomId===m.roomId)&&m.state.pendingItems){const n=m.state.pendingItems*(m.state.formula.product==='exp'?1000:1);transact({[m.state.formula.product]:n},`collect-manufacture:${m.roomId}`);m.collectedItems+=m.state.pendingItems;m.state=collectManufacturing(m.state).state}
  for(const t of trades.values())if(includeTrade&&(roomId===undefined||roomId===t.roomId)){let count=0;while(t.pending.length&&count++<orderLimit){const o=t.pending[0]!,delta={gold:unlimitedMaterials?0:-o.goldCost,fragment:unlimitedMaterials?0:-o.fragmentCost,lmd:o.lmdReward,orundum:o.orundumReward};if(!transact(delta,`collect-order:${o.id}`))break;materialsConsumed.gold=(materialsConsumed.gold??0)+o.goldCost;materialsConsumed.fragment=(materialsConsumed.fragment??0)+o.fragmentCost;t.pending.shift();t.collectedOrders++;record('order-collected',{roomId:t.roomId,orderId:o.id})}}
 }
 const rng=(t:TradeRoom)=>{t.rng=(Math.imul(1664525,t.rng)+1013904223)>>>0;return t.rng/4294967296}
 const restore=()=>{
  if(!run)return
  Object.assign(state.occupants,run.swap.restoreOccupants)
  record('run-order-restored',{roomId:run.roomId,operatorIds:Object.values(run.swap.restoreOccupants)})
  run=undefined;onOccupancyChanged()
 }
 const synchronize=(frame:ProductionFrame)=>{
  for(const room of frame.config.rooms){
   const evaluation=frame.evaluations[room.id]!
   if(room.type==='manufacture'){
    let m=manufactures.get(room.id)
    if(!m){const formula:ManufacturingFormulaId=room.product==='exp'?'exp-medium':room.product==='fragment'?(options.fragmentFormulaByRoom?.[room.id]??'fragment-orirock'):'gold'
     if(room.level<MANUFACTURING_FORMULAS[formula].requiredRoomLevel){unsupported('MANUFACTURE_FORMULA_LEVEL',`${room.id}：所选配方不满足设施等级，未计产出`);continue}
     m={roomId:room.id,state:startManufacturing({formula,capacityWeight:0,paymentAuthorized:false}),blockedHours:0,blockedMaterialHours:0,collectedItems:0};manufactures.set(room.id,m)}
    // The same efficiency snapshot has stable staffing and capacity-relevant mood boundaries.
    let capacities=capacityByEvaluation.get(frame.evaluations)
    if(!capacities){capacities=new Map();capacityByEvaluation.set(frame.evaluations,capacities)}
    const moodBand=room.operatorIds.map(id=>Number((frame.morale.get(id)??24)<12)).join('')
    let cached=capacities.get(room.id)
    if(!cached||cached.moodBand!==moodBand){cached={moodBand,bonus:evaluateManufacturingCapacity(room,frame.config,frame.active,frame.morale)};capacities.set(room.id,cached)}
    const bonus=cached.bonus
    const capacity=[24,36,54][room.level-1]!+bonus
    m.state=updateManufacturingCapacity(m.state,Math.max(0,capacity))
   }else if(room.type==='trading'){
    let t=trades.get(room.id)
    if(!t){let hash=seed;for(const c of room.id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;t={roomId:room.id,active:null,pending:[],completedOrders:0,collectedOrders:0,blockedHours:0,limit:0,disabled:false,attempted:false,rng:hash};trades.set(room.id,t)}
    const capacity=evaluateTradeOrderCapacity(room,frame.config,frame.active,evaluation);t.limit=capacity.limit
    if(capacity.limit===null)unsupported('UNQUANTIFIED_ORDER_CAPACITY',`${room.id}：${capacity.unquantified.join('；')}，停止新单获取`)
   }
  }
 }
 const finish=(frame:ProductionFrame)=>{
  for(const t of trades.values())if(t.active&&t.active.remainingBaseMinutes<=EPS){
   if(!nativeScheduler&&mode!=='ideal'&&!t.attempted&&schedule.runOrderPolicies.some(p=>p.roomId===t.roomId)&&t.active.base.mode==='gold'){
    unsupported('RUN_ORDER_WINDOW_MISSED',`${t.roomId}：跑单执行器被其他站占用，本单按实际常驻阵容完成`)
    record('run-order-missed',{roomId:t.roomId,orderId:t.active.id})
   }
   const a=t.active,c=capture(frame,t.roomId)
   if(mode==='ideal'&&a.base.mode==='gold'){
    const policy=(state.config.runOrderPolicies??schedule.runOrderPolicies).find(p=>p.roomId===t.roomId)
    const level=schedule.rooms.find(r=>r.roomId===t.roomId)!.level
    const runners=policy?.orderedOperatorIds.filter(id=>{const name=OPERATOR_MAP.get(id)?.name;return name==='但书'||level===3&&name==='龙舌兰'||name==='U-Official'})??[]
    if(runners.length){
     c.uOfficial=c.uOfficial||runners.some(id=>hasOperatorSkill(frame.config,id,'trade_ord_spd&wt[000]'))
     c.proviso=Math.max(c.proviso??0,...runners.map(id=>runOrderSkillRank(frame.config,id,'proviso'))) as 0|1|2
     c.tequila=Math.max(c.tequila??0,...runners.map(id=>runOrderSkillRank(frame.config,id,'tequila'))) as 0|1|2
     record('run-order-ideal',{roomId:t.roomId,orderId:a.id,operatorIds:[...new Set(runners)]})
    }
   }
   // Workload-changing modes are explicit acquisition-start snapshots; later staffing cannot reroll them.
   c.pepe=a.base.mode==='pepe';c.closure=a.base.mode==='closure'
   const snapshot=finishOrder({...a,remainingBaseMinutes:0},c,state.time)
   t.pending.push(snapshot);t.completedOrders++;t.active=null
   record('order-completed',{roomId:t.roomId,orderId:a.id,order:snapshot})
   if(run?.roomId===t.roomId){collect(t.roomId);openWork(frame);restore()}
  }
 }
 const openWork=(frame:ProductionFrame)=>{
  for(const m of manufactures.values())fund(m)
  for(const t of trades.values())if(!t.active&&!t.disabled&&t.limit!==null&&t.pending.length<t.limit){
   const room=frame.config.rooms.find(r=>r.id===t.roomId)!,c=capture(frame,t.roomId)
   if(mode==='ideal'&&room.strategy!=='orundum'){
    const policy=(state.config.runOrderPolicies??schedule.runOrderPolicies).find(p=>p.roomId===t.roomId)
    for(const id of policy?.orderedOperatorIds??[]){
     if(hasOperatorSkill(frame.config,id,'trade_ord_pepe[000]'))c.pepe=true
     if(hasOperatorSkill(frame.config,id,'trade_ord_closure[000]'))c.closure=true
    }
   }
   const orderMode:OrderMode=room.strategy==='orundum'?'orundum':c.pepe?'pepe':c.closure?'closure':'gold'
   if(orderMode==='pepe'&&target==='trading')diagnostic('PEPE_DRONE_UNVERIFIED',`${t.roomId}：佩佩订单无人机加速未核实；保留无人机库存，不计加速`)
   try{const base=selectBaseOrder(getOrderDistribution(room.level,frame.evaluations[t.roomId]!.quality,orderMode),rng(t));t.active=startOrder({id:`${t.roomId}:${t.completedOrders+1}`,startedAt:state.time,base});t.attempted=false;record('order-started',{roomId:t.roomId,orderId:t.active.id})}
   catch(error){t.disabled=true;unsupported('ORDER_DISTRIBUTION_UNSUPPORTED',`${t.roomId}：${String(error)}`)}
  }
 }
 const tryRun=(frame:ProductionFrame)=>{
  if(nativeScheduler||mode==='ideal'||run)return
  for(const room of schedule.rooms.filter(r=>schedule.runOrderPolicies.some(p=>p.roomId===r.roomId))){
   const t=trades.get(room.roomId)
   if(!t?.active||t.attempted||t.active.base.mode==='orundum')continue
   const eff=t.active.base.efficiencyAffected?frame.evaluations[t.roomId]!.efficiencyPercent/100:1
   if(t.active.remainingBaseMinutes>eff*lead/60+EPS)continue
   t.attempted=true
   const swap=prepareRunOrderSwap(room,state.occupants)
   swap.diagnostics.forEach(d=>diagnostic(d.code,d.message))
   const incoming=swap.swaps.map(s=>s.incomingOperatorId)
   const busy=swap.swaps.some(s=>Object.entries(state.occupants).some(([pos,id])=>id===s.incomingOperatorId&&pos!==s.positionId)||!state.config.positions.some(p=>p.id===s.positionId))
   if(busy||new Set(incoming).size!==incoming.length||swap.diagnostics.some(d=>d.code==='RUN_ORDER_MULTIPLE_SPECIAL_CANDIDATES')){unsupported('RUN_ORDER_OCCUPANCY_UNSUPPORTED',`${t.roomId}：跑单候选忙碌/重复或无工位，本单保留自然常驻阵容，结果仅供参考`);record('run-order-skipped',{roomId:t.roomId});continue}
   const count=Math.ceil(Math.max(0,t.active.remainingBaseMinutes-EPS)/3)
   if(mode==='drone'&&drones.stock+EPS<count){unsupported('RUN_ORDER_DRONES_INSUFFICIENT',`${t.roomId}：无人机不足以补完；本单保留常驻阵容，未假定外部补给`);record('run-order-skipped',{roomId:t.roomId});continue}
   run={roomId:t.roomId,swap}
   for(const s of swap.swaps){for(const [bed,id] of Object.entries(state.bedOccupants))if(id===s.incomingOperatorId)delete state.bedOccupants[bed];state.occupants[s.positionId]=s.incomingOperatorId}
   onOccupancyChanged();record('run-order-inserted',{roomId:t.roomId,operatorIds:incoming})
   if(mode==='drone'){const result=spendDrones(drones,count);drones=result.state;transact({drone:-count},'run-order-drone');t.active=advanceOrder(t.active,{elapsedMinutes:0,efficiency:1,droneBaseMinutes:result.baseMinutes}).order;record('run-order-drone',{roomId:t.roomId,amount:count})}
   break
  }
 }
 const chargeRate=(f:ProductionFrame)=>Math.max(0,1+f.config.rooms.filter(r=>r.type==='power').reduce((n,r)=>n+(f.evaluations[r.id]!.efficiencyPercent-100)/100,0))/6
 let nextDailyClear=24
  const spendSurplus=()=>{
   if(nativeScheduler)return
   const isDailyClear=state.time>=nextDailyClear-EPS
   const isCapacityReached=drones.stock>=drones.capacity-EPS
   if(target==='none'||(!isCapacityReached&&!isDailyClear))return
   let budget=Math.max(0,Math.floor(drones.stock+EPS)-reserve)
   if(budget<=0)return
   if(target==='trading'){
    const targetTrade=(options.droneRoomId||options.droneTradingRoomId)?trades.get((options.droneRoomId||options.droneTradingRoomId)!):[...trades.values()][0]
    if(targetTrade?.active&&targetTrade.active.base.mode!=='pepe'&&targetTrade.active.remainingBaseMinutes>EPS){
     while(budget>0&&targetTrade.active&&targetTrade.active.remainingBaseMinutes>EPS){
      const remaining=targetTrade.active.remainingBaseMinutes
      const n=Math.min(budget,Math.ceil((remaining-EPS)/3))
      if(n<=0)break
      const spent=spendDrones(drones,n);drones=spent.state;transact({drone:-n},'trade-drone');budget-=n
      targetTrade.active=advanceOrder(targetTrade.active,{elapsedMinutes:0,efficiency:1,droneBaseMinutes:spent.baseMinutes}).order
      record('trade-drone',{roomId:targetTrade.roomId,amount:n})
     }
    }
    return
   }
   for(const m of manufactures.values()){
    if(options.droneRoomId ? m.roomId!==options.droneRoomId : m.state.formula.product!==target)continue
    // Whole drones supply base work; excess crosses a paid, capacity-checked batch boundary.
    while(budget>0){
     fund(m);let remaining=nextManufacturingEvent(m.state);if(remaining===null)break
     if(remaining<=EPS){const p=advanceManufacturing(m.state,remaining+EPS);m.state=p.state;if(interval===0)collect(m.roomId);fund(m);remaining=nextManufacturingEvent(m.state);if(remaining===null)break}
     const n=Math.min(budget,Math.max(1,Math.ceil((remaining-EPS)/3)))
     if(n<=0)break
     const spent=spendDrones(drones,n);drones=spent.state;transact({drone:-n},'manufacture-drone');budget-=n
     let remainingWork=spent.baseMinutes
     while(remainingWork>EPS){
      const progress=advanceManufacturing(m.state,remainingWork);m.state=progress.state;remainingWork=progress.unusedBaseMinutes
      if(interval===0)collect(m.roomId)
      fund(m)
      if(!progress.consumedBaseMinutes||nextManufacturingEvent(m.state)===null)break
     }
     if(remainingWork>EPS)record('unused-drone-base-minutes',{roomId:m.roomId,amount:remainingWork})
     record('manufacture-drone',{roomId:m.roomId,amount:n})
    }
    if(!budget)break
   }
  }
  const settle=(getFrame:()=>ProductionFrame)=>{
   let frame=getFrame();synchronize(frame);finish(frame)
   if(!nativeScheduler&&(interval===0||state.time>=nextCollection-EPS)){collect();if(interval>0)nextCollection=(Math.floor((state.time+EPS)/interval)+1)*interval}
   frame=getFrame();synchronize(frame);openWork(frame);tryRun(frame)
   if(mode==='drone'&&run){finish(getFrame());frame=getFrame();synchronize(frame);openWork(frame)}
   while(!run){
    const beforeSpending=serial
    spendSurplus()
    if(serial===beforeSpending)break
    finish(getFrame());collect(undefined,!nativeScheduler);openWork(getFrame())
   }
   if(state.time>=nextDailyClear-EPS){
    nextDailyClear=(Math.floor((state.time+EPS)/24)+1)*24
   }
   markObservation()
  }
  const nextStep=(maximum:number,getFrame:(offset:number)=>ProductionFrame)=>{
   let dt=Math.min(maximum,nativeScheduler?Infinity:nextCollection-state.time)
   const zero=getFrame(0)
   // Capped charging is an event; smaller numerical steps must not change spending policy.
   const targetTrade=(options.droneRoomId||options.droneTradingRoomId)?trades.get((options.droneRoomId||options.droneTradingRoomId)!):[...trades.values()][0]
   const rate=chargeRate(zero),canSpend=target==='trading'?(targetTrade?.active!==null&&targetTrade?.active!==undefined):(target!=='none'&&[...manufactures.values()].some(m=>(options.droneRoomId?m.roomId===options.droneRoomId:m.state.formula.product===target)&&nextManufacturingEvent(m.state)!==null))
   if(!nativeScheduler&&target!=='none'){
    if(canSpend&&rate>0&&drones.stock<drones.capacity-EPS)dt=Math.min(dt,(drones.capacity-drones.stock)/rate/60)
    if(nextDailyClear>state.time+EPS)dt=Math.min(dt,nextDailyClear-state.time)
   }
   const crosses=(h:number)=>{const f=getFrame(h/2)
    for(const m of manufactures.values()){const n=nextManufacturingEvent(m.state);if(n!==null&&h*60*f.evaluations[m.roomId]!.efficiencyPercent/100>=n)return true}
    for(const t of trades.values())if(t.active){const factor=t.active.base.efficiencyAffected?f.evaluations[t.roomId]!.efficiencyPercent/100:1
     let distance=t.active.remainingBaseMinutes
     if(!nativeScheduler&&mode!=='ideal'&&!run&&!t.attempted&&schedule.runOrderPolicies.some(p=>p.roomId===t.roomId)&&t.active.base.mode!=='orundum')distance-=(t.active.base.efficiencyAffected?getFrame(h).evaluations[t.roomId]!.efficiencyPercent/100:1)*lead/60
     if(h*60*factor>=Math.max(0,distance))return true
    }
    return false
   }
   if(crosses(dt)){let lo=0,hi=dt;for(let n=0;n<35;n++){const mid=(lo+hi)/2;if(crosses(mid))hi=mid;else lo=mid}dt=hi}
   return dt
  }
  const advance=(hours:number,frame:ProductionFrame)=>{
   const previous=drones;drones=generateDrones(drones,hours*60,chargeRate(frame));const accepted=drones.stock-previous.stock
   if(accepted>0)transact({drone:accepted},'drone-generated',state.time+hours)
   for(const m of manufactures.values()){
    if(m.state.blockedByStorage)m.blockedHours+=hours
    else if(m.state.awaitingPayment)m.blockedMaterialHours+=hours
    m.state=advanceManufacturing(m.state,hours*60*frame.evaluations[m.roomId]!.efficiencyPercent/100).state
   }
   for(const t of trades.values())if(t.active)t.active=advanceOrder(t.active,{elapsedMinutes:hours*60,efficiency:frame.evaluations[t.roomId]!.efficiencyPercent/100}).order;else if(!t.disabled)t.blockedHours+=hours
  }
  const report=():ProductionReport=>({success:valid,ledger,sample:{completed:completedSample(),opening:opening??{...ledger.balances},closing:{...ledger.balances},inflows:difference(ledger.inflows,openingIn),outflows:difference(ledger.outflows,openingOut),net:difference(ledger.balances,opening??ledger.balances)},materialsConsumed:{...materialsConsumed},drones,events,
   assumptions:{outputMode,inventoryMode,seed,runOrderMode:mode,runOrderLeadSeconds:lead,runOrderBufferSeconds:buffer,droneTarget:target,droneRoomId:options.droneRoomId,droneReserve:reserve,collectionIntervalHours:interval,orderSnapshotPolicy:'acquisition-start-v1: base draw and Pepe/Closure workload at start; U-Official/Proviso/Tequila conversion at completion; payment at collection; simultaneous facilities use schedule order'},
   manufacturing:[...manufactures.values()].map(m=>({roomId:m.roomId,product:m.state.formula.product,completedItems:m.state.lifetimeItems,sampleCompletedItems:m.state.lifetimeItems-(openingManufactured.get(m.roomId)??0),pendingItems:m.state.pendingItems,remainingBaseMinutes:m.state.remainingBaseMinutes,blockedHours:m.blockedHours,blockedMaterialHours:m.blockedMaterialHours})),
   trading:[...trades.values()].map(t=>({roomId:t.roomId,completedOrders:t.completedOrders,collectedOrders:t.collectedOrders,pendingOrders:t.pending,remainingBaseMinutes:t.active?.remainingBaseMinutes??null,blockedHours:t.blockedHours}))})
  if(potential)diagnostic('POTENTIAL_OUTPUT_MODEL','直观产出模式：忽略材料库存不足，设施容量与收取按 Mower 排班执行，完成即计产出；账本为测算辅助，不代表实际到账。无人机仍按所选策略及实际生成量使用。')
  if(mode==='ideal')diagnostic('IDEAL_RUN_ORDER_ASSUMPTIONS','理想跑单按已解锁的佩佩/可露希尔候选决定新单模式，在普通订单完成时应用 U-Official/但书/龙舌兰效果；保留 Mower 任务读取、排序与唤醒，不临时换人、不等待、不消耗跑单干员心情或无人机。常规排班和无人机目标策略仍执行。')
  else diagnostic('PRODUCTION_TIMING_ASSUMPTIONS',nativeScheduler?'葛朗台跑单执行 Mower 的临时换人、提前等待、缓冲及恢复；基础单在开始抽取，特殊奖励在完成时锁定。':'生产按整数配方和固定种子抽单；基础单在开始抽取、特殊奖励在完成锁定为版本化假设。显式无人机跑单在提前窗口换人并消耗无人机完成订单；自然跑单已禁用。')
  diagnostic('DRONE_ALLOCATION_POLICY',nativeScheduler?'无人机完全由 Mower 的任务阶段使用：默认每 3 小时待办检查、100 架判断门槛；是否预留按原版跑单设施分支；跑单按原版独立分支执行。':`无人机采用满仓及每日彻底清空加速${options.droneRoomId&&target!=='none'?`设施(${options.droneRoomId})`:target==='gold'?'赤金':target==='exp'?'作战记录':target==='trading'?`贸易站(${options.droneTradingRoomId??'默认'})`:'关闭'}、保留 ${reserve} 架策略，以保证计算稳定。`)
  if(mode!=='ideal')diagnostic('RUN_ORDER_SOURCE_BED_POLICY','跑单只恢复目标站原阵容；借用的 Free 床腾空，跑单人完成后闲置至正常宿舍填充，不自动恢复来源床位。')

  // Concrete facilities are the only owner of production timers and drone stock.
  // Native scheduling adapters read these at the observation clock, never from a
  // projected daily total or a previous task deadline.
  const nativeManufactureDroneMaximum=(room:string)=>{
   const m=manufactures.get(room)
   if(!m||nextManufacturingEvent(m.state)===null)return 0
   const batches=Math.max(0,Math.floor((m.state.capacityWeight-m.state.storedWeight+EPS)/m.state.formula.storageWeight))
   const baseMinutes=batches?m.state.remainingBaseMinutes+(batches-1)*m.state.formula.baseMinutes:0
   return Math.min(Math.floor(drones.stock+EPS),Math.ceil(Math.max(0,baseMinutes-EPS)/3))
  }
  const nativeSpendManufacturingDrones=(room:string,count:number)=>{
   const m=manufactures.get(room)
   if(!m)throw new Error('Native manufacture facility is unavailable: '+room)
   if(!Number.isInteger(count)||count<0||count>nativeManufactureDroneMaximum(room))throw new Error('Native manufacture drone selection exceeds available work')
   if(count===0)return
   const spent=spendDrones(drones,count);drones=spent.state
   transact({drone:-count},'native-manufacture-drone')
   let work=spent.baseMinutes
   while(work>EPS){
    fund(m)
    const progress=advanceManufacturing(m.state,work);m.state=progress.state;work=progress.unusedBaseMinutes
    fund(m)
    if(!progress.consumedBaseMinutes||nextManufacturingEvent(m.state)===null)break
   }
   if(work>EPS)record('unused-drone-base-minutes',{roomId:room,amount:work})
   record('native-manufacture-drone',{roomId:room,amount:count})
  }
  const nativeRemainingSeconds=(room:string,frame:ProductionFrame)=>{
   const trade=trades.get(room)
   if(!trade)throw new Error('Native trade facility is unavailable: '+room)
   const active=trade.active
   if(!active)return 0
   const efficiency=active.base.efficiencyAffected?frame.evaluations[room]!.efficiencyPercent/100:1
   if(efficiency<=0)throw new Error('Native trade timer is unavailable: '+room)
   return Math.max(0,active.remainingBaseMinutes/efficiency*60)
  }
  const nativeSpendTradeDrones=(room:string,count:number,frame:ProductionFrame)=>{
   const trade=trades.get(room)
   if(!trade?.active)throw new Error('Native drone request requires a current trade order: '+room)
   if(trade.active.base.mode==='pepe')throw new Error('Pepe drone interaction is unverified')
   const spent=spendDrones(drones,count)
   drones=spent.state
   transact({drone:-count},'native-trade-drone')
   trade.active=advanceOrder(trade.active,{elapsedMinutes:0,efficiency:1,droneBaseMinutes:spent.baseMinutes}).order
   record('native-trade-drone',{roomId:room,amount:count})
   finish(frame);openWork(frame)
  }
  const nativeAcceptOrder=(room:string,frame:ProductionFrame)=>{finish(frame);const trade=trades.get(room);if(!trade)throw new Error('Native trade facility is unavailable: '+room);const before=trade.collectedOrders;collect(room,true,false,1);openWork(frame);return trade.collectedOrders>before}
  return {settle,nextStep,advance,report,isRosterLocked:()=>Boolean(run),
   nativeHasTrade:(room:string)=>trades.has(room),nativeHasManufacture:(room:string)=>manufactures.has(room),nativeManufactureDroneMaximum,nativeSpendManufacturingDrones,
   nativePendingTradeOrders:(room?:string)=>[...trades.values()].filter(t=>room===undefined||t.roomId===room).reduce((n,t)=>n+t.pending.length,0),
   nativePendingManufacturingItems:()=>[...manufactures.values()].reduce((n,m)=>n+m.state.pendingItems,0),
   nativeCollectTradeOrders:(frame:ProductionFrame)=>{finish(frame);collect(undefined,true,false);openWork(frame)},
   nativeCollectManufacturingItems:(frame:ProductionFrame)=>{finish(frame);collect(undefined,false,true);openWork(frame)},
   nativeRemainingSeconds,nativeTradeDroneAvailable:(room:string)=>trades.get(room)?.active?.base.mode!=='pepe',nativeTradeRequiredDrones:(room:string)=>{const active=trades.get(room)?.active;return active&&active.base.mode!=='pepe'?Math.ceil(Math.max(0,active.remainingBaseMinutes-EPS)/3):0},nativeSpendTradeDrones,nativeAcceptOrder,nativeDroneCount:()=>Math.floor(drones.stock+EPS)}

}
