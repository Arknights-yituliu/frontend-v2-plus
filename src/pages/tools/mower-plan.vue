<script setup>
import { computed, onMounted, onUnmounted, provide, ref, watch, nextTick } from "vue";
import { createDiscreteApi } from "naive-ui";
import { useRouter } from "vue-router";
import hljs from "highlight.js/lib/core";
import jsonLang from "highlight.js/lib/languages/json";
import buildingApi from "@/api/backend/building.js";
import { saveAs } from "file-saver";
import PlanEditor from "./mower-plan/components/PlanEditor.vue";
import HelpText from "./mower-plan/components/HelpText.vue";
import TriggerDialog from "./mower-plan/components/TriggerDialog.vue";
import TaskDialog from "./mower-plan/components/TaskDialog.vue";
import RenameDialog from "./mower-plan/components/RenameDialog.vue";
import PlanOperatorSelect from "./mower-plan/components/PlanOperatorSelect.vue";
import SlickDormSelect from "./mower-plan/components/SlickDormSelect.vue";
import MoodLimitsEditor from "./mower-plan/components/MoodLimitsEditor.vue";
import PlanAdvancedSettings from "./mower-plan/components/PlanAdvancedSettings.vue";
import { apply_operator_replace, collect_plan_operators } from "@/utils/mower/plan_edit.js";
import { pinyin_match } from "@/utils/mower/common.js";
import { renderOperatorOption, renderOperatorLabel } from "@/utils/mower/opSelect.js";
import { exportPlanImage, importPlanImage } from "@/utils/mower/plan_image.js";
import { mowerPlanStore } from "./mower-plan/store/planStore.js";
import { validatePlan } from "@/utils/mower/plan_validation.js";
import { saveMowerRosterForIncome } from "@/utils/mower/theoretical-output/rosterInput.js";
import { swap } from "@/utils/mower/common.js";
import { useTheme } from "vuetify";

const {
  ling_xi,
  mood_limits,
  operator_mood_limits,
  resting_priority_replacement,
  free_room_exclusions,
  resting_standby,
  dorm_order,
  operators,
  plan,
  resting_priority,
  exhaust_require,
  rest_in_full,
  workaholic,
  backup_plans,
  sub_plan,
  refresh_trading,
  refresh_drained,
  ope_resting_priority,
  load_plan,
  hydratePlanData,
  load_operators,
  build_plan,
  free_blacklist,
  plan_title,
  plan_author,
  plan_note,
} = mowerPlanStore;

const activePlanName = computed(() => (sub_plan.value === "main" ? "主表" : backup_plans.value[sub_plan.value]?.name || "副表"));
const configuredOperatorCount = computed(
  () =>
    new Set(
      Object.values(mowerPlanStore.current_plan.value)
        .flatMap((room) => room.plans.map((slot) => slot.agent))
        .filter((name) => name && name !== "Free" && name !== "Current")
    ).size
);
const plan_editor = ref(null);
const ready = ref(false);
const router = useRouter();
const opening_income = ref(false);
const localJsonInput = ref(null);
const cloudScheduleId = ref("");
const scheduleIdInput = ref("");
const facility = ref("");
provide("facility", facility);

hljs.registerLanguage("json", jsonLang);
const { message, dialog } = createDiscreteApi(["message", "dialog"], { hljs });

const vuetifyTheme = useTheme();
const theme = computed(() => (vuetifyTheme.global.current.value.dark ? "dark" : "light"));
const edit_locked = ref(false);
const rescue = false;
const show_advanced_settings_dialog = ref(false);
const show_mood_limits_dialog = ref(false);
const show_replace_dialog = ref(false);
const show_validation_result = ref(false);
const validation_result = ref({ errors: [], checkedPlans: 0 });
function validate_plan() {
  validation_result.value = validatePlan(build_plan());
  show_validation_result.value = true;
}
const sub_plan_dropdown_open = ref(false);
function onSubPlanShowUpdate(show) {
  if (show) sub_plan_dropdown_open.value = true;
}
function onSubPlanOutsidePointer(event) {
  if (event.target instanceof Element && event.target.closest(".plan-navigation, .mower-sub-plan-menu")) return;
  sub_plan_dropdown_open.value = false;
}
function onSubPlanKeydown(event) {
  if (event.key === "Escape") sub_plan_dropdown_open.value = false;
}
const generating_image = ref(false);
provide("planEditLocked", edit_locked);
const mobile = ref(false);
provide("mobile", mobile);
provide("mowerTheme", theme);

const show_trigger_editor = ref(false);
const show_name_editor = ref(false);
const show_task = ref(false);
const add_task = ref(false);

provide("show_trigger_editor", show_trigger_editor);
provide("show_name_editor", show_name_editor);
provide("show_task", show_task);
provide("add_task", add_task);

const sub_plan_options = computed(() => {
  const result = [
    {
      label: "主表",
      value: "main",
    },
  ];
  for (let i = 0; i < backup_plans.value.length; i++) {
    result.push({
      label: backup_plans.value[i].name,
      value: i,
    });
  }
  return result;
});

function create_sub_plan() {
  mowerPlanStore.createBackup();
}

function delete_sub_plan() {
  backup_plans.value.splice(sub_plan.value, 1);
  sub_plan.value = "main";
}

const current_conf = computed(() => (sub_plan.value === "main" ? mowerPlanStore.main_conf : backup_plans.value[sub_plan.value].conf));
const current_removed = computed(() => current_conf.value.removed_operators ?? {});

function update_dorm_order_override(value) {
  if (sub_plan.value !== "main") current_conf.value.dorm_order_override = value.length > 0;
}

function movePlanBackward() {
  if (sub_plan.value !== "main" && sub_plan.value > 0) {
    const currentIndex = sub_plan.value;
    swap(currentIndex, currentIndex - 1, backup_plans.value);
    sub_plan.value = currentIndex - 1;
  }
}

function movePlanForward() {
  if (sub_plan.value !== "main" && sub_plan.value < backup_plans.value.length - 1) {
    const currentIndex = sub_plan.value;
    swap(currentIndex, currentIndex + 1, backup_plans.value);
    sub_plan.value = currentIndex + 1;
  }
}

const replace_source = ref("");
const replace_target = ref("");

// 弹窗关闭（应用或取消）时清空选择，避免重开时旧 target 已进排班 → 误报重复守卫
watch(show_replace_dialog, (open) => {
  if (!open) {
    replace_source.value = "";
    replace_target.value = "";
  }
});

const replacementState = () => ({ main_plan: plan.value, main_conf: mowerPlanStore.mainConf(), backup_plans: backup_plans.value });
const replace_source_options = computed(() =>
  collect_plan_operators(replacementState())
    .filter((name) => !["Free", "Current"].includes(name))
    .map((name) => ({ label: name, value: name }))
);
const target_already_in_plan = computed(() => collect_plan_operators(replacementState()).includes(replace_target.value));
function do_replace() {
  apply_operator_replace(replacementState(), replace_source.value, replace_target.value);
  message.success("替换完成");
  show_replace_dialog.value = false;
}
function apply_replace() {
  if (!replace_source.value || !replace_target.value || replace_source.value === replace_target.value) {
    message.error("请选择不同的源干员和目标干员");
    return;
  }
  if (target_already_in_plan.value) {
    dialog.warning({
      title: "目标干员已在排班中",
      content: "继续会把所有主表、副表里的源干员替换为目标干员。",
      positiveText: "仍要替换",
      negativeText: "取消",
      onPositiveClick: do_replace,
    });
  } else do_replace();
}
async function saveImage() {
  generating_image.value = true;
  try {
    facility.value = "";
    await nextTick();
    const blob = await exportPlanImage(plan_editor.value.outer, build_plan(), theme.value);
    if (!blob) throw new Error("图片生成失败");
    saveAs(blob, `${plan_title.value || "plan"}.png`);
  } catch (error) {
    message.error(error.message || "图片导出失败");
  } finally {
    generating_image.value = false;
  }
}

function export_json() {
  try {
    const payload = build_plan();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "plan.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    message.success("已导出当前排班");
  } catch (error) {
    console.error("Export JSON failed", error);
    message.error("导出失败，请重试");
  }
}

async function openMowerIncome() {
  if (opening_income.value) return;
  opening_income.value = true;
  try {
    await saveMowerRosterForIncome(build_plan(), plan_title.value || "当前编辑的排班", localStorage);
    await router.push({ name: "MowerIncome" });
  } catch (error) {
    message.error(error.message || "排班转交失败，请稍后重试");
  } finally {
    opening_income.value = false;
  }
}

function triggerLocalJsonImport() {
  localJsonInput.value?.click();
}

async function handleLocalJsonImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const data = file.type.startsWith("image/") ? await importPlanImage(file) : JSON.parse(await file.text());
    hydratePlanData(data);
    sub_plan.value = "main";
    message.success("已载入排班文件");
  } catch (error) {
    console.error("Local JSON import failed", error);
    message.error(error.message || "文件读取失败，请选择排班 JSON 或带二维码的排班图片");
  } finally {
    event.target.value = "";
  }
}

async function saveAndDownloadPlanFile() {
  try {
    const payload = build_plan();
    const { data } = await buildingApi.saveSchedule(payload, cloudScheduleId.value || 1111);
    cloudScheduleId.value = data?.scheduleId ?? cloudScheduleId.value;
    saveAs(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${cloudScheduleId.value || "plan"}.json`);
    message.success(`已下载排班文件，ID：${cloudScheduleId.value || "未知"}`);
  } catch (error) {
    console.error("saveAndDownloadPlanFile failed", error);
    message.error("下载排班文件失败");
  }
}

function extractSchedulePayload(payload) {
  if (!payload) return null;
  if (payload.schedule) return payload.schedule;
  if (payload.data) {
    if (payload.data.schedule) return payload.data.schedule;
    if (payload.data.plan1 || payload.data.conf) return payload.data;
  }
  if (payload.plan1 || payload.conf) return payload;
  return null;
}

async function importScheduleById() {
  if (!scheduleIdInput.value) {
    message.warning("请输入排班ID");
    return;
  }
  try {
    const { data } = await buildingApi.retrieveSchedule(scheduleIdInput.value);
    const schedulePayload = extractSchedulePayload(data);
    if (!schedulePayload) {
      message.error("未找到排班数据");
      return;
    }
    hydratePlanData(schedulePayload);
    sub_plan.value = "main";
    message.success(`已载入排班 ID：${scheduleIdInput.value}`);
  } catch (error) {
    console.error("importScheduleById failed", error);
    message.error("ID 导入失败，请确认编号");
  }
}

function loadPlanFromScheduleBridge() {
  const raw = localStorage.getItem("mowerPlanPayload");
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    hydratePlanData(payload);
    sub_plan.value = "main";
    message.success("已载入排班生成器数据");
  } catch (error) {
    console.error("Failed to load bridged plan", error);
    message.error("载入排班失败");
  } finally {
    localStorage.removeItem("mowerPlanPayload");
  }
}

function handleResize() {
  mobile.value = window.innerWidth < 800;
}

onMounted(async () => {
  handleResize();
  window.addEventListener("resize", handleResize);
  document.addEventListener("pointerdown", onSubPlanOutsidePointer, true);
  document.addEventListener("keydown", onSubPlanKeydown, true);
  await load_operators();
  await load_plan();
  loadPlanFromScheduleBridge();
  ready.value = true;
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  document.removeEventListener("pointerdown", onSubPlanOutsidePointer, true);
  document.removeEventListener("keydown", onSubPlanKeydown, true);
});
</script>

<template>
  <n-message-provider>
    <trigger-dialog />
    <task-dialog />
    <rename-dialog />
    <div class="mower-workspace" :data-theme="theme">
      <header class="workspace-header">
        <div class="workspace-heading">
          <div class="workspace-eyebrow"><span class="status-dot"></span>基建排班</div>
          <h1>Mower 排班表</h1>
        </div>
        <div class="workspace-stats">
          <div>
            <strong>{{ configuredOperatorCount }}</strong
            ><span>已配置干员数</span>
          </div>
          <div>
            <strong>{{ backup_plans.length }}</strong
            ><span>副表</span>
          </div>
        </div>
      </header>

      <section class="workspace-card metadata-card" aria-label="排班信息与文件">
        <div class="section-heading">
          <div>
            <h2>排班信息</h2>
          </div>
        </div>
        <div class="metadata-grid">
          <div class="metadata-fields">
            <label for="mower-plan-title">标题</label>
            <n-input v-model:value="plan_title" :input-props="{ id: 'mower-plan-title' }" placeholder="给这份排班起个名字" />
            <label for="mower-plan-author">作者</label>
            <n-input v-model:value="plan_author" :input-props="{ id: 'mower-plan-author' }" placeholder="填写作者名称" />
          </div>
          <div class="metadata-note">
            <label for="mower-plan-note">备注</label>
            <n-input
              v-model:value="plan_note"
              :input-props="{ id: 'mower-plan-note' }"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 5 }"
              placeholder="记录适用条件、干员要求或排班心得…"
            />
          </div>
        </div>
        <div class="file-toolbar">
          <div class="id-field">
            <n-input v-model:value="scheduleIdInput" placeholder="输入云端排班 ID" aria-label="云端排班 ID" />
            <n-button secondary @click="importScheduleById">载入</n-button>
          </div>
          <div class="file-actions">
            <n-button secondary type="primary" :disabled="!ready" :loading="opening_income" @click="openMowerIncome">转到 收益计算（Mower）</n-button>
            <n-button secondary @click="triggerLocalJsonImport">导入文件</n-button>
            <n-button secondary @click="export_json">导出 JSON</n-button>
            <n-button secondary :loading="generating_image" @click="saveImage">导出图片</n-button>
            <n-button type="primary" @click="saveAndDownloadPlanFile">保存云端</n-button>
          </div>
        </div>
        <input ref="localJsonInput" type="file" accept="application/json,image/png,image/jpeg" class="sr-only" @change="handleLocalJsonImport" />
      </section>

      <section class="workspace-card board-card" aria-label="排班编辑">
        <div class="section-heading">
          <div>
            <h2>排班编辑</h2>
            <p>点击设施编辑干员，拖动设施卡片调整位置。</p>
          </div>
        </div>
        <div class="plan-toolbar">
          <div class="plan-navigation">
            <n-button-group>
              <n-button aria-label="副表上移" title="副表上移" :disabled="sub_plan === 'main' || sub_plan === 0" @click="movePlanBackward">←</n-button>
              <n-button aria-label="副表下移" title="副表下移" :disabled="sub_plan === 'main' || sub_plan === backup_plans.length - 1" @click="movePlanForward"
                >→</n-button
              >
            </n-button-group>
            <n-select
              v-model:value="sub_plan"
              :show="sub_plan_dropdown_open"
              :options="sub_plan_options"
              :menu-props="{ class: 'mower-sub-plan-menu' }"
              aria-label="选择排班表"
              class="plan-selector"
              @update:show="onSubPlanShowUpdate"
              @update:value="sub_plan_dropdown_open = true"
            />
            <n-button :disabled="sub_plan === 'main'" quaternary @click="show_name_editor = true">重命名</n-button>
          </div>
          <div class="plan-actions">
            <n-button secondary type="primary" @click="create_sub_plan">新建副表</n-button>
            <n-button v-if="sub_plan === 'main'" quaternary @click="validate_plan">校验排班</n-button>
            <n-button v-if="sub_plan === 'main'" quaternary @click="show_replace_dialog = true">替换干员</n-button>
            <template v-else>
              <n-button secondary @click="show_trigger_editor = true">触发条件</n-button>
              <n-button secondary @click="show_task = true">编辑任务</n-button>
              <n-popconfirm @positive-click="delete_sub_plan"
                ><template #trigger><n-button quaternary type="error">删除副表</n-button></template
                >删除「{{ activePlanName }}」及其设置？</n-popconfirm
              >
            </template>
          </div>
        </div>
        <div class="board-scroll" tabindex="0" aria-label="可横向滚动的设施排班表">
          <plan-editor v-if="ready" ref="plan_editor" />
        </div>
      </section>

      <section class="workspace-card settings-card" aria-label="换班与休息设置">
        <div class="settings-heading">
          <div class="settings-actions">
            <n-button secondary @click="show_advanced_settings_dialog = true">高级设置</n-button>
            <n-button secondary @click="show_mood_limits_dialog = true">设置心情上下限</n-button>
          </div>
          <p v-if="sub_plan !== 'main'">副表生效时增加或移除名单；留空继承主表及此前副表。</p>
        </div>
        <n-form class="plan-settings-form" :label-placement="mobile ? 'top' : 'left'" :show-feedback="false" label-width="160" label-align="left">
          <n-form-item v-if="!rescue">
            <template #label><span>需要回满心情的干员</span><help-text>回满目标为当前心情上限。</help-text></template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.rest_in_full"
              v-model:removed="current_removed.rest_in_full"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item v-if="!rescue">
            <template #label>
              <span>需要用尽心情的干员</span>
              <help-text> 用尽按当前心情下限计算， 优先取得替班；被占用时先换替班，否则叫回占用组。 </help-text>
            </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.exhaust_require"
              v-model:removed="current_removed.exhaust_require"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item v-if="!rescue">
            <template #label>
              <span>宿舍高优先级干员</span>
              <help-text>
                <p>高优干员 → 普通主班 → 低优主班 → 高优替班 → 候补 → 普通替班 → 空闲；同级距心情上限更远者优先。</p>
                <p>只影响分床和单回，不改变下班顺序。更高排名的新入住者可重分单回，已有普通床位保持不动。</p>
              </help-text>
            </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.ope_resting_priority"
              v-model:removed="current_removed.ope_resting_priority"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item v-if="!rescue">
            <template #label>
              <span>宿舍低优先级干员</span>
              <help-text> 低于普通主班，高于高优替班；同级距心情上限更远者优先。需有床才能下班，不改变下班顺序。 </help-text>
            </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.resting_priority"
              v-model:removed="current_removed.resting_priority"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item v-if="!rescue">
            <template #label>
              <span>宿舍高优先级替班</span>
              <help-text>仅替班生效，低于低优主班、高于候补；同级距心情上限更远者优先，可接管候补床位。</help-text>
            </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.resting_priority_replacement"
              v-model:removed="current_removed.resting_priority_replacement"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item v-if="!rescue">
            <template #label>
              <span>宿舍休息候补干员</span>
              <help-text>
                有床休息，无床或被更高优接管后待命；需有正常优先级主班在休息。绑组随组回班，未绑组随下一批回班。低于急救线升为低优并保床。

                <p>待命不恢复心情；用尽、回满、固定宿舍和零心情工作干员不适用。</p>
              </help-text>
            </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.resting_standby"
              v-model:removed="current_removed.resting_standby"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item>
            <template #label> <span>0心情工作的干员</span><help-text>心情涣散状态仍能触发技能的干员</help-text> </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.workaholic"
              v-model:removed="current_removed.workaholic"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item>
            <template #label>
              <span>宿舍黑名单</span>
              <help-text> 不参与动态分床和补床，固定宿舍岗位不受影响。 </help-text>
            </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.free_blacklist"
              v-model:removed="current_removed.free_blacklist"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item v-if="!rescue">
            <template #label>
              <span>宿舍保留干员</span>
              <help-text> 名单内干员保留 Free 宿舍床位，不因满心情而离宿，仍按正常回班及个人心情上限规则离宿。 </help-text>
            </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="sub_plan !== 'main'"
              v-model="current_conf.free_room_exclusions"
              v-model:removed="current_removed.free_room_exclusions"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item v-if="!rescue">
            <template #label>
              <span>跑单时间刷新干员</span>
              <help-text>
                <p>贸易站外影响贸易效率的干员</p>
                <p>
                  默认情况下，mower 只在贸易站内干员换班后重读所有贸易站的订单剩余时间。<br />
                  若有贸易站外的干员影响贸易效率，且与贸易站内的干员不在一组，则需写入此选项中。
                </p>
              </help-text>
            </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.refresh_trading"
              v-model:removed="current_removed.refresh_trading"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item v-if="!rescue">
            <template #label>
              <span>用尽刷新</span>
              <help-text>
                <p>会影响用尽干员心情消耗速率的干员</p>
                <p>在填入该选项的干员上下班后，会重新读取用尽干员的下班时间</p>
              </help-text>
            </template>
            <PlanOperatorSelect
              :disabled="edit_locked"
              :backup="!rescue && sub_plan !== 'main'"
              v-model="current_conf.refresh_drained"
              v-model:removed="current_removed.refresh_drained"
            ></PlanOperatorSelect>
          </n-form-item>
          <n-form-item>
            <template #label>
              <span>宿舍优先级排序</span>
              <help-text>
                默认 1→2→3→4 为各宿舍高优位，可手动插入低优位。未选择的低优位排在末尾。副表留空继承，覆盖生效顺序时重排宿舍；日常不反复搬床。
              </help-text>
            </template>
            <slick-dorm-select
              :disabled="edit_locked"
              v-model="current_conf.dorm_order"
              room-only
              include-low
              @update:model-value="update_dorm_order_override"
            ></slick-dorm-select>
          </n-form-item>
        </n-form>
      </section>
    </div>
    <n-modal
      v-model:show="show_validation_result"
      preset="card"
      title="排班校验"
      :auto-focus="false"
      :style="{ width: '680px', maxWidth: 'calc(100vw - 24px)' }"
    >
      <n-alert :type="validation_result.errors.length ? 'error' : 'success'" :title="validation_result.errors.length ? '发现排班问题' : '静态校验通过'">
        已检查主表及 {{ validation_result.checkedPlans - 1 }} 张副表的单独生效配置。
      </n-alert>
      <n-scrollbar style="max-height: 50vh">
        <ol v-if="validation_result.errors.length" class="validation-errors">
          <li v-for="error in validation_result.errors" :key="error">{{ error }}</li>
        </ol>
      </n-scrollbar>
      <p class="validation-scope">副表组合、实际运行状态和干员持有情况仍需在 Mower 中完整校验。</p>
      <template #footer><n-button @click="show_validation_result = false">完成</n-button></template>
    </n-modal>
    <n-modal
      v-model:show="show_advanced_settings_dialog"
      :auto-focus="false"
      preset="card"
      title="高级设置"
      :style="{ width: '800px', maxWidth: 'calc(100vw - 24px)' }"
      :content-style="{ maxHeight: '75vh', overflowY: 'auto' }"
    >
      <PlanAdvancedSettings :disabled="edit_locked" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="show_advanced_settings_dialog = false">完成</n-button>
        </n-space>
      </template>
    </n-modal>
    <n-modal
      v-model:show="show_mood_limits_dialog"
      :auto-focus="false"
      preset="card"
      title="设置心情上下限"
      :style="{ width: '680px', maxWidth: 'calc(100vw - 24px)' }"
      :content-style="{ maxHeight: '70vh', overflowY: 'auto' }"
    >
      <n-form label-placement="top" :show-feedback="false">
        <n-form-item>
          <template #label>
            <span>令夕模式</span>
            <help-text>
              <div>令夕上班时起作用</div>
              <div>启动Mower前需要手动对齐心情</div>
              <div>感知：夕心情-令心情=12</div>
              <div>烟火：令心情-夕心情=12</div>
              <div>均衡：夕令心情一样</div>
              <div>个人设置优先于令夕模式，令夕模式优先于全体设置。</div>
            </help-text>
          </template>
          <n-radio-group v-model:value="current_conf.ling_xi" :disabled="edit_locked">
            <n-space>
              <n-radio :value="1">感知信息</n-radio>
              <n-radio :value="2">人间烟火</n-radio>
              <n-radio :value="3">均衡模式</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="自定义上下限">
          <mood-limits-editor
            v-model:defaults="current_conf.mood_limits"
            v-model:overrides="current_conf.operator_mood_limits"
            :disabled="edit_locked"
            :operators="operators"
            :is-backup="sub_plan !== 'main'"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="show_mood_limits_dialog = false">完成</n-button>
        </n-space>
      </template>
    </n-modal>
    <n-modal v-model:show="show_replace_dialog" preset="card" title="一键替换干员" :style="{ width: '560px' }">
      <n-alert title="警告" type="warning"> 该操作会一键替换主表+副表所有干员名字，不可逆，使用前最好复制现有排班表，以防出错 </n-alert>
      <div class="replace-flow">
        <div class="replace-side">
          <div class="replace-side-label">被替换干员（排班中已有）</div>
          <n-select
            v-model:value="replace_source"
            :disabled="edit_locked"
            :options="replace_source_options"
            placeholder="选择排班中的干员"
            filterable
            :filter="(p, o) => pinyin_match(o.label, p)"
            :render-label="renderOperatorLabel"
            :render-option="renderOperatorOption"
          />
        </div>
        <svg class="replace-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div class="replace-side">
          <div class="replace-side-label">替换为（全部干员池）</div>
          <n-select
            v-model:value="replace_target"
            :disabled="edit_locked"
            :options="operators"
            placeholder="选择目标干员"
            filterable
            :filter="(p, o) => pinyin_match(o.label, p)"
            :render-label="renderOperatorLabel"
            :render-option="renderOperatorOption"
          />
        </div>
      </div>
      <n-alert v-if="target_already_in_plan" title="目标干员已在排班中" type="warning" class="replace-duplicate">
        目标干员已存在于排班（可能来自之前的替换，如主表换过、副表没换）。仍可替换：点「替换」后确认即可继续。
      </n-alert>
      <template #footer>
        <n-space justify="end">
          <n-button @click="show_replace_dialog = false">取消</n-button>
          <n-button type="primary" :disabled="edit_locked" @click="apply_replace">替换</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-message-provider>
</template>

<style scoped lang="scss">
.mower-workspace {
  --workspace-accent: #2563a8;
  --workspace-muted: #737f91;
  --workspace-surface: #fff;
  --workspace-soft: #f5f8fc;
  --workspace-line: rgba(30, 55, 88, 0.09);
  --workspace-shadow: 0 2px 5px rgba(25, 45, 80, 0.025), 0 8px 28px rgba(25, 45, 80, 0.035);
  --avatar-outline: rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 1080px;
  min-width: 0;
  margin: 0 auto;
  padding: 28px 24px 48px;
  -webkit-font-smoothing: antialiased;
  color: var(--c-text-color);
  font-variant-numeric: tabular-nums;
}
.mower-workspace[data-theme="dark"] {
  --workspace-accent: #86baff;
  --workspace-muted: #99a8be;
  --workspace-surface: #20252d;
  --workspace-soft: #272e39;
  --workspace-line: rgba(220, 230, 255, 0.09);
  --workspace-shadow: 0 2px 5px rgba(0, 0, 0, 0.08), 0 8px 28px rgba(0, 0, 0, 0.1);
  --avatar-outline: rgba(255, 255, 255, 0.1);
}
.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 26px;
}
.workspace-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--workspace-accent);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 8px;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
h1 {
  font-size: 28px;
  letter-spacing: -0.8px;
  line-height: 1.4;
  font-weight: 650;
  margin: 0 0 8px;
  text-wrap: balance;
}
p {
  font-size: 13px;
  line-height: 1.7;
  color: var(--workspace-muted);
  margin: 0;
  text-wrap: pretty;
}
.workspace-stats {
  display: flex;
  gap: 32px;
  padding-right: 8px;
  flex-shrink: 0;
}
.workspace-stats > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.workspace-stats strong {
  font-size: 26px;
  line-height: 1.3;
  font-weight: 550;
}
.workspace-stats span {
  font-size: 12px;
  color: var(--workspace-muted);
}
.workspace-card {
  background: var(--workspace-surface);
  box-shadow: var(--workspace-shadow);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  min-width: 0;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}
h2 {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.5;
  margin: 0 0 4px;
}
.metadata-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.metadata-fields {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 14px 12px;
  align-items: center;
}
label {
  font-size: 13px;
  color: var(--workspace-muted);
}
.metadata-note {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.metadata-note label {
  margin-top: 9px;
  flex-shrink: 0;
}
.file-toolbar {
  border-top: 1px solid var(--workspace-line);
  margin-top: 22px;
  padding-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: space-between;
  align-items: center;
}
.id-field {
  display: flex;
  width: 250px;
  gap: 8px;
}
.file-actions,
.plan-actions,
.plan-navigation,
.settings-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.plan-toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: var(--workspace-soft);
  margin-bottom: 16px;
}
.plan-selector {
  width: 148px;
}
.board-card {
  padding-bottom: 16px;
}
.board-scroll {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--workspace-muted) transparent;
  border-radius: 8px;
  padding-bottom: 8px;
}
.board-scroll:focus-visible {
  outline: 2px solid var(--workspace-accent);
  outline-offset: 4px;
}
.settings-heading {
  margin-bottom: 14px;
}
.validation-errors {
  padding-left: 24px;
  margin-top: 16px;
}
.validation-errors li + li {
  margin-top: 8px;
}
.validation-scope {
  margin-top: 16px;
}
.settings-heading p {
  margin-top: 10px;
}
.plan-settings-form {
  width: 100%;
}
.plan-settings-form :deep(.n-form-item) {
  padding: 14px 0;
  border-top: 1px solid var(--workspace-line);
}
.plan-settings-form :deep(.n-form-item-label) {
  align-items: center;
}
:deep(.plan-avatar) {
  outline: 1px solid var(--avatar-outline);
  outline-offset: -1px;
}
:deep(.n-button) {
  border-radius: 7px;
  transition-property: background-color, color, opacity, transform;
  transition-duration: 150ms;
}
:deep(.n-button:not(.n-button--disabled):active) {
  transform: scale(0.96);
}
.file-actions :deep(.n-button),
.settings-actions :deep(.n-button) {
  min-height: 36px;
}
.replace-flow {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}
.replace-side {
  flex: 1;
  min-width: 0;
}
.replace-side-label {
  margin-bottom: 8px;
}
.replace-duplicate {
  margin-top: 12px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
@media (max-width: 800px) {
  .mower-workspace {
    padding: 20px 12px 32px;
  }
  .workspace-header {
    align-items: flex-start;
    gap: 16px;
  }
  .workspace-card {
    padding: 18px;
    border-radius: 14px;
  }
  .workspace-stats {
    gap: 18px;
    padding: 0;
  }
  .workspace-stats strong {
    font-size: 22px;
  }
  h1 {
    font-size: 24px;
  }
  .metadata-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .metadata-note {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
  }
  .section-heading {
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .file-actions {
    width: 100%;
  }
  .file-actions > * {
    flex: 1;
  }
  .id-field {
    width: 100%;
  }
  .plan-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
  .plan-navigation {
    width: 100%;
  }
  .plan-selector {
    flex: 1;
    min-width: 140px;
  }
  .settings-actions {
    width: 100%;
  }
  .settings-actions > * {
    flex: 1;
  }
  .workspace-heading p {
    max-width: 240px;
  }
  .plan-settings-form :deep(.n-form-item) {
    padding: 12px 0;
  }
}
@media (max-width: 480px) {
  .workspace-stats {
    display: none;
  }
  .workspace-card {
    padding: 16px;
  }
  .workspace-heading p {
    max-width: none;
  }
  .file-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  :deep(.n-button) {
    transition: none;
  }
  :deep(.n-button:not(.n-button--disabled):active) {
    transform: none;
  }
}
</style>
