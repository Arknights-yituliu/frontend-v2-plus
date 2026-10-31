---
name: operator-ability-description
description: House style for writing one-line Arknights operator capability blurbs and operator-level verdicts in Chinese (作战描述 / 独立点评), used by pages such as 感谢庆典特别招募. Use when writing, rewriting, or reviewing any short operator description that a player reads on the site — especially when deciding how much numeric detail to include, whether an evaluative claim is allowed, or how to phrase a "is this operator still good" judgement.
---

## Overview

This skill records the team's copy standard for **short operator descriptions** shown in
operator cards on the site. Two registers coexist, in the same JSON, and must not be mixed:

| Register | Chinese label | Scope | Evaluative claims |
| --- | --- | --- | --- |
| **Capability blurb** | `作战描述` (key = player tag name) | One operator × one tag | **Forbidden** unless the operator ranks within 30% of the tag leader |
| **Operator verdict** | `独立点评` (operator-level key) | One operator, whole card | **Expected** — history, current role, who should pick |

The capability blurb answers *"what does this operator actually do under this tag?"*.
The verdict answers *"should I care about this operator today?"*.

Reference implementation: `src/static/json/tools/thanksgiving-combat-descriptions.json`,
rendered by `src/pages/tools/thanksgiving-special-recruitment.vue` (`buildCombatDescriptions`).

---

## Register A — `作战描述` (capability blurb)

### A1. Structure: mechanism first, consequence last

Every blurb follows **what makes it work → what that buys you**. Never start with an adjective.

```
3 技能把攻击范围扩大到整个战场、同时锁定 3 个目标，攻击力 +80%。
└─ mechanism ─────────────────────────────────────┘ └─ result ─┘
```

```
共振装置可以铺到任意近战位、不受射程限制，伤害借用持有者攻击力结算。
```

Bad — leads with a verdict and never says how it works:

```
决战歼灭：非常强的清场技能，值得抽取。
```

### A2. Numbers: verbatim when printed, approximate when computed

This is the single most important rule.

| Data origin | Treatment | Example |
| --- | --- | --- |
| Value printed on the skill/talent/potential in-game | **Reproduce exactly** | `攻击力 +130%`、`攻速 +80`、`法抗 -40%`、`阻挡数 +2`、`每 3 秒 1 点技力`、`85% 概率造成 0.2 秒晕眩` |
| Value obtained by arithmetic on top of those (total damage, hit count, DPS, multiplier totals) | **Rough magnitude only, or omit** | `15 秒内能打出一百多段`、`8 秒内一共能结算一百二十多次` |

Do **not** write `等效每秒 3.8 段`, `总倍率 14256%`, `DPS ≈ 4261/s`, or any figure that
required dividing by a window or multiplying hits by a multiplier. A newcomer cannot use
them and they imply a precision the estimate does not have.

When a rough magnitude is still useful, anchor it to the printed duration so it stays checkable:

```
2 技能把攻击间隔缩短到原来的 15%，30 秒能打出一百多段，适合磨次数盾和持续性停顿单个敌人。
```

### A3. Conditions belong in parentheses, right after the claim

Modifiers that gate the number are appended inline, never promoted to a separate clause:

```
在场就给全场友方加 8 点攻速（X 模组下攻击范围内再 +5），是游戏早期的攻速调轴干员之一。
部署时让自身与一名随机友方攻击力 +8%，X 模组 3 级后改为两名随机友方、潜能 6 可到 +10%，人选不可控。
```

Order inside the parenthesis: 模组/专精 → 潜能 → 前提条件. Keep each parenthetical to one
qualifier group; if two independent caveats stack, split the sentence.

### A4. The evaluation gate

An evaluative phrase (`主力`, `极高`, `专治`, `最稳`, `少有`, `强度可观`, `收益明显`, `通用性最好`)
is allowed **only** if you can answer all three:

1. **Which metric in the tag decides this?** (e.g. 次数对策 → 等效每秒段数; 拐杖攻速 → 攻击速度增量)
2. **Where does this operator rank on that metric?**
3. **Is the gap to rank 1 ≤ 30%?**

If the gap is over 30%, or the metric cannot be ranked, delete the adjective and state the
mechanism instead. Phrases that were deleted under this rule from real copy:

| Claim | Reality | Result |
| --- | --- | --- |
| 安洁莉娜「专门磨护盾和高防」 | 3.8 段/秒, rank 18/56, 75% behind leader | rewritten to "适合磨次数盾和持续性停顿单个敌人" |
| 能天使「专治护盾和高防御目标」 | 8.0 段/秒, rank 6/56, 47% behind | deleted |
| 艾雅法拉「大范围法术清场主力」 | 7872% window, rank 5/14, 53% behind | deleted |
| 银灰「物理清场常客」 | 81726 总伤, rank 25/33 | deleted |
| 安洁莉娜「通用性最好的攻速拐之一」 | +8 vs 阿 +50 / 烈夏 +35 | "游戏早期的攻速调轴干员之一" |

For history/standing claims that no metric can settle, the blurb must stay silent — that is
what `独立点评` is for.

### A5. Voice

- **No personal pronouns.** The operator table has no gender field
  (`src/static/json/operator/character_table_simple.v2.json`), so `他/她` cannot be verified.
  Use `自身`、`该干员`、`本体`, or name the summon (`让 Mon3tr 部署在远处`).
  Note `其他`/`其它` legitimately contains `他` — check matches, do not blind-replace.
- **Sentence-case verbs, no exclamation, no rhetorical questions.** Brackets `（）` for
  conditions, `「」` for skill/talent names, `、` inside enumerations, `；` to join two
  parallel effects of the same skill.
- **One blurb = one sentence** (a second clause after `，` or `；` is fine; a second full
  stop is not).
- End on the practical consequence when there is one: `放在远处也能控住敌人`、
  `减速的同时还多受一份伤害`、`队友的物理伤害同样受益`.

### A6. Key information must survive compression

A blurb is short, but **shortness must come out of the prose, never out of the facts**. Before
you trim a sentence, walk the member's `remark` blocks and check that each distinct mechanic
still has a home somewhere in the blurb. The failure mode is real: an early pass described
夜莺 as "法抗 +17 / 圣域 +150%" and dropped the 幻影 summon entirely — which the data calls
"明确的保人增量" and is the reason the Y module wins over X for that tag.

**The checklist — if the data mentions it and it changes what the operator does, it belongs:**

| Category | Why it cannot be dropped | Example |
| --- | --- | --- |
| Summons / traps / drones | Usually the whole point of the entry | 夜莺「幻影」(75 法抗、40% 物理闪避、嘲讽等级 1、每次部署给 1 个、上限 3 个) |
| Count / uptime limits | Explains the real ceiling vs. the per-instance number | 麦哲伦「最多同时部署 4～5 个」、多萝西「最多拥有 10 个（X 模组 13 个）」 |
| Form switching | Same operator, different skill = different unit | 麦哲伦 2 技能「龙腾.L」单体法术 / 3 技能「龙腾.A」群体物理 |
| Second-phase mechanics | Half the tag's reason for existing | 澄闪 攻击同一目标伤害逐次提高（上限 110%）并 10% 概率自爆 |
| Chain / secondary triggers | Range-only descriptions hide the combo | 多萝西 3 技能延迟 2 秒连锁引爆其他陷阱 |
| State protections | Changes how it survives, not how it hits | 陈 3 技能期间无敌且不可阻挡 |
| Line differences | 特限 vs 通用 branch diverge in scope | 灵知 通用模组仅攻击范围内、特限模组覆盖全场 |
| Non-stacking notes | Prevents the reader from over-counting | 温蒂 工程蓄水炮同名技能只刷新不叠加 |

**Also state the branch when the data splits one:**

```
特限模组下虚影不占部署位，部署虚影时自身还会再放一次技能。
天赋让寒冷状态的敌人受到 32% 脆弱、冻结时翻倍到 64%，通用模组只作用于攻击范围内，特限模组则覆盖全场。
```

If a tag's data explicitly says a module makes no difference (`两条模组线均不改变本技能的 +55%`),
do not invent a module caveat — silence there is accurate.

Length ceiling: a blurb may reach **~110 Chinese characters** when it is carrying a summon or
a branch. Prefer that over dropping a mechanic that the data calls out in a 说明 block.

### A7. Tag-specific openers

Each player tag has a natural grammatical shape; leading with the right one keeps the page
scannable. Learn these from `src/static/json/combat/player-tags-criteria.json` `tags[].intro`.

| Tag | Typical shape |
| --- | --- |
| 决战歼灭 | `<N> 技能攻击力 +X%、范围 <N> 格、同时打 <N> 个目标` |
| 次数对策 | `把攻击间隔压到…` / `变成 N 连射` → 段数区间 |
| 吃拐一轮秒 | `<N> 技能是 N 连射 / N 次斩击，每次 <X>%` |
| 远程消耗 | `<召唤物>可以放到…不受射程限制` |
| 插拔容错 | `再部署时间 -N 秒` / `初动已满，落地即可…` |
| 拐杖 | `给…（对象）加 <属性> +X%` |
| 充电 | `让…每 N 秒回 1 点技力` / `每次治疗顺带回技力` |
| 保人 | `天赋常驻给…加防御/法抗` / `N 技能让…闪避` |
| 高档控制 | `<召唤物>落在远处就能…` / `每次攻击附带 N 秒<异常>` |

---

## Register B — `独立点评` (operator verdict)

Used when the operator has no player tags, or when the reader needs a "is this still worth
picking" answer rather than a mechanism. Written in the maintainer's own voice — it is
allowed to judge, but it must judge **concretely**.

### B1. The four-part arc

```
[历史和定位] ∪ [机制或数值亮点] ∪ [版本变化 / 现状] ∪ [给谁用]
```

Only three of the four are required, but the **current-state clause and the audience clause
are mandatory**. A verdict with no "now" and no "who" is not a verdict.

Reference texts (verbatim, authored by the maintainer — treat as the gold standard):

```
煌    二技能在如今的挂机作业中仍占有一定的使用量，缺少挂机干员的玩家可以考虑选取。
刻俄柏 十分强力的、能够对策敌方高防御力敌人的干员，虽然因为近期较多敌方单位实装了法术减伤属性，
      导致实用度有所下降，但作为迄今为止唯二的百分比伤害类干员，
      仍推荐喜欢作战玩法的玩家作为对策干员选取。
泥岩  直到四年前还在作为基石干员高光，如今大多用作矢量突破的特别战线驻守干员，
      在作战方面没有太多可圈可点的地方。
黑键  在四年前作为法术端的秒杀类对策干员，在吃拐的情况下有一段时间的高光，
      如今大多用作矢量突破的特别战线驻守干员。
```

### B2. What makes the voice work

- **Time is explicit.** `如今`、`直到四年前`、`近期`、`有一段时间的高光`. Never "很强" in a
  vacuum — always anchored to when.
- **Name the actual mode.** `挂机作业`、`矢量突破的特别战线驻守`、`法术减伤`. Vague usage like
  "日常表现不错" is banned.
- **Concede before/after you praise.** `虽然…导致实用度有所下降，但作为…仍推荐…` — the drop is
  stated as a cause (`较多敌方单位实装了法术减伤属性`), not as vibes.
- **Blunt verdicts are allowed and should be blunt.** `在作战方面没有太多可圈可点的地方` is
  preferred over `表现中规中矩` / `略显乏力` — hedging sounds like marketing.
- **Recommendation names a player type, not a star rating.** `缺少挂机干员的玩家`、
  `喜欢作战玩法的玩家`、`需要应对高防御敌人的玩家`. Never `建议抽取`、`T0`、`必抽`.
- **Uniqueness must be countable.** `迄今为止唯二的百分比伤害类干员` — if you claim uniqueness,
  state the count.
- Community vocabulary is welcome here (and only here): `基石干员`、`高光`、`吃拐`、`对策干员`、
  `挂机作业`. Do not introduce these into `作战描述`.
- Still no pronouns.

### B3. Things the verdict must not contain

- Numbers needing a calculator (same rule as A2 — this register stays readable).
- Superlatives about the whole roster (`最强法伤`、`无可替代`). Ranked statements inside a named
  category are fine (`唯二的百分比伤害干员`).
- Anything you cannot source. If the maintainer asserts a historical arc, take it as given —
  do **not** invent dates or modes to fill a gap.

---

## Data sourcing and verification

Never write a number from memory. Source of truth is
`src/static/json/combat/operator-tags.json`:

```python
import json
t = json.load(open('src/static/json/combat/operator-tags.json', encoding='utf-8'))
tag = [x for x in t['tags'] if x['name'] == '次数对策'][0]
for m in tag['members']:
    if m['operator'] == '安洁莉娜':
        print('COND:', m.get('condition'))
        for block in m.get('remark', []):
            for item in block.get('items', []):
                print('-', item.get('text'))
```

Fields that matter:

| Field | Use |
| --- | --- |
| `members[].condition` | gate conditions (`精英2；X模组3级；潜能5`) → parentheticals |
| `members[].remark[].items[].text` | the printed values to copy verbatim |
| `members[].subTags` | sub-tag (`多段伤害` / `间隔伤害` / `易伤(脆弱)` …) tells you which metric ranks |
| `members[].calc.steps[].result` | **computed** results — use only as rough magnitude |

### Ranking a tag (required before any evaluative word)

```python
# 次数对策 ranks by 等效每秒段数; 决战歼灭 by 15 秒窗口总倍率 or 全技能总伤;
# 拐杖 by the specific buff magnitude; 保人 / 高档控制 are usually not rankable.
best = 0
for s in (m.get('calc') or {}).get('scenarios', []):
    for st in s.get('steps', []):
        if '等效每秒' in (st.get('title') or '') and st.get('unit') == '段/秒':
            best = max(best, float(st['result']))
```

Sort every member of the tag, find the leader, compute the gap. Over 30% → no adjective.

### Coverage check (run before saving)

```python
import json
t = json.load(open('src/static/json/combat/operator-tags.json', encoding='utf-8'))
c = json.load(open('src/static/json/tools/thanksgiving-special-recruitment.json', encoding='utf-8'))
d = json.load(open('src/static/json/tools/thanksgiving-combat-descriptions.json', encoding='utf-8'))['descriptions']
names = [o['name'] for g in c['groups'] for o in g['operators']]
need = {n: set() for n in names}
for tag in t['tags']:
    if tag.get('source') != 'player':
        continue
    for m in tag.get('members', []):
        if m.get('operator') in need:
            need[m['operator']].add(tag['name'])
for n, tags in need.items():
    key = set(k for k in d.get(n, {}) if k != '独立点评')
    if key != tags:
        print('MISMATCH', n, '缺', tags - key, '多', key - tags)
```

Operators with **no** player tag carry only `独立点评`; the page appends any key that is not a
player tag as a supplementary entry, so a verdict-only entry still renders.

### Style gate (run before saving)

```python
import re
# computed values that must not appear
re.compile(r'段/秒|DPS|总伤|等效每秒')
# unverified superlatives
re.compile(r'主力|常客|最稳|通用性最好|极高|很强|不错|少有|专治|一举|强度可观|收益明显')
# pronouns (其他/其它 are fine — review matches by hand)
re.compile(r'[她他]')
```

---

## Output format

`src/static/json/tools/thanksgiving-combat-descriptions.json`:

```json
{
  "version": "v0.5",
  "note": "<restate the two-register rule and the number policy in one sentence>",
  "descriptions": {
    "凯尔希": {
      "远程消耗": "<作战描述 — player tag name as key>",
      "插拔容错": "<作战描述>",
      "高档控制": "<作战描述>"
    },
    "泥岩": {
      "独立点评": "<operator verdict — used when the operator has no player tags>"
    }
  }
}
```

Rules for the file itself:

- Keys under each operator are **player tag names exactly as they appear in
  `operator-tags.json`** (`tag.name`, never `tag.id`), plus the optional `独立点评`.
- Keep `note` current: it is the machine-readable half of this skill and the only thing a
  future contributor sees without opening the skill.
- Sort operators by recruitment group order, then tag order as it appears in the data.
- Bump `version` on every content pass that rewrites more than a couple of entries.

## Review checklist

1. Every blurb starts with a mechanism, not an adjective.
2. Every printed number matches `remark[].items[].text` verbatim.
3. No computed figure (rates, totals, multiplier sums) survived.
4. Each remaining adjective has a rank gap ≤ 30% behind you in a note or commit message.
5. Conditions are in parentheses, in 模组 → 潜能 → 前提 order.
6. No `他/她` (and no accidental damage to `其他`).
7. **Every summon, cap, form switch, signature special-module effect and 说明-level caveat
   from the member's blocks appears in the blurb** (see A6); nothing was cut for brevity.
8. Verdicts contain a `如今`-style current-state clause and a named audience.
9. Coverage script reports no mismatch; style gate is clean.
10. Page renders: every operator shows at least one entry, or intentionally shows none.
