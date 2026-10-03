# RIIC MAA排班表计算器与交接协议

本文说明 MAA排班表计算器页面的位置、数据来源、与排班表MAA之间的交接契约，以及展示与等级推测所依赖的运行时包边界。

## 一、页面与路由

```text
src/pages/tools/maa-schedule-calculator.vue   页面实现
/tools/maa-schedule-calculator                菜单路径（罗德岛基建，排在“排班表参考”之后）
```

旧地址 `/riicdev/efficiency-inspector` 保留为重定向，指向同一页面，不再有独立的开发版实现。

排班表MAA 页面为 `src/pages/tools/schedule.v2.vue`（路由名 `ScheduleV2`）。

## 二、计算与等级推测

页面不自己维护布局档案表，等级推测直接使用运行时包 `@arknights/riic-efficiency` 的导出：

- `inferScheduleLayout(plans)`：按电站电量预算和房间实际在岗人数推导每间设施的等级；
- `completeInferredRooms(plans, layout)`：按推导出的布局补齐缺失房间；
- `calculateEfficiency`：当文档缺少 `layout` 时，包内会再做一次同样的兜底推测。

页面用 `completeInferredRooms` 补齐房间，构建 `ScheduleDocument` 后把 `inferScheduleLayout` 的结果赋给 `document.layout`，结算与排班生成器因此共用同一套房间语义。文档若已自带 `layout`，包会直接使用而不再推测。

## 三、展示

结果区不再手写效率分解，而是消费包的 headless 显示模型：

```text
buildResultDisplay(result, { sanityValues, droneAcceleration })
```

页面按四个分区展示，默认只展开“每日产出总览”：

1. 每日产出总览（`dailyOutput.tiles`）；
2. 房间效率明细（`calculationSteps.facilitySteps`，支持“按设施/按队列”切换，分别经 `buildFacilityStepPanes` / `buildFacilityStepCards`）；
3. 基础价值点（`calculationSteps.basePoints`）；
4. 无人机（`calculationSteps.maaDrone`，即 MAA 无人机加速结果）。

`buildResultDisplay` 的 `droneAcceleration` 参数需要的是带 `scenarios` 的 `DroneAccelerationResult`（由 `calculateDroneAcceleration` 生成，依赖用户的龙门币贸易站策略），与 `result.maaDroneAcceleration` 不是同一结构；本页没有该策略输入，因此不传该参数，只展示 MAA 无人机分区。

完整 `riic-efficiency` 结果 JSON 放在页面最下方，折叠展示。

渲染组件：

```text
src/components/tools/RiicDisplayCard.vue
src/components/tools/RiicDisplaySection.vue
src/components/tools/RiicDisplayTile.vue
```

## 四、两个方向的交接

### 计算器 → 排班表MAA

点击“打开排班表MAA”时，如果计算器已载入排班，会将当前载入的源排班写入 `sessionStorage` 后跳转；没有载入排班时只跳转。

```text
key: riic_maa_calculator_to_editor_v1
value: { version: 1, source: "riic-maa-calculator", schedule }
```

排班表MAA 在 `onMounted` 读取并校验该数据（`version === 1`、`source === "riic-maa-calculator"`、`plans` 非空）。校验通过后使用 `importSchedule(schedule, { preserveUnsupportedRooms: true })` 导入并清除该键；这会替换编辑器当前排班，未保存的编辑内容也会被替换。JSON 或字段校验失败时提示数据无效并清除该键。

### 排班表MAA → 计算器

`schedule.v2.vue` 的“转到 MAA排班表计算器”按钮先执行 `createSchedule()`，再把结果写入 `sessionStorage` 后跳转：

```text
key: riic_maa_editor_to_efficiency_calculator_v1
value: { version: 1, source: "riic-maa-editor", schedule }
```

计算器在 `onMounted` 读取并校验（`version === 1`、`source === "riic-maa-editor"`、`plans` 非空），校验通过即导入并清除该键；校验失败提示“收到的排班数据无效”并清除。

该模式与已有的 `riic_schedule_generator_to_legacy_editor_v1`（排班生成器 → 排班表MAA）保持一致，两个键互不影响。

## 五、继承与已知限制

- 排班表MAA 的排班对象没有房间等级字段，等级由计算器按第二节的规则推测；只有排班自带 `level` 时才直接沿用。
- 计算器没有班次时长编辑控件。输入时长为正数时先四舍五入为整数分钟；缺失时长会自动分配。所有班次都缺少时长时，将 1440 分钟平均分配；只有部分缺失时，将扣除已知时长后的剩余分钟平均分给缺失班次。若剩余分钟不足以给每个缺失班次至少 1 分钟，则改为将 1440 分钟平均分配给全部班次。
- 已提供且有效的班次时长会原样用于结算；如果这些时长合计不等于 1440 分钟，目前不会自动归一化，也不会显示总时长警告。计算结果按排班周期结算，产出总览会显示周期小时数。明确提供的非整数或无效时长会显示时长警告；非整数正数会先被四舍五入，舍入结果大于 0 时使用该值，否则按缺失时长分配。
- 训练室按空设施处理：排班里出现训练室时保留房间并计入布局与电量，但不安排干员；排班表MAA 的房间模板本身不产出训练室，所以从排班表MAA 交接的排班不会带出训练室。
- 设施数量上限沿用排班表MAA 的模板（贸易站 5、制造站 5、发电站 3、宿舍 4、会客室/加工站/办公室/控制中枢各 1、最多 7 个班次）。

## 六、运行时包同步

本页面依赖的 `src/vendor/riic-efficiency/` 是 `@arknights/riic-efficiency` 的 vendored 副本，来源为基建工具箱仓库的 `packages/riic-efficiency`。

同步时按下列文件整体替换：

```text
dist/index.js
data/manifest.json
data/operators/*.json（按内容差异替换）
```

本次同步为该包新增了 `inferScheduleLayout`、`completeInferredRooms`、`dormitoryLevels`、`importPowerSummary`、`resizeImportedRooms` 五个导出，没有移除任何既有导出。

## 七、验证

- `npm run check:riic-baseline-rules`、`npm run check:riic-schedule-model`、`npm run check:riic-drone-preview` 等既有脚本，确认排班生成器消费路径未被包升级影响；
- `npm run check:riic-maa-calculator` 覆盖布局推测、房间补齐与 `layoutSource` 契约，是本页面依赖的运行时包入口检查。
