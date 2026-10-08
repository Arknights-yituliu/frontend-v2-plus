import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
let passed = 0;
function check(name, callback) {
  callback();
  passed++;
  console.log(`✓ ${name}`);
}
try {
  const { mowerPlanStore: store } = await server.ssrLoadModule("/src/pages/tools/mower-plan/store/planStore.js");
  const {
    mowerConfigStore: config,
    hydrateAdvancedSettings,
    buildAdvancedSettings,
  } = await server.ssrLoadModule("/src/pages/tools/mower-plan/store/configStore.js");
  const { swapPlanFacilities, apply_operator_replace, collect_plan_operators } = await server.ssrLoadModule("/src/utils/mower/plan_edit.js");
  const { addPlanBinding, bindingColorStyle } = await server.ssrLoadModule("/src/utils/mower/plan_bindings.js");
  const slot = (agent, group = "") => ({ agent, group, replacement: [] });
  const legacy = {
    plan1: { room_1_1: { name: "制造站", product: "orirock", plans: [slot("阿米娅")] } },
    conf: { resting_priority: "阿米娅" },
    backup_plans: [
      { name: "旧副表", plan: {}, conf: {}, trigger: { left: "True", operator: "==", right: "True" }, trigger_timing: "AFTER_PLANNING", task: {} },
    ],
  };
  const before = JSON.stringify(legacy);
  store.hydratePlanData(legacy);
  check("旧排班载入不修改传入数据，回收站保持省略", () => {
    assert.equal(JSON.stringify(legacy), before);
    assert.equal(store.plan.value.recycle.plans.length, 2);
    assert.equal(store.build_plan().plan1.recycle, undefined);
    assert.equal(store.build_plan().backup_plans[0].trigger_timing, undefined);
  });
  check("副表创建包含新版可编辑字段", () => {
    store.createBackup();
    assert.equal(store.current_plan.value.recycle.plans.length, 2);
    assert.deepEqual(store.backup_plans.value[1].conf.removed_operators.resting_standby, []);
    assert.equal(store.backup_plans.value[1].conf.dorm_order_override, false);
  });
  check("主表与副表设置直接编辑后均进入导出", () => {
    store.main_conf.ling_xi = 3;
    store.main_conf.mood_limits = { lower: 2, upper: 20 };
    store.main_conf.resting_standby.push("阿米娅");
    store.backup_plans.value[1].conf.removed_operators.resting_standby.push("阿米娅");
    const exported = store.build_plan();
    assert.equal(exported.conf.ling_xi, 3);
    assert.deepEqual(exported.conf.mood_limits, { lower: 2, upper: 20 });
    assert.equal(exported.conf.resting_standby, "阿米娅");
    assert.equal(exported.backup_plans[1].conf.removed_operators.resting_standby, "阿米娅");
  });
  check("多绑组替班、回收站、共享颜色与个人心情上下限往返保留", () => {
    store.sub_plan.value = "main";
    store.plan.value.recycle.plans[0] = slot("阿米娅", "控制组");
    addPlanBinding(store.plan.value.recycle.plans[0]);
    Object.assign(store.plan.value.recycle.plans[0].group_bindings[0], { group: "加工组", replacement: ["砾"] });
    store.operator_mood_limits.value = { 阿米娅: { lower: 1, upper: 21 } };
    store.backup_plans.value[0].plan.central.plans[0] = slot("砾", "加工组");
    const expectedColor = store.group_colors.value["加工组"];
    store.sub_plan.value = 0;
    assert.equal(store.group_colors.value["加工组"], expectedColor);
    const exported = store.build_plan();
    store.hydratePlanData(exported);
    assert.deepEqual(store.plan.value.recycle.plans[0].group_bindings[0], { group: "加工组", replacement: ["砾"] });
    assert.deepEqual(store.operator_mood_limits.value.阿米娅, { lower: 1, upper: 21 });
    assert.ok(bindingColorStyle(store.plan.value.recycle.plans[0], store.group_colors.value).backgroundImage.includes("linear-gradient"));
  });
  check("导入主表单个设施为独立副本，不修改其他副表字段", () => {
    store.sub_plan.value = 0;
    const trigger = JSON.stringify(store.backup_plans.value[0].trigger);
    store.import_main_facility("recycle");
    store.current_plan.value.recycle.plans[0].group_bindings[0].replacement.push("桃金娘");
    assert.deepEqual(store.plan.value.recycle.plans[0].group_bindings[0].replacement, ["砾"]);
    assert.equal(JSON.stringify(store.backup_plans.value[0].trigger), trigger);
  });
  check("回收站排班或任务超过两人时拒绝导入并保留现有排班", () => {
    const previous = JSON.stringify(store.build_plan());
    for (const bad of [
      { plan1: { recycle: { plans: [slot("阿米娅"), slot("砾"), slot("桃金娘")] } } },
      { plan1: {}, backup_plans: [{ plan: {}, conf: {}, task: { recycle: ["阿米娅", "砾", "桃金娘"] } }] },
    ]) {
      assert.throws(() => store.hydratePlanData(bad), /回收站/);
      assert.equal(JSON.stringify(store.build_plan()), previous);
    }
  });
  check("宿舍旧床位迁移与副表覆盖标志往返保留", () => {
    store.hydratePlanData({
      plan1: {},
      conf: { dorm_order: "dormitory_3_2,dormitory_1_low" },
      backup_plans: [
        { name: "默认排序覆盖", plan: {}, conf: { dorm_order: "dormitory_1,dormitory_2,dormitory_3,dormitory_4", dorm_order_override: true }, task: {} },
      ],
    });
    assert.equal(store.dorm_order.value[0], "dormitory_3");
    assert.equal(store.dorm_order.value[1], "dormitory_1_low");
    assert.equal(store.build_plan().backup_plans[0].conf.dorm_order_override, true);
  });
  check("高级设置百分比转换与旧文件缺省正确", () => {
    hydrateAdvancedSettings({
      resting_threshold: 0.7,
      fia_threshold: 0.85,
      favorite: "阿米娅,砾",
      product_switching: { enable: true },
      future_setting: "retain",
    });
    assert.equal(config.resting_threshold.value, 70);
    assert.equal(config.product_switching.value.max_drones_per_switch, 0);
    assert.equal(buildAdvancedSettings().resting_threshold, 0.7);
    assert.equal(buildAdvancedSettings().favorite, "阿米娅,砾");
    assert.equal(buildAdvancedSettings().future_setting, "retain");
    hydrateAdvancedSettings();
    assert.equal(config.resting_threshold.value, 65);
    assert.equal(config.product_switching.value.enable, false);
  });
  check("源石碎片装置配方保留独立产物代号", () => {
    store.hydratePlanData({ plan1: { room_1_1: { name: "制造站", product: "orirock_device", plans: [] } } });
    assert.equal(store.build_plan().plan1.room_1_1.product, "orirock_device");
  });
  check("右侧六种布局只更新本机顺序，所有排班内容保持不变", () => {
    const permutations = [
      ["contact", "train", "recycle"],
      ["contact", "recycle", "train"],
      ["train", "contact", "recycle"],
      ["train", "recycle", "contact"],
      ["recycle", "contact", "train"],
      ["recycle", "train", "contact"],
    ];
    const before = JSON.stringify(store.build_plan());
    for (const order of permutations) {
      config.right_side_room_order.value = ["contact", "train", "recycle"];
      for (let index = 0; index < 3; index++) config.swap_right_side_facilities(config.right_side_room_order.value[index], order[index]);
      assert.deepEqual(config.right_side_room_order.value, order);
      assert.equal(JSON.stringify(store.build_plan()), before);
    }
    config.swap_right_side_facilities("room_1_1", "train");
    assert.equal(store.build_plan().advanced_settings.right_side_room_order, undefined);
  });
  check("生产设施换位同步活动副表的条件与显式任务", () => {
    store.createBackup();
    const backup = store.backup_plans.value[0];
    backup.trigger = { left: "op_data.facility_operator_count('room_1_1')", operator: ">", right: "0" };
    backup.task = { room_1_1: ["阿米娅"] };
    swapPlanFacilities(store.plan.value, store.backup_plans.value, 0, "room_1_1", "room_1_2");
    assert.ok(backup.trigger.left.includes("room_1_2"));
    assert.deepEqual(backup.task.room_1_2, ["阿米娅"]);
    assert.equal(store.plan.value.room_1_2.product, "orirock_device");
  });
  check("一键替换覆盖全部绑组、增减名单、个人心情、条件与任务", () => {
    store.plan.value.central.plans[0] = { agent: "阿米娅", group: "控制", replacement: ["砾"], group_bindings: [{ group: "第二组", replacement: ["阿米娅"] }] };
    store.main_conf.operator_mood_limits = { 阿米娅: { lower: 1, upper: 20 } };
    const backup = store.backup_plans.value[0];
    backup.conf.removed_operators.workaholic = ["阿米娅"];
    backup.trigger.left = "op_data.operators['阿米娅'].current_mood()";
    backup.task = { recycle: ["阿米娅", "Current"] };
    const state = { main_plan: store.plan.value, main_conf: store.mainConf(), backup_plans: store.backup_plans.value };
    assert.ok(collect_plan_operators(state).includes("阿米娅"));
    apply_operator_replace(state, "阿米娅", "桃金娘");
    const exported = store.build_plan();
    assert.equal(exported.plan1.central.plans[0].agent, "桃金娘");
    assert.deepEqual(exported.plan1.central.plans[0].group_bindings[0].replacement, ["桃金娘"]);
    assert.equal(exported.backup_plans[0].conf.removed_operators.workaholic, "桃金娘");
    assert.ok(exported.backup_plans[0].trigger.left.includes("['桃金娘']"));
    assert.equal(exported.backup_plans[0].task.recycle[0], "桃金娘");
    assert.deepEqual(exported.conf.operator_mood_limits.桃金娘, { lower: 1, upper: 20 });
  });
  check("高级设置完整往返包含切产物、无人机、隔离、菲亚和版本维护阈值", () => {
    store.hydratePlanData({
      plan1: {},
      advanced_settings: {
        product_switching: { enable: true, waiting_seconds: 4 },
        drone_count_limit: 137,
        drone_interval: 2.5,
        resting_threshold: 0.7,
        version_update_resting_threshold: 0.95,
        version_update_threshold_advance_hours: 18,
        dorm_isolation: [["阿米娅", "砾"]],
        group_mood_gap_threshold_minutes: 90,
        fia_fool: false,
        fia_threshold: 0.85,
        rescue_threshold: 0.6,
        favorite: "阿米娅",
      },
    });
    const expected = store.build_plan();
    store.hydratePlanData(JSON.parse(JSON.stringify(expected)));
    assert.deepEqual(store.build_plan(), expected);
    assert.equal(store.build_plan().advanced_settings.drone_count_limit, 137);
    assert.equal(store.build_plan().advanced_settings.version_update_resting_threshold, 0.95);
    assert.deepEqual(store.build_plan().advanced_settings.dorm_isolation, [["阿米娅", "砾"]]);
  });
  check("旧高级宿舍排序迁入排班，新导出排除显示顺序与退役设置", () => {
    store.hydratePlanData({
      plan1: {},
      advanced_settings: {
        dorm_order: "dormitory_3,dormitory_1",
        right_side_room_order: ["recycle", "train", "contact"],
        swap_contact_train: true,
        experimental_dorm_logic: true,
      },
    });
    const exported = store.build_plan();
    assert.equal(exported.conf.dorm_order, "dormitory_3,dormitory_1,dormitory_2,dormitory_4");
    for (const key of ["dorm_order", "right_side_room_order", "swap_contact_train", "experimental_dorm_logic"])
      assert.equal(exported.advanced_settings[key], undefined);
    const before = JSON.stringify(exported);
    assert.throws(() => store.hydratePlanData({ conf: {} }), /缺少排班主表/);
    assert.equal(JSON.stringify(store.build_plan()), before);
  });
  const { validatePlan } = await server.ssrLoadModule("/src/utils/mower/plan_validation.js");
  const valid = {
    default: "plan1",
    plan1: {
      room_1_1: { name: "制造站", product: "gold", plans: [{ agent: "阿米娅", group: "制造组", replacement: ["砾"] }] },
      dormitory_1: { plans: [slot("杜林"), ...Array.from({ length: 4 }, () => slot("Free"))] },
    },
    conf: {},
    backup_plans: [],
  };
  const cloneValid = () => structuredClone(valid);
  const { MOWER_INCOME_STORAGE_KEY, saveMowerRosterForIncome, parseMowerRosterText } = await server.ssrLoadModule("/src/utils/mower/theoretical-output/rosterInput.js");
  store.hydratePlanData({
    ...cloneValid(),
    title: "收益跳转排班",
    conf: { resting_priority: "杜林" },
    advanced_settings: { product_switching: { enable: true }, drone_threshold: 175 },
    backup_plans: [{ name: "测试副表", plan: { room_1_1: { name: "制造站", product: "exp3", plans: [slot("Current")] } }, conf: {}, task: {}, trigger: { left: "True", operator: "==", right: "True" } }],
  });
  const incomePayload = store.build_plan();
  const incomeBefore = JSON.stringify(incomePayload);
  const incomeCache = new Map([[MOWER_INCOME_STORAGE_KEY, "原有收益排班"]]);
  const incomeStorage = { setItem: (key, value) => incomeCache.set(key, value) };
  await saveMowerRosterForIncome(incomePayload, store.plan_title.value, incomeStorage);
  const incomeSaved = JSON.parse(incomeCache.get(MOWER_INCOME_STORAGE_KEY));
  const incomeRestored = await parseMowerRosterText(JSON.stringify(incomeSaved.payload));
  check("收益跳转传入完整主副表与高级设置，收益页载入后内容一致", () => {
    assert.deepEqual(incomeRestored, incomePayload);
    assert.equal(incomeSaved.fileName, "收益跳转排班");
    assert.equal(JSON.stringify(incomePayload), incomeBefore);
  });
  const incomeSavedBefore = incomeCache.get(MOWER_INCOME_STORAGE_KEY);
  await assert.rejects(saveMowerRosterForIncome({ default: "plan1", plan1: {} }, "空表", incomeStorage), /为空/);
  check("无法计算的排班不覆盖收益页原有排班", () => {
    assert.equal(incomeCache.get(MOWER_INCOME_STORAGE_KEY), incomeSavedBefore);
  });
  await assert.rejects(saveMowerRosterForIncome(incomePayload, "存储失败", { setItem: () => { throw new Error("浏览器存储不可用"); } }), /浏览器无法保存排班/);
  check("收益跳转存储失败时返回错误，保留编辑器内容", () => {
    assert.equal(JSON.stringify(store.build_plan()), incomeBefore);
  });
  check("浏览器校验允许正常排班且不修改传入文件", () => {
    const before = JSON.stringify(valid);
    assert.deepEqual(validatePlan(valid).errors, []);
    assert.equal(JSON.stringify(valid), before);
  });
  check("浏览器校验报告重复主班、替班缺失和无效名字", () => {
    const plan = cloneValid();
    plan.plan1.central = { plans: [slot("阿米娅"), slot("错误干员")] };
    const errors = validatePlan(plan).errors.join(";");
    assert.match(errors, /同时在/);
    assert.match(errors, /缺少普通替班/);
    assert.match(errors, /干员名无效/);
  });
  check("浏览器校验报告宿舍人数与 Free 顺序错误", () => {
    const plan = cloneValid();
    plan.plan1.dormitory_1.plans = [slot("Free"), slot("杜林")];
    const errors = validatePlan(plan).errors.join(";");
    assert.match(errors, /5 个岗位/);
    assert.match(errors, /Free 必须连续/);
  });
  check("浏览器校验覆盖多绑组及组内唯一替班", () => {
    const plan = cloneValid();
    plan.plan1.room_1_1.plans.push({ agent: "凯尔希", group: "制造组", replacement: ["砾"] });
    assert.match(validatePlan(plan).errors.join(";"), /分配不同替班/);
    plan.plan1.room_1_1.plans[0].group_bindings = [{ group: "制造组", replacement: ["砾"] }];
    assert.match(validatePlan(plan).errors.join(";"), /不能为空或重复/);
  });
  check("浏览器校验按 Current 继承主表并检查副表产物开关", () => {
    const plan = cloneValid();
    plan.backup_plans.push({ name: "切产物", conf: {}, plan: { room_1_1: { name: "制造站", product: "orirock", plans: [slot("Current")] } } });
    assert.match(validatePlan(plan).errors.join(";"), /需要开启/);
    plan.advanced_settings = { product_switching: { enable: true } };
    assert.deepEqual(validatePlan(plan).errors, []);
    assert.equal(validatePlan(plan).checkedPlans, 2);
  });
  check("浏览器校验覆盖副表设施变化、任务容量和个人心情", () => {
    const plan = cloneValid();
    plan.conf.operator_mood_limits = { 阿米娅: { lower: 20, upper: 10 } };
    plan.backup_plans.push({
      name: "非法配置",
      conf: {},
      plan: { room_1_1: { name: "贸易站", product: "lmd", plans: [slot("Current")] } },
      task: { recycle: ["砾", "芬", "杜林"] },
    });
    const errors = validatePlan(plan).errors.join(";");
    assert.match(errors, /不能改变设施/);
    assert.match(errors, /人数超过/);
    assert.match(errors, /下限不大于上限/);
  });
  console.log(`\n${passed} 项排班检查通过`);
} finally {
  await server.close();
}
