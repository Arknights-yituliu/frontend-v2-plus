<script setup>
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";

/**
 * 计算过程详情（「更好的作战干员筛选」详情弹窗内的成员级区域）
 *
 * 数据见源项目 docs/calc-process-spec.md：
 * - calc = { metric, timeline?, note?, scenarios: [{ id, steps }] }
 * - 时间轴另存于 operator-timelines.json（首次需要时惰性加载），timelines[`干员@技能`] =
 *   { fps, scenarios: [{ id, name, durationFrames, panel, series: [{ key, group, label, damageType, events }] }] }
 *
 * series 的 group 是图例单位、key 是数据单元：同一 group 的多条 series 在曲线上合并求和，
 * tooltip 仍可按 key 分项（见 docs/output-standard.md §10）。
 */

const props = defineProps({
  calc: { type: Object, required: true },
  timelineLoader: { type: Function, default: null },
  tagId: { type: String, default: "" },
});

/* ---------------------------------------------------------------- 情形与控件 */

const scenarioId = ref(props.calc?.scenarios?.[0]?.id ?? "default");
const metric = ref(props.calc?.metric === "hits" ? "hits" : "damage");
const view = ref("cumulative"); // cumulative | single

const scenario = computed(() => {
  const list = props.calc?.scenarios || [];
  return list.find((s) => s.id === scenarioId.value) || list[0] || null;
});
const steps = computed(() => scenario.value?.steps || []);
const hasTimeline = computed(() => Boolean(props.calc?.timeline));

// 情形名：时间轴优先（同一情形两边同名），无图条目回退 calc.scenarioNames 里的 name，最后才用 id
function scenarioName(s) {
  return timeline.value?.scenarios?.find((x) => x.id === s.id)?.name || s.name || s.id;
}

// 分节：同一 section 的连续步骤归为一组，渲染为小标题 + 组内序号
const sections = computed(() => {
  const out = [];
  for (const st of steps.value) {
    const name = st.section || "";
    const last = out[out.length - 1];
    if (last && last.name === name) last.items.push(st);
    else out.push({ name, items: [st] });
  }
  return out;
});

watch(
  () => props.calc,
  () => {
    scenarioId.value = props.calc?.scenarios?.[0]?.id ?? "default";
    metric.value = props.calc?.metric === "hits" ? "hits" : "damage";
  }
);

/* ---------------------------------------------------------------- 时间轴惰性加载 */

const timelines = shallowRef(null);
const timelineError = ref("");

async function loadTimeline() {
  if (!hasTimeline.value || !props.timelineLoader) return;
  try {
    timelines.value = await props.timelineLoader();
  } catch (e) {
    timelineError.value = String((e && e.message) || e);
  }
}

const timeline = computed(() => (hasTimeline.value && timelines.value ? timelines.value[props.calc.timeline] || null : null));
const timelineScenario = computed(() => {
  const tl = timeline.value;
  if (!tl) return null;
  const list = tl.scenarios || [];
  // 情形 id 与 calc.scenarios 对齐；时间轴缺该情形时不画图
  return list.find((s) => s.id === scenarioId.value) || null;
});

/* ---------------------------------------------------------------- 图表 */

const chartEl = ref(null);
let chart = null;
let themeObserver = null;

// 图例配色：**按伤害类型取色**，不按图例出现顺序。
// 同一张图上同一种伤害类型出现多次时（逻各斯两条凋亡、荒芜拉普兰德三条法术……），
// 第 2/3 个取同色相的变体档位并用虚线区分——跨干员仍然是「物理=橙、法术=紫」。
// 色值经 dataviz 校验器逐图校验（色觉模拟 ΔE ≥ 8、正常视觉 ΔE ≥ 15、对底对比度 ≥ 3:1）。
const ROLE_COLORS = {
  light: {
    physical: ["#e0701a", "#f5b07a"],
    art: ["#7c3aed", "#b596f7", "#4c1d95"],
    true: ["#b0248f"],
    weakpoint: ["#a07622"],
    element: ["#10938a"],
    apoptosis: ["#8a8a8a", "#c4c4c4"],
    burn: ["#b3202e", "#e88a90"],
    erosion: ["#1f6fd0"],
    neural: ["#0f9ba0"],
  },
  dark: {
    physical: ["#cf7a35", "#f8dcc4"],
    art: ["#a78bfa", "#dcd0fe", "#6d4fd0"],
    true: ["#e0579f"],
    weakpoint: ["#c9a94a"],
    element: ["#40c9b8"],
    apoptosis: ["#c0c0c0", "#5e5e5e"],
    burn: ["#d4564a", "#f0988f"],
    erosion: ["#5a9ce8"],
    neural: ["#45b8bd"],
  },
};

// 旧副本没有 colorRole 时的兜底：按 damageType 近似映射
const DAMAGE_TYPE_FALLBACK = {
  physical: "physical",
  art: "art",
  true: "true",
  element: "element",
  fixed: "art",
};

function roleOf(series) {
  return series.colorRole || DAMAGE_TYPE_FALLBACK[series.damageType] || "art";
}

function themeColors() {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return {
    dark,
    text: dark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.72)",
    subText: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
    axis: dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)",
    tooltipBg: dark ? "rgba(30,30,34,0.96)" : "rgba(255,255,255,0.98)",
    tooltipBorder: dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)",
  };
}

// group → { points: [[frame, value]], desc, role, tier, keys }
function buildSeries(sc) {
  const metricKey = metric.value; // damage | hits
  const groups = new Map();
  const usedByRole = new Map(); // role → 已分配的图例数（决定取第几档色）
  for (const s of sc.series || []) {
    const g = s.group || s.label || s.key;
    if (!groups.has(g)) {
      const role = roleOf(s);
      const tier = usedByRole.get(role) || 0;
      usedByRole.set(role, tier + 1);
      groups.set(g, { group: g, desc: s.groupDesc || g, role, tier, keys: [], points: [] });
    }
    const slot = groups.get(g);
    slot.keys.push({ key: s.key, label: s.label, damageType: s.damageType });
    for (const ev of s.events || []) {
      const frame = ev[0];
      const value = metricKey === "hits" ? ev[2] ?? 1 : ev[1];
      slot.points.push([frame, value]);
    }
  }
  // 同帧事件合并；按帧排序
  const out = [];
  for (const slot of groups.values()) {
    const merged = new Map();
    for (const [f, v] of slot.points) merged.set(f, (merged.get(f) || 0) + v);
    slot.points = [...merged.entries()].sort((a, b) => a[0] - b[0]);
    out.push(slot);
  }
  return out;
}

function toCumulative(points) {
  let acc = 0;
  return points.map(([f, v]) => {
    acc += v;
    return [f, acc];
  });
}

function chartOption(sc) {
  const c = themeColors();
  const fps = timeline.value?.fps || 30;
  const groups = buildSeries(sc);
  const cumulative = view.value === "cumulative";
  const dense = groups.reduce((n, g) => n + g.points.length, 0) > 40;

  const table = c.dark ? ROLE_COLORS.dark : ROLE_COLORS.light;
  const series = groups.map((g) => {
    const pts = cumulative ? toCumulative(g.points) : g.points;
    // 同一伤害类型的第 2/3 个图例取同色相变体，并以虚线区分
    const shades = table[g.role] || table.art;
    const color = shades[Math.min(g.tier, shades.length - 1)];
    const dashed = g.tier > 0;
    return {
      name: g.group,
      type: "line",
      // 累计视图：伤害是阶梯累加；单次视图直接连各事件点
      step: cumulative ? "end" : false,
      // 数据标记点：单次视图总是显示；累计视图在点稀疏时显示
      showSymbol: !cumulative || !dense,
      symbol: "circle",
      symbolSize: cumulative ? 4 : 6,
      lineStyle: { width: 2, color, type: dashed ? "dashed" : "solid" },
      itemStyle: { color },
      label: { show: false },
      data: pts,
      z: 3,
    };
  });

  return {
    animation: false,
    grid: { left: 56, right: 20, top: 46, bottom: 42 },
    legend: {
      type: "scroll",
      top: 4,
      left: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: c.text, fontSize: 11 },
      // 只列图例单位（group），散点标记系列不进图例
      data: groups.map((g) => g.group),
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.text, fontSize: 12 },
      formatter: (params) => {
        if (!params?.length) return "";
        const frame = params[0].value[0];
        const lines = [`第 ${frame} 帧（${(frame / fps).toFixed(2)} 秒）`];
        for (const p of params) {
          const slot = groups.find((g) => g.group === p.seriesName);
          const label = slot && slot.desc !== slot.group ? `${slot.group}（${slot.desc}）` : p.seriesName;
          lines.push(`${p.marker}${label}：${formatValue(p.value[1], metric.value)}`);
        }
        return lines.join("<br/>");
      },
    },
    xAxis: {
      type: "value",
      name: "帧",
      nameTextStyle: { color: c.subText, fontSize: 11 },
      min: 0,
      max: sc.durationFrames,
      axisLine: { lineStyle: { color: c.axis } },
      axisLabel: { color: c.subText, fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      // 轴含义由上方按钮承担（累计/单次 × 伤害/段数）；轴上不再写单位
      axisLine: { show: false },
      axisLabel: { color: c.subText, fontSize: 10 },
      splitLine: { lineStyle: { color: c.axis, type: "dashed" } },
    },
    series,
  };
}

function formatValue(v, m) {
  if (m === "hits") return `${Math.round(v * 100) / 100} 段`;
  return `${Math.round(v)} 点`;
}

function hasResult(st) {
  return st.result !== undefined && st.result !== null && st.result !== "";
}

function renderChart() {
  const sc = timelineScenario.value;
  if (!sc || typeof window === "undefined" || !window.echarts || !chartEl.value) return;
  if (!chart) {
    chart = window.echarts.init(chartEl.value);
    themeObserver = new MutationObserver(() => chart?.setOption(chartOption(sc), true));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
  chart.setOption(chartOption(sc), { notMerge: true });
  chart.resize();
}

watch([timelineScenario, metric, view], () => nextTick(renderChart));
watch(timeline, () => nextTick(renderChart));

let resizeObserver = null;

async function init() {
  await loadTimeline();
  await nextTick();
  if (timelineScenario.value && chartEl.value) {
    renderChart();
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => chart?.resize());
      resizeObserver.observe(chartEl.value);
    }
  }
}

init();

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = null;
});

const chartUnavailable = computed(() => hasTimeline.value && !timelineError.value && timelines.value !== null && !timeline.value);
</script>

<template>
  <div class="bcf-calc-detail">
    <div class="bcf-calc-head-row">
      <span class="bcf-calc-title">计算过程详情</span>
      <span v-if="calc.note" class="bcf-calc-note">{{ calc.note }}</span>
    </div>

    <div v-if="(calc.scenarios || []).length > 1" class="bcf-calc-subs">
      <button
        v-for="s in calc.scenarios"
        :key="s.id"
        type="button"
        class="bcf-calc-sub"
        :class="{ 'is-active': s.id === scenarioId }"
        @click="scenarioId = s.id"
      >
        {{ scenarioName(s) }}
      </button>
    </div>

    <template v-if="hasTimeline">
      <div class="bcf-calc-toolbar">
        <div class="bcf-calc-seg">
          <button type="button" :class="{ 'is-active': metric === 'damage' }" @click="metric = 'damage'">伤害</button>
          <button type="button" :class="{ 'is-active': metric === 'hits' }" @click="metric = 'hits'">攻击段数</button>
        </div>
        <div class="bcf-calc-seg">
          <button type="button" :class="{ 'is-active': view === 'cumulative' }" @click="view = 'cumulative'">
            {{ metric === "hits" ? "累计段数" : "累计伤害" }}
          </button>
          <button type="button" :class="{ 'is-active': view === 'single' }" @click="view = 'single'">
            {{ metric === "hits" ? "单次段数" : "单次伤害" }}
          </button>
        </div>
      </div>
      <div v-if="timelineError" class="bcf-calc-error">时间轴加载失败：{{ timelineError }}</div>
      <div v-else-if="chartUnavailable" class="bcf-calc-error">该情形暂无时间轴数据。</div>
      <div v-else ref="chartEl" class="bcf-calc-chart"></div>
    </template>

    <div class="bcf-calc-steps">
      <div v-for="(sec, si) in sections" :key="si" class="bcf-calc-section">
        <div v-if="sec.name" class="bcf-calc-section-head">{{ sec.name }}</div>
        <div v-for="(st, i) in sec.items" :key="i" class="bcf-calc-step">
          <div class="bcf-calc-step-head">
            <span class="bcf-calc-step-no">{{ i + 1 }}.</span>
            <span class="bcf-calc-step-title">{{ st.title || "" }}</span>
          </div>
          <div class="bcf-calc-step-body">
            <template v-if="st.expr">
              <code class="bcf-calc-expr">{{ st.expr }}</code>
              <span v-if="hasResult(st)" class="bcf-calc-result">
                ＝ {{ st.result }}<em v-if="st.unit">{{ st.unit }}</em>
              </span>
            </template>
            <span v-else-if="hasResult(st)" class="bcf-calc-value">
              {{ st.result }}<em v-if="st.unit">{{ st.unit }}</em>
            </span>
          </div>
          <div v-if="st.note" class="bcf-calc-step-note">{{ st.note }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bcf-calc-detail {
  margin: 8px 0 4px;
  padding: 8px 10px 10px;
  border-left: 3px solid rgb(var(--v-theme-primary));
  border-radius: 0;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 12.5px;
}

.bcf-calc-head-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.bcf-calc-title {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.bcf-calc-note {
  font-size: 11.5px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.bcf-calc-subs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 4px;
}

.bcf-calc-sub {
  padding: 2px 9px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.24);
  border-radius: 12px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 11.5px;
  cursor: pointer;
}

.bcf-calc-sub.is-active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
}

.bcf-calc-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0 4px;
  flex-wrap: wrap;
}

.bcf-calc-seg {
  display: inline-flex;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 6px;
  overflow: hidden;
}

.bcf-calc-seg button {
  padding: 3px 10px;
  border: 0;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 11.5px;
  cursor: pointer;
}

.bcf-calc-seg button.is-active {
  background: rgba(var(--v-theme-primary), 0.18);
  color: rgb(var(--v-theme-primary));
}

.bcf-calc-chart {
  width: 100%;
  height: 260px;
  min-height: 240px;
}

.bcf-calc-error {
  padding: 12px 0;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 12px;
}

.bcf-calc-steps {
  margin-top: 6px;
}

.bcf-calc-section + .bcf-calc-section {
  margin-top: 8px;
}

.bcf-calc-section-head {
  margin: 6px 0 2px;
  font-weight: 600;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.bcf-calc-step {
  padding: 2px 0 2px 12px;
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  margin-left: 4px;
}

.bcf-calc-step-head {
  display: flex;
  gap: 4px;
  align-items: baseline;
}

.bcf-calc-step-no {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 11px;
}

.bcf-calc-step-title {
  font-size: 12px;
}

.bcf-calc-step-body {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 1px;
}

.bcf-calc-expr {
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.bcf-calc-result {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

/* 无算式的步骤（给定值）：只显示数值，不加「＝」 */
.bcf-calc-value {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.bcf-calc-result em,
.bcf-calc-value em {
  margin-left: 2px;
  font-style: normal;
  font-weight: 400;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.bcf-calc-step-note {
  margin-top: 1px;
  font-size: 11.5px;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
