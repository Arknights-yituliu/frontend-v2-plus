<script setup>
import { computed, ref } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

const props = defineProps({
  roomGroup: {
    type: Object,
    required: true,
  },
  controlState: {
    type: Object,
    default: () => ({}),
  },
  lateFillState: {
    type: Object,
    default: () => ({}),
  },
  operators: {
    type: Array,
    default: () => [],
  },
  operatorTable: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["add-operator", "remove-operator"]);
const operatorSearch = ref("");

const CONTROL_CENTER_CANDIDATE_SECTIONS = Object.freeze([
  {
    id: "operator",
    label: "干员加成类",
    matches: (tags) =>
      tags.includes("trading-operator") ||
      tags.includes("manufacture-operator"),
  },
  {
    id: "intermediate",
    label: "中间产物类",
    matches: (tags) => tags.some((tag) => tag.startsWith("intermediate-")),
  },
  {
    id: "room",
    label: "房间类",
    matches: (tags) =>
      tags.includes("office") ||
      tags.includes("trading-station") ||
      tags.includes("manufacture-station"),
  },
]);

const normalizedSearch = computed(() => operatorSearch.value.trim().toLowerCase());
const selectedOperatorIds = computed(
  () =>
    new Set([
      ...(props.controlState.operatorIds || []),
      ...(props.lateFillState.operatorIds || []),
    ]),
);
const filteredOperatorSections = computed(() => {
  const search = normalizedSearch.value;
  const matchedOperators = search
    ? props.operators.filter((operator) =>
        `${operator.name} ${operator.charId}`.toLowerCase().includes(search),
      )
    : props.operators;

  return CONTROL_CENTER_CANDIDATE_SECTIONS.map((section) => ({
    ...section,
    operators: matchedOperators.filter((operator) =>
      section.matches(operator.controlCenterBuffTags || []),
    ),
  }));
});

</script>

<template>
  <section class="control-center-staffing-panel">
    <div
      v-if="controlState.status === 'requiresOperators'"
      class="control-center-empty"
    >
      请先同步干员数据，再自动安排控制中枢功能位。
    </div>
    <div
      v-else-if="controlState.status === 'missingCapacity'"
      class="control-center-empty"
    >
      当前布局缺少控制中枢容量信息。
    </div>
    <template v-else>
      <header class="control-center-summary">
        <span>功能位自动安排，其余位置优先由其他中枢干员补齐。</span>
        <strong>已安排 {{ controlState.operatorIds?.length || 0 }} 人</strong>
      </header>

      <section class="control-center-roles">
        <article
          v-for="role in controlState.roles || []"
          :key="role.id"
          class="control-center-role"
          :class="{ disabled: !role.enabled }"
        >
          <header>
            <strong>{{ role.label }}</strong>
            <small>自动</small>
          </header>

          <div
            v-if="role.operators?.length"
            class="control-center-role-operators"
          >
            <div
              v-for="operator in role.operators"
              :key="`${role.id}:${operator.charId}`"
              class="control-center-role-operator-button"
            >
              <button
                type="button"
                class="control-center-role-operator"
                :title="`撤下${operator.name}`"
                @click="
                  emit('remove-operator', operator.charId)
                "
              >
                <OperatorAvatar
                  :char-id="operator.charId"
                  :rarity="operatorTable?.[operator.charId]?.rarity || 1"
                  :size="38"
                  :mobile-size="36"
                  border
                ></OperatorAvatar>
                <span class="control-center-role-copy">
                  <strong>{{ operator.name }}</strong>
                  <small v-if="operator.controlCenterRoomEffectLabel">
                    {{ operator.controlCenterRoomEffectLabel }}
                  </small>
                </span>
              </button>
            </div>
          </div>
          <span v-else class="control-center-role-empty">
            {{ role.enabled ? "暂无符合条件的干员" : "未启用" }}
          </span>
        </article>

        <article
          v-for="index in controlState.emptySlotCount || 0"
          :key="`empty-slot-${index}`"
          class="control-center-role control-center-unused-slot"
        >
          <v-icon icon="mdi-account-outline" size="22"></v-icon>
          <span>保留空位</span>
        </article>
      </section>

      <section class="control-center-late-fill">
        <header>
          <strong>中枢补位</strong>
          <small>普通房间排完后，从未使用干员中补入</small>
        </header>
        <template v-if="lateFillState.status === 'ready'">
          <article
            v-for="entry in lateFillState.teamEntries || []"
            :key="`late-fill-${entry.teamIndex}`"
            class="control-center-late-fill-team"
          >
            <header>
              <strong>班组 {{ entry.teamIndex + 1 }}</strong>
              <small>
                已补 {{ entry.operators?.length || 0 }} / {{ entry.slotCount || 0 }}
              </small>
            </header>
            <div class="control-center-late-fill-operators">
              <button
                v-for="operator in entry.operators || []"
                :key="`${entry.teamIndex}:${operator.charId}`"
                type="button"
                class="control-center-late-fill-operator"
                :title="`撤下${operator.name}`"
                @click="emit('remove-operator', operator.charId)"
              >
                <OperatorAvatar
                  :char-id="operator.charId"
                  :rarity="operatorTable?.[operator.charId]?.rarity || 1"
                  :size="34"
                  :mobile-size="32"
                  border
                ></OperatorAvatar>
                <span>
                  <strong>{{ operator.name }}</strong>
                  <small>
                    {{
                      operator.lateFillSource === "effect"
                        ? "中枢有效"
                        : "闲置干员"
                    }}
                  </small>
                </span>
              </button>
              <span
                v-for="index in entry.emptySlotCount || 0"
                :key="`late-fill-empty-${entry.teamIndex}-${index}`"
                class="control-center-late-fill-empty"
              >
                <v-icon icon="mdi-account-outline" size="17"></v-icon>
                空位
              </span>
            </div>
          </article>
        </template>
        <p v-else class="control-center-late-fill-empty">
          完成普通房间排班后生成补位队列。
        </p>
      </section>

      <section class="control-center-candidates">
        <header>
          <strong>可用中枢干员</strong>
          <input
            v-model="operatorSearch"
            type="search"
            placeholder="搜索干员"
            aria-label="搜索控制中枢干员"
          />
        </header>
        <section
          v-for="section in filteredOperatorSections"
          :key="section.id"
          class="control-center-candidate-section"
        >
          <header>
            <strong>{{ section.label }}</strong>
            <span>{{ section.operators.length }}</span>
          </header>
          <div class="control-center-candidate-list">
            <article
              v-for="operator in section.operators"
              :key="`${section.id}:${operator.charId}`"
              class="control-center-candidate"
              :class="{
                selected: selectedOperatorIds.has(operator.charId),
              }"
            >
              <button
                type="button"
                class="control-center-candidate-button"
                :disabled="selectedOperatorIds.has(operator.charId)"
                :title="
                  selectedOperatorIds.has(operator.charId)
                    ? `${operator.name}已在中枢`
                    : `加入${operator.name}`
                "
                @click="emit('add-operator', operator.charId)"
              >
                <OperatorAvatar
                  :char-id="operator.charId"
                  :rarity="operatorTable?.[operator.charId]?.rarity || 1"
                  :size="34"
                  :mobile-size="32"
                  border
                ></OperatorAvatar>
                <span class="control-center-candidate-copy">
                  <strong>{{ operator.name }}</strong>
                  <small v-if="operator.controlCenterRoomEffectLabel">
                    {{ operator.controlCenterRoomEffectLabel }}
                  </small>
                </span>
              </button>
            </article>
          </div>
        </section>
      </section>
    </template>
  </section>
</template>

<style scoped>
.control-center-staffing-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 12px;
}

.control-center-empty,
.control-center-summary {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.control-center-summary,
.control-center-candidates > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.control-center-summary strong {
  flex: 0 0 auto;
  color: var(--c-text-color);
  font-size: 12px;
}

.control-center-roles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.control-center-role {
  display: flex;
  min-width: 0;
  min-height: 92px;
  flex-direction: column;
  gap: 8px;
  padding: 9px;
  border: 1px solid var(--c-border-color);
  border-left: 3px solid var(--riic-blue);
  border-radius: 4px;
  background: var(--c-page-background-color);
}

.control-center-role.disabled {
  opacity: 0.56;
}

.control-center-role > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.control-center-role > header strong {
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.3;
}

.control-center-role > header small,
.control-center-role-empty {
  color: var(--riic-muted);
  font-size: 11px;
}

.control-center-role-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--c-text-color);
  font-size: 11px;
  cursor: pointer;
}

.control-center-role-toggle input {
  margin: 0;
}

.control-center-role-operator,
.control-center-candidate-button {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 7px;
}

.control-center-role-operator {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.control-center-role-operator-button {
  min-width: 0;
}

.control-center-role-operators {
  display: grid;
  gap: 6px;
}

.control-center-role-copy,
.control-center-candidate-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.control-center-role-copy strong,
.control-center-candidate-copy strong {
  overflow: hidden;
  color: var(--c-text-color);
  font-size: 11px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-center-role-copy small,
.control-center-candidate-copy small {
  overflow: hidden;
  color: var(--riic-blue);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-center-unused-slot {
  align-items: center;
  justify-content: center;
  border-style: dashed;
  border-left-color: var(--riic-muted);
  color: var(--riic-muted);
  font-size: 11px;
}

.control-center-late-fill {
  display: grid;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid
    color-mix(in srgb, var(--c-border-color) 72%, transparent);
}

.control-center-late-fill > header,
.control-center-late-fill-team > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.control-center-late-fill > header strong,
.control-center-late-fill-team > header strong {
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.control-center-late-fill > header small,
.control-center-late-fill-team > header small,
.control-center-late-fill-operator small,
.control-center-late-fill-empty {
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.3;
}

.control-center-late-fill-team {
  display: grid;
  gap: 6px;
}

.control-center-late-fill-operators {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.control-center-late-fill-operator,
.control-center-late-fill-empty {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
  padding: 5px 6px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
}

.control-center-late-fill-operator {
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.control-center-late-fill-operator > span {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.control-center-late-fill-operator strong {
  overflow: hidden;
  color: var(--c-text-color);
  font-size: 11px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-center-late-fill-operator small {
  color: var(--riic-blue);
}

.control-center-late-fill-empty {
  border-style: dashed;
}

.control-center-candidates {
  padding-top: 12px;
  border-top: 1px solid
    color-mix(in srgb, var(--c-border-color) 72%, transparent);
}

.control-center-candidates > header strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.control-center-candidates input {
  width: min(220px, 54%);
  min-width: 0;
  padding: 5px 7px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  outline: none;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  font-size: 12px;
}

.control-center-candidates input:focus {
  border-color: var(--riic-blue);
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--riic-blue) 16%, transparent);
}

.control-center-candidate-section {
  margin-top: 12px;
}

.control-center-candidate-section > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.control-center-candidate-section > header strong {
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.control-center-candidate-section > header span {
  color: var(--riic-muted);
  font-size: 12px;
}

.control-center-candidate-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 7px;
  margin-top: 10px;
}

.control-center-candidate {
  min-width: 0;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
}

.control-center-candidate.selected {
  border-color: var(--riic-blue);
  background: color-mix(in srgb, var(--riic-blue) 10%, var(--c-page-background-color));
}

.control-center-candidate-button {
  width: 100%;
  padding: 5px 6px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.control-center-candidate-button:disabled {
  cursor: default;
  opacity: 0.72;
}

@media (max-width: 640px) {
  .control-center-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .control-center-candidates input {
    width: 58%;
  }

  .control-center-candidate-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
