<script setup>
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import { ElNotification } from "element-plus";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import { htmlStringToVNode } from "@/utils/format.js";
import { debounce } from "@/utils/debounce.js";

/**
 * 更好的作战干员筛选
 * 数据来源：better-combat-operators-selection 项目产出的 results/operator-tags.json 与 combat_glossary.json
 * （已复制到 src/static/json/combat/，两份文件保持原样，不在本仓库内手工维护）
 */

const DATA = ref(null);
const GLOSSARY = ref(null);
const EXPLAIN = ref(null);
const loadError = ref("");

onMounted(async () => {
    try {
        const [tagsModule, glossaryModule, explainModule] = await Promise.all([
            import("@/static/json/combat/operator-tags.json"),
            import("@/static/json/combat/combat_glossary.json"),
            import("@/static/json/combat/player-tags-explain.json"),
        ]);
        // 先放术语表：卡片备注的术语高亮（wrapTerms）现在只在「提交卡片」时算一次，
        // 若 DATA 先落导致在 GLOSSARY 到位前就把组合卡的备注算好，那批备注将永远没有术语高亮
        GLOSSARY.value = glossaryModule.default;
        EXPLAIN.value = explainModule.default;
        DATA.value = tagsModule.default;
    } catch (error) {
        loadError.value = String((error && error.message) || error);
    }
});

/* ---------------------------------------------------------------- 悬浮说明（玩家体感 TAG 通俗文案） */

// 顶级按 tagId；子项按 `tagId|组|值`（源：results/player-tags-explain.json）
const explainByTagId = computed(() => new Map((EXPLAIN.value?.tags || []).map((x) => [x.id, x.text])));
const explainBySub = computed(
    () => new Map((EXPLAIN.value?.subs || []).map((x) => [x.tagId + "|" + x.group + "|" + x.value, x.text])),
);

function tagExplain(t) {
    return t?.source === "player" ? explainByTagId.value.get(t.id) || "" : "";
}

function subExplain(tagId, group, value) {
    return explainBySub.value.get(tagId + "|" + group + "|" + value) || "";
}

/* ---------------------------------------------------------------- 索引 */

const tagById = computed(() => new Map((DATA.value?.tags || []).map((t) => [t.id, t])));

const officialTags = computed(() => (DATA.value?.tags || []).filter((t) => t.source === "official"));
const playerTags = computed(() => (DATA.value?.tags || []).filter((t) => t.source === "player"));

// 官方类按 category 分组（A→I）
const officialByCategory = computed(() => {
    const groups = new Map();
    for (const t of officialTags.value) {
        const cat = String(t.category || "其它");
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(t);
    }
    return [...groups.entries()].map(([name, tags]) => ({ name, tags }));
});

// 成员条目索引：tagId -> Map(干员名 -> 条目[])，仅非阵容组合 TAG（组合条目单独处理）
const opEntriesByTag = computed(() => {
    const index = new Map();
    for (const t of DATA.value?.tags || []) {
        if (t.id === "P12") continue;
        const byOp = new Map();
        for (const m of t.members || []) {
            if (!m.operator) continue;
            if (!byOp.has(m.operator)) byOp.set(m.operator, []);
            byOp.get(m.operator).push(m);
        }
        index.set(t.id, byOp);
    }
    return index;
});

// 干员名 -> 其出现过的 TAG id 列表
const opTagIds = computed(() => {
    const map = new Map();
    for (const [tagId, byOp] of opEntriesByTag.value) {
        for (const name of byOp.keys()) {
            if (!map.has(name)) map.set(name, []);
            map.get(name).push(tagId);
        }
    }
    return map;
});

// 每个玩家 TAG 的有效荐作用域：`{group, value, fallback, names:Set}`。
// 有 recommendedBySub 的 TAG（荐已下沉到子 TAG）逐子值取「新手向→兜底」；
// 其余 TAG 用 TAG 级 recommended/recommendedFallback。两份名单均人工指定，前端只读不生成。
const recScopesByTag = computed(() => {
    const map = new Map();
    for (const t of DATA.value?.tags || []) {
        if (t.source !== "player") continue;
        const bySub = t.recommendedBySub || [];
        const fbSub = t.recommendedFallbackBySub || [];
        const scopes = [];
        const addScope = (group, value, pri, fb) => {
            const hasPri = (pri || []).length > 0;
            const names = hasPri ? pri : fb || [];
            if (names.length) scopes.push({ group, value, fallback: !hasPri, names: new Set(names) });
        };
        if (bySub.length || fbSub.length) {
            const fbm = new Map(fbSub.map((x) => [x.value, x.names || []]));
            for (const x of bySub) addScope(x.group, x.value, x.names || [], fbm.get(x.value));
            for (const x of fbSub) if (!bySub.some((y) => y.value === x.value)) addScope(x.group, x.value, [], x.names || []);
        } else {
            addScope("", "", t.recommended || [], t.recommendedFallback || []);
        }
        if (scopes.length) map.set(t.id, scopes);
    }
    return map;
});

// P12 的组荐/组员荐同样按作用域（势力／用法）取用
function p12RecHit(name) {
    const scopes = recScopesByTag.value.get("P12") || [];
    return scopes.find((s) => s.names.has(name)) || null;
}

// 阵容组合（P12）的荐是独立设定：名单元素为组合名（组荐）或该组合的提供者名（组员荐），
// 二者互不派生（见源项目 docs/output-standard.md §6）；作用域为「势力／用法」（p12RecHit）。

// 干员/组合名 -> 是否出现在任一荐作用域（排序与角标按 recScopesByTag 判定，见下）

// 决战歼灭：子 TAG 排列顺序（范围轴＋伤害轴；与源项目 tools/generate_results.py 的 P01_SUB_ORDER 同步）
const P01_SUB_ORDER = ["小范围", "大范围", "主物理伤害", "主法术伤害", "主真实伤害", "主弱点伤害", "物法混伤", "物真混伤", "物元混伤", "法元混伤"];

// 子 TAG 选项：tagId -> [{key, group, value, kind}]；阵容组合的子项＝子 TAG 分类（势力/用法）+ 组合名
const subOptionsByTag = computed(() => {
    const map = new Map();
    for (const t of DATA.value?.tags || []) {
        const items = [];
        const seen = new Set();
        if (t.id === "P12") {
            // 子 TAG 分类（势力／用法）：数据侧已按分类给组合条目打上 subTags；
            // 组合名不再是可筛的子项（其成员已全部归入「势力」），用搜索框按名字找组合。
            for (const m of t.members || []) {
                for (const s of m.subTags || []) {
                    const key = "subtag|" + s.value;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    items.push({ key, group: s.group, value: s.value, kind: "subtag" });
                }
            }
            // 顺序：势力→用法
            const catOrder = ["势力", "用法"];
            items.sort((a, b) => catOrder.indexOf(a.value) - catOrder.indexOf(b.value));
        } else {
            for (const m of t.members || []) {
                for (const s of m.subTags || []) {
                    const key = s.group + "|" + s.value;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    items.push({ key, group: s.group, value: s.value, kind: "sub" });
                }
            }
            if (t.id === "P01") {
                // 决战歼灭按固定排列顺序展示（数据侧的成员顺序不保证子 TAG 顺序）
                items.sort((a, b) => P01_SUB_ORDER.indexOf(a.value) - P01_SUB_ORDER.indexOf(b.value));
            }
        }
        if (items.length) map.set(t.id, items);
    }
    return map;
});

// 组合提供者/受益者的头像、星级与实装时间映射（operators[] 为唯一编号来源）
const providersCharId = computed(() => new Map((DATA.value?.operators || []).map((o) => [o.name, o.charId])));
const providersRarity = computed(() => new Map((DATA.value?.operators || []).map((o) => [o.name, o.rarity])));
const providersRelease = computed(() => new Map((DATA.value?.operators || []).map((o) => [o.name, o.releaseDate || ""])));

// 组合的排序键：组合本身没有实装时间，取「最新提供者的实装时间」代表它的时代
const comboRelease = computed(() => {
    const map = new Map();
    for (const m of tagById.value.get("P12")?.members || []) {
        if (!m.combo) continue;
        let latest = "";
        for (const p of m.providers || []) {
            const date = providersRelease.value.get(p.operator) || "";
            if (date > latest) latest = date;
        }
        map.set(m.combo, latest);
    }
    return map;
});

// 组合的渲染顺序：组荐优先，其次实装时间降序（缺失/同日保持原顺序，Array#sort 稳定）
function compareCombo(a, b) {
    const recA = p12RecHit(a) ? 1 : 0;
    const recB = p12RecHit(b) ? 1 : 0;
    if (recA !== recB) return recB - recA;
    return (comboRelease.value.get(b) || "").localeCompare(comboRelease.value.get(a) || "");
}

// filter 已返回新数组，直接排序不会动到源数据
const p12Combos = computed(() => (tagById.value.get("P12")?.members || []).filter((m) => m.combo).sort((a, b) => compareCombo(a.combo, b.combo)));

/* ---------------------------------------------------------------- 筛选状态 */

const q = ref("");
// v-text-field 的 clearable 点「×」时 v-model 收到的是 null（不是空串），
// 这里在入口统一收敛成字符串，避免下游 q.value.trim() 抛错导致整页渲染中断
const searchText = computed({
    get: () => q.value,
    set: (value) => {
        q.value = value ?? "";
    },
});

// 输入框即时回显 q；真正参与过滤的 filterQ 延迟 200ms 收敛，
// 避免连打时每个按键都触发一次结果重算（q 变了但用户还没打完，算多少次都是白算）
const filterQ = ref(q.value);
const applyFilterQ = debounce((value) => {
    filterQ.value = value;
}, 200);
watch(q, (value) => applyFilterQ(value));

const selTags = ref(new Set());
const selSubs = ref(new Map()); // tagId -> Set(subKey)
const openGroups = ref({ official: true, player: true });

const p12Selected = computed(() => selTags.value.has("P12"));
const selectedNonP12 = computed(() => [...selTags.value].filter((id) => id !== "P12"));
const hasSelection = computed(() => selTags.value.size > 0);
// 荐只在玩家体感 TAG 下判定：未选玩家体感 TAG 时不显示荐
const selectedPlayerTags = computed(() =>
    [...selTags.value].filter((id) => tagById.value.get(id)?.source === "player"),
);
const selectedSubCount = computed(() => [...selSubs.value.values()].reduce((n, s) => n + s.size, 0));
// 仅选了阵容组合时，干员区不展示（避免"组合→全部干员"的空降噪音）
const showOpGrid = computed(() => !hasSelection.value || selectedNonP12.value.length > 0);

const selectedComboCats = computed(() => {
    const set = selSubs.value.get("P12");
    if (!set || !set.size) return null;
    const cats = new Set();
    for (const k of set) if (k.startsWith("subtag|")) cats.add(k.slice("subtag|".length));
    return cats.size ? cats : null;
});

function matches(text, keyword) {
    return String(text || "").toLowerCase().includes(keyword);
}

const keyword = computed(() => filterQ.value.trim().toLowerCase());

// 命中干员：对全部已选（非组合）TAG 取交集；某 TAG 下若勾选了子 TAG，则每个已选子项都须命中（可跨多条条目）
// 渲染顺序：先放「荐」的干员，再按原顺序追加其余干员（两组内部都保持 operators[] 顺序）
const resultOperators = computed(() => {
    if (!DATA.value || !showOpGrid.value) return [];
    const selected = selectedNonP12.value;
    const recommended = [];
    const others = [];
    for (const op of DATA.value.operators || []) {
        if (keyword.value && !matches(op.name, keyword.value)) continue;
        let hit = true;
        for (const tagId of selected) {
            const entries = opEntriesByTag.value.get(tagId)?.get(op.name);
            if (!entries?.length) {
                hit = false;
                break;
            }
            const subs = selSubs.value.get(tagId);
            // 子 TAG 多选取交集：每个已选子项都须在该干员的某条条目上命中（可跨多条）；
            // 不勾任何子项＝该 TAG 不限子项（docs/ui-render-rules.md §4.2）
            if (subs?.size) {
                const keys = new Set();
                for (const e of entries) {
                    for (const s of e.subTags || []) keys.add(s.group + "|" + s.value);
                }
                for (const key of subs) {
                    if (!keys.has(key)) {
                        hit = false;
                        break;
                    }
                }
                if (!hit) break;
            }
        }
        if (!hit) continue;
        (recTagNames(op.name).length ? recommended : others).push(op);
    }
    return recommended.concat(others);
});

// 命中组合：选中阵容组合时展示，可按子 TAG 分类（势力／用法）收窄；组合名用搜索框查找
const resultCombos = computed(() => {
    if (!DATA.value || !p12Selected.value) return [];
    const cats = selectedComboCats.value;
    return p12Combos.value.filter((c) => {
        if (keyword.value && !matches(c.combo, keyword.value)) return false;
        if (cats) {
            const have = new Set((c.subTags || []).map((s) => s.value));
            for (const cat of cats) if (!have.has(cat)) return false;
        }
        return true;
    });
});

/* ---------------------------------------------------------------- 筛选操作 */

function toggleTag(tag) {
    const next = new Set(selTags.value);
    const subs = new Map(selSubs.value);
    if (next.has(tag.id)) {
        next.delete(tag.id);
        subs.delete(tag.id);
    } else {
        // 「阵容组合」只可单独选择：选中它时清空其它 TAG，选中其它 TAG 时取消它
        if (tag.id === "P12" || next.has("P12")) {
            next.clear();
            subs.clear();
        }
        next.add(tag.id);
        if (tag.id === "P12") openGroups.value = { ...openGroups.value, player: true };
    }
    selTags.value = next;
    selSubs.value = subs;
}

function toggleSub(tagId, item) {
    const subs = new Map(selSubs.value);
    const set = new Set(subs.get(tagId) || []);
    if (set.has(item.key)) set.delete(item.key);
    else set.add(item.key);
    subs.set(tagId, set);
    selSubs.value = subs;
}

function clearAll() {
    selTags.value = new Set();
    selSubs.value = new Map();
    q.value = "";
    // 清空要立刻生效，不等防抖那 200ms（watch(q) 之后仍会把空串再写一次，结果一致）
    filterQ.value = "";
}

// 已选 TAG 的「子 TAG 细化」面板（含阵容组合的组合名列表）
const subPanels = computed(() =>
    [...selTags.value]
        .map((id) => ({ tag: tagById.value.get(id), items: subOptionsByTag.value.get(id) }))
        .filter((p) => p.tag && p.items?.length),
);

/* ---------------------------------------------------------------- 荐（菱形标识） */

// 荐判定：对每个已选玩家体感 TAG，须在该 TAG 的某个「有效作用域」内有荐；
// 勾选了子 TAG 时只在该子 TAG 的作用域内找（多选仍取交集）。返回 [{tagId, scope}]。
function recTagEntries(name) {
    if (!DATA.value || !name) return [];
    const tags = selectedPlayerTags.value;
    if (!tags.length) return [];
    const out = [];
    for (const id of tags) {
        const scopes = recScopesByTag.value.get(id) || [];
        const subSel = selSubs.value.get(id);
        const vals = subSel?.size ? new Set([...subSel].map((k) => k.slice(k.indexOf("|") + 1))) : null;
        const hit = scopes.filter((s) => (!vals || !s.value || vals.has(s.value)) && s.names.has(name));
        if (!hit.length) return [];
        for (const s of hit) out.push({ tagId: id, scope: s });
    }
    return out;
}

// 命中标签：TAG 名（子作用域时写作「TAG 名 · 子值」，便于知道因何被荐）
function recTagNames(name) {
    const hits = recTagEntries(name);
    return [
        ...new Set(
            hits.map((h) => {
                const tagName = tagById.value.get(h.tagId)?.name || h.tagId;
                return h.scope.value ? `${tagName} · ${h.scope.value}` : tagName;
            }),
        ),
    ];
}

// 荐标识的悬浮提示：把口径与免责一并挂在标识上，避免被当成强度结论；
// 命中里只要有用到「兜底荐」的，就改用实力向文案
function recTip(name) {
    const hits = recTagEntries(name);
    if (!hits.length) return "";
    const labels = recTagNames(name);
    const isFallback = hits.some((h) => h.scope.fallback);
    return isFallback
        ? `荐：${labels.join("、")}（该 TAG 暂无新手向推荐，展示综合实力较强，仅供参考）`
        : `荐：${labels.join("、")}（新手优先培养，仅供参考）`;
}

// 组荐：这个阵容本身是否被推荐给新手优先培养（只看 P12 的荐作用域，与组员荐独立）
function comboRecTip(name) {
    const hit = p12RecHit(name);
    return hit ? `组荐：推荐新手优先培养这个阵容${hit.value ? "（" + hit.value + "）" : ""}` : "";
}

// 组员荐：这个阵容里的提供者是否被推荐优先培养（同样只看 P12 的荐作用域）
function isMemberRec(name) {
    return !!p12RecHit(name);
}

function memberRecTip(name) {
    const hit = p12RecHit(name);
    return hit ? `荐：练这个阵容时优先培养这名干员${hit.value ? "（" + hit.value + "）" : ""}` : "";
}

// 阵容组合内的渲染顺序：组员荐的提供者排在前面，其余随后；两组内部都按实装时间降序（新的在前）。
// releaseDate 是 YYYY-MM-DD，直接比字符串即可；缺失/同日的按 providers 原顺序（Array#sort 稳定）。
// 注意先复制再排序：providers 是 JSON 模块里的数组，原地 sort 会改掉源数据。
function sortProvidersByRec(providers) {
    const releaseOf = (p) => providersRelease.value.get(p.operator) || "";
    return [...(providers || [])].sort((a, b) => {
        const recA = isMemberRec(a.operator) ? 1 : 0;
        const recB = isMemberRec(b.operator) ? 1 : 0;
        if (recA !== recB) return recB - recA;
        return releaseOf(b).localeCompare(releaseOf(a));
    });
}

/* ---------------------------------------------------------------- 详情弹窗 */

const dialog = ref(false);
const detail = ref(null); // {type:'op', op} | {type:'combo', combo}

// 卡片上的术语点击只应弹术语解释，不再顺带打开详情弹窗
function isTermClick(event) {
    return !!event?.target?.closest?.("[data-combat-term]");
}

function openOperator(op, event) {
    if (isTermClick(event)) return;
    detail.value = { type: "op", op };
    dialog.value = true;
}

function openCombo(combo, event) {
    if (isTermClick(event)) return;
    detail.value = { type: "combo", combo };
    dialog.value = true;
}

// 弹窗内干员条目：有筛选时=命中的 TAG（按子 TAG 过滤）；无筛选时=其全部 TAG
const detailTagEntries = computed(() => {
    if (detail.value?.type !== "op" || !DATA.value) return [];
    const name = detail.value.op.name;
    const ids = selectedNonP12.value.length
        ? selectedNonP12.value.filter((id) => opEntriesByTag.value.get(id)?.has(name))
        : (opTagIds.value.get(name) || []);
    return ids.map((id) => {
        const tag = tagById.value.get(id);
        const subs = selSubs.value.get(id);
        let entries = opEntriesByTag.value.get(id).get(name);
        if (subs?.size) {
            // 交集判定已在干员级完成；条目级保留「命中任一已选子项」的条目，
            // 把每条已选子项的证据都显示出来；过滤后为空则回退全部条目
            const filtered = entries.filter((e) => (e.subTags || []).some((s) => subs.has(s.group + "|" + s.value)));
            if (filtered.length) entries = filtered;
        }
        return { tag, entries };
    });
});

// 组合弹窗内的提供者：同样把组员荐排在最前
const detailComboProviders = computed(() =>
    detail.value?.type === "combo" ? sortProvidersByRec(detail.value.combo.providers) : [],
);

// 卡片详情末尾的引用标识：聚合本卡所有引用外部工具的条目（去重引用部分与描述）
const detailSource = computed(() => {
    if (!detail.value) return null;
    const list =
        detail.value.type === "combo"
            ? detail.value.combo.source
                ? [detail.value.combo.source]
                : []
            : detailTagEntries.value.flatMap((g) => g.entries.filter((e) => e.source).map((e) => e.source));
    if (!list.length) return null;
    const uniq = (key) => [...new Set(list.map((s) => s[key]).filter(Boolean))];
    return {
        model: list[0].model || "ArkDPS",
        author: list[0].author || "极夜星辰",
        url: list[0].url || ARKDPS_URL,
        parts: uniq("parts").join("、"),
        detail: uniq("detail").join("；"),
    };
});

/* ---------------------------------------------------------------- 战斗术语（基建技能一览同款交互） */

// 术语按名字长度降序：正则里长词在前，保证「凋亡损伤·我方」先于「凋亡损伤」匹配
const TERM_LIST = computed(() =>
    (GLOSSARY.value?.sections || [])
        .flatMap((section) => section.terms || [])
        .sort((a, b) => b.name.length - a.name.length),
);

const TERM_MAP = computed(() => new Map(TERM_LIST.value.map((t) => [t.name, t])));

const TERM_REGEX = computed(() => {
    if (!TERM_LIST.value.length) return null;
    const escaped = TERM_LIST.value.map((t) => t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(escaped.join("|"), "g");
});

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

function escapeHtml(text) {
    return String(text == null ? "" : text).replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);
}

// 备注/条件文本 → 术语包上 <span data-combat-term>（最长优先匹配）
function wrapTerms(text) {
    const escaped = escapeHtml(text);
    if (!TERM_REGEX.value) return escaped;
    return escaped.replace(TERM_REGEX.value, (m) => `<span class="combat-term" data-combat-term="${m}">${m}</span>`);
}

// 「ArkDPS」「ark-dps.com」→ 高亮 + 直达站点的链接（引用标注见源项目 docs/calc-rules.md §4.10）
const ARKDPS_URL = "https://ark-dps.com/zh/";

function linkifyArkdps(html) {
    if (!html || html.includes("bcf-arkdps")) return html;
    // 单次替换：「ArkDPS」与「ark-dps.com」必须同一轮处理——分两轮会把第一轮写入 href 的域名
    // 再包一次链接、产出嵌套锚点（渲染出 ark-dps.com/zh/" target="_blank"… 残片）
    const link = (m) =>
        `<a class="bcf-arkdps" href="${ARKDPS_URL}" target="_blank" rel="noreferrer"` +
        ` title="ArkDPS（作者：极夜星辰）· 官网 ark-dps.com/zh/">${m}</a>`;
    return html.replace(/(?<![A-Za-z0-9>])(?:ArkDPS|ark-dps\.com)(?![A-Za-z0-9<])/g, link);
}

function truncate(text, limit = 120) {
    const s = String(text || "");
    return s.length > limit ? s.slice(0, limit) + "…" : s;
}

/* ---------------------------------------------------------------- 条件 / 备注分块渲染
   结构见源项目 docs/output-standard.md §4.2 与 docs/concept.md「备注分块」：
   remark = 块数组 [{label?, items:[{label?, text}]}]，块类由块标签判定。 */

function blockKind(label) {
    const s = String(label || "");
    if (!s) return "plain";
    if (s === "成绩" || s.startsWith("成绩 ")) return "score";
    if (s === "计算") return "calc";
    if (s === "说明") return "note";
    return "ability";
}

// 条件 → 逐条 chips（`；` 分隔）；只有一条时按纯文本渲染
function renderCondition(condition) {
    const text = String(condition || "").trim() || "无";
    const parts = text.split("；").map((s) => s.trim()).filter(Boolean);
    if (parts.length <= 1) return linkifyArkdps(wrapTerms(text));
    return parts.map((p) => `<span class="bcf-req">${linkifyArkdps(wrapTerms(p))}</span>`).join("");
}

// 备注块数组 → HTML；术语高亮只作用于正文 text，不作用于标签（避免标签被包成 combat-term）
function renderRemark(remark) {
    if (!remark) return "";
    const blocks = typeof remark === "string" ? [{ items: [{ text: remark }] }] : remark;
    const itemsHtml = (items) =>
        (items || [])
            .map((it) =>
                it.label
                    ? `<div class="bcf-item"><span class="bcf-k">${linkifyArkdps(escapeHtml(it.label))}</span><span class="bcf-v">${linkifyArkdps(wrapTerms(it.text))}</span></div>`
                    : `<div class="bcf-item bcf-item--wide"><span class="bcf-v">${linkifyArkdps(wrapTerms(it.text))}</span></div>`,
            )
            .join("");
    return blocks
        .map((b) => {
            const label = String(b.label || "");
            const kind = blockKind(label);
            const body = `<div class="bcf-items">${itemsHtml(b.items)}</div>`;
            if (kind === "score") {
                const caseName = label.slice("成绩".length).trim();
                return (
                    `<div class="bcf-block bcf-block--score"><div class="bcf-block-head">` +
                    `<span class="bcf-block-title">成绩</span>` +
                    (caseName ? `<span class="bcf-block-case">${escapeHtml(caseName)}</span>` : "") +
                    `</div>${body}</div>`
                );
            }
            if (kind === "calc") {
                // 默认折叠，点击标题展开：v-html 内容拿不到 Vue 事件，走 onTermClick 的委托切换 .is-open
                return `<div class="bcf-block bcf-block--calc" data-calc><div class="bcf-block-head bcf-calc-head" data-calc-toggle>演算过程</div>${body}</div>`;
            }
            if (kind === "note") {
                return `<div class="bcf-block bcf-block--note"><div class="bcf-block-head">说明</div>${body}</div>`;
            }
            if (kind === "ability") {
                return `<div class="bcf-block bcf-block--ability"><div class="bcf-block-head">${escapeHtml(label)}</div>${body}</div>`;
            }
            return `<div class="bcf-block">${body}</div>`;
        })
        .join("");
}

// 组合卡片摘要（截断 96 字）：取首块首条，即成绩块的成绩行
function remarkSummary(remark, limit = 96) {
    const text = Array.isArray(remark)
        ? (remark[0]?.items || []).map((i) => i.text).join("；")
        : String(remark || "");
    return truncate(text, limit);
}

// 点击术语 → 浮窗（照「基建技能一览」的 ElNotification 方式）；点击演算过程标题 → 展开/收起
function onTermClick(event) {
    const toggle = event.target?.closest?.("[data-calc-toggle]");
    if (toggle) {
        toggle.closest("[data-calc]")?.classList.toggle("is-open");
        return;
    }
    const el = event.target?.closest?.("[data-combat-term]");
    if (!el) return;
    const term = TERM_MAP.value.get(el.getAttribute("data-combat-term"));
    if (!term) return;
    const notes = (term.notes || []).map((n) => `<li>${escapeHtml(n)}</li>`).join("");
    // 内联样式：ElNotification 挂在 body 下，拿不到本组件的 scoped 样式
    const html =
        `<div>${escapeHtml(term.definition)}</div>` +
        (notes ? `<ul style="margin:6px 0 0;padding-left:18px;">${notes}</ul>` : "");
    ElNotification({
        title: term.name,
        message: htmlStringToVNode(html),
        duration: 7000,
    });
}

/* ---------------------------------------------------------------- 展示辅助 */

const SOURCE_LABEL = { official: "官方", player: "玩家" };

function chipTagsFor(op) {
    if (selectedNonP12.value.length) {
        return selectedNonP12.value.filter((id) => opEntriesByTag.value.get(id)?.has(op.name)).map((id) => tagById.value.get(id)?.name);
    }
    const names = (opTagIds.value.get(op.name) || []).map((id) => tagById.value.get(id)?.name);
    return names.slice(0, 4).concat(names.length > 4 ? [`+${names.length - 4}`] : []);
}

/* ---------------------------------------------------------------- 结果窗口（首屏 30 张，滚到底再补 30 张） */

// 命中集（resultOperators / resultCombos）保持「即时但便宜」：只过滤，不做逐卡计算，
// 供命中计数、空态与 hasMore 使用；逐卡的「贵」计算只发生在下面窗口内的几十张上。
const PAGE_SIZE = 30;

// 结果区的视口判定余量。.bcf-stats 行只有约 50px 高且紧贴在结果区上方，
// 因此「只要统计行可见 → 结果区必落入 rootMargin → gridInView 必为 true」，
// 卡片永远不可能与「命中 N 名干员」同屏却还是上一轮筛选的结果。
// 取 100px 而不是更大的值：余量越大 gridInView 越早翻真，冻结越少生效。
const GRID_MARGIN_PX = 100;
// 触底加载：提前 300px 把下一页备好
const SENTINEL_MARGIN_PX = 300;

const visibleCount = ref(PAGE_SIZE);

// 过滤条件一变，窗口立刻收回第一页。必须 flush:'sync'：提交发生在 pre 队列里、computed 又是
// 惰性求值，只有同步阶段改掉 visibleCount，才能保证提交时读到的 slice 已经是第一页内容。
// 依赖 selTags/selSubs 每次都被整体替换成新 Set/Map（见 toggleTag/toggleSub），原地 mutate 则不再触发。
watch([selTags, selSubs, keyword], () => {
    visibleCount.value = PAGE_SIZE;
}, { flush: "sync" });

const visibleOps = computed(() => resultOperators.value.slice(0, visibleCount.value));
const hasMore = computed(() => showOpGrid.value && visibleCount.value < resultOperators.value.length);

// 结果区是否在视口内。初值取 true：保证数据到位后的第一帧就有 30 张卡、结果区有高度，
// 否则首帧空白，IO 也拿不到有意义的几何信息；随后由 IO 的首个回调纠正为真实状态。
const gridInView = ref(true);

// 真正提交到 DOM 的快照。结果区不在视口内时，筛选变化只更新命中集（统计数字、空态），
// 既不重建卡片模型也不碰 DOM —— 这就是「在筛选面板连点 TAG 不卡」的来源。
// 必须是 shallowRef：ref() 会把每个干员对象都变成响应式代理。
const committedOpCards = shallowRef([]);
const committedComboCards = shallowRef([]);
// 非响应式脏标记：滚回视口时判断要不要补提交，避免无谓地换掉数组身份、让整片卡片重渲染
let cardsDirty = true;

function buildOpCards() {
    return visibleOps.value.map((op) => {
        // recTip 原先在模板里调了两次（v-if 一次 + :title 一次），这里每张只算一次
        const tip = recTip(op.name);
        return { op, tip, diamond: !!tip, chips: chipTagsFor(op) };
    });
}

// 组合最多 14 个，不做窗口化；同样把 recTip、术语正则、头像映射预先算好，
// 免得每次重渲染都把 wrapTerms 的正则替换再跑一遍
function buildComboCards() {
    return resultCombos.value.map((combo) => {
        const tip = comboRecTip(combo.combo);
        return {
            combo,
            tip,
            diamond: !!tip,
            // 先排序再截断：带组员荐的提供者一定落在可见的头像行里
            providers: sortProvidersByRec(combo.providers).slice(0, 8).map((p) => ({
                name: p.operator,
                charId: providersCharId.value.get(p.operator) || "",
                rarity: providersRarity.value.get(p.operator) || 6,
            })),
            remarkHtml: linkifyArkdps(wrapTerms(remarkSummary(combo.remark))),
        };
    });
}

function commitCards() {
    committedOpCards.value = buildOpCards();
    committedComboCards.value = buildComboCards();
    cardsDirty = false;
}

// 这里只做两件便宜的事：标脏 +（在视口内时）提交。
// 注意不要把 buildOpCards 写成 computed 再 watch —— watch 每次触发都会重跑 getter，
// 那样即使不提交也会重建模型，窗口化等于白做。
watch([visibleOps, resultCombos], () => {
    cardsDirty = true;
    if (gridInView.value) commitCards();
});

// v-intersect 只在 mounted 时读一次绑定值，所以用常量对象 + 具名函数（不要在模板里写内联箭头）
const GRID_INTERSECT = {
    handler(isIntersecting) {
        gridInView.value = !!isIntersecting;
        // 从视口外滚回来要主动提交：此时 visibleOps 没变，上面的 watch 不会再触发
        if (isIntersecting && cardsDirty) commitCards();
    },
    options: { rootMargin: `0px 0px ${GRID_MARGIN_PX}px 0px` },
};

const sentinelEl = ref(null);

function loadMore() {
    if (!gridInView.value || !hasMore.value) return;
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, resultOperators.value.length);
    fillViewport();
}

// IO 只在相交状态翻转时回调。视口很高 / 卡片很矮时，补完一页哨兵仍处于相交状态
// （true→true 不再回调）会永远卡在第一页，所以补完一页等 DOM 落地再量一次，
// 直到哨兵被顶出视口或没有更多数据（hasMore 保证 visibleCount 每轮严格增大，必然终止）。
let fillToken = 0;
async function fillViewport() {
    const token = ++fillToken;
    await nextTick();
    if (token !== fillToken || !gridInView.value || !hasMore.value) return;
    const el = sentinelEl.value;
    if (!el) return;
    // 只在「刚补过一页」这条路径上强制一次布局，不在渲染路径上
    if (el.getBoundingClientRect().top > window.innerHeight + SENTINEL_MARGIN_PX) return;
    loadMore();
}

const SENTINEL_INTERSECT = {
    handler(isIntersecting) {
        if (isIntersecting) loadMore();
    },
    options: { rootMargin: `0px 0px ${SENTINEL_MARGIN_PX}px 0px` },
};
</script>

<template>
    <div class="bcf-page" @click="onTermClick">
        <header class="bcf-header">
            <p class="bcf-description">
                按官方设定 TAG 与玩家体感 TAG 快速筛选干员。多选 TAG 时取「同时满足」的交集；选中 TAG 后还能用子 TAG
                进一步收窄，子 TAG 多选同样取交集。点击卡片查看该干员在当前 TAG 下的条件与备注，备注中的<strong>蓝色术语</strong>可点击查看解释。
            </p>
            <div class="bcf-note">
                <strong>使用说明</strong>
                <span>蓝色下划线术语点击可查看术语解释；把光标悬停在玩家体感 TAG 或子 TAG 上，可查看该 TAG 的通俗说明；选中玩家体感 TAG 后，卡片右上角的<em class="bcf-diamond-inline"></em>菱彩标识表示该干员在所选的全部玩家体感 TAG 下均为「荐」。</span>
            </div>
            <div class="bcf-note bcf-note--about">
                <strong>关于「荐」</strong>
                <span>
                    当新手玩家想要一名具备对应 TAG 能力的干员时，可以优先培养的那一批干员。
                    由于主要面向新手玩家，因此精英一阶段就具备相当强度的 TAG 能力的干员会获得较高的配得权重。
                    如果某个玩家体感 TAG 没有适合新手优先培养的干员，那么就不会存在「荐」的标识。
                    只有选中玩家体感 TAG 时才会显示荐标识；同时选中多个玩家体感 TAG 时，只有在这些 TAG
                    下<strong>均为荐</strong>的干员才会显示。官方设定 TAG 不参与荐的判定。
                </span>
            </div>
            <div class="bcf-note bcf-note--combo">
                <strong>阵容组合的荐</strong>
                <span>
                    「阵容组合」是独立维度，<strong>仅可单独选择</strong>（选中它会取消其它 TAG 的选择），展示的是「可成组搭配」而不是单个干员的能力。
                    它的荐是单独的一套，与组合内干员的荐<strong>互相独立</strong>（给组合加荐≠给它的提供者加荐，反之亦然）。
                    ① 组合<strong>带有荐</strong>（组荐）→ 这个阵容推荐新手优先开练，练它时建议优先练组内标了荐的干员；
                    ② 组合<strong>没有荐</strong> → 不推荐新手优先开练这个阵容；若你已打算练它，建议优先练组内标了荐的干员。
                </span>
            </div>
            <div class="bcf-note bcf-note--disclaimer">
                <strong>免责说明</strong>
                <span>
                    玩家体感 TAG 及其荐名单由本站整理，其中包含大量主观评定条件，且游戏版本、模组与技能专精都会影响实际表现，
                    因此可能存在不完整、不准确或滞后之处，仅供查阅参考。本工具不构成任何抽卡建议，
                    请勿将其作为抽卡或氪金的决策凭据。
                </span>
            </div>
        </header>

        <div v-if="loadError" class="bcf-error">数据载入失败：{{ loadError }}</div>

        <div v-else-if="!DATA" class="bcf-loading">
            <v-progress-circular indeterminate color="primary" :size="30" />
            <span>正在载入干员 TAG 数据…</span>
        </div>

        <template v-else>
            <v-card class="bcf-filter" variant="outlined">
                <div class="bcf-filter-row">
                    <v-text-field
                        v-model="searchText"
                        class="bcf-search"
                        density="compact"
                        variant="outlined"
                        hide-details
                        clearable
                        prepend-inner-icon="mdi-magnify"
                        placeholder="搜索干员 / 组合名…"
                    />
                    <span class="bcf-selected-count">
                        已选 <b>{{ selTags.size }}</b> 个 TAG<span v-if="selectedSubCount"> · {{ selectedSubCount }} 个子 TAG</span>
                    </span>
                    <v-btn size="small" variant="text" :disabled="!hasSelection && !q" @click="clearAll">清空筛选</v-btn>
                </div>

                <div class="bcf-group">
                    <button class="bcf-group-head" type="button" @click="openGroups.official = !openGroups.official">
                        <v-icon :icon="openGroups.official ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="18" />
                        官方设定 TAG（{{ officialTags.length }}）
                    </button>
                    <v-expand-transition>
                        <div v-show="openGroups.official" class="bcf-group-body">
                            <template v-for="cat in officialByCategory" :key="'cat-' + cat.name">
                                <div class="bcf-cat">{{ cat.name }}</div>
                                <div class="bcf-tags">
                                    <v-chip
                                        v-for="t in cat.tags"
                                        :key="t.id"
                                        size="small"
                                        :variant="selTags.has(t.id) ? 'flat' : 'tonal'"
                                        :color="selTags.has(t.id) ? 'primary' : undefined"
                                        @click="toggleTag(t)"
                                    >
                                        {{ t.name }}
                                    </v-chip>
                                </div>
                            </template>
                        </div>
                    </v-expand-transition>
                </div>

                <div class="bcf-group">
                    <button class="bcf-group-head" type="button" @click="openGroups.player = !openGroups.player">
                        <v-icon :icon="openGroups.player ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="18" />
                        玩家体感 TAG（{{ playerTags.length }}）
                    </button>
                    <v-expand-transition>
                        <div v-show="openGroups.player" class="bcf-group-body">
                            <div class="bcf-tags">
                                <v-tooltip
                                    v-for="t in playerTags"
                                    :key="t.id"
                                    location="top"
                                    max-width="380"
                                    content-class="bcf-tt"
                                    open-delay="150"
                                >
                                    <template #activator="{ props: ttProps }">
                                        <v-chip
                                            v-bind="ttProps"
                                            size="small"
                                            :class="{ 'bcf-chip--solo': t.id === 'P12' }"
                                            :variant="selTags.has(t.id) ? 'flat' : 'tonal'"
                                            :color="selTags.has(t.id) ? 'primary' : undefined"
                                            @click="toggleTag(t)"
                                        >
                                            {{ t.name }}
                                            <template v-if="t.id === 'P12'" #append>
                                                <v-icon icon="mdi-account-multiple" size="14" />
                                            </template>
                                        </v-chip>
                                    </template>
                                    <div class="bcf-tt-body">
                                        <div class="bcf-tt-title">{{ t.name }}</div>
                                        <p>{{ tagExplain(t) || "（暂无说明）" }}</p>
                                        <p v-if="t.id === 'P12'" class="bcf-tt-note">此 TAG 只能单独选择。</p>
                                    </div>
                                </v-tooltip>
                            </div>
                        </div>
                    </v-expand-transition>
                </div>

                <div v-if="subPanels.length" class="bcf-subpanels">
                    <div v-for="panel in subPanels" :key="'sub-' + panel.tag.id" class="bcf-subpanel">
                        <div class="bcf-subhead">「{{ panel.tag.name }}」子 TAG（{{ panel.tag.id === 'P12' ? '势力/用法分类多选取交集' : '多选取交集' }}；不选＝不限）</div>
                        <div class="bcf-tags">
                            <template v-for="item in panel.items" :key="item.key">
                                <v-tooltip
                                    v-if="panel.tag.source === 'player' && item.kind !== 'combo'"
                                    location="top"
                                    max-width="380"
                                    content-class="bcf-tt"
                                    open-delay="150"
                                >
                                    <template #activator="{ props: ttProps }">
                                        <v-chip
                                            v-bind="ttProps"
                                            size="x-small"
                                            :variant="selSubs.get(panel.tag.id)?.has(item.key) ? 'flat' : 'outlined'"
                                            :color="selSubs.get(panel.tag.id)?.has(item.key) ? 'primary' : undefined"
                                            @click="toggleSub(panel.tag.id, item)"
                                        >
                                            {{ item.value }}
                                        </v-chip>
                                    </template>
                                    <div class="bcf-tt-body">
                                        <div class="bcf-tt-title">{{ item.value }}</div>
                                        <p>{{ subExplain(panel.tag.id, item.group, item.value) || "（暂无说明）" }}</p>
                                    </div>
                                </v-tooltip>
                                <v-chip
                                    v-else
                                    size="x-small"
                                    :variant="selSubs.get(panel.tag.id)?.has(item.key) ? 'flat' : 'outlined'"
                                    :color="selSubs.get(panel.tag.id)?.has(item.key) ? 'primary' : undefined"
                                    @click="toggleSub(panel.tag.id, item)"
                                >
                                    {{ item.value }}
                                </v-chip>
                            </template>
                        </div>
                    </div>
                </div>

                <div v-if="hasSelection" class="bcf-selected">
                    <template v-for="id in [...selTags]" :key="'sel-' + id">
                        <v-tooltip
                            v-if="tagById.get(id)?.source === 'player'"
                            location="top"
                            max-width="380"
                            content-class="bcf-tt"
                            open-delay="150"
                        >
                            <template #activator="{ props: ttProps }">
                                <v-chip
                                    v-bind="ttProps"
                                    size="small"
                                    color="primary"
                                    variant="flat"
                                    closable
                                    :class="{ 'bcf-chip--solo': id === 'P12' }"
                                    @click:close="toggleTag(tagById.get(id))"
                                >
                                    {{ tagById.get(id)?.name }}
                                </v-chip>
                            </template>
                            <div class="bcf-tt-body">
                                <div class="bcf-tt-title">{{ tagById.get(id)?.name }}</div>
                                <p>{{ tagExplain(tagById.get(id)) || "（暂无说明）" }}</p>
                                <p v-if="id === 'P12'" class="bcf-tt-note">此 TAG 只能单独选择。</p>
                            </div>
                        </v-tooltip>
                        <v-chip
                            v-else
                            size="small"
                            color="primary"
                            variant="flat"
                            closable
                            @click:close="toggleTag(tagById.get(id))"
                        >
                            {{ tagById.get(id)?.name }}
                        </v-chip>
                    </template>
                </div>
            </v-card>

            <div class="bcf-stats">
                命中 <b>{{ showOpGrid ? resultOperators.length : 0 }}</b> 名干员<template v-if="p12Selected">
                    · <b>{{ resultCombos.length }}</b> 个组合</template>
                <span v-if="p12Selected && !showOpGrid" class="bcf-tip">已选择「阵容组合」，结果见下方组合卡片</span>
            </div>

            <!-- 结果区：进入视口才提交（重算 + 渲染）卡片；滚到尾部哨兵再补 30 张。
                 不用 TransitionGroup：它的渲染函数每次都会对每个已渲染子节点读
                 offsetLeft/offsetTop（与 CSS 无关），卡片一多就是每帧几百次强制布局。 -->
            <div class="bcf-grid" v-intersect="GRID_INTERSECT">
                <v-card
                    v-for="card in committedOpCards"
                    :key="'op-' + card.op.charId"
                    class="bcf-card"
                    variant="outlined"
                    @click="openOperator(card.op, $event)"
                >
                    <div v-if="card.diamond" class="bcf-diamond" :title="card.tip"></div>
                    <OperatorAvatar :char-id="card.op.charId" :rarity="card.op.rarity" :size="64" :mobile-size="48" border />
                    <div class="bcf-name">{{ card.op.name }}</div>
                    <div class="bcf-stars">{{ "★".repeat(card.op.rarity || 1) }}</div>
                    <div class="bcf-sub">{{ [card.op.class, card.op.branch].filter(Boolean).join("·") }}</div>
                    <div class="bcf-chips">
                        <v-chip v-for="c in card.chips" :key="card.op.charId + '-' + c" size="x-small" variant="tonal">{{ c }}</v-chip>
                    </div>
                </v-card>

                <v-card
                    v-for="card in committedComboCards"
                    :key="'combo-' + card.combo.combo"
                    class="bcf-card bcf-combo-card"
                    variant="outlined"
                    @click="openCombo(card.combo, $event)"
                >
                    <div v-if="card.diamond" class="bcf-diamond" :title="card.tip"></div>
                    <div class="bcf-combo-name">{{ card.combo.combo }}</div>
                    <div class="bcf-providers">
                        <OperatorAvatar
                            v-for="p in card.providers"
                            :key="card.combo.combo + '-' + p.name"
                            :char-id="p.charId"
                            :size="36"
                            :rarity="p.rarity"
                            border
                        />
                    </div>
                    <div class="bcf-sub">提供者 {{ (card.combo.providers || []).length }} 名 · 受益者 {{ (card.combo.beneficiaries || []).length }} 名</div>
                    <div class="bcf-combo-note" v-html="card.remarkHtml"></div>
                </v-card>
            </div>

            <!-- 哨兵必须放在 .bcf-grid 之外：grid 布局里它会占掉一个网格单元。
                 用 v-if 而非 v-show，卸载时指令的 unmounted 会正常释放 observer -->
            <button
                v-if="hasMore"
                ref="sentinelEl"
                type="button"
                class="bcf-sentinel"
                v-intersect="SENTINEL_INTERSECT"
                @click="loadMore"
            >
                <v-progress-circular indeterminate size="18" color="primary" />
                <span>正在加载更多…（已显示 {{ committedOpCards.length }} / {{ resultOperators.length }}）</span>
            </button>
            <div v-else-if="resultOperators.length > PAGE_SIZE" class="bcf-sentinel bcf-sentinel--done">
                已显示全部 <b>{{ resultOperators.length }}</b> 名干员
            </div>

            <div v-if="!resultOperators.length && !resultCombos.length" class="bcf-empty">没有同时满足全部所选条件的干员/组合。</div>

            <v-dialog v-model="dialog" max-width="780">
                <!-- link="false"：这里的 @click 只用于术语事件委托，卡片本身不是链接。
                     否则 Vuetify 会给卡片加 .v-card--link（cursor: pointer）与 v-ripple 点击特效 -->
                <v-card v-if="detail" class="bcf-dialog" :link="false" @click="onTermClick">
                    <div class="bcf-dialog-body">
                        <template v-if="detail.type === 'op'">
                            <div class="bcf-dialog-head">
                                <OperatorAvatar :char-id="detail.op.charId" :rarity="detail.op.rarity" :size="88" :mobile-size="64" border />
                                <div class="bcf-dialog-info">
                                    <div class="bcf-dialog-name">
                                        {{ detail.op.name }}
                                        <span v-if="recTip(detail.op.name)" class="bcf-diamond" :title="recTip(detail.op.name)"></span>
                                    </div>
                                    <div class="bcf-stars">{{ "★".repeat(detail.op.rarity || 1) }}</div>
                                    <div class="bcf-sub">
                                        {{ [detail.op.class, detail.op.branch].filter(Boolean).join("·") }}
                                        <template v-if="detail.op.faction"> · {{ detail.op.faction }}</template>
                                        <template v-if="detail.op.releaseDate"> · {{ detail.op.releaseDate }} 实装</template>
                                    </div>
                                    <a class="bcf-prts" :href="detail.op.prtsUrl" target="_blank" rel="noreferrer">PRTS 干员页 ↗</a>
                                </div>
                            </div>
                            <div v-for="group in detailTagEntries" :key="group.tag.id" class="bcf-entry">
                                <div class="bcf-entry-head">
                                    <v-chip size="x-small" :color="group.tag.source === 'official' ? 'blue-grey' : 'primary'" variant="flat">
                                        {{ SOURCE_LABEL[group.tag.source] }}
                                    </v-chip>
                                    <b>{{ group.tag.name }}</b>
                                </div>
                                <div v-for="(e, i) in group.entries" :key="group.tag.id + '-' + i" class="bcf-entry-body">
                                    <div class="bcf-line"><span class="bcf-label">条件</span><span class="bcf-cond" v-html="renderCondition(e.condition)"></span></div>
                                    <div v-if="e.remark" class="bcf-line"><span class="bcf-label">备注</span><div class="bcf-remark" v-html="renderRemark(e.remark)"></div></div>
                                    <div v-if="e.subTags?.length" class="bcf-chips">
                                        <v-chip v-for="s in e.subTags" :key="s.group + s.value" size="x-small" variant="outlined">
                                            {{ s.value }}
                                        </v-chip>
                                    </div>
                                    <a class="bcf-prts" :href="e.prtsUrl" target="_blank" rel="noreferrer">PRTS 详情 ↗</a>
                                </div>
                            </div>
                        </template>

                        <template v-else>
                            <div class="bcf-dialog-head">
                                <div class="bcf-dialog-info">
                                    <div class="bcf-dialog-name">
                                        {{ detail.combo.combo }}
                                        <span v-if="comboRecTip(detail.combo.combo)" class="bcf-diamond" :title="comboRecTip(detail.combo.combo)"></span>
                                    </div>
                                    <div class="bcf-sub">阵容组合 · 提供者 {{ (detail.combo.providers || []).length }} 名</div>
                                </div>
                            </div>
                            <div class="bcf-entry">
                                <div class="bcf-entry-body">
                                    <div class="bcf-line"><span class="bcf-label">条件</span><span class="bcf-cond" v-html="renderCondition(detail.combo.condition || '—')"></span></div>
                                    <div v-if="detail.combo.remark" class="bcf-line"><span class="bcf-label">机制</span><div class="bcf-remark" v-html="renderRemark(detail.combo.remark)"></div></div>
                                    <div v-if="detail.combo.beneficiaries?.length" class="bcf-chips">
                                        <v-chip v-for="b in detail.combo.beneficiaries" :key="b" size="x-small" variant="outlined">{{ b }}</v-chip>
                                    </div>
                                </div>
                            </div>
                            <div v-for="(p, i) in detailComboProviders" :key="'prov-' + i" class="bcf-entry">
                                <div class="bcf-entry-head">
                                    <OperatorAvatar :char-id="providersCharId.get(p.operator) || ''" :rarity="providersRarity.get(p.operator) || 6" :size="32" border />
                                    <b>{{ p.operator }}</b>
                                    <em v-if="memberRecTip(p.operator)" class="bcf-diamond bcf-diamond--inline" :title="memberRecTip(p.operator)"></em>
                                </div>
                                <div class="bcf-entry-body">
                                    <div class="bcf-line"><span class="bcf-label">条件</span><span class="bcf-cond" v-html="renderCondition(p.condition || '无')"></span></div>
                                    <div v-if="p.remark" class="bcf-line"><span class="bcf-label">备注</span><div class="bcf-remark" v-html="renderRemark(p.remark)"></div></div>
                                    <a class="bcf-prts" :href="p.prtsUrl" target="_blank" rel="noreferrer">PRTS 详情 ↗</a>
                                </div>
                            </div>
                        </template>
                    </div>
                    <div v-if="detailSource" class="bcf-source bcf-source--footer">
                        数据来源：<a
                            class="bcf-arkdps"
                            :href="detailSource.url"
                            target="_blank"
                            rel="noreferrer"
                            :title="'ArkDPS（作者：' + detailSource.author + '）· 官网 ark-dps.com/zh/'"
                        >{{ detailSource.model }}</a>（作者：{{ detailSource.author }} · 官网 ark-dps.com/zh/）<template v-if="detailSource.parts">｜引用部分：{{ detailSource.parts }}</template><template v-if="detailSource.detail">——{{ detailSource.detail }}</template>
                    </div>
                    <div class="bcf-dialog-foot">
                        <v-btn variant="text" @click="dialog = false">关闭</v-btn>
                    </div>
                </v-card>
            </v-dialog>
        </template>
    </div>
</template>

<style scoped>
.bcf-page {
    max-width: 1280px;
    margin: 0 auto;
    color: var(--c-text-color);
}

.bcf-header {
    margin-bottom: 18px;
}

.bcf-kicker {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--c-text-tip-color);
    margin: 0 0 6px;
}

.bcf-header h1 {
    font-size: clamp(22px, 3vw, 32px);
    margin: 0 0 8px;
}

.bcf-description {
    font-size: 14px;
    line-height: 1.9;
    color: var(--c-text-tip-color);
    margin: 0 0 10px;
    max-width: 860px;
}

.bcf-note {
    display: flex;
    gap: 8px;
    font-size: 13px;
    line-height: 1.8;
    color: var(--c-text-tip-color);
    background: var(--c-page-background-color-secondary);
    border-left: 3px solid var(--c-theme-primary);
    padding: 8px 12px;
    border-radius: 4px;
}

.bcf-note + .bcf-note {
    margin-top: 8px;
}

.bcf-note > strong {
    color: var(--c-text-color);
    flex-shrink: 0;
    white-space: nowrap;
}

.bcf-note--about {
    border-left-color: #4aa9ea;
}

.bcf-note--combo {
    border-left-color: #9a7ce0;
}

.bcf-note--disclaimer {
    border-left-color: #e0a355;
}

.bcf-diamond-inline {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin: 0 2px;
    transform: rotate(45deg);
    background: conic-gradient(from 45deg, #ff5d5d, #ffd24a, #7fd88f, #4aa9ea, #b47ffc, #ff5d5d);
    vertical-align: -1px;
}

.bcf-loading,
.bcf-error {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 48px 0;
    justify-content: center;
    color: var(--c-text-tip-color);
}

.bcf-error {
    color: #e77351;
}

/* ---- 筛选面板 ---- */

.bcf-filter {
    padding: 14px 16px;
    background: var(--c-page-background-color-secondary);
    border-color: var(--c-border-color);
}

.bcf-filter-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.bcf-search {
    flex: 1 1 260px;
    max-width: 420px;
}

.bcf-selected-count {
    font-size: 13px;
    color: var(--c-text-tip-color);
}

.bcf-selected-count b {
    color: var(--c-theme-primary);
}

.bcf-selected {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--c-border-color);
}

.bcf-group {
    margin-top: 10px;
}

.bcf-group-head {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    color: var(--c-text-color);
    padding: 2px 0;
}

.bcf-group-body {
    padding: 6px 0 2px;
}

.bcf-cat {
    font-size: 12px;
    color: var(--c-text-tip-color);
    margin: 6px 0 4px;
}

.bcf-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

/* 「阵容组合」只可单独选择：虚线描边 + 紫色文字；描边落在页面上（不是落在自身上），
   所以两种主题下都用同一支紫色，选中后蓝色填充外仍能看到虚线环。悬停提示见 title */
.bcf-chip--solo {
    outline: 1px dashed #9a7ce0;
    outline-offset: 2px;
    font-weight: 700;
    color: #7d5bd6;
}

.bcf-subpanels {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--c-border-color);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.bcf-subhead {
    font-size: 12px;
    color: var(--c-text-tip-color);
    margin-bottom: 4px;
}

/* ---- 结果区 ---- */

.bcf-stats {
    margin: 16px 2px 10px;
    font-size: 14px;
    color: var(--c-text-tip-color);
}

.bcf-stats b {
    color: var(--c-theme-primary);
}

.bcf-tip {
    margin-left: 8px;
    font-size: 12px;
}

.bcf-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
}

.bcf-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 10px 10px;
    cursor: pointer;
    background: var(--c-card-background-color);
    border-color: var(--c-border-color);
    transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.bcf-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 14px var(--c-box-shadow-color);
}

.bcf-name {
    font-weight: 700;
    font-size: 14px;
    text-align: center;
}

.bcf-stars {
    font-size: 12px;
    color: #f2c75c;
    letter-spacing: 1px;
}

.bcf-sub {
    font-size: 12px;
    color: var(--c-text-tip-color);
    text-align: center;
}

.bcf-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
    margin-top: 2px;
}

/* 荐：菱形静态炫彩标识 */
.bcf-diamond {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 12px;
    height: 12px;
    transform: rotate(45deg);
    background: conic-gradient(from 45deg, #ff5d5d, #ffd24a, #7fd88f, #4aa9ea, #b47ffc, #ff5d5d);
    border: 1px solid rgba(255, 255, 255, 0.75);
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.35);
}

.bcf-combo-card {
    align-items: stretch;
}

.bcf-combo-name {
    font-weight: 700;
    font-size: 15px;
    text-align: center;
}

/* 行内小号菱彩：详情卡片里只用一个图标标荐，不加文字 */
.bcf-diamond--inline {
    position: static;
    width: 9px;
    height: 9px;
    flex-shrink: 0;
}

.bcf-providers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
}

.bcf-combo-note {
    font-size: 12px;
    line-height: 1.7;
    color: var(--c-text-tip-color);
}

.bcf-empty {
    padding: 40px 0;
    text-align: center;
    color: var(--c-text-tip-color);
}

/* ---- 触底加载哨兵 ---- */

.bcf-sentinel {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 52px;
    padding: 16px 0 4px;
    background: none;
    border: none;
    font-family: inherit;
    font-size: 12px;
    color: var(--c-text-tip-color);
    cursor: pointer;
}

/* 迷你进度环在 flex 里会被拉成椭圆，钉住尺寸 */
.bcf-sentinel :deep(.v-progress-circular) {
    flex-shrink: 0;
}

.bcf-sentinel--done {
    cursor: default;
}

.bcf-sentinel--done b {
    color: var(--c-theme-primary);
}

/* ---- 卡片入场（纯 CSS） ----
   原先用 TransitionGroup，它的渲染函数每轮都要对每个已渲染子节点读 offsetLeft/offsetTop
   （positionMap），move 类存在时 onUpdated 还要再遍历三遍。窗口化之后卡片已经很少，
   但没必要再付这笔钱，所以换成 CSS 动画：新进入窗口的卡片自带入场，已在 DOM 里的不动。 */

@keyframes bcf-card-in {
    from {
        opacity: 0;
        transform: translateY(6px) scale(0.94);
    }
}

.bcf-card {
    /* 不写 animation-fill-mode：动画结束后不残留 transform，否则会盖掉 :hover 的 translateY(-2px) */
    animation: bcf-card-in 0.16s ease;
}

@media (prefers-reduced-motion: reduce) {
    .bcf-card {
        animation: none;
        transition: none;
    }
}

/* ---- 术语（基建技能一览同款：天蓝 + 下划线，点击弹浮窗） ---- */

:deep(.combat-term) {
    color: #00bbff;
    text-decoration: underline;
    text-decoration-color: grey;
    cursor: pointer;
}

/* ---- 弹窗 ---- */

/* v-dialog 被 teleport 到 body 下，拿不到 v-app(.theme-*) 上的 --c-* 变量，
   这里改用 Vuetify 主题变量（overlay 容器自带 v-theme--light/dark） */
.bcf-dialog {
    display: flex;
    flex-direction: column;
    padding: 0;
    background: rgb(var(--v-theme-surface));
    color: rgb(var(--v-theme-on-surface));
    max-height: 80vh;
}

.bcf-dialog-body {
    padding: 18px 20px;
    overflow-y: auto;
    flex: 1 1 auto;
    min-height: 0; /* flex 子项默认不小于内容高度，长内容会顶穿 max-height 盖住页脚 */
}

.bcf-dialog .bcf-sub,
.bcf-dialog .bcf-label {
    color: rgba(var(--v-theme-on-surface), 0.6);
}

.bcf-dialog .bcf-entry {
    border-top-color: rgba(var(--v-theme-on-surface), 0.12);
}

.bcf-dialog-head {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 12px;
}

.bcf-dialog-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.bcf-dialog-name {
    font-size: 20px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 10px;
}

.bcf-dialog-name .bcf-diamond {
    position: static;
}

.bcf-prts {
    color: rgb(var(--v-theme-primary));
    font-size: 12px;
    text-decoration: none;
}

.bcf-prts:hover {
    text-decoration: underline;
}

.bcf-entry {
    margin-top: 12px;
    border-top: 1px dashed var(--c-border-color);
    padding-top: 10px;
}

.bcf-entry-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}

.bcf-entry-body {
    margin: 0 0 8px;
    padding-left: 4px;
}

.bcf-line {
    display: flex;
    gap: 8px;
    font-size: 13px;
    line-height: 1.9;
}

.bcf-label {
    flex-shrink: 0;
    color: var(--c-text-tip-color);
    width: 2.5em;
}

/* ---- 条件 chips ---- */

.bcf-dialog :deep(.bcf-req) {
    display: inline-block;
    margin: 0 4px 2px 0;
    padding: 0 6px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.7;
    background: rgba(var(--v-theme-on-surface), 0.08);
}

/* ---- 备注分块（结构见源项目 docs/ui-render-rules.md §6） ---- */

.bcf-remark {
    flex: 1 1 auto;
    min-width: 0;
}

.bcf-dialog :deep(.bcf-block) {
    margin: 4px 0;
}

.bcf-dialog :deep(.bcf-block-head) {
    font-size: 12.5px;
    font-weight: 600;
}

.bcf-dialog :deep(.bcf-block--ability > .bcf-block-head) {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgb(var(--v-theme-primary));
}

.bcf-dialog :deep(.bcf-block--ability > .bcf-block-head)::before {
    content: "";
    width: 3px;
    height: 0.9em;
    border-radius: 2px;
    background: currentColor;
}

.bcf-dialog :deep(.bcf-items) {
    display: flex;
    flex-direction: column;
    margin-top: 2px;
}

.bcf-dialog :deep(.bcf-item) {
    display: flex;
    gap: 8px;
    align-items: baseline;
}

.bcf-dialog :deep(.bcf-k) {
    flex: 0 0 auto;
    min-width: 3.4em;
    padding-right: 8px;
    border-right: 1px solid rgba(var(--v-theme-on-surface), 0.18);
    font-size: 12px;
    text-align: right;
    color: rgba(var(--v-theme-on-surface), 0.55);
}

.bcf-dialog :deep(.bcf-v) {
    flex: 1 1 auto;
    min-width: 0;
}

/* 成绩：主色左边框 + 淡底，成绩行左列对齐 */
.bcf-dialog :deep(.bcf-block--score) {
    padding: 5px 10px;
    border-left: 3px solid rgb(var(--v-theme-primary));
    border-radius: 0 6px 6px 0;
    background: rgba(var(--v-theme-primary), 0.07);
}

.bcf-dialog :deep(.bcf-block--score > .bcf-block-head) {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.bcf-dialog :deep(.bcf-block-title) {
    font-size: 12.5px;
    font-weight: 700;
    color: rgb(var(--v-theme-primary));
}

.bcf-dialog :deep(.bcf-block-case) {
    font-size: 12px;
    color: rgba(var(--v-theme-on-surface), 0.7);
}

/* 计算：默认折叠，点标题展开 */
.bcf-dialog :deep(.bcf-calc-head) {
    cursor: pointer;
    user-select: none;
    color: rgba(var(--v-theme-on-surface), 0.6);
}

.bcf-dialog :deep(.bcf-calc-head)::before {
    content: "▸ ";
}

.bcf-dialog :deep(.bcf-block--calc.is-open > .bcf-calc-head)::before {
    content: "▾ ";
}

.bcf-dialog :deep(.bcf-block--calc > .bcf-items) {
    display: none;
}

.bcf-dialog :deep(.bcf-block--calc.is-open > .bcf-items) {
    display: flex;
}

.bcf-dialog :deep(.bcf-block--calc),
.bcf-dialog :deep(.bcf-block--note) {
    font-size: 12px;
    color: rgba(var(--v-theme-on-surface), 0.6);
}

.bcf-dialog-foot {
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
    padding: 8px 16px 12px;
    border-top: 1px dashed rgba(var(--v-theme-on-surface), 0.12);
}

/* ---- ArkDPS 引用高亮（外链直达） ---- */

.bcf-arkdps {
    color: #4ea1ff;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: 600;
    background: rgba(78, 161, 255, 0.12);
    border-radius: 3px;
    padding: 0 2px;
}

.bcf-arkdps:hover {
    background: rgba(78, 161, 255, 0.24);
}

.bcf-source {
    margin-top: 6px;
    font-size: 12px;
    color: rgba(var(--v-theme-on-surface), 0.7);
}

.bcf-source--footer {
    margin: 0 16px 4px;
    padding-top: 8px;
    border-top: 1px dashed rgba(var(--v-theme-on-surface), 0.12);
    line-height: 1.7;
}

/* ---- 玩家 TAG 悬浮说明（tooltip 内容，teleport 后仍带 scoped 属性） ---- */

.bcf-tt-body {
    max-width: 360px;
    font-size: 13px;
    line-height: 1.65;
    color: #f2f4f8;
}

.bcf-tt-title {
    font-weight: 700;
    margin-bottom: 4px;
    color: #ffffff;
}

.bcf-tt-body p {
    margin: 0;
}

.bcf-tt-note {
    margin-top: 6px !important;
    color: rgba(242, 244, 248, 0.66);
    font-size: 12px;
}

/* ---- 响应式 ---- */

@media (max-width: 700px) {
    .bcf-page {
        padding: 16px 12px 32px;
    }

    .bcf-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 10px;
    }
}
</style>

<style>
/* v-tooltip 内容被 teleport 到 body 下，scoped 选择器够不到遮罩层自身；
   这里显式给深色底与高对比文字，避免与主题底色/文字色接近而难以分辨 */
.v-overlay__content.bcf-tt {
    background: #23272f !important;
    color: #f2f4f8 !important;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    padding: 10px 12px;
}

.v-overlay__content.bcf-tt .bcf-arkdps {
    color: #8fc3ff;
    background: rgba(143, 195, 255, 0.16);
}
</style>
