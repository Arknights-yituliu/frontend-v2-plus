# Mower 收益计算引擎

本目录是 [R.I.I.C-Calculator](https://github.com/Panda-Panta/R.I.I.C-Calculator) 的浏览器计算快照。源提交与逐文件 SHA-256 记录在 `source-manifest.json`；文本统一先将 CRLF 换行为 LF，再以 UTF-8 编码计算哈希，避免 Windows Git 换行转换造成跨平台误报。保留 `THIRD_PARTY_MOWER_LICENSE` 的 Mower MIT 声明。只包含收益模拟、Mower 导入/二维码、报表所需依赖；不包含原应用外壳、自动排班优化器或候选组合目录。

当前快照固定为 [ALEXsun0/R.I.I.C-Calculator 提交 `6ddbeece6264e1881b7bf34f9b346bbf03704fff`](https://github.com/ALEXsun0/R.I.I.C-Calculator/commit/6ddbeece6264e1881b7bf34f9b346bbf03704fff)，153 个文件的全部源哈希来自该提交，不包含源工作树未提交修改。该提交已用于[原项目同步 PR](https://github.com/Panda-Panta/R.I.I.C-Calculator/pull/22)，尚未合入原项目。快照依赖闭包从网站的计算、JSON 导入和二维码入口生成；`operatorHelpers.ts` 仅提取所需的 6 个运行时声明，声明及函数体与源文件逐字一致，保留原版权说明。干员库校验使用完整源模块 `scheduler/inventoryValidation.ts`，不再提取优化器模块。

本轮源码核对基准为 [Mower alpha `84e3926c0f36045d7baeb1ac050f815b40952d6d`](https://github.com/ArkMowers/arknights-mower/commit/84e3926c0f36045d7baeb1ac050f815b40952d6d)，其中已合入[宿舍调整 `71fc94e031636a8843b8b3cfc430a3e0b5f65257`](https://github.com/ALEXsun0/arknights-mower/commit/71fc94e031636a8843b8b3cfc430a3e0b5f65257)。快照包含本轮核对后的副表分组与嵌套函数、候补与回满动态住客分床、恢复回班、初始化纠错依赖和普通替班读回倒计时处理；固定源码与移植哈希不等于全部设备行为已逐项验证。

导入与最新格式支持：

- `workbench/compat/mowerJson.ts` 与源文件完全一致。最新源默认排班只有空岗位，导入后缺失的左侧设施不补建，右侧会客室、加工站、办公室、训练室和回收站在未保存等级时默认 3 级。宿舍的有效 Free 床位可以独立建立恢复容量，无需最低宿管人数；没有驻员或有效 Free 床位且未保存等级的宿舍按未建造处理。显式 `facility_levels` 优先于默认与推断值。未建造设施不计耗电、技能、产出或休息床位。
- 同步原算法的 alpha 格式迁移、共享分组、替补及宿舍隔离规则、回收站和产物切换。二维码解码支持当前 14 码和旧版 16 码；保留现有函数名以兼容网站入口。迁移警告及归档副表由源导入器保留，不自行改写其规则。

外层 `../calculate.ts` 负责网站数据适配与计算参数：默认预热 3 天、采样 7 天、整小时暖机、最大步长 0.25 小时、种子 -1（每次计算通过浏览器 `crypto.getRandomValues` 生成随机 uint32）、理想跑单、无限材料、不使用无人机。结果显示并导出实际种子；适配器接受显式非负整数种子用于复现，测试对照使用固定 42，页面不固定种子。网站显式采用最新主程序 `scheduleSimulationBridge` 的默认 `mower-alpha` 调度；纯 `simulateSchedule` API 为兼容调用者仍以 `mower-default` 为省略值。两者均保留原算法。无人机库存上限沿用最新源默认 250，可由页面容量设置或保留的 efficiencyResources.droneCapacity 覆盖；高级调度的 drone_count_limit 不等于物理库存容量。菲亚梅塔统一从 16 心情开始，这是本次用户选择的演算初始条件；手填初始心情不覆盖该值，副表切换和运行态重建保留已经变化的心情。其余干员默认从各自心情上限开始，未设置上限时为 24。仍按实际心情事件执行轮班、菲亚交换、订单与无人机任务。理想订单不占用排班操作时间，也不影响普通换班唤醒；调度使用独立心情阈值事件，并确认具体 Free 宿舍人员的实际恢复顺序。原算法仅支持理想跑单，已移除 Grandet 跑单模式及其专用调度模块。完整成功采样才返回日均产出；换班延后尚未全部确认恢复时保留原诊断、导出延后记录，并在页面明确提示不能据此确认长期稳定产出。未完成、执行失败或含无效数值的报告仍拒绝显示收益。

网站 Worker 在连续五分钟没有合法模拟时间推进时停止。只有当前预热与采样窗口内严格增加的 elapsedHours 能续期；重复、倒退或无效进度不会延长等待。有效长测可继续完成，仍保留手动取消、原算法的 200000 区间上限及无效结果拒绝。

训练计划假设固定为无未完成的训练计划，不再提供可选状态。副表条件 `op_data.facility_has_mastery_plan('train')` 可正常解析并固定求值为 `false`；需要此条件的排班保留 `MOWER_MASTERY_PLAN_ASSUMPTION` 诊断。条件取反及与其他条件组合时按原布尔表达式求值，不跳过整张副表，也不模拟训练进度或计划完成时刻。网站检查结果以 `usesMasteryPlanCondition` 说明是否引用此条件，计算报告的 `masteryPlanPresent` 固定为 `false`，旧输入中的训练计划状态不改变该约定。

使用一图流干员库时，主班、替补、菲亚目标及副表岗位、任务、分组条件和副表自身条件所引用干员必须持有；只用于策略排序、标记或排除的名单校验名称，但不要求持有。每个技能槽只使用实际精英阶段和等级已解锁的版本。实际库优先于孑精 0 覆盖。快照尚未收录但未被排班引用的新干员会被明确提示并排除空闲候选。未启用干员库则采用原算法的最高技能与全目录空闲池，并在报告说明。

`mowerReportMetrics.ts` 保持原报表口径：经验、赤金价值、订单龙门币、虚拟赤金及 82 综合值为日均；订单数量和分布为整个采样窗口的计数。`meanOrderValue` 为实际完成的非合成玉订单的平均价值，无订单时为 `null`。`scoreBreakdown` 使用最新源统一计分模块并按各数值成员校验，默认权重仍为经验 1、赤金 0.8、订单 0.2，碎片及合成玉权重默认 0；虚拟赤金不进入物理库存。报告保留原算法关于积分、设备时钟、未量化技能与被跳过副表条件的诊断。

验证命令：

```sh
node scripts/check-mower-theoretical-output.mjs
node scripts/check-mower-theoretical-output.mjs --source /absolute/path/to/R.I.I.C-Calculator
```

第一条会校验全部移植文本的规范化哈希及集成边界。第二条还校验全部源文件规范化哈希，并直接读取原仓库已存在的公开 252/342 排班夹具，在相同参数下逐字段比较原报表结果；夹具不复制到本仓库。验证的是移植后算法一致性，不是游戏实测或完整 Mower 设备行为证明。
