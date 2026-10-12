<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { ElNotification } from "element-plus";
import { htmlStringToVNode } from "@/utils/format.js";

/**
 * 玩家体感 TAG 评定标准抽屉
 * 数据：src/static/json/combat/player-tags-criteria.json（源项目 results/player-tags-criteria.json）
 * 结构：intro{text,items} ＋ tags[{id,name,intro,sections[{label,note?,items}],subs[{group,value,intro,sections}]}] ＋ terms[{name,text}]
 * 交互：顶部搜索框过滤条目；目标定位（从 tooltip 的「查看评定标准详情」进入）滚动并高亮；正文术语点击弹解释
 */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  data: { type: Object, default: null },
  // { tagId } 或 { tagId, group, value }；null＝从顶部浏览
  target: { type: Object, default: null },
});
const emit = defineEmits(["update:modelValue"]);

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const keyword = ref("");
const bodyEl = ref(null);
const highlight = ref("");

/* ---------------------------------------------------------------- 术语（点击弹窗） */

const TERMS = computed(() => (props.data?.terms || []).map((t) => t.name).filter(Boolean).sort((a, b) => b.length - a.length));
const TERM_MAP = computed(() => new Map((props.data?.terms || []).map((t) => [t.name, t.text])));
const TERM_REGEX = computed(() => {
  if (!TERMS.value.length) return null;
  const escaped = TERMS.value.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(escaped.join("|"), "g");
});

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

function escapeHtml(text) {
  return String(text == null ? "" : text).replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);
}

// 正文 → 术语包上可点击 span（最长优先匹配；渲染用 v-html）
function termify(text) {
  const escaped = escapeHtml(text);
  if (!TERM_REGEX.value) return escaped;
  return escaped.replace(TERM_REGEX.value, (m) => `<span class="bcd-term" data-criteria-term="${m}">${m}</span>`);
}

function onBodyClick(event) {
  const el = event.target?.closest?.("[data-criteria-term]");
  if (!el) return;
  const name = el.getAttribute("data-criteria-term");
  const text = TERM_MAP.value.get(name);
  if (!text) return;
  // 内联样式：ElNotification 挂在 body 下，拿不到本组件的 scoped 样式
  ElNotification({
    title: name,
    message: htmlStringToVNode(`<div style="line-height:1.7;">${escapeHtml(text)}</div>`),
    duration: 7000,
  });
}

/* ---------------------------------------------------------------- 锚点与定位 */

function tagAnchor(tagId) {
  return "bcd-" + tagId;
}

function subAnchor(tagId, index) {
  return "bcd-" + tagId + "-s" + index;
}

function anchorForTarget() {
  const t = props.target;
  if (!t?.tagId) return "";
  if (t.group != null) {
    const tag = (props.data?.tags || []).find((x) => x.id === t.tagId);
    const idx = (tag?.subs || []).findIndex((s) => s.group === t.group && s.value === t.value);
    return idx >= 0 ? subAnchor(t.tagId, idx) : tagAnchor(t.tagId);
  }
  return tagAnchor(t.tagId);
}

function flash(anchor) {
  highlight.value = anchor;
  window.setTimeout(() => {
    if (highlight.value === anchor) highlight.value = "";
  }, 2200);
}

function scrollToAnchor(anchor, attempt = 0) {
  if (!anchor) return;
  nextTick(() => {
    const root = bodyEl.value;
    const el = root?.querySelector?.("#" + anchor);
    if (el) {
      el.scrollIntoView({ block: "start" });
      flash(anchor);
    } else if (attempt < 3) {
      window.setTimeout(() => scrollToAnchor(anchor, attempt + 1), 150);
    }
  });
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    keyword.value = "";
    const anchor = anchorForTarget();
    if (anchor) scrollToAnchor(anchor);
    else nextTick(() => bodyEl.value?.scrollTo?.({ top: 0 }));
  }
);

watch(
  () => props.target,
  () => {
    if (props.modelValue && props.target) {
      keyword.value = "";
      scrollToAnchor(anchorForTarget());
    }
  }
);

/* ---------------------------------------------------------------- 检索 */

function flatten(items) {
  return (items || []).flatMap((it) => (typeof it === "string" ? [it] : [it.text, ...(it.items || [])]));
}

function sectionsText(sections) {
  return (sections || []).flatMap((s) => [s.label, s.note || "", ...flatten(s.items)]).join(" ");
}

const INDEX = computed(() => {
  const list = [];
  for (const t of props.data?.tags || []) {
    list.push({ type: "tag", tagId: t.id, index: -1, name: t.name, text: [t.intro, sectionsText(t.sections)].join(" ") });
    (t.subs || []).forEach((s, i) => {
      list.push({ type: "sub", tagId: t.id, index: i, name: s.value, text: [s.intro, sectionsText(s.sections)].join(" ") });
    });
  }
  return list;
});

const results = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return null;
  return INDEX.value.filter((e) => e.name.toLowerCase().includes(q) || e.text.toLowerCase().includes(q));
});

function jumpTo(entry) {
  keyword.value = "";
  const anchor = entry.type === "tag" ? tagAnchor(entry.tagId) : subAnchor(entry.tagId, entry.index);
  scrollToAnchor(anchor);
}

/* 供父级（移动端固钉按钮）调用：回到抽屉顶部 */
function scrollBodyToTop() {
  bodyEl.value?.scrollTo({ top: 0, behavior: "smooth" });
}

defineExpose({ scrollBodyToTop });
</script>

<template>
  <el-drawer v-model="open" direction="rtl" size="640px" :with-header="false" modal-class="bcd-modal" append-to-body>
    <div class="bcd">
      <div class="bcd-head">
        <div class="bcd-head-top">
          <div class="bcd-title">玩家体感 TAG 评定标准</div>
          <button class="bcd-close" type="button" aria-label="关闭评定标准" @click="open = false">
            <v-icon icon="mdi-close" size="16" />
          </button>
        </div>
        <div class="bcd-tip">每条 TAG：先是一段通俗说明，然后是收录条件、不收录范围、计算方式与对照例子；正文里的术语可以点击查看解释。</div>
        <el-input v-model="keyword" class="bcd-search" size="default" clearable placeholder="搜索 TAG / 子 TAG / 正文…" />
      </div>

      <div ref="bodyEl" class="bcd-body" @click="onBodyClick">
        <template v-if="!data">
          <div class="bcd-empty">评定标准数据载入中…</div>
        </template>

        <template v-else-if="results === null">
          <div class="bcd-gintro">
            <p v-html="termify(data.intro?.text || '')"></p>
            <ul>
              <li v-for="(item, i) in data.intro?.items || []" :key="'gi' + i" v-html="termify(item)"></li>
            </ul>
          </div>

          <section v-for="t in data.tags || []" :key="t.id" :id="tagAnchor(t.id)" class="bcd-tag" :class="{ 'is-hl': highlight === tagAnchor(t.id) }">
            <h2>{{ t.name }}</h2>
            <p class="bcd-lead" v-html="termify(t.intro)"></p>
            <div v-for="(s, si) in t.sections || []" :key="'ts' + si" class="bcd-sec">
              <div class="bcd-label">{{ s.label }}<span v-if="s.note" class="bcd-note">{{ s.note }}</span></div>
              <ul class="bcd-items">
                <li v-for="(it, ii) in s.items || []" :key="'ti' + ii">
                  <template v-if="typeof it === 'string'" v-html="termify(it)"></template>
                  <template v-else>
                    <span v-html="termify(it.text)"></span>
                    <ul v-if="it.items && it.items.length">
                      <li v-for="(c, ci) in it.items" :key="'tic' + ci" v-html="termify(c)"></li>
                    </ul>
                  </template>
                </li>
              </ul>
            </div>

            <div
              v-for="(sub, idx) in t.subs || []"
              :id="subAnchor(t.id, idx)"
              :key="'sub' + idx"
              class="bcd-sub"
              :class="{ 'is-hl': highlight === subAnchor(t.id, idx) }"
            >
              <h3>{{ sub.value }}<span class="bcd-sub-group">（{{ sub.group }}）</span></h3>
              <p class="bcd-lead" v-html="termify(sub.intro)"></p>
              <div v-for="(s, si) in sub.sections || []" :key="'ss' + si" class="bcd-sec">
                <div class="bcd-label">{{ s.label }}<span v-if="s.note" class="bcd-note">{{ s.note }}</span></div>
                <ul class="bcd-items">
                  <li v-for="(it, ii) in s.items || []" :key="'si' + ii">
                    <template v-if="typeof it === 'string'" v-html="termify(it)"></template>
                    <template v-else>
                      <span v-html="termify(it.text)"></span>
                      <ul v-if="it.items && it.items.length">
                        <li v-for="(c, ci) in it.items" :key="'sic' + ci" v-html="termify(c)"></li>
                      </ul>
                    </template>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </template>

        <template v-else>
          <div v-if="!results.length" class="bcd-empty">没有找到匹配的条目</div>
          <template v-else>
            <button v-for="(r, ri) in results" :key="'r' + ri" type="button" class="bcd-hit" @click="jumpTo(r)">
              <span class="bcd-hit-name">{{ r.name }}</span>
              <span class="bcd-hit-meta">{{ r.type === "tag" ? "TAG" : "子 TAG" }}</span>
            </button>
          </template>
        </template>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.bcd {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--bcd-text);
  font-size: 13px;
  line-height: 1.75;
}

.bcd-head {
  flex: none;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--bcd-divider);
}

.bcd-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.bcd-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--bcd-text-2);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.bcd-close:hover {
  background: var(--bcd-hit-hover);
  color: var(--bcd-text);
}

.bcd-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--bcd-text);
}

.bcd-tip {
  margin-top: 4px;
  color: var(--bcd-text-2);
  font-size: 12px;
  line-height: 1.6;
}

.bcd-search {
  margin-top: 10px;
}

.bcd-search :deep(.el-input__wrapper) {
  background: var(--bcd-panel);
  box-shadow: 0 0 0 1px var(--bcd-border) inset;
}

.bcd-search :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--bcd-accent) inset;
}

.bcd-search :deep(.el-input__inner) {
  color: var(--bcd-text);
}

.bcd-search :deep(.el-input__inner::placeholder) {
  color: var(--bcd-text-2);
}

.bcd-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 10px 18px 28px;
  overscroll-behavior: contain;
}

.bcd-gintro {
  margin: 6px 0 14px;
  padding: 10px 12px;
  border: 1px dashed var(--bcd-border);
  border-radius: 8px;
  background: var(--bcd-panel);
  color: var(--bcd-text);
}

.bcd-gintro p {
  margin: 0 0 6px;
}

.bcd-gintro ul {
  margin: 0;
  padding-left: 18px;
}

.bcd-tag {
  padding: 8px 0 4px;
  border-top: 1px solid var(--bcd-divider);
  scroll-margin-top: 8px;
}

.bcd-tag h2 {
  margin: 8px 0 6px;
  font-size: 16px;
  color: var(--bcd-text);
}

.bcd-lead {
  margin: 0 0 8px;
  color: var(--bcd-text);
  opacity: 0.92;
}

.bcd-sec {
  margin: 8px 0;
}

.bcd-label {
  font-weight: 700;
  color: var(--bcd-accent);
}

.bcd-note {
  margin-left: 4px;
  font-weight: 400;
  color: var(--bcd-text-2);
  font-size: 12px;
}

.bcd-items {
  margin: 4px 0 0;
  padding-left: 18px;
}

.bcd-items li {
  margin: 2px 0;
}

.bcd-items li ul {
  margin: 2px 0;
  padding-left: 16px;
}

.bcd-sub {
  margin: 10px 0 4px;
  padding: 8px 10px 6px;
  border-left: 3px solid var(--bcd-sub-border);
  background: var(--bcd-sub-bg);
  border-radius: 0 8px 8px 0;
  scroll-margin-top: 8px;
}

.bcd-sub h3 {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--bcd-accent);
}

.bcd-sub-group {
  font-weight: 400;
  font-size: 12px;
  color: var(--bcd-text-2);
}

/* 术语样式与页面卡片一致：天蓝 + 下划线，点击弹解释 */
.bcd-term {
  color: #00bbff;
  text-decoration: underline;
  text-decoration-color: grey;
  cursor: pointer;
}

.bcd-hit {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 4px 0;
  padding: 8px 10px;
  background: var(--bcd-hit-bg);
  border: 1px solid var(--bcd-hit-border);
  border-radius: 8px;
  color: var(--bcd-text);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.bcd-hit:hover {
  background: var(--bcd-hit-hover);
  border-color: var(--bcd-sub-border);
}

.bcd-hit-meta {
  flex: none;
  margin-left: 8px;
  color: var(--bcd-text-2);
  font-size: 12px;
}

.bcd-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--bcd-text-2);
}

.is-hl {
  animation: bcd-flash 2.2s ease-out;
}

@keyframes bcd-flash {
  0%,
  60% {
    background: var(--bcd-flash);
  }
  100% {
    background: transparent;
  }
}
</style>

<style>
/* el-drawer 被 teleport 到 body 下，scoped 选择器够不到；用 modal-class 挂主题变量，
   跟随站点明暗主题（App.vue 的 setTheme 把 html 的 class 切成 dark／light，--c-* 变量在 v-app 上取不到） */
.bcd-modal .el-drawer {
  --bcd-bg: #ffffff;
  --bcd-panel: #f7f8fa;
  --bcd-text: #191919;
  --bcd-text-2: #6f6f6f;
  --bcd-border: rgba(0, 0, 0, 0.14);
  --bcd-divider: rgba(0, 0, 0, 0.08);
  --bcd-accent: #1867c0;
  --bcd-sub-bg: rgba(24, 103, 192, 0.05);
  --bcd-sub-border: rgba(24, 103, 192, 0.35);
  --bcd-hit-bg: #ffffff;
  --bcd-hit-border: rgba(0, 0, 0, 0.16);
  --bcd-hit-hover: rgba(24, 103, 192, 0.08);
  --bcd-flash: rgba(24, 103, 192, 0.14);
  background: var(--bcd-bg);
  color: var(--bcd-text);
}

html.dark .bcd-modal .el-drawer {
  --bcd-bg: #222222;
  --bcd-panel: #2c2c2c;
  --bcd-text: #e6e6e6;
  --bcd-text-2: #b8b8b8;
  --bcd-border: rgba(255, 255, 255, 0.16);
  --bcd-divider: rgba(255, 255, 255, 0.1);
  --bcd-accent: #8fc3ff;
  --bcd-sub-bg: rgba(255, 255, 255, 0.05);
  --bcd-sub-border: rgba(143, 195, 255, 0.45);
  --bcd-hit-bg: #2c2c2c;
  --bcd-hit-border: rgba(255, 255, 255, 0.16);
  --bcd-hit-hover: rgba(143, 195, 255, 0.12);
  --bcd-flash: rgba(143, 195, 255, 0.18);
}

@media (max-width: 700px) {
  .bcd-modal .el-drawer {
    width: 100% !important;
  }
}
</style>
