# Mower 收益计算引擎

本目录是 [R.I.I.C-Calculator](https://github.com/Panda-Panta/R.I.I.C-Calculator) 的浏览器计算快照。源提交与逐文件 SHA-256 记录在 `source-manifest.json`；文本统一先将 CRLF 换行为 LF，再以 UTF-8 编码计算哈希，避免 Windows Git 换行转换造成跨平台误报。保留 `THIRD_PARTY_MOWER_LICENSE` 的 Mower MIT 声明。只包含收益模拟、Mower 导入/二维码、报表所需依赖；不包含原应用外壳、自动排班优化器或候选组合目录。

原工作树的 `mowerDormAssignment.ts` 当时有 Git 修改标记，但 `git diff --numstat` 没有内容差异；快照哈希记录实际工作树内容经过上述换行规范化后的结果。其余源文件保持原算法。`operatorHelpers.ts` 和 `inventoryAdmission.ts` 仅提取运行时所需成员，函数体未改写。

两处导入适配记录在清单中：

- `workbench/compat/mowerJson.ts` 清空默认岗位；未声明的左侧生产房间为未建造。Mower 不记录未驻人的右侧设施，所以这些设施保留原算法的类型和推断等级，岗位为空。页面提供等级编辑并标明推断来源。
- `workbench/validate.ts` 允许明确未建造的空产出房间；其他电力、容量、重复干员等阻断校验保持原有行为。

外层 `../calculate.ts` 负责网站数据适配与计算参数：默认预热 3 天、采样 7 天、整小时暖机、最大步长 0.25 小时、种子 42、理想跑单、无限材料、不使用无人机。仍按实际心情事件执行轮班、菲亚交换、订单与无人机任务。尚未结束或仍有未恢复换班阻塞的模拟不会返回日产出。

使用一图流干员库时，主班、替补、菲亚目标及副表岗位、任务、条件所引用干员必须持有；只用于策略排序、标记或排除的名单校验名称，但不要求持有。每个技能槽只使用实际精英阶段和等级已解锁的版本。实际库优先于孑精 0 覆盖。快照尚未收录但未被排班引用的新干员会被明确提示并排除空闲候选。未启用干员库则采用原算法的最高技能与全目录空闲池，并在报告说明。

`mowerReportMetrics.ts` 保持原报表口径：经验、赤金价值、订单龙门币、虚拟赤金及 82 综合值为日均；订单数量和分布为整个采样窗口的计数。虚拟赤金不进入物理库存。报告保留原算法关于积分、设备时钟、未量化技能与被跳过副表条件的诊断。

验证命令：

```sh
node scripts/check-mower-theoretical-output.mjs
node scripts/check-mower-theoretical-output.mjs --source /absolute/path/to/R.I.I.C-Calculator
```

第一条会校验全部移植文本的规范化哈希及集成边界。第二条还校验全部源文件规范化哈希，并直接读取原仓库已存在的公开 252/342 排班夹具，在相同参数下逐字段比较原报表结果；夹具不复制到本仓库。验证的是移植后算法一致性，不是游戏实测或完整 Mower 设备行为证明。
