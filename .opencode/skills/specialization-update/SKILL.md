---
name: specialization-update
description: Process for updating operator specialization (专精) training efficiency data. Used when new operators are released or existing training room buffs change. Updates maximum_efficiency.json and optimal_specialization.json.
---

## Overview

This skill covers the end-to-end process of updating 专精 (specialization/mastery training) related JSON data files when new operators are released with training room buffs, or when existing operators' base skills change.

## Key Files

| File | Purpose |
|------|---------|
| `src/static/json/build/building_table.json` | Raw base skill data; source of truth for all training room buffs |
| `src/static/json/build/maximum_efficiency.json` | Complete ranking of every operator's training room efficiency |
| `src/static/json/build/optimal_specialization.json` | Best assistant per profession/branch/mastery-level combination |
| `src/static/json/operator/character_table_simple.json` | Operator basic info (name, profession, subProfessionId) |

## Process

### Step 1: Identify the operator's training buffs

Search `building_table.json` for the operator by name or charId. Filter to entries where `roomType` is `"training"`. Note:
- `phase` 0 = base skill (usually lower efficiency, unlocked at E0)
- `phase` 2 = upgraded skill (higher efficiency, unlocked at E2)
- The `phase: 2` entry gives the **max efficiency**
- Extract the percentage from the `description` field

### Step 2: Determine max efficiency value

Parse the training speed percentage from the description and convert to decimal:
- `+30%` → `0.3`
- `+45%` → `0.45`
- `+70%` → `0.7`
- Conditional buffs should use the maximum achievable value

### Step 3: Determine profession coverage

From the description, identify which professions the buff applies to:
- Single profession: e.g. `"profession": "近卫"`
- Multiple professions: e.g. `"profession": "术师/近卫"`, `"conditions": { "target_profession": ["术师", "近卫"] }`
- All professions: `"profession": "通用"` (no `target_profession` needed)
- Branch-specific: e.g. `"branch": "领主"` (noted in conditions)

### Step 4: Add to maximum_efficiency.json

Add a new entry following this template:

**Flat buff (no mastery level condition):**
```json
{
  "name": "<干员名>",
  "profession": "<职业1>/<职业2>",
  "max_efficiency": <小数>,
  "conditions": {
    "target_profession": ["<职业1>", "<职业2>"],
    "skill_name": "<技能名>"
  },
  "skill_name": "<完整技能描述>",
  "charId": "<char_xxxx_xxxx>"
}
```

**Conditional buff (specific mastery level):**
```json
{
  "name": "<干员名>",
  "profession": "<职业>",
  "max_efficiency": <总效率>,
  "conditions": {
    "target_profession": "<职业>",
    "skill_name": "<技能名>",
    "mastery_level": <1|2|3>,
    "efficiency_base": <基础效率>,
    "efficiency_bonus": <额外效率>
  },
  "skill_name": "<完整技能描述>",
  "charId": "<char_xxxx_xxxx>"
}
```

**Branch-specific buff:**
```json
{
  "name": "<干员名>",
  "profession": "<职业>",
  "max_efficiency": <总效率>,
  "conditions": {
    "target_profession": "<职业>",
    "skill_name": "<技能名>",
    "branch": "<分支名>",
    "efficiency_base": <基础效率>,
    "efficiency_bonus": <额外效率>
  },
  "skill_name": "<完整技能描述>",
  "charId": "<char_xxxx_xxxx>"
}
```

Insert the new entry at the top of the array.

### Step 5: Check if optimal_specialization.json needs updating

Compare the new operator's efficiency against the `best_assistant` in each relevant slot in `optimal_specialization.json`. The file structure:

```
professions → <profession> → general → specialization_<N> → best_assistant
professions → <profession> → branches → <branch_name> → best_assistant
```

For each profession/branch that the new operator covers, check:
1. If the new efficiency is **higher** than the current `best_assistant.efficiency`, replace it
2. Consider mastery level conditions (specialization_1/2/3) separately
3. If the buff only applies at a specific mastery level, only update that level's entry
4. If the buff is unconditional, compare against all levels

**Do NOT update** if the new efficiency is lower or equal to the existing best.

### Step 6: Commit

Use the commit format:
```
update(specialization): 职业专精最优路线和专精效率排行榜更新
```

## Examples

### Example 1: Operator with conditional specialization_3 buff (望, char_2027_wang)

Buff: "training speed +70% when training to mastery 3" (any profession)

Added to `maximum_efficiency.json` as first entry (new operator). Updated `optimal_specialization.json`:
- 医疗 → general → specialization_3: replaced 阿 (0.6) with 望 (0.7)
- 重装 → general → specialization_3: replaced 星熊 (0.6) with 望 (0.7)

### Example 2: Operator with flat buff that doesn't beat any best (维伊, char_4226_veen)

Buff: "术师与近卫 training speed +45%" (flat, E2)

Only added to `maximum_efficiency.json`. Not added to `optimal_specialization.json` because existing best assistants for 术師/近卫 all have 0.75+ efficiency.

### Example 3: Operator with branch-specific buff

Buff: "近卫 training speed +30%, +45% extra if branch is 领主" (仇白)
- profession: "近卫", max_efficiency: 0.75
- Only updates the `branches.领主` entry, not `general`

## Common Patterns

| Buff Type | max_efficiency | Profession Label | conditions Pattern |
|-----------|---------------|-----------------|-------------------|
| Single profession flat +β (50%) | 0.5 | Single name | `target_profession` only |
| Single profession +α (30%) | 0.3 | Single name | `target_profession` only |
| Single profession +α/β + mastery/branch bonus | 0.75 | Single name | `target_profession` + `branch` or `mastery_level` + `efficiency_base` + `efficiency_bonus` |
| Single profession +α + mastery bonus (65%) | 0.95 | Single name | `target_profession` + `mastery_level` + `efficiency_base` + `efficiency_bonus` |
| Dual profession flat | varies | "X/Y" | `target_profession` array |
| All professions flat | 0.25 | "通用" | `skill_name` only |
| All professions conditional | varies | "通用" | skill-specific conditions |

## Edge Cases

1. **Half-time operators** (艾丽妮/逻各斯): These reduce training time by 50% via a separate mechanic. They are listed in `optimal_specialization.json` under `half_time_operators`, not in the `professions` tree.

2. **Stacking buffs** (耀骑士临光, 导火索 etc.): Operators whose buff scales with number of specific faction operators in base. Use the maximum achievable value as `max_efficiency`.

3. **Special mechanics** (余): Buffs that scale with special resources (e.g. 人间烟火). Note the special condition in `conditions.special`.

4. **Operators without training buffs**: Skip these entirely — they should NOT be added to either file.
