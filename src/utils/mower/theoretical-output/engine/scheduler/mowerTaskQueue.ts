// Port of ArkMowers/arknights-mower scheduler_task.py and base_schedule.py handle_error.
// Source: c6bdbb292fe7fcd84c6dfb66154a12a1a9bc5b88 (MIT, Copyright 2021 Nano).
export interface MowerTaskType {readonly key:string;readonly value:string;readonly displayValue:string;readonly priority:1|2}
const kind=(key:string,value:string,displayValue:string,priority:1|2=2):MowerTaskType=>Object.freeze({key,value,displayValue,priority})
export const MOWER_TASK_TYPES={
 RUN_ORDER:kind('RUN_ORDER','run_order','跑单',1),SWITCH_PRODUCT:kind('SWITCH_PRODUCT','switch_product','切换产物/订单'),
 FIAMMETTA:kind('FIAMMETTA','菲亚梅塔','肥鸭'),SHIFT_OFF:kind('SHIFT_OFF','shifit_off','下班'),SHIFT_ON:kind('SHIFT_ON','shifit_on','上班'),
 EXHAUST_OFF:kind('EXHAUST_OFF','exhaust_on','用尽下班'),SELF_CORRECTION:kind('SELF_CORRECTION','self_correction','纠错'),
 CLUE_PARTY:kind('CLUE_PARTY','Impart','趴体'),CLUE:kind('CLUE','clue','线索任务'),MAA_MALL:kind('MAA_MALL','maa_Mall','MAA信用购物'),
 NOT_SPECIFIC:kind('NOT_SPECIFIC','','空任务'),RECRUIT:kind('RECRUIT','recruit','公招'),SKLAND:kind('SKLAND','skland','森空岛签到'),
 RE_ORDER:kind('RE_ORDER','宿舍排序','宿舍排序'),RELEASE_DORM:kind('RELEASE_DORM','释放宿舍空位','释放宿舍空位'),FILL_DORM:kind('FILL_DORM','宿舍补位','宿舍补位'),
 REFRESH_TIME:kind('REFRESH_TIME','强制刷新任务时间','强制刷新任务时间'),SKILL_UPGRADE:kind('SKILL_UPGRADE','技能专精','技能专精'),
 SWAP_SUPPORT:kind('SWAP_SUPPORT','换协助位','换协助位'),DEPOT:kind('DEPOT','仓库扫描','仓库扫描'),WORKSHOP:kind('WORKSHOP','加工材料','加工材料'),FURNITURE:kind('FURNITURE','分解所有重复家具','分解所有重复家具'),
} as const
const MICROSECONDS_PER_HOUR=3_600_000_000
export const roundMowerMicros=(micros:number)=>{const base=Math.floor(micros),fraction=micros-base;return fraction===.5?(base%2===0?base:base+1):Math.round(micros)}
/** Python datetime/timedelta resolution. Do not use the morale epsilon for task ordering. */
export const toMowerMicros=(hours:number)=>{const value=roundMowerMicros(hours*MICROSECONDS_PER_HOUR);if(!Number.isSafeInteger(value))throw new Error('Invalid Mower task time: '+String(hours));return value}
export const fromMowerMicros=(micros:number)=>micros/MICROSECONDS_PER_HOUR
export function setMowerTaskType(value:MowerTaskType|string|null|undefined):MowerTaskType {
 if(value&&typeof value==='object'&&Object.values(MOWER_TASK_TYPES).includes(value))return value
 if(typeof value==='string')return Object.values(MOWER_TASK_TYPES).find(t=>t.displayValue.toUpperCase()===value.toUpperCase())??MOWER_TASK_TYPES.NOT_SPECIFIC
 return MOWER_TASK_TYPES.NOT_SPECIFIC
}
export type MowerTaskPlan=Record<string,string[]>
export interface MowerTaskOptions {time?:number;type?:MowerTaskType|string|null;plan?:MowerTaskPlan;metadata?:string;adjusted?:boolean;strictMoodLimit?:boolean;moodLimit?:number}
export class MowerTask {
 timeMicros:number;type:MowerTaskType;plan:MowerTaskPlan;metadata:string;adjusted:boolean;strictMoodLimit:boolean;moodLimit:number|undefined
 observedOrderDueMicros?:number;wakeOnlyCompletion=false
 productShiftLocked=false
 dormRecoveryRestore:string[]=[]
 constructor(options:MowerTaskOptions={},now=0){this.timeMicros=toMowerMicros(options.time??now);this.type=setMowerTaskType(options.type);this.plan=options.plan??{};this.metadata=options.metadata??'';this.adjusted=options.adjusted??false;this.strictMoodLimit=options.strictMoodLimit??false;this.moodLimit=options.moodLimit}
 get time(){return fromMowerMicros(this.timeMicros)}
 set time(value:number){this.timeMicros=toMowerMicros(value)}
 equals(other:MowerTask):boolean {const keys=Object.keys(this.plan);return this.type===other.type&&Math.abs(this.timeMicros-other.timeMicros)<1_500_000&&keys.length===Object.keys(other.plan).length&&keys.every(k=>other.plan[k]?.length===this.plan[k]!.length&&this.plan[k]!.every((name,i)=>other.plan[k]![i]===name))}
}
export interface MowerTaskQuery {time?:number;type?:MowerTaskType;comparison?:'<'|'='|'>';metadata?:string}
export class MowerTaskQueue {
 tasks:MowerTask[]=[]
 /** The no-run-order default scheduling path uses stable time sorting, not type priority. */
 sort():void {this.tasks.sort((a,b)=>a.timeMicros-b.timeMicros)}
 find(query:MowerTaskQuery={}):MowerTask|undefined {
  const time=query.time===undefined?undefined:toMowerMicros(query.time),comparison=query.comparison??'<'
  return this.tasks.find(task=>(comparison==='='?time!==undefined&&Math.abs(task.timeMicros-time)<1_500_000:time===undefined||(comparison==='>'?task.timeMicros>time:task.timeMicros<time))&&(!query.type||task.type===query.type)&&(!query.metadata||task.metadata.includes(query.metadata)))
 }
 /** infra_main removes every reference to the completed object, not every equal task. */
 consume(task:MowerTask):void {this.tasks=this.tasks.filter(t=>t!==task)}
 /** plan_metadata rebuilds these two types; locked experimental shifts retain identity. */
 removeDerived(experimental=false):void {this.tasks=this.tasks.filter(t=>![MOWER_TASK_TYPES.SHIFT_ON,MOWER_TASK_TYPES.RELEASE_DORM].includes(t.type)||experimental&&t.productShiftLocked)}
 /** Default handle_error branch: any queued task strictly inside 2.5h suppresses a fallback. */
 ensureFallback(now:number):MowerTask|undefined {
  if(this.find({time:now+2.5}))return undefined
  const task=new MowerTask({time:now+2.5});this.tasks.push(task);return task
 }
}
