<script setup>
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

const props = defineProps({
  developerSourceUrl: { type: String, default: "" },
  developerLayoutOptions: { type: Array, default: () => [] },
  developerShiftOptions: { type: Array, default: () => [] },
  developerLayoutId: { type: String, default: "" },
  developerShiftMode: { type: String, default: "" },
  developerCandidates: { type: Array, default: () => [] },
  developerCombinationGroups: { type: Array, default: () => [] },
  developerCombinationCount: { type: Number, default: 0 },
  manualQueueIndex: { type: Number, default: 0 },
  manualQueueCount: { type: Number, default: 1 },
  manualAssignmentCount: { type: Number, default: 0 },
  manualRooms: { type: Array, default: () => [] },
  manualBlueprintRows: { type: Array, default: () => [] },
  selectedManualRoomId: { type: String, default: "" },
  selectedManualRoom: { type: Object, default: null },
  manualSelectedAssignment: { type: Object, default: null },
  manualGroupOptions: { type: Array, default: () => [] },
  getManualRoomAssignment: { type: Function, required: true },
  getManualRoomAssignmentLabel: { type: Function, required: true },
  getManualRoomConflictNames: { type: Function, required: true },
  isManualOptionSelected: { type: Function, required: true },
  getManualOptionConflictNames: { type: Function, required: true },
  getOperatorAvatar: { type: Function, required: true },
  getCandidateSourceUrl: { type: Function, required: true },
  formatSourceDate: { type: Function, required: true },
});

const emit = defineEmits([
  "update:developerLayoutId",
  "update:developerShiftMode",
  "update:manualQueueIndex",
  "select-manual-room",
  "clear-manual-room-assignment",
  "assign-manual-group",
]);
</script>

<template>
<section class="developer-workbench">
      <header class="developer-heading">
        <div>
          <span class="result-label">原表组合浏览</span>
          <h2>选择布局和换班频率</h2>
          <p>
            列表只读取一图流 TXT 作业中已有的队列组合。效率和时长保留原表口径，
            便于后续校验不同工作时长下的实际表现。
          </p>
        </div>
        <a
          class="source-link"
          :href="developerSourceUrl"
          target="_blank"
          rel="noreferrer"
        >
          查看原始作业
          <v-icon icon="mdi-open-in-new" size="16"></v-icon>
        </a>
      </header>

      <div class="developer-controls">
        <fieldset class="developer-choice-group">
          <legend>布局</legend>
          <div class="developer-choice-list">
            <button
              v-for="option in developerLayoutOptions"
              :key="option.value"
              type="button"
              class="developer-choice"
              :class="{ selected: developerLayoutId === option.value }"
              :aria-pressed="developerLayoutId === option.value"
              @click="$emit('update:developerLayoutId', option.value)"
            >
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </button>
          </div>
        </fieldset>

        <fieldset class="developer-choice-group">
          <legend>换班频率</legend>
          <div class="developer-choice-list">
            <button
              v-for="option in developerShiftOptions"
              :key="option.value"
              type="button"
              class="developer-choice"
              :class="{ selected: developerShiftMode === option.value }"
              :aria-pressed="developerShiftMode === option.value"
              @click="$emit('update:developerShiftMode', option.value)"
            >
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </button>
          </div>
        </fieldset>
      </div>

      <section class="manual-schedule-editor">
        <header class="manual-editor-heading">
          <div>
            <span class="result-label">手动编排</span>
            <h2>按房间选择原表干员组</h2>
            <p>
              简图中的房间位与 MAA 排班结构一致。先选择队列和房间，再从右侧应用该房间可用的原表组合。
            </p>
          </div>
          <div class="manual-editor-status">
            <strong>{{ manualAssignmentCount }}</strong>
            <span>/ {{ manualRooms.length * manualQueueCount }} 个房间队列已配置</span>
          </div>
        </header>

        <div class="manual-queue-tabs" role="tablist" aria-label="排班队列">
          <button
            v-for="queueIndex in manualQueueCount"
            :key="queueIndex"
            type="button"
            class="manual-queue-tab"
            :class="{ selected: manualQueueIndex === queueIndex - 1 }"
            :aria-selected="manualQueueIndex === queueIndex - 1"
            role="tab"
            @click="$emit('update:manualQueueIndex', queueIndex - 1)"
          >
            队列 {{ queueIndex }}
          </button>
        </div>

        <div class="manual-editor-layout">
          <section class="manual-blueprint" aria-label="基建简图">
            <header class="manual-panel-heading">
              <div>
                <v-icon icon="mdi-home-city-outline" size="20"></v-icon>
                <h3>{{ developerLayoutId }} 基建简图</h3>
              </div>
              <span>点击房间开始编排</span>
            </header>

            <section
              v-for="row in manualBlueprintRows"
              :key="row.id"
              class="manual-blueprint-row"
            >
              <h4>{{ row.label }}</h4>
              <div class="manual-room-grid">
                <button
                  v-for="room in row.rooms"
                  :key="room.id"
                  type="button"
                  class="manual-room"
                  :class="[
                    `room-${room.roomType}`,
                    {
                      selected: selectedManualRoomId === room.id,
                      assigned: getManualRoomAssignment(
                        room.id,
                        manualQueueIndex,
                      ),
                      conflicted: getManualRoomConflictNames(room).length,
                    },
                  ]"
                  :aria-pressed="selectedManualRoomId === room.id"
                  @click="$emit('select-manual-room', room.id)"
                >
                  <span class="manual-room-icon">
                    <v-icon :icon="room.icon" size="18"></v-icon>
                  </span>
                  <span class="manual-room-copy">
                    <strong>{{ room.label }}</strong>
                    <small>{{
                      getManualRoomAssignmentLabel(room.id, manualQueueIndex)
                    }}</small>
                  </span>
                  <v-icon
                    v-if="getManualRoomConflictNames(room).length"
                    class="manual-room-conflict"
                    icon="mdi-alert-outline"
                    size="17"
                  ></v-icon>
                </button>
              </div>
            </section>
          </section>

          <section class="manual-group-picker">
            <header class="manual-picker-heading">
              <div v-if="selectedManualRoom">
                <span>{{ selectedManualRoom.typeLabel }}</span>
                <h3>{{ selectedManualRoom.label }}</h3>
              </div>
              <button
                type="button"
                class="icon-action"
                title="清空当前房间队列"
                aria-label="清空当前房间队列"
                :disabled="!manualSelectedAssignment"
                @click="$emit('clear-manual-room-assignment')"
              >
                <v-icon icon="mdi-close"></v-icon>
              </button>
            </header>

            <p class="manual-picker-note">
              队列 {{ manualQueueIndex + 1 }} 可选 {{ manualGroupOptions.length }} 组。
              组内效率与时长保留原始作业记录。
            </p>

            <div
              v-if="manualGroupOptions.length"
              class="manual-group-option-list"
            >
              <button
                v-for="option in manualGroupOptions"
                :key="option.key"
                type="button"
                class="manual-group-option"
                :class="{
                  selected: isManualOptionSelected(option),
                  conflicted: getManualOptionConflictNames(option).length,
                }"
                @click="$emit('assign-manual-group', option)"
              >
                <header>
                  <div>
                    <span>{{
                      option.fallback ? "原表未覆盖" : option.duration
                    }}</span>
                    <strong>
                      {{
                        option.fallback
                          ? "保持安排"
                          : option.efficiency === null
                          ? "原表组合说明"
                          : `${option.efficiency}%`
                      }}
                    </strong>
                  </div>
                  <v-icon
                    v-if="isManualOptionSelected(option)"
                    icon="mdi-check-circle"
                    size="20"
                  ></v-icon>
                </header>

                <div
                  v-if="option.operators.length"
                  class="operator-list"
                >
                  <div
                    v-for="operator in option.operators"
                    :key="`${operator.displayName}-${operator.eliteLevel}`"
                    class="operator-name"
                    :class="{ tired: operator.isTired }"
                  >
                    <OperatorAvatar
                      v-if="getOperatorAvatar(operator.displayName)"
                      :char-id="
                        getOperatorAvatar(operator.displayName).charId
                      "
                      :rarity="
                        getOperatorAvatar(operator.displayName).rarity
                      "
                      :size="34"
                      :mobile-size="32"
                      border
                      class="operator-avatar"
                    ></OperatorAvatar>
                    <span class="operator-label">
                      <span>{{ operator.displayName }}</span>
                      <small v-if="operator.eliteLevel !== null">
                        E{{ operator.eliteLevel }}
                      </small>
                    </span>
                  </div>
                </div>
                <p v-else class="developer-empty-operators">
                  {{ option.fallback ? "不换人" : "保持 / 不指定" }}
                </p>

                <p class="manual-option-description">{{ option.description }}</p>
                <p
                  v-if="getManualOptionConflictNames(option).length"
                  class="manual-option-conflict"
                >
                  与已编排房间重复：{{ getManualOptionConflictNames(option).join("、") }}
                </p>
                <small class="manual-option-source">
                  {{
                    option.fallback
                      ? "该设施由用户自行保留"
                      : `${option.sources.length} 个原表来源`
                  }}
                </small>
              </button>
            </div>

            <p v-else class="manual-empty-state">
              当前布局、换班频率和队列位置下没有可用于此房间的原表组合。
            </p>
          </section>
        </div>
      </section>

      <div class="developer-summary">
        <div>
          <strong>{{ developerCombinationCount }}</strong>
          <span>个唯一组合</span>
        </div>
        <p>
          来自 {{ developerCandidates.length }} 份作业；相同的站点、时长、干员顺序与说明已合并，
          但仍保留每个来源。
        </p>
      </div>

      <div class="developer-notice">
        <v-icon icon="mdi-information-outline" size="20"></v-icon>
        <p>
          百分比是原表作者标注的“平均”或“纸面”效率，不是当前页面重新模拟的结果。
          没有百分比说明的组合仍会展示为“原表未标注”。
        </p>
      </div>

      <section
        v-for="group in developerCombinationGroups"
        :key="group.title"
        class="developer-station"
      >
        <header class="developer-station-heading">
          <div>
            <h2>{{ group.title }}</h2>
            <span>{{ group.stationType }}</span>
          </div>
          <strong>{{ group.combinations.length }} 组</strong>
        </header>

        <div class="developer-combination-grid">
          <article
            v-for="combination in group.combinations"
            :key="combination.key"
            class="developer-combination"
          >
            <header class="developer-combination-heading">
              <div>
                <span>
                  队列
                  {{
                    combination.queueIndexes
                      .map((index) => index + 1)
                      .join(" / ")
                  }}
                </span>
                <strong>{{ combination.duration }}</strong>
              </div>
              <strong
                class="developer-efficiency"
                :class="{ unmarked: combination.efficiency === null }"
              >
                {{
                  combination.efficiency === null
                    ? "原表未标注"
                    : `${combination.efficiency}%`
                }}
              </strong>
            </header>

            <div v-if="combination.operators.length" class="operator-list">
              <div
                v-for="operator in combination.operators"
                :key="`${operator.displayName}-${operator.eliteLevel}`"
                class="operator-name"
                :class="{ tired: operator.isTired }"
              >
                <OperatorAvatar
                  v-if="getOperatorAvatar(operator.displayName)"
                  :char-id="
                    getOperatorAvatar(operator.displayName).charId
                  "
                  :rarity="
                    getOperatorAvatar(operator.displayName).rarity
                  "
                  :size="34"
                  :mobile-size="32"
                  border
                  class="operator-avatar"
                ></OperatorAvatar>
                <span class="operator-label">
                  <span>{{ operator.displayName }}</span>
                  <small v-if="operator.eliteLevel !== null">
                    E{{ operator.eliteLevel }}
                  </small>
                </span>
              </div>
            </div>
            <p v-else class="developer-empty-operators">保持 / 不指定</p>

            <p class="developer-description">
              {{
                combination.description ||
                "原表没有为这组干员补充效率说明"
              }}
            </p>

            <details class="developer-sources">
              <summary>{{ combination.sources.length }} 个来源作业</summary>
              <a
                v-for="source in combination.sources"
                :key="`${source.sourcePath}-${source.queueIndex}`"
                :href="getCandidateSourceUrl(source)"
                target="_blank"
                rel="noreferrer"
              >
                {{ formatSourceDate(source.sourceUpdatedAt) }}
                · {{ source.title }}
                · 队列 {{ source.queueIndex + 1 }}
              </a>
            </details>
          </article>
        </div>
      </section>
    </section>
</template>

<style scoped>
.developer-workbench {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px 0 36px;
}

.developer-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--c-border-color);
}

.developer-heading h2 {
  margin: 8px 0 0;
  font-size: 24px;
  line-height: 1.35;
}

.developer-heading p {
  max-width: 720px;
  margin: 9px 0 0;
  color: var(--riic-muted);
  font-size: 14px;
  line-height: 1.6;
}

.developer-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.developer-choice-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.developer-choice-group legend {
  margin-bottom: 9px;
  color: var(--riic-muted);
  font-size: 12px;
  font-weight: 700;
}

.developer-choice-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.developer-choice {
  display: flex;
  flex-direction: column;
  min-height: 72px;
  padding: 12px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.developer-choice:hover,
.developer-choice.selected {
  border-color: var(--riic-blue);
}

.developer-choice.selected {
  background: color-mix(in srgb, var(--riic-blue) 10%, var(--c-page-background-color));
  box-shadow: inset 3px 0 0 var(--riic-blue);
}

.developer-choice strong {
  font-size: 16px;
}

.developer-choice small {
  margin-top: 5px;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.45;
}

.developer-summary {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 13px 16px;
  border-left: 4px solid var(--riic-green);
  background: var(--c-page-background-color-secondary);
}

.developer-summary div {
  display: flex;
  align-items: baseline;
  flex: 0 0 auto;
  gap: 5px;
}

.developer-summary strong {
  color: var(--riic-green);
  font-size: 23px;
}

.developer-summary span,
.developer-summary p {
  color: var(--riic-muted);
  font-size: 13px;
}

.developer-summary p {
  margin: 0;
  line-height: 1.55;
}

.developer-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0 2px;
  color: var(--riic-muted);
}

.developer-notice .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--riic-orange);
}

.developer-notice p {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
}

.developer-station {
  padding-top: 20px;
  border-top: 1px solid var(--c-border-color);
}

.developer-station-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.developer-station-heading h2 {
  margin: 0;
  font-size: 18px;
}

.developer-station-heading span {
  display: block;
  margin-top: 4px;
  color: var(--riic-muted);
  font-size: 11px;
}

.developer-station-heading > strong {
  flex: 0 0 auto;
  color: var(--riic-blue);
  font-size: 13px;
}

.developer-combination-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.developer-combination {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background: var(--c-page-background-color);
}

.developer-combination-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.developer-combination-heading > div > span,
.developer-combination-heading > div > strong {
  display: block;
}

.developer-combination-heading > div > span {
  color: var(--riic-muted);
  font-size: 11px;
}

.developer-combination-heading > div > strong {
  margin-top: 3px;
  font-size: 15px;
}

.developer-efficiency {
  flex: 0 0 auto;
  color: var(--riic-green);
  font-size: 18px;
}

.developer-efficiency.unmarked {
  color: var(--riic-muted);
  font-size: 12px;
}

.developer-combination .operator-list {
  margin-top: 14px;
}

.developer-empty-operators {
  margin: 14px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
}

.developer-description {
  min-height: 20px;
  margin: 12px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.developer-sources {
  margin-top: auto;
  padding-top: 12px;
}

.developer-sources summary {
  color: var(--riic-blue);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.developer-sources a {
  display: block;
  margin-top: 7px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.45;
  text-decoration: none;
}

.developer-sources a:hover {
  color: var(--riic-blue);
  text-decoration: underline;
}

.manual-schedule-editor {
  padding: 22px 0;
  border-top: 1px solid var(--c-border-color);
  border-bottom: 1px solid var(--c-border-color);
}

.manual-editor-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.manual-editor-heading h2 {
  margin: 8px 0 0;
  font-size: 21px;
  line-height: 1.35;
}

.manual-editor-heading p {
  max-width: 680px;
  margin: 8px 0 0;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.55;
}

.manual-editor-status {
  display: flex;
  align-items: baseline;
  flex: 0 0 auto;
  gap: 4px;
  padding-top: 5px;
  color: var(--riic-muted);
  font-size: 12px;
}

.manual-editor-status strong {
  color: var(--riic-green);
  font-size: 23px;
}

.manual-queue-tabs {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--c-border-color);
}

.manual-queue-tab {
  min-width: 84px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.manual-queue-tab:hover,
.manual-queue-tab.selected {
  border-color: var(--riic-blue);
  color: var(--riic-blue);
}

.manual-queue-tab.selected {
  background: color-mix(in srgb, var(--riic-blue) 10%, var(--c-page-background-color));
}

.manual-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
  gap: 20px;
  margin-top: 18px;
}

.manual-blueprint,
.manual-group-picker {
  min-width: 0;
}

.manual-blueprint {
  padding: 16px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color-secondary);
}

.manual-panel-heading,
.manual-picker-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.manual-panel-heading > div {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--riic-blue);
}

.manual-panel-heading h3,
.manual-picker-heading h3 {
  margin: 0;
  color: var(--c-text-color);
  font-size: 15px;
}

.manual-panel-heading > span {
  color: var(--riic-muted);
  font-size: 11px;
}

.manual-blueprint-row {
  margin-top: 18px;
}

.manual-blueprint-row h4 {
  margin: 0 0 8px;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 700;
}

.manual-room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 8px;
}

.manual-room {
  --room-color: var(--riic-blue);
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 62px;
  padding: 8px;
  border: 1px solid var(--c-border-color);
  border-left: 3px solid var(--room-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.manual-room:hover,
.manual-room.selected {
  border-color: var(--room-color);
}

.manual-room.selected {
  background: color-mix(in srgb, var(--room-color) 9%, var(--c-page-background-color));
  box-shadow: inset 0 0 0 1px var(--room-color);
}

.manual-room.assigned .manual-room-icon {
  background: color-mix(in srgb, var(--room-color) 17%, transparent);
}

.manual-room.conflicted {
  --room-color: var(--riic-red);
}

.room-control {
  --room-color: var(--riic-blue);
}

.room-manufacture {
  --room-color: var(--riic-orange);
}

.room-trading {
  --room-color: var(--riic-green);
}

.room-power {
  --room-color: var(--riic-gold);
}

.room-meeting,
.room-hire {
  --room-color: #3d8ca8;
}

.room-processing {
  --room-color: #7667a8;
}

.room-dormitory {
  --room-color: #6d7782;
}

.manual-room-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--room-color);
}

.manual-room-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.manual-room-copy strong {
  font-size: 12px;
}

.manual-room-copy small {
  display: -webkit-box;
  margin-top: 3px;
  overflow: hidden;
  color: var(--riic-muted);
  font-size: 10px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.manual-room-conflict {
  flex: 0 0 auto;
  color: var(--riic-red);
}

.manual-group-picker {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
}

.manual-picker-heading > div > span {
  display: block;
  margin-bottom: 4px;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 700;
}

.manual-picker-heading .icon-action:disabled {
  color: var(--riic-muted);
  cursor: default;
  opacity: 0.55;
}

.manual-picker-note {
  margin: 12px 0 0;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.5;
}

.manual-group-option-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  max-height: 620px;
  margin-top: 14px;
  overflow-y: auto;
  padding-right: 2px;
}

.manual-group-option {
  width: 100%;
  padding: 11px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.manual-group-option:hover,
.manual-group-option.selected {
  border-color: var(--riic-blue);
}

.manual-group-option.selected {
  background: color-mix(in srgb, var(--riic-blue) 9%, var(--c-page-background-color));
  box-shadow: inset 3px 0 0 var(--riic-blue);
}

.manual-group-option.conflicted {
  border-color: color-mix(in srgb, var(--riic-red) 65%, var(--c-border-color));
}

.manual-group-option > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.manual-group-option > header > div > span,
.manual-group-option > header > div > strong {
  display: block;
}

.manual-group-option > header > div > span {
  color: var(--riic-muted);
  font-size: 10px;
}

.manual-group-option > header > div > strong {
  margin-top: 3px;
  color: var(--riic-green);
  font-size: 15px;
}

.manual-group-option.selected > header > .v-icon {
  color: var(--riic-blue);
}

.manual-group-option .operator-list {
  margin-top: 10px;
}

.manual-option-description,
.manual-option-conflict {
  margin: 9px 0 0;
  font-size: 11px;
  line-height: 1.45;
}

.manual-option-description {
  color: var(--riic-muted);
}

.manual-option-conflict {
  color: var(--riic-red);
}

.manual-option-source {
  display: block;
  margin-top: 8px;
  color: var(--riic-muted);
  font-size: 10px;
}

.manual-empty-state {
  margin: 22px 0;
  color: var(--riic-muted);
  font-size: 13px;
  line-height: 1.55;
}

.result-label {
  display: block;
  color: var(--riic-blue);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--riic-blue);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  min-height: 40px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--c-text-color);
  font: inherit;
  cursor: pointer;
}

.operator-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.operator-name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 4px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  font-size: 12px;
  line-height: 1.2;
}

.operator-avatar {
  flex: 0 0 auto;
}

.operator-label {
  display: flex;
  align-items: baseline;
  gap: 3px;
  min-width: 0;
  padding-right: 3px;
}

.operator-label > span {
  overflow-wrap: anywhere;
}

.operator-label small {
  flex: 0 0 auto;
  color: var(--riic-blue);
  font-size: 9px;
  font-weight: 700;
}

.operator-name.tired {
  border-color: var(--riic-red);
  color: var(--riic-red);
}

@media (max-width: 900px) {
  .developer-combination-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .manual-editor-layout {
    grid-template-columns: 1fr;
  }

  .manual-room-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .manual-group-option-list {
    max-height: none;
  }
}

@media (max-width: 640px) {
  .developer-heading {
    flex-direction: column;
  }

  .developer-heading h2 {
    font-size: 21px;
  }

  .developer-controls,
  .developer-combination-grid {
    grid-template-columns: 1fr;
  }

  .developer-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .manual-editor-heading {
    flex-direction: column;
    gap: 4px;
  }

  .manual-editor-status {
    padding-top: 0;
  }

  .manual-queue-tabs {
    overflow-x: auto;
    padding-bottom: 12px;
  }

  .manual-queue-tab {
    flex: 0 0 84px;
  }

  .manual-blueprint,
  .manual-group-picker {
    padding: 14px;
  }

  .manual-room-grid {
    grid-template-columns: 1fr;
  }

  .manual-room {
    min-height: 58px;
  }
}
</style>
