<script setup>
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

const props = defineProps({
  roomGroup: {
    type: Object,
    required: true,
  },
  operatorTable: {
    type: Object,
    default: () => ({}),
  },
  candidateState: {
    type: Object,
    default: () => ({}),
  },
  visibleCohorts: {
    type: Array,
    default: () => [],
  },
  showDebug: {
    type: Boolean,
    default: false,
  },
  formatRoomGroupBonusPercent: {
    type: Function,
    required: true,
  },
  getSelectedTeamCandidateCount: {
    type: Function,
    required: true,
  },
  getSelectedRoomCandidateCount: {
    type: Function,
    required: true,
  },
  canToggleRoomGroupTeamCandidate: {
    type: Function,
    required: true,
  },
  getOperatorSkillTooltip: {
    type: Function,
    default: null,
  },
  getRoomGroupCandidateFallbackQueueOperators: {
    type: Function,
    required: true,
  },
  getRoomGroupCandidateFallbackPlaceholderCount: {
    type: Function,
    required: true,
  },
  getRoomGroupCandidateMetrics: {
    type: Function,
    required: true,
  },
  getRoomGroupCandidateDebugValues: {
    type: Function,
    required: true,
  },
  formatRoomGroupCandidateDebugValue: {
    type: Function,
    required: true,
  },
  getRoomGroupSelectionProgress: {
    type: Function,
    required: true,
  },
  fallbackPlan: {
    type: Object,
    default: null,
  },
  fallbackSections: {
    type: Array,
    default: () => [],
  },
  getRoomFallbackOperatorClasses: {
    type: Function,
    required: true,
  },
  formatRoomFallbackOperatorPercent: {
    type: Function,
    required: true,
  },
  getRoomFallbackOperatorDebugValues: {
    type: Function,
    required: true,
  },
  canAppendFallbackOperator: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  "retry-catalog-load",
  "show-more-candidates",
  "toggle-team-candidate",
  "remove-fallback-operator",
  "append-fallback-operator",
]);

function getSkillTooltip(operator) {
  return props.getOperatorSkillTooltip
    ? props.getOperatorSkillTooltip(operator)
    : "暂无已解锁基建技能";
}

function getCandidateSkillTooltip(candidate, fallbackOperators = []) {
  const operatorIds = candidate?.operatorIds || [];
  const tooltips = [
    ...operatorIds.map((charId) => getSkillTooltip({ charId })),
    ...fallbackOperators.map((operator) => getSkillTooltip(operator)),
  ].filter(Boolean);
  return tooltips.length > 0
    ? [...new Set(tooltips)].join("\n")
    : "暂无已解锁基建技能";
}

function toggleCandidate(cohort, candidate) {
  emit("toggle-team-candidate", { cohort, candidate });
}

function showMoreCandidates(cohort) {
  emit("show-more-candidates", cohort);
}

function removeFallbackOperator(slot) {
  emit("remove-fallback-operator", slot);
}

function appendFallbackOperator(section, operator) {
  emit("append-fallback-operator", { section, operator });
}
</script>

<template>
  <section class="room-editor-panel">
    <header class="room-editor-panel-heading">
      <div>
        <v-icon :icon="roomGroup.icon" size="20"></v-icon>
        <div>
          <strong>{{ roomGroup.label }}</strong>
          <span>
            {{ roomGroup.count }} 座{{ roomGroup.facilityLabel }}
          </span>
        </div>
      </div>
      <span>
        {{
          roomGroup.rotationRequired
            ? "按选定频率自动轮换"
            : "暂不参与轮换"
        }}
      </span>
    </header>

    <div
      v-if="candidateState.status === 'outOfScope'"
      class="room-editor-empty"
    >
      <span>无需操作，若需手动调整，可在后续步骤中进行。</span>
    </div>

    <div
      v-else-if="candidateState.status === 'requiresOperators'"
      class="room-editor-empty"
    >
      <span>同步干员数据后，即可按已拥有干员生成候选班组</span>
    </div>

    <div
      v-else-if="candidateState.status === 'catalogLoading'"
      class="room-editor-empty"
    >
      <span>
        {{
          roomGroup.fallbackOnly
            ? "正在载入该设施组的补位干员列表"
            : "正在载入该设施组的固定候选列表"
        }}
      </span>
    </div>

    <div
      v-else-if="candidateState.status === 'catalogLoadFailed'"
      class="room-editor-empty"
    >
      <span>
        {{
          roomGroup.fallbackOnly
            ? "补位干员列表载入失败"
            : "固定候选列表载入失败"
        }}{{
          candidateState.catalogErrors?.length
            ? `：${candidateState.catalogErrors.join("；")}`
            : ""
        }}
      </span>
      <button
        type="button"
        class="room-staffing-load-more"
        @click="emit('retry-catalog-load')"
      >
        重新载入
      </button>
    </div>

    <div
      v-else-if="
        candidateState.status === 'missingCapacity' ||
        candidateState.status === 'missingFallbackPreset'
      "
      class="room-editor-empty"
    >
      <span>当前房间组的容量或固定候选数据尚未配置</span>
    </div>

    <div v-else-if="candidateState.status === 'ready'" class="room-staffing-results">
      <template v-if="!roomGroup.fallbackOnly">
        <section
          v-for="cohort in visibleCohorts"
          :key="cohort.id"
          class="room-staffing-cohort"
        >
          <header class="room-staffing-cohort-heading">
            <strong>
              {{ roomGroup.label }} 班组选择（{{
                getSelectedTeamCandidateCount(roomGroup, cohort)
              }}/{{ cohort.teamCount }}）
            </strong>
          </header>

          <div class="room-staffing-candidate-list">
            <button
              v-for="(candidate, candidateIndex) in cohort.displayCandidates"
              :key="`${candidate.key}:${candidateIndex}`"
              type="button"
              class="room-staffing-candidate"
              :class="{
                selected:
                  !candidate.repeatableTeam &&
                  getSelectedRoomCandidateCount(
                    roomGroup,
                    cohort,
                    candidate.key,
                  ) > 0,
                repeatable: candidate.repeatableTeam,
                unavailable:
                  !canToggleRoomGroupTeamCandidate(
                    roomGroup,
                    cohort,
                    candidate,
                  ) &&
                  (candidate.repeatableTeam ||
                    getSelectedRoomCandidateCount(
                      roomGroup,
                      cohort,
                      candidate.key,
                    ) === 0),
              }"
              :aria-pressed="
                !candidate.repeatableTeam &&
                getSelectedRoomCandidateCount(
                  roomGroup,
                  cohort,
                  candidate.key,
                ) > 0
              "
              :title="
                getCandidateSkillTooltip(
                  candidate,
                  getRoomGroupCandidateFallbackQueueOperators(
                    roomGroup,
                    cohort,
                    candidate,
                  ),
                )
              "
              :disabled="
                !canToggleRoomGroupTeamCandidate(
                  roomGroup,
                  cohort,
                  candidate,
                )
              "
              @click="toggleCandidate(cohort, candidate)"
            >
              <div class="room-staffing-candidate-main">
                <div class="room-staffing-candidate-team">
                  <strong
                    class="room-staffing-candidate-name"
                    :title="getCandidateSkillTooltip(candidate)"
                  >
                    {{ candidate.name }}
                  </strong>
                  <span
                    v-if="candidate.repeatableTeam"
                    class="room-staffing-candidate-repeat-label"
                  >
                    下一班
                  </span>
                  <div class="room-staffing-candidate-avatars">
                    <OperatorAvatar
                      v-for="charId in candidate.operatorIds"
                      :key="charId"
                      :char-id="charId"
                      :rarity="operatorTable?.[charId]?.rarity || 1"
                      :size="32"
                      :mobile-size="30"
                      border
                    ></OperatorAvatar>
                    <span
                      v-for="operator in getRoomGroupCandidateFallbackQueueOperators(
                        roomGroup,
                        cohort,
                        candidate,
                      )"
                      :key="`fallback-operator-${operator.charId}`"
                      class="room-staffing-candidate-fallback-avatar"
                    >
                      <OperatorAvatar
                        :char-id="operator.charId"
                        :rarity="operatorTable?.[operator.charId]?.rarity || 1"
                        :size="32"
                        :mobile-size="30"
                        rounded
                      ></OperatorAvatar>
                    </span>
                    <span
                      v-for="index in getRoomGroupCandidateFallbackPlaceholderCount(
                        roomGroup,
                        cohort,
                        candidate,
                      )"
                      :key="`fallback-${index}`"
                      class="room-staffing-candidate-placeholder"
                    >
                      <v-icon icon="mdi-account-outline" size="22"></v-icon>
                    </span>
                  </div>
                </div>
                <div class="room-staffing-candidate-details">
                  <div
                    v-for="metric in getRoomGroupCandidateMetrics(candidate)"
                    :key="`${metric.facility}:${metric.kind}`"
                    class="room-staffing-candidate-detail"
                    :class="metric.kind"
                  >
                    <strong
                      class="room-staffing-candidate-metric"
                      :class="`facility-${metric.facility}`"
                    >
                      {{
                        `${metric.label} ${formatRoomGroupBonusPercent(
                          metric.bonus,
                        )}`
                      }}
                    </strong>
                  </div>
                  <div
                    v-if="candidate.fallback.count > 0"
                    class="room-staffing-candidate-detail fallback"
                  >
                    <strong>补位 ×{{ candidate.fallback.count }}</strong>
                  </div>
                </div>
              </div>
              <div v-if="showDebug" class="room-staffing-candidate-debug">
                <div class="room-staffing-candidate-debug-row">
                  <span>
                    候选数据
                    {{ getRoomGroupCandidateDebugValues(candidate).qualityLabel }}
                  </span>
                  <span>
                    {{
                      getRoomGroupCandidateDebugValues(candidate)
                      .calculationStatusLabel
                    }}
                  </span>
                </div>
                <div class="room-staffing-candidate-debug-row">
                  <span>来源文件</span>
                  <span>
                    {{
                      getRoomGroupCandidateDebugValues(candidate).sourceFile ||
                      "未记录"
                    }}
                  </span>
                </div>
                <div
                  v-if="
                    getRoomGroupCandidateDebugValues(candidate).directMetrics
                      .length > 0
                  "
                  class="room-staffing-candidate-debug-row"
                >
                  <span>本设施</span>
                  <span
                    v-for="metric in getRoomGroupCandidateDebugValues(candidate)
                      .directMetrics"
                    :key="`direct-${metric.facility}`"
                    :class="`facility-${metric.facility}`"
                  >
                    {{
                      `${metric.label} ${formatRoomGroupBonusPercent(
                        metric.bonus,
                      )}`
                    }}
                  </span>
                  <span
                    v-if="
                      getRoomGroupCandidateDebugValues(candidate).fallbackCount >
                        0
                    "
                  >
                    其中补位
                    {{
                      formatRoomGroupBonusPercent(
                        getRoomGroupCandidateDebugValues(candidate)
                          .fallbackBonusPercent,
                      )
                    }}
                  </span>
                </div>
                <div
                  v-if="
                    getRoomGroupCandidateDebugValues(candidate)
                      .additionalMetrics.length > 0
                  "
                  class="room-staffing-candidate-debug-row"
                >
                  <span>额外加成</span>
                  <span
                    v-for="metric in getRoomGroupCandidateDebugValues(candidate)
                      .additionalMetrics"
                    :key="`additional-${metric.facility}`"
                    :class="`facility-${metric.facility}`"
                  >
                    {{
                      `${metric.label} ${formatRoomGroupBonusPercent(
                        metric.bonus,
                      )}`
                    }}
                  </span>
                </div>
                <div class="room-staffing-candidate-debug-formula">
                  贡献
                  {{
                    formatRoomGroupCandidateDebugValue(
                      getRoomGroupCandidateDebugValues(candidate)
                        .directBonusPercent,
                    )
                  }}
                  +
                  {{
                    formatRoomGroupCandidateDebugValue(
                      getRoomGroupCandidateDebugValues(candidate)
                        .additionalBonusPercent,
                    )
                  }}
                  =
                  {{
                    formatRoomGroupCandidateDebugValue(
                      getRoomGroupCandidateDebugValues(candidate)
                        .totalContributionPercent,
                    )
                  }}
                  ，排序
                  {{
                    formatRoomGroupCandidateDebugValue(
                      getRoomGroupCandidateDebugValues(candidate).sortScore,
                    )
                  }}
                  ，最终
                  {{
                    formatRoomGroupCandidateDebugValue(
                      getRoomGroupCandidateDebugValues(candidate).rankingValue,
                    )
                  }}
                </div>
                <div class="room-staffing-candidate-debug-row">
                  <span>抓人计算</span>
                  <span>
                    班组/干员自身
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .candidateCoreBonusPercent,
                      )
                    }}
                    +
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .fallbackBonusPercent,
                      )
                    }}
                    补位 =
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .candidateCoreBonusPercent +
                          getRoomGroupCandidateDebugValues(candidate)
                            .fallbackBonusPercent,
                      )
                    }}%
                    （不含中枢设施加成）
                  </span>
                </div>
                <div
                  v-if="
                    getRoomGroupCandidateDebugValues(candidate)
                      .closureCalculation
                  "
                  class="room-staffing-candidate-debug-row"
                >
                  <span>可露希尔特别订单</span>
                  <span>
                    队友普通订单
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .closureCalculation.sourceOrderBonusPercent,
                      )
                    }}
                    +
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .closureCalculation.fallbackOrderBonusPercent,
                      )
                    }}
                    +
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .closureCalculation.controlCenterOrderBonusPercent,
                      )
                    }}
                    =
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .closureCalculation.teammateOrderBonusPercent,
                      )
                    }}%
                  </span>
                </div>
                <div
                  v-if="
                    getRoomGroupCandidateDebugValues(candidate)
                      .closureCalculation
                  "
                  class="room-staffing-candidate-debug-row"
                >
                  <span>特别订单等效</span>
                  <span>
                    贸易站
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .closureCalculation.tradeEquivalentBonusPercent,
                      )
                    }}%
                    ，虚拟赤金
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .closureCalculation.goldEquivalentProductionPercent,
                      )
                    }}%
                  </span>
                </div>
                <div class="room-staffing-candidate-debug-row">
                  <span>中枢设施加成</span>
                  <span>
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .controlCenterFacilityBonusPercent,
                      )
                    }}%
                    （不参与抓人排序）
                  </span>
                </div>
                <div
                  v-if="
                    getRoomGroupCandidateDebugValues(candidate)
                      .controlCenterOperatorBonusPercent
                  "
                  class="room-staffing-candidate-debug-row"
                >
                  <span>中枢干员加成</span>
                  <span>
                    {{
                      formatRoomGroupCandidateDebugValue(
                        getRoomGroupCandidateDebugValues(candidate)
                          .controlCenterOperatorBonusPercent,
                      )
                    }}%
                    （参与抓人排序）
                  </span>
                </div>
                <div
                  v-for="segment in getRoomGroupCandidateDebugValues(candidate)
                    .controlCenterFacilityCalculation.segments"
                  :key="`control-facility-${candidate.key}-${segment.index}`"
                  class="room-staffing-candidate-debug-row"
                >
                  <span>
                    中枢第{{ segment.index + 1 }}段
                    {{ segment.durationHours }}h
                  </span>
                  <span>
                    {{
                      segment.teams
                        .map(
                          (team) =>
                            `班组${team.teamIndex + 1} ${formatRoomGroupCandidateDebugValue(
                              team.bonusPercent,
                            )}%`,
                        )
                        .join(" + ") || "无中枢设施加成"
                    }}
                    =
                    {{
                      formatRoomGroupCandidateDebugValue(
                        segment.segmentBonus,
                      )
                    }}%
                  </span>
                </div>
                <div
                  v-if="
                    getRoomGroupCandidateDebugValues(candidate)
                      .controlCenterFacilityCalculation.segments.length > 0
                  "
                  class="room-staffing-candidate-debug-formula"
                >
                  中枢设施轮班平均 =
                  {{
                    getRoomGroupCandidateDebugValues(candidate)
                      .controlCenterFacilityCalculation.segments
                      .map(
                        (segment) =>
                          `${formatRoomGroupCandidateDebugValue(
                            segment.segmentBonus,
                          )}%×${segment.durationHours}h`,
                      )
                      .join(" + ")
                  }}
                  /
                  {{
                    getRoomGroupCandidateDebugValues(candidate)
                      .controlCenterFacilityCalculation.totalHours
                  }}h
                  =
                  {{
                    formatRoomGroupCandidateDebugValue(
                      getRoomGroupCandidateDebugValues(candidate)
                        .controlCenterFacilityCalculation.weightedBonusPercent,
                    )
                  }}%
                </div>
              </div>
            </button>
          </div>

          <div
            v-if="cohort.hasMoreCandidates"
            class="room-staffing-candidate-actions"
          >
            <button
              type="button"
              class="room-staffing-load-more"
              @click="showMoreCandidates(cohort)"
            >
              加载更多（剩余
              {{ cohort.availableCandidateCount - cohort.displayCandidates.length }}
              组）
            </button>
          </div>
        </section>
      </template>

      <section
        v-if="
          (roomGroup.fallbackOnly ||
            getRoomGroupSelectionProgress(roomGroup).complete) &&
          fallbackPlan &&
          fallbackPlan.pendingCount > 0
        "
        class="room-fallback-stage"
        :class="`facility-${roomGroup.facility || ''}`"
      >
        <header class="room-fallback-heading">
          <strong>补位队列</strong>
          <span>
            {{ fallbackPlan.selectedCount }}/{{ fallbackPlan.pendingCount }}
          </span>
        </header>
        <section
          v-for="section in fallbackSections"
          :key="section.key"
          class="room-fallback-section"
        >
          <header class="room-fallback-heading room-fallback-section-heading">
            <strong>{{ section.title }}</strong>
            <span>{{ section.selectedCount }}/{{ section.pendingCount }}</span>
          </header>
          <TransitionGroup
            name="room-fallback-card"
            tag="div"
            class="room-fallback-queue"
          >
            <template v-for="slot in section.slots" :key="slot.key">
              <button
                v-if="slot.assignedOperator"
                :key="`queue-${slot.key}`"
                type="button"
                class="room-fallback-queue-operator"
                :class="[
                  getRoomFallbackOperatorClasses(slot.assignedOperator),
                  { debugging: showDebug },
                ]"
                :aria-label="`移出补位：${slot.assignedOperator.name}`"
                @click="removeFallbackOperator(slot)"
                :title="getSkillTooltip(slot.assignedOperator)"
              >
                <OperatorAvatar
                  :char-id="slot.assignedOperator.charId"
                  :rarity="
                    operatorTable?.[slot.assignedOperator.charId]?.rarity || 1
                  "
                  :size="34"
                  :mobile-size="32"
                  border
                ></OperatorAvatar>
                <small>{{ slot.assignedOperator.name }}</small>
                <span
                  v-if="slot.assignedOperator.idleFill"
                  class="room-fallback-idle-label"
                >
                  闲置补位
                </span>
                <span class="room-fallback-operator-efficiency">
                  {{
                    formatRoomFallbackOperatorPercent(
                      slot.assignedOperator.effectivePercent ??
                        slot.assignedOperator.percent,
                    )
                  }}
                </span>
                <span v-if="showDebug" class="room-fallback-operator-debug">
                  基础
                  {{
                    formatRoomFallbackOperatorPercent(
                      getRoomFallbackOperatorDebugValues(slot.assignedOperator)
                        .basePercent,
                    )
                  }}
                  + 规则
                  {{
                    formatRoomFallbackOperatorPercent(
                      getRoomFallbackOperatorDebugValues(slot.assignedOperator)
                        .layoutRuleBonus,
                    )
                  }}
                  <template
                    v-if="
                      getRoomFallbackOperatorDebugValues(slot.assignedOperator)
                        .controlCenterOperatorBonusPercent
                    "
                  >
                    + 中枢
                    {{
                      formatRoomFallbackOperatorPercent(
                        getRoomFallbackOperatorDebugValues(
                          slot.assignedOperator,
                        ).controlCenterOperatorBonusPercent,
                      )
                    }}
                  </template>
                  =
                  {{
                    formatRoomFallbackOperatorPercent(
                      getRoomFallbackOperatorDebugValues(slot.assignedOperator)
                        .totalPercent,
                    )
                  }}
                </span>
              </button>
              <span
                v-else
                :key="`queue-placeholder-${slot.key}`"
                class="room-fallback-queue-placeholder"
                aria-hidden="true"
              >
                <v-icon icon="mdi-account-outline" size="22"></v-icon>
              </span>
            </template>
          </TransitionGroup>
          <div
            v-if="section.candidates.length"
            class="room-fallback-candidates"
          >
            <header class="room-fallback-heading">
              <strong>补位候选干员</strong>
            </header>
            <TransitionGroup
              name="room-fallback-card"
              tag="div"
              class="room-fallback-candidate-list"
            >
              <button
                v-for="operator in section.candidates"
                :key="`candidate-${section.key}-${operator.charId}`"
                type="button"
                class="room-fallback-operator"
                :class="[
                  getRoomFallbackOperatorClasses(operator),
                  { debugging: showDebug },
                ]"
                :disabled="
                  !canAppendFallbackOperator(
                    roomGroup,
                    fallbackPlan,
                    section,
                    operator,
                  )
                "
                @click="appendFallbackOperator(section, operator)"
                :title="getSkillTooltip(operator)"
              >
                <OperatorAvatar
                  :char-id="operator.charId"
                  :rarity="operatorTable?.[operator.charId]?.rarity || 1"
                  :size="34"
                  :mobile-size="32"
                  border
                ></OperatorAvatar>
                <small>{{ operator.name }}</small>
                <span
                  v-if="operator.idleFill"
                  class="room-fallback-idle-label"
                >
                  闲置补位
                </span>
                <span class="room-fallback-operator-efficiency">
                  {{
                    formatRoomFallbackOperatorPercent(
                      operator.effectivePercent ?? operator.percent,
                    )
                  }}
                </span>
                <span v-if="showDebug" class="room-fallback-operator-debug">
                  基础
                  {{
                    formatRoomFallbackOperatorPercent(
                      getRoomFallbackOperatorDebugValues(operator).basePercent,
                    )
                  }}
                  + 规则
                  {{
                    formatRoomFallbackOperatorPercent(
                      getRoomFallbackOperatorDebugValues(operator)
                        .layoutRuleBonus,
                    )
                  }}
                  <template
                    v-if="
                      getRoomFallbackOperatorDebugValues(operator)
                        .controlCenterOperatorBonusPercent
                    "
                  >
                    + 中枢
                    {{
                      formatRoomFallbackOperatorPercent(
                        getRoomFallbackOperatorDebugValues(operator)
                          .controlCenterOperatorBonusPercent,
                      )
                    }}
                  </template>
                  =
                  {{
                    formatRoomFallbackOperatorPercent(
                      getRoomFallbackOperatorDebugValues(operator).totalPercent,
                    )
                  }}
                </span>
              </button>
            </TransitionGroup>
          </div>
        </section>
      </section>
    </div>

    <div v-else class="room-editor-empty">
      <span>选择生产设施房间组后，即可查看候选班组</span>
    </div>
  </section>
</template>

<style scoped>
.room-editor-panel {
  display: contents;
}

.room-editor-panel-heading {
  display: none;
}

.room-editor-panel-heading > div {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.room-editor-panel-heading > div > :deep(.v-icon) {
  flex: 0 0 auto;
  color: var(--riic-blue);
}

.room-editor-panel-heading > div > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.room-editor-panel-heading strong {
  overflow: hidden;
  color: var(--c-text-color);
  font-size: 14px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-editor-panel-heading span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.room-editor-empty {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 12px;
  padding: 10px 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.room-editor-empty span {
  white-space: nowrap;
}

.room-staffing-results {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 12px;
}

.room-staffing-cohort + .room-staffing-cohort {
  margin-top: 2px;
}

.room-staffing-cohort-heading {
  display: flex;
  align-items: center;
  min-height: 17px;
  padding: 0 0 8px;
}

.room-staffing-cohort-heading strong {
  color: var(--riic-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.room-staffing-candidate-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 8px;
}

.room-staffing-candidate {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 72px;
  padding: 8px 10px;
  border: 1px solid var(--c-border-color);
  border-left: 3px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    opacity 0.16s ease;
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.room-staffing-candidate.selected {
  border-left-color: var(--riic-green);
  border-left-width: 5px;
  background: color-mix(
    in srgb,
    var(--riic-green) 12%,
    var(--c-page-background-color)
  );
}

.room-staffing-candidate.unavailable {
  opacity: 0.52;
}

.room-staffing-candidate:hover:not(:disabled) {
  background: color-mix(
    in srgb,
    var(--riic-blue) 5%,
    var(--c-page-background-color)
  );
}

.room-staffing-candidate.selected:hover:not(:disabled) {
  background: color-mix(
    in srgb,
    var(--riic-green) 16%,
    var(--c-page-background-color)
  );
}

.room-staffing-candidate:disabled {
  cursor: default;
}

.room-staffing-candidate-main {
  display: flex;
  align-items: stretch;
  min-width: 0;
  gap: 12px;
}

.room-staffing-candidate-team {
  display: flex;
  align-items: flex-start;
  flex: 0 1 auto;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.room-staffing-candidate-name {
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-staffing-candidate-repeat-label {
  padding: 1px 4px;
  border: 1px solid var(--riic-blue);
  border-radius: 3px;
  color: var(--riic-blue);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
}

.room-staffing-candidate-avatars {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  min-width: 0;
}

.room-staffing-candidate-fallback-avatar {
  display: inline-flex;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border-radius: 50%;
}

.room-staffing-candidate-fallback-avatar > * {
  border-radius: inherit;
}

.room-staffing-candidate-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border: 1px solid
    color-mix(in srgb, var(--c-border-color) 78%, transparent);
  border-radius: 50%;
  background: color-mix(
    in srgb,
    var(--riic-muted) 8%,
    var(--c-page-background-color)
  );
  color: var(--riic-muted);
}

.room-staffing-candidate-details {
  display: flex;
  flex: 0 0 124px;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  width: 124px;
  min-width: 124px;
  margin-left: auto;
  text-align: left;
}

.room-staffing-candidate-debug {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 6px;
  color: var(--riic-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
}

.room-staffing-candidate-debug-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
}

.room-staffing-candidate-debug-row > span:first-child {
  color: var(--riic-muted);
}

.room-staffing-candidate-debug-row .facility-trading {
  color: #2475bd;
}

.room-staffing-candidate-debug-row .facility-manufacture {
  color: #b78106;
}

.room-staffing-candidate-debug-row .facility-power {
  color: #25835a;
}

.room-staffing-candidate-debug-row .facility-meeting {
  color: #d6771a;
}

.room-staffing-candidate-debug-row .facility-office {
  color: #be3f61;
}

.room-staffing-candidate-debug-formula {
  color: var(--riic-muted);
}

.room-staffing-candidate-detail {
  display: flex;
  align-items: baseline;
  min-width: 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.3;
}

.room-staffing-candidate-metric {
  display: inline-flex;
  align-items: center;
  color: var(--riic-blue);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
  white-space: nowrap;
}

.room-staffing-candidate-detail.fallback strong {
  color: var(--riic-muted);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.room-staffing-candidate-metric.facility-trading {
  color: #2475bd;
}

.room-staffing-candidate-metric.facility-manufacture {
  color: #b78106;
}

.room-staffing-candidate-metric.facility-power {
  color: #25835a;
}

.room-staffing-candidate-metric.facility-meeting {
  color: #d6771a;
}

.room-staffing-candidate-metric.facility-hire,
.room-staffing-candidate-metric.facility-office {
  color: #be3f61;
}

.room-staffing-candidate-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
}

.room-staffing-load-more {
  min-height: 28px;
  padding: 3px 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
  background: var(--c-page-background-color);
  color: var(--riic-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  cursor: pointer;
}

.room-staffing-load-more:hover {
  border-color: color-mix(
    in srgb,
    var(--riic-blue) 52%,
    var(--c-border-color)
  );
  color: var(--riic-blue);
}

.room-fallback-stage {
  --room-fallback-selection-color: var(--riic-blue);
  margin-top: 2px;
  padding-top: 12px;
  border-top: 1px solid
    color-mix(in srgb, var(--c-border-color) 72%, transparent);
}

.room-fallback-stage.facility-trading {
  --room-fallback-selection-color: var(--riic-blue);
}

.room-fallback-stage.facility-manufacture {
  --room-fallback-selection-color: var(--riic-gold);
}

.room-fallback-stage.facility-power {
  --room-fallback-selection-color: var(--riic-green);
}

.room-fallback-stage.facility-control {
  --room-fallback-selection-color: #6a629e;
}

.room-fallback-stage.facility-meeting {
  --room-fallback-selection-color: #b95c7a;
}

.room-fallback-stage.facility-dormitory {
  --room-fallback-selection-color: #3d8586;
}

.room-fallback-stage.facility-processing {
  --room-fallback-selection-color: #ad762c;
}

.room-fallback-stage.facility-hire,
.room-fallback-stage.facility-office {
  --room-fallback-selection-color: #84699c;
}

.room-fallback-stage.facility-training {
  --room-fallback-selection-color: #bf6252;
}

.room-fallback-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.room-fallback-heading strong {
  color: var(--c-text-color);
  font-size: 13px;
  line-height: 1.4;
}

.room-fallback-heading span {
  color: var(--riic-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.room-fallback-queue {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.room-fallback-queue-operator,
.room-fallback-queue-placeholder {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  flex-direction: column;
  width: 72px;
  min-height: 92px;
  padding: 6px 4px 8px;
  border-radius: 4px;
}

.room-fallback-queue-operator {
  --fallback-destination: var(--room-fallback-selection-color);
  gap: 3px;
  overflow: hidden;
  border: 1px solid
    color-mix(
      in srgb,
      var(--room-fallback-selection-color) 34%,
      var(--c-border-color)
    );
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  box-shadow: 0 3px 9px rgb(24 41 58 / 10%);
  cursor: pointer;
  transition:
    box-shadow 0.16s ease,
    filter 0.16s ease,
    transform 0.16s ease;
}

.room-fallback-queue-operator:hover {
  box-shadow: 0 5px 12px rgb(24 41 58 / 14%);
  filter: saturate(0.84);
  transform: translateY(-1px);
}

.room-fallback-queue-placeholder {
  border: 1px dashed
    color-mix(in srgb, var(--c-border-color) 84%, transparent);
  background: color-mix(
    in srgb,
    var(--riic-muted) 7%,
    var(--c-page-background-color)
  );
  color: var(--riic-muted);
}

.room-fallback-candidates {
  margin-top: 10px;
}

.room-fallback-candidate-list {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  min-width: 0;
  gap: 10px;
}

.room-fallback-operator {
  --fallback-destination: transparent;
  position: relative;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72px;
  min-height: 92px;
  gap: 3px;
  padding: 6px 4px 8px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  box-shadow: 0 3px 9px rgb(24 41 58 / 10%);
  cursor: pointer;
  transition:
    box-shadow 0.16s ease,
    filter 0.16s ease,
    opacity 0.16s ease,
    transform 0.16s ease;
}

.room-fallback-operator:disabled {
  cursor: default;
}

.room-fallback-operator small {
  overflow: hidden;
  max-width: 64px;
  color: inherit;
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-fallback-operator-efficiency {
  color: var(--riic-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.room-fallback-idle-label {
  position: absolute;
  top: 3px;
  right: 3px;
  padding: 1px 3px;
  border-radius: 2px;
  color: #775600;
  background: #fff2c4;
  font-size: 8px;
  line-height: 1.2;
}

.room-fallback-operator.idle-fill,
.room-fallback-queue-operator.idle-fill {
  border-style: dashed;
}

.room-fallback-operator.debugging,
.room-fallback-queue-operator.debugging {
  min-height: 118px;
}

.room-fallback-operator-debug {
  display: block;
  width: 100%;
  padding: 0 2px;
  color: var(--riic-muted);
  font-size: 9px;
  line-height: 1.25;
  text-align: center;
  white-space: normal;
}

.room-fallback-operator::after {
  position: absolute;
  right: 4px;
  bottom: 0;
  left: 4px;
  height: 3px;
  border-radius: 2px;
  background: var(--fallback-destination);
  content: "";
}

.room-fallback-operator.occupied:not(.selected)::after {
  right: 4px;
  left: 4px;
  width: auto;
  transform: none;
}

.room-fallback-operator.occupied > div:first-child {
  filter: grayscale(0.78);
  opacity: 0.38;
}

.room-fallback-operator.occupied > span {
  color: var(--riic-muted);
  opacity: 0.68;
}

.room-fallback-operator.occupied:not(.selected) {
  box-shadow: none;
}

.room-fallback-operator:not(.occupied):not(:disabled):hover {
  box-shadow: 0 5px 13px rgb(24 41 58 / 16%);
  transform: translateY(-2px);
}

.room-fallback-operator:not(.occupied):not(:disabled):active {
  box-shadow: 0 2px 6px rgb(24 41 58 / 10%);
  transform: translateY(0) scale(0.97);
}

.room-fallback-operator.destination-trading {
  --fallback-destination: var(--riic-blue);
}

.room-fallback-operator.destination-power {
  --fallback-destination: var(--riic-green);
}

.room-fallback-operator.destination-manufacture {
  --fallback-destination: var(--riic-gold);
}

.room-fallback-operator.destination-control {
  --fallback-destination: #145c50;
}

.room-fallback-operator.destination-meeting,
.room-fallback-operator.destination-hire,
.room-fallback-operator.destination-office,
.room-fallback-operator.destination-processing,
.room-fallback-operator.destination-dormitory,
.room-fallback-operator.destination-training {
  --fallback-destination: #7b8088;
}

.room-fallback-operator.selected {
  --fallback-destination: var(--room-fallback-selection-color);
}

.room-fallback-operator.selected::after {
  right: auto;
  left: 50%;
  width: 12px;
  transform: translateX(-50%);
}

.room-fallback-queue-operator::after {
  position: absolute;
  right: auto;
  bottom: 0;
  left: 50%;
  width: 12px;
  height: 3px;
  border-radius: 2px;
  background: var(--fallback-destination);
  transform: translateX(-50%);
  content: "";
}

.room-fallback-card-enter-active,
.room-fallback-card-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.room-fallback-card-enter-from,
.room-fallback-card-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.94);
}

.room-fallback-card-move {
  transition: transform 0.16s ease;
}

@media (max-width: 640px) {
  .room-staffing-candidate-main {
    gap: 8px;
  }

  .room-staffing-candidate-details {
    flex-basis: 108px;
    width: 108px;
    min-width: 108px;
  }
}
</style>
