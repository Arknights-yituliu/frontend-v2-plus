<script setup>
import "/src/assets/css/survey/rank.v3.scss";
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {match} from "pinyin-pro";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import operatorProgressionStatisticsDataCache from "/src/plugins/indexedDB/operatorProgressionStatisticsData.js";
import {dateFormat} from "/src/utils/dateUtil.js";

const route = useRoute();
const router = useRouter();

/* ---------------- 常量 ---------------- */

const PROFESSIONS = [
  {value: "PIONEER", label: "先锋"},
  {value: "WARRIOR", label: "近卫"},
  {value: "TANK", label: "重装"},
  {value: "SNIPER", label: "狙击"},
  {value: "CASTER", label: "术师"},
  {value: "MEDIC", label: "医疗"},
  {value: "SUPPORT", label: "辅助"},
  {value: "SPECIAL", label: "特种"}
];

const RARITIES = [6, 5, 4, 3, 2, 1];

const OBTAIN_OPTIONS = ["常驻干员", "赠送干员", "限定干员"];

const MOD_TYPES = ["X", "Y", "D", "A", "B"];

const METRICS = [
  {key: "ownRate", label: "持有率"},
  {key: "eliteRank2", label: "精二率"},
  {key: "skillAvg", label: "专三率"},
  {key: "modAvg", label: "模组满级率"}
];

const PAGE_SIZE = 20;
const RANK_PAGE_SIZE = 10;

/* ---------------- 状态 ---------------- */

const rawList = ref([]);
const loading = ref(true);
const loadError = ref("");
const updateTimeText = ref("");

const keyword = ref("");
const profession = ref("");
const rarity = ref(6);
const year = ref("");
const obtain = ref("");
const modFilter = ref("");

const view = ref("table");
const sortKey = ref("ownRate");
const sortOrder = ref("desc");
const metric = ref("ownRate");
const pageSize = ref(PAGE_SIZE);
const rankLimit = ref(RANK_PAGE_SIZE);

const drawerOpen = ref(false);
const activeOperator = ref(null);
const shareCopied = ref(false);

const notesOpen = ref(false);

function toggleNotes() {
  notesOpen.value = !notesOpen.value;
}

/* ---------------- 数据处理 ---------------- */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pct(value) {
  return num(value).toFixed(1);
}

function modValue(op, type) {
  const has = (op.equip || []).some(item => String(item.typeName2 || "").toUpperCase() === type);
  if (!has) {
    return null;
  }
  const value = op[`mod${type}Rank3`];
  return value === undefined || value === null || value === "" ? null : num(value);
}

function skillValue(op, index) {
  return num(op[`skill${index}Rank3`]);
}

function skillCount(op) {
  return Math.min(3, (op.skills || []).length);
}

function skillAvg(op) {
  const count = skillCount(op);
  if (!count) {
    return 0;
  }
  let total = 0;
  for (let i = 1; i <= count; i++) {
    total += skillValue(op, i);
  }
  return total / count;
}

function modAvg(op) {
  const values = MOD_TYPES.map(type => modValue(op, type)).filter(v => v !== null);
  if (!values.length) {
    return 0;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function metricValue(op, key) {
  switch (key) {
    case "ownRate":
      return num(op.ownRate);
    case "eliteRank2":
      return num(op.eliteRank2);
    case "skillAvg":
      return skillAvg(op);
    case "modAvg":
      return modAvg(op);
    default:
      // 单个技能 skill1/skill2/skill3，或单个模组 modX/modY/modD/modA/modB
      if (/^skill[1-3]$/.test(key)) {
        return skillValue(op, Number(key.slice(5)));
      }
      if (/^mod[A-Z]$/.test(key)) {
        const v = modValue(op, key.slice(3));
        return v === null ? 0 : v;
      }
      return 0;
  }
}

const sampleSize = computed(() => {
  let max = 0;
  for (const op of rawList.value) {
    max = Math.max(max, num(op.sampleSize));
  }
  return max;
});

const sampleSizeText = computed(() => sampleSize.value.toLocaleString("zh-CN"));

const years = computed(() => {
  const set = new Set();
  for (const op of rawList.value) {
    const stamp = num(op.date);
    if (stamp > 0) {
      set.add(new Date(stamp).getFullYear());
    }
  }
  return [...set].sort((a, b) => a - b);
});

const professionMap = computed(() => {
  const map = {};
  for (const item of PROFESSIONS) {
    map[item.value] = item.label;
  }
  return map;
});

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return rawList.value.filter(op => {
    if (kw) {
      const name = String(op.name || "").toLowerCase();
      const id = String(op.charId || "").toLowerCase();
      if (!name.includes(kw) && !id.includes(kw) && !match(op.name || "", keyword.value.trim())) {
        return false;
      }
    }
    if (profession.value && op.profession !== profession.value) {
      return false;
    }
    if (rarity.value !== "" && Number(op.rarity) !== Number(rarity.value)) {
      return false;
    }
    if (year.value !== "" && new Date(num(op.date)).getFullYear() !== Number(year.value)) {
      return false;
    }
    if (obtain.value && op.itemObtainApproach !== obtain.value) {
      return false;
    }
    if (modFilter.value) {
      const hasBranch = (op.equip || []).some(item => String(item.typeName2 || "").toUpperCase() === modFilter.value);
      if (!hasBranch) {
        return false;
      }
    }
    return true;
  });
});

const activeKey = computed(() => (view.value === "rank" ? metric.value : sortKey.value));
const activeOrder = computed(() => (view.value === "rank" ? "desc" : sortOrder.value));

const sortedList = computed(() => {
  const key = activeKey.value;
  const direction = activeOrder.value === "asc" ? 1 : -1;
  return [...filtered.value].sort((a, b) => {
    const diff = metricValue(a, key) - metricValue(b, key);
    if (diff !== 0) {
      return diff * direction;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN");
  });
});

const visibleRows = computed(() => sortedList.value.slice(0, pageSize.value));

const rankRows = computed(() => sortedList.value.slice(0, rankLimit.value));

const sortLabel = computed(() => {
  const key = sortKey.value;
  if (/^skill[1-3]$/.test(key)) {
    return `技能${["一", "二", "三"][Number(key.slice(5)) - 1]}专三率`;
  }
  if (/^mod[A-Z]$/.test(key)) {
    return `${key.slice(3)} 模组满级率`;
  }
  const item = METRICS.find(m => m.key === key);
  return item ? item.label : "持有率";
});

const activeMetricLabel = computed(() => {
  const item = METRICS.find(m => m.key === activeKey.value);
  return item ? item.label : "持有率";
});

const activeChips = computed(() => {
  const chips = [];
  if (year.value !== "") {
    chips.push({key: "year", label: `${year.value} 年实装`, clear: () => (year.value = "")});
  }
  if (obtain.value) {
    chips.push({key: "obtain", label: obtain.value, clear: () => (obtain.value = "")});
  }
  if (modFilter.value) {
    chips.push({
      key: "mod",
      label: `${modFilter.value} 模组`,
      clear: () => (modFilter.value = "")
    });
  }
  if (profession.value) {
    chips.push({
      key: "profession",
      label: professionMap.value[profession.value],
      clear: () => (profession.value = "")
    });
  }
  if (rarity.value !== "") {
    chips.push({key: "rarity", label: `${rarity.value} 星`, clear: () => (rarity.value = "")});
  }
  return chips;
});

/* ---------------- 详情抽屉 ---------------- */

const detailSkills = computed(() => {
  const op = activeOperator.value;
  if (!op) {
    return [];
  }
  const list = [];
  for (let i = 1; i <= skillCount(op); i++) {
    const info = (op.skills || [])[i - 1] || {};
    const ranks = op[`skill${i}`] || {};
    list.push({
      index: i,
      name: info.skillName || `技能${i}`,
      rank1: num(ranks.rank1) * 100,
      rank2: num(ranks.rank2) * 100,
      rank3: num(ranks.rank3) * 100
    });
  }
  return list;
});

const detailMods = computed(() => {
  const op = activeOperator.value;
  if (!op) {
    return [];
  }
  return (op.equip || [])
      .map(item => {
        const type = String(item.typeName2 || "").toUpperCase();
        const ranks = op[`mod${type}`] || {};
        return {
          type,
          name: item.uniEquipName || `${type} 模组`,
          rank1: num(ranks.rank1) * 100,
          rank2: num(ranks.rank2) * 100,
          rank3: num(ranks.rank3) * 100
        };
      })
      .filter(item => item.rank1 > 0 || item.rank2 > 0 || item.rank3 > 0);
});

const detailRank = computed(() => {
  const op = activeOperator.value;
  if (!op) {
    return null;
  }
  const peers = rawList.value.filter(item => item.rarity === op.rarity && item.profession === op.profession);
  const ordered = [...peers].sort((a, b) => metricValue(b, activeKey.value) - metricValue(a, activeKey.value));
  const index = ordered.findIndex(item => item.charId === op.charId);
  return {
    index: index >= 0 ? index + 1 : null,
    total: peers.length
  };
});

const detailInsight = computed(() => {
  const op = activeOperator.value;
  if (!op) {
    return "";
  }
  const skills = detailSkills.value;
  if (!skills.length) {
    return `精二率 ${pct(op.eliteRank2)}%，样本内 ${num(op.own).toLocaleString("zh-CN")} 人拥有该干员。`;
  }
  const top = [...skills].sort((a, b) => b.rank3 - a.rank3)[0];
  return `精二率 ${pct(op.eliteRank2)}%，${top.name} 的专三率最高（${pct(top.rank3)}%），是当前主流练法。`;
});

const detailMeta = computed(() => {
  const op = activeOperator.value;
  if (!op) {
    return "";
  }
  const parts = [
    professionMap.value[op.profession] || op.profession,
    `${op.rarity} 星`
  ];
  const stamp = num(op.date);
  if (stamp > 0) {
    parts.push(`${dateFormat(stamp, "yyyy-MM-dd")} 实装`);
  }
  if (op.itemObtainApproach) {
    parts.push(op.itemObtainApproach);
  }
  return parts.filter(Boolean).join(" · ");
});

const detailOwnSub = computed(() => {
  const op = activeOperator.value;
  if (!op) {
    return "";
  }
  const sample = num(op.sampleSize);
  if (!sample) {
    return "";
  }
  return `${num(op.own).toLocaleString("zh-CN")} / ${sample.toLocaleString("zh-CN")} 位玩家拥有`;
});

const detailEliteSub = computed(() => {
  const op = activeOperator.value;
  if (!op) {
    return "";
  }
  const own = num(op.own);
  if (!own) {
    return "";
  }
  const count = Math.round((num(op.eliteRank2) / 100) * own);
  return `其中 ${count.toLocaleString("zh-CN")} 人已精二`;
});

/* ---------------- 行为 ---------------- */

function toggleSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
  } else {
    sortKey.value = key;
    sortOrder.value = "desc";
  }
  pageSize.value = PAGE_SIZE;
}

function resetFilters() {
  keyword.value = "";
  profession.value = "";
  rarity.value = "";
  year.value = "";
  obtain.value = "";
  modFilter.value = "";
  pageSize.value = PAGE_SIZE;
  rankLimit.value = RANK_PAGE_SIZE;
}

watch([keyword, profession, rarity, year, obtain, modFilter], () => {
  pageSize.value = PAGE_SIZE;
  rankLimit.value = RANK_PAGE_SIZE;
});

function openDetail(op) {
  activeOperator.value = op;
  drawerOpen.value = true;
}

function closeDetail() {
  drawerOpen.value = false;
}

function gotoMyOperators() {
  closeDetail();
  router.push("/survey/operators");
}

async function copyShareLink() {
  const op = activeOperator.value;
  if (!op) {
    return;
  }
  const path = router.resolve({query: {char: op.charId}}).href;
  const url = `${window.location.origin}${path}`;
  try {
    await navigator.clipboard.writeText(url);
    shareCopied.value = true;
    window.setTimeout(() => (shareCopied.value = false), 1600);
  } catch (e) {
    shareCopied.value = false;
  }
}

function onKeydown(event) {
  if (event.key === "Escape" && drawerOpen.value) {
    closeDetail();
  }
}

async function loadData() {
  loading.value = true;
  loadError.value = "";
  try {
    const data = await operatorProgressionStatisticsDataCache.getData();
    const list = (data && data.result) || [];
    rawList.value = list;
    const sharedOperator = list.find(op => op.charId === route.query.char);
    if (sharedOperator) {
      openDetail(sharedOperator);
    }
    const stamp = num(data && data.createTime);
    updateTimeText.value = stamp > 0 ? dateFormat(stamp, "MM-dd HH:mm") : "";
  } catch (e) {
    rawList.value = [];
    loadError.value = "数据加载失败，请检查网络后重试。";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="op-rank-page">
    <header class="op-head">
      <div>
        <div class="op-head__crumb">干员数据 / 干员大数据</div>
        <h1 class="op-head__title">干员大数据</h1>
        <p class="op-head__desc">
          基于 {{ sampleSizeText }} 位玩家上传的练度快照，统计干员的持有率、精二率、技能专三率与模组满级率。
        </p>
      </div>

      <div class="op-meta">
        <div class="op-meta__item">
          <span class="op-meta__label">样本量</span>
          <span class="op-meta__value">
            <b class="op-meta__num">{{ sampleSizeText }}</b>
            <span class="op-meta__unit">位玩家</span>
          </span>
        </div>
        <span class="op-meta__sep"></span>
        <div class="op-meta__item">
          <span class="op-meta__label">覆盖干员</span>
          <span class="op-meta__value">
            <b class="op-meta__num">{{ rawList.length }}</b>
            <span class="op-meta__unit">位干员</span>
          </span>
        </div>
        <template v-if="updateTimeText">
          <span class="op-meta__sep"></span>
          <div class="op-meta__item">
            <span class="op-meta__label">数据更新</span>
            <span class="op-meta__value">
              <i class="op-meta__dot"></i>
              <b class="op-meta__num">{{ updateTimeText }}</b>
            </span>
          </div>
        </template>
      </div>
    </header>

    <!-- 筛选 -->
    <section class="op-card op-filter">
      <div class="op-filter__row">
        <label class="op-search">
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="5.4" stroke="currentColor" stroke-width="1.6" opacity="0.55"/>
            <path d="M12.1 12.1L16 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
                  opacity="0.55"/>
          </svg>
          <input v-model="keyword" type="search" placeholder="搜索干员名称 / 拼音" aria-label="搜索干员"/>
        </label>

        <button class="op-reset" type="button" @click="resetFilters">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 2.6-6.4M3 4v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round"/>
          </svg>
          重置筛选
        </button>
      </div>

      <div class="op-seg-row">
        <span class="op-seg-label">年份</span>
        <div class="op-seg">
          <button class="op-seg__item" :class="{'is-active': year === ''}" type="button" @click="year = ''">
            全部
          </button>
          <button v-for="item in years" :key="item" class="op-seg__item"
                  :class="{'is-active': Number(year) === item}" type="button"
                  @click="year = Number(year) === item ? '' : item">
            {{ item }} 年
          </button>
        </div>
      </div>

      <div class="op-seg-row">
        <span class="op-seg-label">获得</span>
        <div class="op-seg">
          <button class="op-seg__item" :class="{'is-active': obtain === ''}" type="button" @click="obtain = ''">
            全部
          </button>
          <button v-for="item in OBTAIN_OPTIONS" :key="item" class="op-seg__item"
                  :class="{'is-active': obtain === item}" type="button"
                  @click="obtain = obtain === item ? '' : item">
            {{ item }}
          </button>
        </div>
      </div>

      <div class="op-seg-row">
        <span class="op-seg-label">职业</span>
        <div class="op-seg">
          <button class="op-seg__item" :class="{'is-active': profession === ''}" type="button"
                  @click="profession = ''">全部
          </button>
          <button v-for="item in PROFESSIONS" :key="item.value" class="op-seg__item"
                  :class="{'is-active': profession === item.value}" type="button"
                  @click="profession = profession === item.value ? '' : item.value">
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="op-seg-row">
        <span class="op-seg-label">星级</span>
        <div class="op-seg">
          <button class="op-seg__item" :class="{'is-active': rarity === ''}" type="button" @click="rarity = ''">
            全部
          </button>
          <button v-for="item in RARITIES" :key="item" class="op-seg__item"
                  :class="{'is-active--soft': Number(rarity) === item}" type="button"
                  @click="rarity = Number(rarity) === item ? '' : item">
            {{ item }} 星
          </button>
        </div>
      </div>

      <div class="op-seg-row">
        <span class="op-seg-label">模组</span>
        <div class="op-seg">
          <button class="op-seg__item" :class="{'is-active': modFilter === ''}" type="button"
                  @click="modFilter = ''">
            全部
          </button>
          <button v-for="item in MOD_TYPES" :key="item" class="op-seg__item"
                  :class="{'is-active--soft': modFilter === item}" type="button"
                  @click="modFilter = modFilter === item ? '' : item">
            {{ item }} 模组
          </button>
        </div>
      </div>

      <div class="op-divider-h"></div>

      <div class="op-chips">
        <div class="op-chips__list">
          <button v-for="chip in activeChips" :key="chip.key" class="op-chip" type="button" @click="chip.clear()">
            {{ chip.label }}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
          <button v-if="activeChips.length" class="op-reset" type="button" @click="resetFilters">清除全部</button>
        </div>
        <span class="op-chips__count">命中 {{ filtered.length }} 位干员 · 全库 {{ rawList.length }} 位</span>
      </div>

      <div class="op-divider-h"></div>

      <div class="op-notes">
        <button class="op-notes__toggle" type="button" :aria-expanded="notesOpen" @click="toggleNotes">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>
            <path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <span>这些数字怎么算</span>
          <svg class="op-notes__chev" width="12" height="12" viewBox="0 0 12 12" fill="none"
               :class="{'is-open': notesOpen}" aria-hidden="true">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                  stroke-linejoin="round"/>
          </svg>
        </button>
        <div v-show="notesOpen" class="op-notes__body">
          <p class="op-notes__item">持有率 = 拥有该干员的玩家数 ÷ 有效样本量。</p>
          <p class="op-notes__item">专三率只统计已拥有该干员的玩家，因此与持有率不可直接相加比较。</p>
          <p class="op-notes__item">模组满级率按 3 级开启计算；未实装模组显示为短横线。</p>
        </div>
      </div>
    </section>

    <!-- 表格视图 -->
    <section v-if="view === 'table'" class="op-card">
      <div class="op-toolbar">
        <div class="op-toolbar__left">
          <span class="op-toolbar__title">干员练度总览</span>
          <span class="op-toolbar__hint">
            按{{ sortLabel }}{{ sortOrder === 'desc' ? '降序' : '升序' }} · 单位 %
          </span>
        </div>
        <div class="op-switch">
          <button class="op-switch__item is-active" type="button">表格</button>
          <button class="op-switch__item" type="button" @click="view = 'rank'">排行</button>
        </div>
      </div>

      <div class="op-table">
        <div class="op-thead">
          <div class="c-op"><span class="op-th">干员</span></div>
          <div class="c-own">
            <button class="op-th" :class="{'is-sorted': sortKey === 'ownRate'}" type="button"
                    @click="toggleSort('ownRate')">
              持有率
              <svg v-if="sortKey === 'ownRate'" width="10" height="10" viewBox="0 0 10 10" fill="none"
                   :style="{transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none'}" aria-hidden="true">
                <path d="M5 1.5V8M5 8L2.2 5.2M5 8L7.8 5.2" stroke="currentColor" stroke-width="1.4"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="c-elite">
            <button class="op-th" :class="{'is-sorted': sortKey === 'eliteRank2'}" type="button"
                    @click="toggleSort('eliteRank2')">
              精二率
              <svg v-if="sortKey === 'eliteRank2'" width="10" height="10" viewBox="0 0 10 10" fill="none"
                   :style="{transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none'}" aria-hidden="true">
                <path d="M5 1.5V8M5 8L2.2 5.2M5 8L7.8 5.2" stroke="currentColor" stroke-width="1.4"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="c-skill">
            <div class="op-th-group">
              <span class="op-th-group__label">技能专三率</span>
              <div class="op-th-group__items">
                <button v-for="i in 3" :key="i" class="op-th op-th--sub"
                        :class="{'is-sorted': sortKey === 'skill' + i}" type="button"
                        @click="toggleSort('skill' + i)">
                  S{{ i }}
                  <svg v-if="sortKey === 'skill' + i" width="10" height="10" viewBox="0 0 10 10" fill="none"
                       :style="{transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none'}" aria-hidden="true">
                    <path d="M5 1.5V8M5 8L2.2 5.2M5 8L7.8 5.2" stroke="currentColor" stroke-width="1.4"
                          stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="c-mod">
            <div class="op-th-group">
              <span class="op-th-group__label">模组满级率</span>
              <div class="op-th-group__items">
                <button v-for="type in MOD_TYPES" :key="type" class="op-th op-th--sub"
                        :class="{'is-sorted': sortKey === 'mod' + type}" type="button"
                        @click="toggleSort('mod' + type)">
                  {{ type }}
                  <svg v-if="sortKey === 'mod' + type" width="10" height="10" viewBox="0 0 10 10" fill="none"
                       :style="{transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none'}" aria-hidden="true">
                    <path d="M5 1.5V8M5 8L2.2 5.2M5 8L7.8 5.2" stroke="currentColor" stroke-width="1.4"
                          stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="c-act"></div>
        </div>

        <template v-if="loading">
          <div v-for="n in 6" :key="n" class="op-skeleton-row">
            <div class="op-sk" style="width:36px;height:36px;border-radius:8px"></div>
            <div class="op-sk" style="width:88px"></div>
            <div class="op-sk" style="width:120px;margin-left:auto"></div>
            <div class="op-sk" style="width:100px"></div>
          </div>
        </template>

        <div v-else-if="loadError" class="op-state">
          <div class="op-state__title">数据加载失败</div>
          <div>{{ loadError }}</div>
          <button class="op-state__btn" type="button" @click="loadData">重试</button>
        </div>

        <div v-else-if="!visibleRows.length" class="op-state">
          <div class="op-state__title">没有符合条件的干员</div>
          <div>把筛选条件放宽一点，或者清空后重新筛选。</div>
          <button class="op-state__btn" type="button" @click="resetFilters">清除全部筛选</button>
        </div>

        <template v-else>
          <div v-for="op in visibleRows" :key="op.charId" class="op-row" role="button" tabindex="0"
               @click="openDetail(op)" @keydown.enter="openDetail(op)" @keydown.space.prevent="openDetail(op)">
            <div class="c-op">
              <div class="op-identity">
                <div class="op-avatar">
                  <OperatorAvatar :char-id="op.charId" :rarity="Number(op.rarity)" :size="36" :mobile-size="32"/>
                </div>
                <div>
                  <div class="op-identity__name">{{ op.name }}</div>
                  <div class="op-identity__meta">
                    {{ professionMap[op.profession] || op.profession }} · {{ op.rarity }} 星{{
                      op.itemObtainApproach === '限定干员' ? ' · 限定' : ''
                    }}
                  </div>
                </div>
              </div>
            </div>

            <div class="c-own">
              <span class="op-value">{{ pct(op.ownRate) }}%</span>
            </div>

            <div class="c-elite">
              <div class="op-bar-cell">
                <div class="op-bar op-bar--short">
                  <div class="op-bar__fill"
                       :style="{width: Math.min(100, num(op.eliteRank2)) + '%'}"></div>
                </div>
                <span class="op-value">{{ pct(op.eliteRank2) }}%</span>
              </div>
            </div>

            <div v-show="op.rarity > 3" class="c-skill">
              <div class="op-skills">
                <div v-for="i in skillCount(op)" :key="i" class="op-skill">
                  <div class="op-skill__head">
                    <span class="op-skill__idx">S{{ i }}</span>
                    <span class="op-skill__sep">·</span>
                    <span class="op-skill__val">{{ pct(skillValue(op, i)) }}%</span>
                  </div>
                  <div class="op-skill__track">
                    <div class="op-skill__fill" :style="{width: Math.min(100, skillValue(op, i)) + '%'}"></div>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="op.rarity > 3" class="c-mod">
              <div class="op-mods">
                <span v-for="type in MOD_TYPES" :key="type" class="op-mod"
                      :class="{'op-mod--off': modValue(op, type) === null}">
                  <span class="op-mod__k">{{ type }}</span>
                  <span class="op-mod__v">{{ modValue(op, type) === null ? '—' : `${Math.round(modValue(op, type))}%` }}</span>
                </span>
              </div>
            </div>

            <div class="c-act">
              <svg class="op-chev" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
                      stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </template>
      </div>

      <div v-if="!loading && !loadError && filtered.length" class="op-footer">
        <span>
          显示 {{ visibleRows.length }} / {{ filtered.length }} 位干员 · 已按{{ sortLabel }}{{
            sortOrder === 'desc' ? '降序' : '升序'
          }}
        </span>
        <button v-if="visibleRows.length < filtered.length" class="op-footer__btn" type="button"
                @click="pageSize = filtered.length">
          加载全部 {{ filtered.length }} 位
        </button>
      </div>
    </section>

    <!-- 排行视图 -->
    <section v-else class="op-rank-main">
      <div class="op-toolbar">
        <div class="op-toolbar__left">
          <span class="op-toolbar__title">练度排行</span>
          <span class="op-toolbar__hint">· 切换指标即时重排</span>
        </div>
        <div class="op-switch">
          <button class="op-switch__item" type="button" @click="view = 'table'">表格</button>
          <button class="op-switch__item is-active" type="button">排行</button>
        </div>
      </div>

      <div class="op-filter__row" style="padding: 14px 20px 0">
        <div class="op-seg">
          <button v-for="item in METRICS" :key="item.key" class="op-seg__item"
                  :class="{'is-active--soft': metric === item.key}" type="button" @click="metric = item.key">
            {{ item.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="op-skeleton-row">
        <div class="op-sk" style="width:26px;height:26px;border-radius:50%"></div>
        <div class="op-sk" style="width:120px"></div>
        <div class="op-sk" style="width:40%;margin-left:auto"></div>
      </div>

      <div v-else-if="loadError" class="op-state">
        <div class="op-state__title">数据加载失败</div>
        <div>{{ loadError }}</div>
        <button class="op-state__btn" type="button" @click="loadData">重试</button>
      </div>

      <div v-else-if="!rankRows.length" class="op-state">
        <div class="op-state__title">没有符合条件的干员</div>
        <button class="op-state__btn" type="button" @click="resetFilters">清除全部筛选</button>
      </div>

      <template v-else>
        <div v-for="(op, index) in rankRows" :key="op.charId" class="op-rank__row" role="button" tabindex="0"
             @click="openDetail(op)" @keydown.enter="openDetail(op)" @keydown.space.prevent="openDetail(op)">
          <span class="op-rank__no" :class="{'op-rank__no--top': index === 0}">{{ index + 1 }}</span>
          <div class="op-rank__name">
            <div class="op-identity__name">{{ op.name }}</div>
            <div class="op-identity__meta">
              {{ professionMap[op.profession] || op.profession }} · {{ op.rarity }} 星
            </div>
          </div>
          <div class="op-rank__bar">
            <div class="op-rank__fill" :style="{width: Math.min(100, metricValue(op, metric)) + '%'}"></div>
          </div>
          <span class="op-rank__value">{{ pct(metricValue(op, metric)) }}%</span>
        </div>

      </template>

      <div v-if="!loading && rankRows.length" class="op-footer">
        <span>第 1 - {{ rankRows.length }} 位 · 共 {{ filtered.length }} 位</span>
        <button v-if="rankRows.length < filtered.length" class="op-footer__btn" type="button"
                @click="rankLimit = filtered.length">
          查看余下 {{ filtered.length - rankRows.length }} 位
        </button>
      </div>
    </section>

    <!-- 详情抽屉 -->
    <Teleport to="body">
      <Transition name="op-fade">
        <div v-if="drawerOpen" class="op-mask" @click="closeDetail"></div>
      </Transition>
      <Transition name="op-slide">
        <aside v-if="drawerOpen && activeOperator" class="op-drawer" role="dialog" aria-modal="true"
               aria-label="干员练度详情">
          <button class="op-drawer__close" type="button" aria-label="关闭" @click="closeDetail">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.5 3.5L14.5 14.5M14.5 3.5L3.5 14.5" stroke="currentColor" stroke-width="1.6"
                    stroke-linecap="round"/>
            </svg>
          </button>

          <div class="op-drawer__head">
            <div class="op-avatar">
              <OperatorAvatar :char-id="activeOperator.charId" :rarity="Number(activeOperator.rarity)" :size="64"/>
            </div>
            <div>
              <div class="op-drawer__name">{{ activeOperator.name }}</div>
              <div class="op-drawer__meta">{{ detailMeta }}</div>
            </div>
          </div>

          <div class="op-stats">
            <div class="op-stat">
              <div class="op-stat__label">持有率</div>
              <div class="op-stat__value">{{ pct(activeOperator.ownRate) }}%</div>
              <div class="op-stat__sub">{{ detailOwnSub }}</div>
            </div>
            <div class="op-stat">
              <div class="op-stat__label">精二率</div>
              <div class="op-stat__value">{{ pct(activeOperator.eliteRank2) }}%</div>
              <div class="op-stat__sub">{{ detailEliteSub }}</div>
            </div>
          </div>

          <div class="op-insight">{{ detailInsight }}</div>

          <div v-if="detailSkills.length">
            <div class="op-section__head">
              <span class="op-section__title">技能专精率</span>
              <span class="op-section__hint">仅统计已拥有该干员的玩家</span>
            </div>
            <div v-for="item in detailSkills" :key="item.index" class="op-detail">
              <div class="op-detail__head">
                <span class="op-detail__name">{{ item.name }}</span>
                <span class="op-detail__tag">技能{{ ['一', '二', '三'][item.index - 1] }}</span>
              </div>
              <div class="op-detail__levels">
                <div class="op-detail__level">
                  <span class="op-detail__label">专一</span>
                  <div class="op-detail__track">
                    <div class="op-detail__fill" :style="{width: Math.min(100, item.rank1) + '%'}"></div>
                  </div>
                  <span class="op-detail__value">{{ pct(item.rank1) }}%</span>
                </div>
                <div class="op-detail__level">
                  <span class="op-detail__label">专二</span>
                  <div class="op-detail__track">
                    <div class="op-detail__fill" :style="{width: Math.min(100, item.rank2) + '%'}"></div>
                  </div>
                  <span class="op-detail__value">{{ pct(item.rank2) }}%</span>
                </div>
                <div class="op-detail__level">
                  <span class="op-detail__label">专三</span>
                  <div class="op-detail__track">
                    <div class="op-detail__fill" :style="{width: Math.min(100, item.rank3) + '%'}"></div>
                  </div>
                  <span class="op-detail__value">{{ pct(item.rank3) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="detailMods.length">
            <div class="op-section__head">
              <span class="op-section__title">模组等级率</span>
              <span class="op-section__hint">按已实装模组统计</span>
            </div>
            <div v-for="item in detailMods" :key="item.type" class="op-detail">
              <div class="op-detail__head">
                <span class="op-detail__name">{{ item.name }}</span>
                <span class="op-detail__tag">{{ item.type }} 模组</span>
              </div>
              <div class="op-detail__levels">
                <div class="op-detail__level">
                  <span class="op-detail__label">1 级</span>
                  <div class="op-detail__track">
                    <div class="op-detail__fill" :style="{width: Math.min(100, item.rank1) + '%'}"></div>
                  </div>
                  <span class="op-detail__value">{{ pct(item.rank1) }}%</span>
                </div>
                <div class="op-detail__level">
                  <span class="op-detail__label">2 级</span>
                  <div class="op-detail__track">
                    <div class="op-detail__fill" :style="{width: Math.min(100, item.rank2) + '%'}"></div>
                  </div>
                  <span class="op-detail__value">{{ pct(item.rank2) }}%</span>
                </div>
                <div class="op-detail__level">
                  <span class="op-detail__label">3 级</span>
                  <div class="op-detail__track">
                    <div class="op-detail__fill" :style="{width: Math.min(100, item.rank3) + '%'}"></div>
                  </div>
                  <span class="op-detail__value">{{ pct(item.rank3) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="detailRank && detailRank.index" class="op-rankstrip">
            <span>
              在 {{ detailRank.total }} 位 {{ activeOperator.rarity }} 星{{
                professionMap[activeOperator.profession] || activeOperator.profession
              }}中，{{ activeMetricLabel }}排名
            </span>
            <span class="op-rankstrip__value">第 {{ detailRank.index }} 位</span>
          </div>

          <div class="op-drawer__footer">
            <button class="op-btn op-btn--primary" type="button" @click="gotoMyOperators">对比我的练度</button>
            <button class="op-btn op-btn--ghost" type="button" @click="copyShareLink">
              {{ shareCopied ? '已复制' : '分享' }}
            </button>
          </div>
        </aside>
      </Transition>
    </Teleport>
  </div>
</template>
