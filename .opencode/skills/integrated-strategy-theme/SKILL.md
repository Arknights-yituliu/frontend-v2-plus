---
name: integrated-strategy-theme
description: Create or update an integrated strategy theme component for the Arknights integrated strategies endings page. Use when adding a new season/theme, updating an existing theme's endings, or converting casual descriptions of how to reach endings into formatted Vue component code.
---

## Overview

This skill covers the end-to-end process of creating or updating an integrated strategy (集成战略 / IS) theme component. These components display step-by-step guides for reaching each ending in a given IS season, rendered via `el-timeline`.

## Section 1: Insertion Method

Creating a new theme requires changes in two files plus creating one new file.

### 1.1 Create the theme component file

Create the file at:
```
src/pages/information/integrated-strategies/themes/<EnglishPascalCaseName>.vue
```

Template skeleton:

```vue
<script lang="js" setup>
import {MoreFilled} from '@element-plus/icons-vue'
import BOSS from '@/components/information/BOSS.vue'
</script>

<template>
  <!-- <中文主题名> -->
  <!-- 事件：https://prts.wiki/w/<主题名>/事件一览 -->
  <!-- 收藏品：https://prts.wiki/w/<主题名>/<收藏品页面> -->
  <!-- 区域：https://prts.wiki/w/<主题名>#区域 -->
  <div>
    <el-timeline>
      <el-timeline-item placement="top" timestamp="第一结局">
        <el-card>
          <h3><结局名称></h3>
          <el-timeline>
            <!-- ... steps ... -->
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第N层，通过
                <el-link href="<wiki_url>" target="_blank" type="primary">
                  【<关卡名>】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <!-- ... more endings ... -->
      <el-timeline-item placement="top" timestamp="完结"/>
      <!-- 不要删除末尾时间线节点，因组件自身样式特性，删除该节点会导致最后一个时间线节点内部的时间线组件样式显示异常 -->
    </el-timeline>
  </div>
</template>

<style scoped>
@import "@/assets/css/information/integratedStrategies.scss";
</style>
```

### 1.2 Register the component in the container

Edit `src/pages/information/integrated-strategies/integratedStrategies.vue`:

1. Add import line in `<script setup>`:
   ```js
   import <EnglishName> from "./themes/<EnglishPascalCaseName>.vue";
   ```

2. Add display name to the `options` array (in release order):
   ```js
   const options = [
     '傀影与猩红孤钻',
     '水月与深蓝之树',
     // ... existing ...
     '<中文主题名>'
   ]
   ```

3. Add entry to `componentMap`:
   ```js
   const componentMap = {
     '傀影与猩红孤钻': PhantomAndCrimsonSolitaire,
     // ... existing ...
     '<中文主题名>': <EnglishName>
   } as const
   ```

### 1.3 Update an existing theme

If updating an existing theme, edit the theme file directly. The insertion steps above do not apply; only Sections 2 and 3 apply.

---

## Section 2: Writing Style Conventions

All style rules are distilled from the five existing theme files. Follow these rules exactly; do not deviate.

### 2.1 File Annotation Comments

The first lines inside `<template>` must have these HTML comments:

1. Chinese theme name: `<!-- 傀影与猩红孤钻 -->`
2. Event wiki link: `<!-- 事件：https://prts.wiki/w/<主题名>/事件一览 -->`
3. Collection wiki link: `<!-- 收藏品：https://prts.wiki/w/<主题名>/<收藏品页面名> -->`
4. Area wiki link: `<!-- 区域：https://prts.wiki/w/<主题名>#区域 -->`

Some themes have theme-specific additional comments (e.g., 通宝 for Sui's Garden, 思绪 for Sarkaz). Add these if the theme has special mechanics.

### 2.2 Top-level Timeline Structure

```html
<div>
  <el-timeline>
    <el-timeline-item placement="top" timestamp="第N结局">
      <!-- one ending block -->
    </el-timeline-item>
    <!-- ... all endings ... -->
    <el-timeline-item placement="top" timestamp="完结"/>
    <!-- 不要删除末尾时间线节点，因组件自身样式特性，删除该节点会导致最后一个时间线节点内部的时间线组件样式显示异常 -->
  </el-timeline>
</div>
```

**Critical rule:** The final `<el-timeline-item placement="top" timestamp="完结"/>` node and the comment after it MUST always be present. Do not remove them.

### 2.3 Each Ending Block Structure

```html
<el-timeline-item placement="top" timestamp="第N结局">
  <el-card>
    <h3>结局名称</h3>
    <el-timeline>
      <!-- step items -->
    </el-timeline>
  </el-card>
</el-timeline-item>
```

- `timestamp` uses Chinese ordinals: `第一结局`, `第二结局`, `第三结局`, `第四结局`, `第五结局`
- `<h3>` contains the ending's poetic name (e.g., `舞会终场`), no extra styling or links

### 2.4 Icon & Color Mapping

Every `<el-timeline-item>` step must have an icon and a visual color. Use this table:

| Icon | Semantic Meaning | Visual | Used When |
|------|-----------------|--------|-----------|
| `BOSS` | Final boss fight / achieve ending | `color="#8A0993"` | The final step of each ending; "抵达第N层，通过...达成结局" |
| `Battle` | Special combat | `color="#5EDFD6"` | A step involving entering a special battle (ISW-SP / ISW-NO), or defeating a specific roaming enemy |
| `MoreFilled` | Random encounter / generic event | `type="primary"` | "进入不期而遇，触发事件..."; any event step that is not fate-turning/shop/exchange |
| `Flag` | Fate-turning / destiny node (命运所指) | `type="warning"` | Destiny node events, e.g., "抵达第N层，在险路恶敌的前一个命运所指节点中触发事件..." |
| `Refresh` | Exchange / trade-off node (失与得) | `type="success"` | "进入任意一个失与得节点..." |
| `Coin` | Shop / purchase | `type="success"` | "进入...易与节点购买藏品" or "进入任意一个诡意行商节点，寻找并购买..." |
| `Warning` | Caution / alert | `type="danger"` | A step that warns the player: "if you do X you will lose the ability to reach this ending" |
| `Right` | Advance step (先行一步) | `type="primary"` | "进入任意一个先行一步节点..." |
| `Search` | Analysis / truth-seeking (去伪存真) | `color="rgb(255, 214, 105)"` | Sarkaz-specific: "在任意一个去伪存真节点将...组合成..." |

**Import rules:**
- Only import the icons you actually use from `@element-plus/icons-vue`
- `BOSS` and `Battle` are custom components, import them from `@/components/information/BOSS.vue` and `@/components/information/Battle.vue`
- Always include `MoreFilled` in the import as it is used in nearly every theme

**Color rules:**
- Custom SVG components (BOSS, Battle) use `color="..."` attribute
- Element Plus icons use `type` attribute (unless specified otherwise above with `color`)
- Two icons sharing the same `type` is allowed — they represent cursorily related actions (e.g., Coin and Refresh are both commerce-related)

### 2.5 Event Link Patterns (el-link)

**Standard event link** (within flow text):
```html
<el-link href="wiki_url" target="_blank" type="primary">
  "事件名称"
</el-link>
```

**Underlined event link inside a tooltip** (for inline event references):
```html
<el-link :underline="false"
         href="wiki_url"
         target="_blank"
         type="primary">
  <el-text tag="ins" type="primary">"事件名称"</el-text>
</el-link>
```

### 2.6 Collectible/Item Patterns

**Collectible name with tooltip showing its effect:**
```html
<el-tooltip content="收藏品效果描述" effect="light" placement="top">
  <el-text tag="ins">【收藏品名称】</el-text>
</el-tooltip>
```

**Key rules:**
- Collectible names are wrapped in `【】` (Chinese brackets)
- The tooltip `content` is the collectible's in-game effect text
- `effect="light"` and `placement="top"` are always used
- Some collectibles have multi-effect tooltips separated by `，` or `；`
- For collectibles that "let exploration go in a different direction", use: `让探索走向不同的结局` or `让探索开启不同的方向`

**Conditional text inside a tooltip** (explaining when something appears):
```html
<el-tooltip content="条件说明（e.g., '在第3层末尾的【险路恶敌】前可能遭遇'）" effect="light" placement="top">
  <el-text tag="ins">触发条件文本</el-text>
</el-tooltip>
```

### 2.7 Stage (关卡) Link Patterns

**Main stage link:**
```html
<el-link href="https://prts.wiki/w/ISW-DF_关卡名" target="_blank" type="primary">
  【ISW-DF 关卡名】
</el-link>
```

**Stage with variant encounter tooltip** (difficulty-dependent boss):
```html
<el-link :underline="false" href="https://prts.wiki/w/ISW-DF_变体关卡名" target="_blank" type="primary">
  <el-tooltip content="挑战自然·12及以上，35%概率遭遇" effect="light" placement="top">
    <el-text tag="ins" type="primary">【ISW-DF 变体关卡名】</el-text>
  </el-tooltip>
</el-link>
```

**Special battle links** (ISW-SP / ISW-NO prefixes):
```html
<el-link href="https://prts.wiki/w/ISW-SP_关卡名" target="_blank" type="primary">
  【ISW-SP 关卡名】
</el-link>
```

The pattern is `ISW-DF` for final/critical stages, `ISW-SP` for special battled from events, `ISW-NO` for special combat from nodes.

### 2.8 Optional/Note/Tip Indicator Patterns

Use `<span>` with specific CSS classes (defined in `integratedStrategies.scss`):

| Pattern | Usage |
|---------|-------|
| `<span class="optional">（可选）</span>` | Marks an optional step that can be done for extra benefit but is not required |
| `<span class="optional warning">（注意）</span>` | Warns the player about a risk, irreversible choice, or failure condition |
| `<span class="optional tip">（提示）</span>` | Gives a helpful gameplay hint or strategy tip |

These spans render with distinct colors:
- `.optional` → bold text
- `.optional.warning` → orange `#e6a23c`
- `.optional.tip` → green `#20ffa8`

### 2.9 Multiple Content Blocks Per Step

A single `<el-timeline-item>` step can contain multiple `<div>` blocks. Each `<div>` is a separate sub-point within the same step. Example:

```html
<el-timeline-item :icon="BOSS" color="#8A0993">
  <div>
    主流程描述...
  </div>
  <div>
    <span class="optional warning">（注意）</span>附加说明...
  </div>
  <div>
    <span class="optional tip">（提示）</span>策略建议...
  </div>
</el-timeline-item>
```

### 2.10 Inline Condition/Parenthetical Annotations

For option costs and requirements, use direct parenthetical notation **after** the option text. Do NOT wrap costs inside tooltips.

**Correct:**
```html
选择"太可怜了，仔细观赏"（消耗1希望），获得...
选择"用构想补足缺陷"（消耗2缕构想），进入...
```

**Wrong (do not use):**
```html
选择<el-tooltip content="消耗1希望"><el-text tag="ins">"太可怜了，仔细观赏"</el-text></el-tooltip>获得...
```

For costs that are not directly tied to a single option choice but describe a broader requirement, use the same pattern inline:

```html
（消耗5目标生命值，购买时需至少拥有6目标生命值）
```

For choice option names that the player selects:
- Use Chinese quotation marks `""` directly, **without** `<el-text tag="ins">` (no underline)
- Example: `选择"选项文本"（消耗1希望），获得`
- Do NOT wrap option texts in `<el-text tag="ins">` — underline is reserved for collectible names `【】` and special item/concept names

### 2.11 Ordered List Pattern (ol)

For enumerated branching options (e.g., in Sui's Garden 5th ending), use:

```html
<div>
  <ol>
    <li>
      分支名称（需持有【收藏品名】）：详细描述...
    </li>
    <li>
      另一分支...
    </li>
  </ol>
</div>
```

SCSS styles for `ol` and `.li-link` are already defined in `integratedStrategies.scss`.

### 2.12 Boss Finish Step Pattern

Every ending must end with this exact structure:

```html
<el-timeline-item :icon="BOSS" color="#8A0993">
  <div>
    抵达第N层，通过
    <el-link href="<url>" target="_blank" type="primary">
      【<关卡名>】
    </el-link>
    达成结局
  </div>
</el-timeline-item>
```

**Variations:**
- If the final fight is at a non-integer floor (like the 6th floor of 5-layer themes with extra floor mechanics), use that floor number
- If the boss has a difficulty-dependent variant, add a second `<el-link>` with tooltip after `或`:

```html
<div>
  通过
  <el-link href="<normal_url>" target="_blank" type="primary">
    【<普通关卡名>】
  </el-link>
  或
  <el-link :underline="false" href="<variant_url>" target="_blank" type="primary">
    <el-tooltip content="挑战自然·12及以上，35%概率遭遇" effect="light" placement="top">
      <el-text tag="ins" type="primary">【<变体关卡名>】</el-text>
    </el-tooltip>
  </el-link>
  达成结局
</div>
```

### 2.13 Language and Tone

- **All UI text is in Simplified Chinese**
- Keep descriptions brief and instructional
- Use game-accurate terminology matching the CN server
- Vocabulary:
  - `抵达第N层` = reach floor N
  - `触发事件` = trigger event
  - `进入不期而遇` = enter Encounter node
  - `选择` + `"选项文本"` = select with option quoted
  - `获得` = obtain
  - `持有...可触发` = holding ... enables triggering
  - `消耗N希望/N源石锭` = costs N hope/N ingots
  - `让探索走向不同的结局` or `让探索开启不同的方向` = diverges exploration to a different ending
- For enemy/boss names: use `<el-link>` to prts.wiki if the enemy has a page
- Use `<b>` sparingly for strong emphasis (e.g., `<b>入卷</b>` for the scroll-tucking mechanic)

### 2.14 Import Section Pattern

```js
<script lang="js" setup>
import {Icon1, Icon2, ...} from '@element-plus/icons-vue'
import BOSS from '@/components/information/BOSS.vue'
import Battle from '@/components/information/Battle.vue'
</script>
```

- `BOSS` is required in every theme
- `Battle` is imported only when the theme uses the Battle icon
- Only import Element Plus icons that are actually used in the template
- Do not import `Coin`/`Refresh`/`Search`/`Warning`/`Flag`/`Right` unless needed

### 2.15 Wiki URL Format

All wiki links go to `https://prts.wiki` with URL-encoded Chinese characters:

- Base events page: `https://prts.wiki/w/<主题名>/事件一览`
- Event anchor: `...#%E4%BA%8B%E4%BB%B6锚点编码`
- Stage page: `https://prts.wiki/w/ISW-DF_关卡名`
- Enemy page: `https://prts.wiki/w/<敌人名>`

Always use `target="_blank"` on wiki links so they open in a new tab.

---

## Section 3: Process Transformation

This section describes how to convert a user's natural-language description of endings into actual code following Section 2's conventions.

### 3.1 Transformation Workflow

1. Parse the user's input to identify each ending and its steps
2. For each step, determine the appropriate icon from the mapping table (Section 2.4)
3. For each step, determine what `<span class="optional ...">` indicators are needed (Section 2.8)
4. Format collectible names with `【】` and tooltips (Section 2.6)
5. Format event/stage links per Sections 2.5 and 2.7
6. Write in the instructional tone described in Section 2.13
7. Structure the entire file per Section 2

### 3.2 Self-Search First Rule

If the user's description contains any specific URLs (e.g., PRTS wiki links to events, stage pages, or collectible pages), **you must first attempt to fetch those URLs** to fill in missing details before asking the user. Use the WebFetch tool to retrieve collectible effect texts, option texts, stage names, enemy names, costs, and other details from the linked pages.

**Only ask the user after you have exhausted available online sources** and still cannot find the required information.

### 3.3 Mandatory Clarification Rule (MUST FOLLOW)

**Before generating ANY code, you MUST identify and address every ambiguity in the user's input.** Follow the Self-Search First Rule (Section 3.2) before asking.

You are a **format converter**, not a content author. You must not invent, infer, or fill in any missing details. Specifically, you must resolve (via self-search or user inquiry) whenever:

- A collectible's effect text is missing or unclear → ask: "这个收藏品的效果是什么？"
- A step's cost (希望/源石锭/目标生命/灯火/坍缩值) is not specified → ask for exact value
- A step's trigger condition (which floor, which node type, before/after which boss) is vague → ask for specifics
- A stage name or stage type (ISW-DF / ISW-SP / ISW-NO) is uncertain → ask for verification
- An event's name is loosely referenced or paraphrased → ask for the exact in-game event name
- The option text to select is paraphrased or incomplete → ask: "具体需要选择哪个选项？"
- The ending name is unclear → ask
- The floor number for the final boss is ambiguous → ask
- An enemy name is vague (e.g., "the knight" vs "猎潮的骑士") → ask for the exact enemy name
- Whether a step is optional or mandatory is unclear → ask
- A condition described differs from known game data → flag the discrepancy and ask
- The user's phrasing conflicts with any rule in Section 2 → ask how to resolve
- Any mechanic is described that doesn't fit existing patterns → ask: "这个机制应该如何编码表示？是否需要新增编写风格规定？"

**Question format:** Only after you have searched linked URLs and still cannot find the needed information, list all remaining ambiguities together in a structured way. For example:

```
已搜索您提供的网址，但仍有以下信息无法确认：
1. 【收藏品X】的效果文本是什么？
2. 事件"Y"中需要选择的具体选项文本是什么？
3. 第4步的条件"灯火不低于XX"的具体数值是？
...
```

### 3.4 Step Type Recognition Guide

When reading the user's description, match phrases to icon types:

| User Description Keywords | Icon |
|---------------------------|------|
| "打boss", "最终关卡", "达成结局", "通关" | BOSS |
| "特殊战斗", "进入战斗", "作战", "击败[敌人名]" | Battle |
| "不期而遇", "触发事件[事件名]", "遭遇[事件名]" | MoreFilled |
| "命运所指", "险路恶敌的前一个节点" | Flag |
| "失与得", "交换", "换取" | Refresh |
| "购买", "商店", "商人", "行商", "易与" | Coin |
| "注意", "警告", "如果失败则无法", "会失去", "会覆盖" | Warning |
| "先行一步" | Right |
| "去伪存真", "合成", "组合", "解读" | Search |

### 3.5 Commit Message Format

After completing a new theme or update, suggest the commit message:

For new theme:
```
feat(集成战略): 新增<主题名>结局一览
```

For update:
```
update(集成战略): <主题名><变更简述>
```

---

## Maintainer Notes

- When a new IS season releases, the route in `src/router/routes.js` already exists at `/information/integratedStrategies` — no route change is needed
- The `integratedStrategies.scss` file contains all shared styles; do not add local styles to theme files
- The `integratedStrategies.vue` container uses `<el-segmented>` and `<component :is>` for tab switching; adding a new theme component and name to the `options` array is all that's needed
- If a theme has a node type or mechanic not covered by this skill's icon mapping, document it here after confirming the correct pattern with the user
