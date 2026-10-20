import assert from "node:assert/strict";
import { createServer } from "vite";
import { createSSRApp, createRenderer, h, reactive, ssrContextKey } from "vue";
import { renderToString } from "@vue/server-renderer";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
let passed = 0;
function check(name, callback) { callback(); passed++; console.log(`✓ ${name}`); }
const slot = (agent, replacement = []) => ({ agent, group: "", replacement });
const fixture = () => ({
  default: "plan1", conf: {}, backup_plans: [],
  plan1: {
    room_1_1: { name: "制造站", product: "gold", plans: [slot("芬", ["香草"])] },
    room_1_3: { name: "发电站", plans: [] },
    dormitory_1: { plans: Array.from({ length: 5 }, () => slot("Free")) },
  },
});
try {
  const { facilityLevelState, facilityCapacity } = await server.ssrLoadModule("/src/utils/mower/facility_levels.js");
  const { mowerPlanStore: store } = await server.ssrLoadModule("/src/pages/tools/mower-plan/store/planStore.js");
  const { validatePlan } = await server.ssrLoadModule("/src/utils/mower/plan_validation.js");
  check("未设置等级时右侧默认三级，空员设施仍计耗电", () => {
    const plan = fixture(); delete plan.plan1.dormitory_1;
    const state = facilityLevelState(plan);
    for (const room of ["meeting", "factory", "contact", "train", "recycle"]) assert.equal(state.facilities[room].level, 3);
    assert.deepEqual(state.power, { generation: 270, consumption: 250, margin: 20, sufficient: true });
    plan.facility_levels = { train: 1, contact: 0 };
    assert.equal(facilityLevelState(plan).power.consumption, 140);
  });
  check("保存等级控制空员设施和宿舍，计算不修改输入", () => {
    const plan = fixture();
    plan.facility_levels = { room_1_1: 1, room_1_3: 2, dormitory_1: 2, contact: 1, meeting: 0, train: 0, factory: 3, recycle: 3 };
    const original = structuredClone(plan);
    const state = facilityLevelState(plan);
    assert.deepEqual(state.power, { generation: 130, consumption: 50, margin: 80, sufficient: true });
    assert.equal(state.facilities.contact.plans.length, 0);
    assert.equal(state.facilities.dormitory_1.level, 2);
    assert.deepEqual(plan, original);
  });
  check("两电站按实际岗位推断产出等级，三电站推断满级", () => {
    const plan = fixture();
    plan.plan1.room_2_3 = { name: "发电站", plans: [] };
    let state = facilityLevelState(plan);
    assert.equal(state.facilities.dormitory_1.level, 1);
    assert.equal(state.facilities.room_1_1.level, 1);
    plan.plan1.room_3_3 = { name: "发电站", plans: [] };
    state = facilityLevelState(plan);
    assert.equal(state.facilities.dormitory_1.level, 5);
    assert.equal(state.facilities.room_1_1.level, 3);
    plan.facility_levels = { room_3_3: 0, room_1_1: 2 };
    state = facilityLevelState(plan);
    assert.equal(state.facilities.dormitory_1.level, 1);
    assert.equal(state.facilities.room_1_1.level, 2);
  });
  check("Current参与产出岗位计数，单独Current不推断宿舍建造，Free仍提供床位", () => {
    const plan = fixture();
    plan.plan1.room_2_3 = { name: "发电站", plans: [] };
    plan.plan1.room_1_1.plans = [slot("Current"), slot("Free"), slot(" ")];
    plan.plan1.dormitory_1.plans = [slot("Current")];
    let state = facilityLevelState(plan);
    assert.equal(state.facilities.room_1_1.level, 2);
    assert.equal(state.facilities.dormitory_1.level, 0);
    assert.equal(plan.plan1.dormitory_1.plans[0].agent, "Current");
    plan.plan1.dormitory_1.plans.push(slot("Free"));
    state = facilityLevelState(plan);
    assert.equal(state.facilities.dormitory_1.level, 1);
    plan.facility_levels = { dormitory_1: 2 };
    plan.plan1.dormitory_1.plans = [slot("Current")];
    assert.equal(facilityLevelState(plan).facilities.dormitory_1.level, 2);
  });
  check("等级范围与未知设施报告错误，未建造保留驻员供修正", () => {
    for (const [room, level] of [["dormitory_1", 6], ["contact", 4], ["room_1_1", 1.5], ["central", -1], ["contact", "2"], ["unknown", 1], ["gaming_1", 1]]) {
      assert.match(facilityLevelState({ ...fixture(), facility_levels: { [room]: level } }).issues.join(";"), /等级必须/);
    }
    const plan = fixture(); plan.facility_levels = { room_1_1: 0 };
    assert.match(validatePlan(plan).errors.join(";"), /room_1_1 未建造/);
    assert.equal(plan.plan1.room_1_1.plans[0].agent, "芬");
    assert.match(facilityLevelState({ ...fixture(), facility_levels: [] }).issues.join(";"), /必须为对象/);
    assert.match(facilityLevelState({ ...fixture(), facility_levels: { room_3_1: 1 } }).issues.join(";"), /先设置.*设施类别/);
  });
  check("电力刚好相等有效，缺电保留原表并进入静态校验", () => {
    const plan = fixture();
    plan.facility_levels = { room_1_3: 1, room_1_1: 2, dormitory_1: 3, meeting: 0, contact: 0, train: 0, factory: 0 };
    assert.deepEqual(facilityLevelState(plan).power, { generation: 60, consumption: 60, margin: 0, sufficient: true });
    assert.deepEqual(validatePlan(plan).errors, []);
    plan.facility_levels.dormitory_1 = 4;
    assert.match(validatePlan(plan).errors.join(";"), /电力赤字/);
    assert.equal(plan.plan1.room_1_1.plans.length, 1);
  });
  check("物理容量区分控制中枢、回收站、产出与其他右侧设施", () => {
    for (const [type, level, capacity] of [["central", 1, 1], ["central", 5, 5], ["recycle", 1, 1], ["recycle", 2, 2], ["manufacture", 2, 2], ["trading", 1, 1], ["dormitory", 1, 5], ["train", 1, 2], ["meeting", 1, 2], ["factory", 3, 1], ["power", 3, 1], ["contact", 0, 0]]) assert.equal(facilityCapacity(type, level), capacity);
    const plan = fixture();
    plan.plan1.central = { plans: [slot("阿米娅", ["砾"]), slot("杜宾", ["红"])] };
    plan.facility_levels = { central: 1 };
    assert.match(validatePlan(plan).errors.join(";"), /central.*等级容量 1/);
  });
  check("副表不能抬高显式等级、绕过未建造或扩展左侧主表岗位", () => {
    const plan = fixture();
    plan.facility_levels = { recycle: 1, contact: 0, room_1_1: 3 };
    plan.backup_plans = [{ name: "等级测试", conf: {}, plan: {
      recycle: { plans: [slot("红", ["黑角"]), slot("砾", ["杜林"])] },
      contact: { plans: [slot("阿米娅", ["杜宾"])] },
      room_1_1: { name: "制造站", product: "gold", plans: [slot("Current"), slot("讯使", ["桃金娘"])] },
    }, task: { recycle: ["Current", "Current"] } }];
    const original = structuredClone(plan);
    const errors = validatePlan(plan).errors.join(";");
    assert.match(errors, /副表「等级测试」：recycle.*等级容量 1/);
    assert.match(errors, /副表「等级测试」：contact 未建造/);
    assert.match(errors, /副表「等级测试」：room_1_1 不能改变设施类型或岗位数/);
    assert.match(errors, /任务 recycle 人数超过设施容量/);
    assert.deepEqual(plan, original);
  });
  check("主副表共享等级，JSON往返保留空员等级及原表且相互不污染", () => {
    const plan = fixture(); plan.facility_levels = { room_1_1: 1, contact: 1, recycle: 0, dormitory_1: 2 };
    const original = structuredClone(plan);
    store.hydratePlanData(plan);
    store.sub_plan.value = 0;
    const exported = store.build_plan();
    assert.deepEqual(exported.facility_levels, plan.facility_levels);
    assert.equal(exported.plan1.contact, undefined);
    exported.facility_levels.contact = 2;
    assert.equal(store.facility_levels.value.contact, 1);
    store.facility_levels.value.dormitory_1 = 0;
    assert.equal(store.plan.value.dormitory_1.plans.length, 5);
    assert.equal(plan.facility_levels.dormitory_1, 2);
    store.hydratePlanData(original);
    const saved = store.build_plan(); store.hydratePlanData(JSON.parse(JSON.stringify(saved)));
    assert.deepEqual(store.build_plan(), saved);
    assert.deepEqual(plan, original);
  });
  check("恢复默认只删除手动等级，旧表缺省为空且非法中间编辑可保存", () => {
    store.hydratePlanData({ ...fixture(), facility_levels: { dormitory_1: 2 } });
    delete store.facility_levels.value.dormitory_1;
    assert.equal(facilityLevelState(store.build_plan()).facilities.dormitory_1.level, 5);
    store.facility_levels.value.contact = 99;
    assert.equal(store.build_plan().facility_levels.contact, 99);
    assert.match(validatePlan(store.build_plan()).errors.join(";"), /contact 等级必须/);
    store.hydratePlanData(fixture());
    assert.deepEqual(store.build_plan().facility_levels, {});
  });
  const { default: levelEditor } = await server.ssrLoadModule("/src/pages/tools/mower-plan/components/PlanFacilityLevels.vue");
  for (const malformed of ["bad", 99, []]) {
    store.hydratePlanData({ plan1: {}, facility_levels: malformed });
    let update;
    const app = createSSRApp(levelEditor, { mode: "level", facility: "contact" });
    app.component("n-select", { setup(props, { attrs }) { update = attrs["onUpdate:value"]; return () => h("div"); } });
    for (const name of ["n-tag", "n-alert", "n-button"]) app.component(name, { render() { return h("div", this.$slots.default?.()); } });
    await renderToString(app);
    assert.equal(typeof update, "function");
    update(1);
    assert.deepEqual(store.build_plan().facility_levels, { contact: 1 });
  }
  check("实际等级选择器可修正字符串、数字、数组配置，不产生写属性异常", () => {
    assert.deepEqual(store.build_plan().facility_levels, { contact: 1 });
  });
  check("等级设置与恢复使同一组件的默认标签及恢复按钮条件即时更新", () => {
    const renderer = createRenderer({
      patchProp() {}, insert() {}, remove() {}, createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
      setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null,
    });
    store.hydratePlanData({ plan1: {} });
    let bindings;
    const props = reactive({ facility: "contact", locked: false, mode: "level" });
    const app = renderer.createApp({ setup() { bindings = levelEditor.setup(props, { expose() {} }); return () => null; } });
    app.provide(ssrContextKey, { modules: new Set() });
    app.mount({});
    try {
      assert.equal(bindings.explicit.value, false);
      bindings.setLevel(1);
      assert.equal(bindings.explicit.value, true);
      assert.equal(bindings.options.value[1].label, "1 级");
      bindings.resetLevel();
      assert.equal(bindings.explicit.value, false);
      assert.equal(bindings.options.value[3].label, "3 级（默认）");
      props.locked = true;
      bindings.setLevel(1);
      assert.deepEqual(store.build_plan().facility_levels, {});
    } finally { app.unmount(); }
  });
  console.log(`\n${passed} 项设施等级检查通过`);
} finally { await server.close(); }
