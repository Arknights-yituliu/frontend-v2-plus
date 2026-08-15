<script setup>
import { computed } from "vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: false,
  },
  stations: {
    type: Array,
    default: () => [],
  },
  productOptions: {
    type: Object,
    default: () => ({}),
  },
  allowLevelAdjustment: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "toggle",
  "change-station-level",
  "change-station-product",
  "apply",
  "reset",
]);

const FACILITY_META = Object.freeze({
  trading: {
    label: "贸易站",
    icon: "mdi-handshake-outline",
    tone: "trading",
  },
  manufacture: {
    label: "制造站",
    icon: "mdi-factory",
    tone: "manufacture",
  },
  power: {
    label: "发电站",
    icon: "mdi-lightning-bolt",
    tone: "power",
  },
  meeting: {
    label: "会客室",
    icon: "mdi-account-group-outline",
    tone: "meeting",
  },
  office: {
    label: "办公室",
    icon: "mdi-briefcase-outline",
    tone: "office",
  },
  dormitory: {
    label: "宿舍",
    icon: "mdi-bed-outline",
    tone: "dormitory",
  },
  processing: {
    label: "加工站",
    icon: "mdi-hammer-wrench",
    tone: "processing",
  },
  training: {
    label: "训练室",
    icon: "mdi-school-outline",
    tone: "training",
  },
});

const visibleStations = computed(() =>
  (props.stations || []).map((station) => ({
    ...station,
    meta: FACILITY_META[station?.facility] || FACILITY_META.manufacture,
    products: props.productOptions?.[station?.facility] || [],
  })),
);

function updateStationLevel(station, delta) {
  const maxLevel = station.facility === "dormitory" ? 5 : 3;
  emit("change-station-level", {
    id: station.id,
    level: Math.min(
      maxLevel,
      Math.max(1, Number(station.stationLevel || 1) + delta),
    ),
  });
}
</script>

<template>
  <section class="custom-layout-entry">
    <button
      type="button"
      class="custom-layout-toggle"
      :aria-expanded="open"
      @click="emit('toggle')"
    >
      <span class="custom-layout-toggle-copy">
        <v-icon icon="mdi-tune-variant" size="18"></v-icon>
        <span>自定义布局（beta）-调整设施等级与产物-请确认你知道自己在干什么-如果出了问题可以点击上面预置布局恢复</span>
        <small v-if="active">已应用</small>
      </span>
      <v-icon
        :icon="open ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        size="18"
      ></v-icon>
    </button>

    <transition name="custom-layout-editor">
      <section v-if="open" class="custom-layout-editor">
        <div class="custom-layout-station-grid">
          <article
            v-for="station in visibleStations"
            :key="station.id"
            class="custom-layout-station"
            :class="`tone-${station.meta.tone}`"
          >
            <div class="custom-layout-station-heading">
              <span class="custom-layout-station-title">
                <v-icon :icon="station.meta.icon" size="17"></v-icon>
                <span>{{ station.meta.label }}</span>
              </span>
              <span class="custom-layout-station-index">
                {{ station.id.split("-").slice(-1)[0] }}
              </span>
            </div>

            <div
              v-if="allowLevelAdjustment"
              class="custom-layout-level-control"
            >
              <button
                type="button"
                title="降低等级"
                :disabled="station.stationLevel <= 1"
                @click="updateStationLevel(station, -1)"
              >
                <v-icon icon="mdi-minus" size="16"></v-icon>
              </button>
              <span>Lv.{{ station.stationLevel }}</span>
              <button
                type="button"
                title="提高等级"
                :disabled="
                  station.stationLevel >=
                  (station.facility === 'dormitory' ? 5 : 3)
                "
                @click="updateStationLevel(station, 1)"
              >
                <v-icon icon="mdi-plus" size="16"></v-icon>
              </button>
            </div>

            <div
              v-if="station.products.length"
              class="custom-layout-product-options"
            >
              <button
                v-for="option in station.products"
                :key="option.value"
                type="button"
                :class="{ selected: station.product === option.value }"
                @click="
                  emit('change-station-product', {
                    id: station.id,
                    product: option.value,
                  })
                "
              >
                {{ option.label }}
              </button>
            </div>
          </article>
        </div>

        <div class="custom-layout-actions">
          <button
            type="button"
            class="custom-layout-apply"
            @click="emit('apply')"
          >
            使用自定义布局
          </button>
          <button
            type="button"
            class="custom-layout-reset"
            :disabled="!active"
            @click="emit('reset')"
          >
            <v-icon icon="mdi-restore" size="16"></v-icon>
            <span>重置</span>
          </button>
        </div>
      </section>
    </transition>
  </section>
</template>

<style scoped>
.custom-layout-entry {
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 5px;
  background: var(--c-page-background-color-secondary);
}

.custom-layout-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 42px;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.custom-layout-toggle-copy,
.custom-layout-station-title,
.custom-layout-level-control {
  display: inline-flex;
  align-items: center;
}

.custom-layout-toggle-copy {
  min-width: 0;
  gap: 6px;
}

.custom-layout-toggle small {
  padding: 2px 5px;
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--riic-green) 12%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.custom-layout-editor {
  padding: 10px;
  border-top: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
}

.custom-layout-editor-enter-active,
.custom-layout-editor-leave-active {
  overflow: hidden;
  transition:
    max-height 0.2s ease,
    opacity 0.16s ease;
}

.custom-layout-editor-enter-from,
.custom-layout-editor-leave-to {
  max-height: 0;
  opacity: 0;
}

.custom-layout-editor-enter-to,
.custom-layout-editor-leave-from {
  max-height: 1600px;
  opacity: 1;
}

.custom-layout-station-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.custom-layout-station {
  --station-color: var(--riic-blue);
  min-width: 0;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--station-color) 22%, var(--c-border-color));
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--station-color) 4%,
    var(--c-page-background-color-secondary)
  );
}

.custom-layout-station.tone-trading {
  --station-color: var(--riic-blue);
}

.custom-layout-station.tone-manufacture {
  --station-color: var(--riic-gold);
}

.custom-layout-station.tone-power {
  --station-color: var(--riic-green);
}

.custom-layout-station.tone-meeting {
  --station-color: var(--riic-orange);
}

.custom-layout-station.tone-office {
  --station-color: var(--riic-red);
}

.custom-layout-station.tone-dormitory,
.custom-layout-station.tone-processing,
.custom-layout-station.tone-training {
  --station-color: var(--riic-muted);
}

.custom-layout-station-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 6px;
  color: var(--station-color);
}

.custom-layout-station-title {
  min-width: 0;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
}

.custom-layout-station-index {
  flex: 0 0 auto;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1;
}

.custom-layout-level-control {
  justify-content: center;
  width: 100%;
  min-height: 30px;
  margin-top: 8px;
  gap: 6px;
}

.custom-layout-level-control button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--station-color) 36%, var(--c-border-color));
  border-radius: 3px;
  background: var(--c-page-background-color);
  color: var(--station-color);
  cursor: pointer;
}

.custom-layout-level-control button:disabled {
  opacity: 0.34;
  cursor: default;
}

.custom-layout-level-control span {
  min-width: 38px;
  color: var(--c-text-color);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.custom-layout-product-options {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8px;
  gap: 4px;
}

.custom-layout-product-options button {
  min-width: 0;
  padding: 3px 5px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 11px;
  line-height: 1.25;
  cursor: pointer;
}

.custom-layout-product-options button:hover,
.custom-layout-product-options button.selected {
  border-color: color-mix(in srgb, var(--station-color) 45%, var(--c-border-color));
  background: color-mix(
    in srgb,
    var(--station-color) 12%,
    var(--c-page-background-color)
  );
  color: var(--station-color);
}

.custom-layout-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.custom-layout-apply,
.custom-layout-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 4px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.custom-layout-apply {
  border: 0;
  background: var(--riic-blue);
  color: #fff;
}

.custom-layout-reset {
  gap: 4px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color-secondary);
  color: var(--riic-muted);
}

.custom-layout-reset:not(:disabled):hover {
  border-color: var(--riic-orange);
  color: var(--riic-orange);
}

.custom-layout-reset:disabled {
  opacity: 0.42;
  cursor: default;
}

@media (max-width: 900px) {
  .custom-layout-station-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .custom-layout-station-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
