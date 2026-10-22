<script setup>
import { computed, ref } from "vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import ITEM_INFO from "/src/static/json/material/item_info.json";

const props = defineProps({
  outputs: {
    type: Array,
    default: () => [],
  },
  boostConsumption: {
    type: Array,
    default: () => [],
  },
});

const RECYCLE_RARITIES = [5, 4, 3, 2];
const RECYCLE_RARITY_LABELS = Object.freeze({
  5: "T5 材料",
  4: "T4 材料",
  3: "T3 材料",
  2: "T2 材料",
});
const ITEM_INFO_BY_ID = new Map(
  ITEM_INFO.map((item) => [String(item.itemId), item]),
);

const dialogOpen = ref(false);
const grouping = ref("rarity");
const outputItems = computed(() =>
  (Array.isArray(props.outputs) ? props.outputs : [])
    .map((item) => {
      const itemId = String(item?.itemId || "");
      const amount = Number(item?.amountPerDay);
      return {
        ...item,
        itemId,
        amountPerDay: Number.isFinite(amount) ? amount : 0,
        rarity: Number(ITEM_INFO_BY_ID.get(itemId)?.rarity),
      };
    })
    .filter((item) => item.itemId && item.name && item.amountPerDay > 0)
    .sort((left, right) => right.amountPerDay - left.amountPerDay),
);
const canOpen = computed(() => outputItems.value.length > 0);
const boostItems = computed(() =>
  Array.isArray(props.boostConsumption) ? props.boostConsumption : [],
);
const total = computed(() =>
  outputItems.value.reduce((sum, item) => sum + item.amountPerDay, 0),
);
const outputRows = computed(() => {
  if (grouping.value === "material") {
    return outputItems.value.map((item) => ({
      key: item.itemId,
      itemId: item.itemId,
      label: item.name,
      amountPerDay: item.amountPerDay,
    }));
  }

  return RECYCLE_RARITIES.map((rarity) => {
    const members = outputItems.value.filter(
      (item) => item.rarity === rarity,
    );
    return {
      key: String(rarity),
      itemId: members[0]?.itemId || "",
      label: RECYCLE_RARITY_LABELS[rarity],
      amountPerDay: members.reduce(
        (sum, item) => sum + item.amountPerDay,
        0,
      ),
    };
  }).filter((row) => row.amountPerDay > 0);
});

function open() {
  if (canOpen.value) {
    dialogOpen.value = true;
  }
}

function formatAmount(value, digits = 4) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }

  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}
</script>

<template>
  <slot
    name="activator"
    :can-open="canOpen"
    :open="open"
    :total="total"
  />

  <v-dialog v-if="canOpen" v-model="dialogOpen" max-width="620" scrollable>
    <v-card class="riic-recycle-output-dialog">
      <v-card-title>回收站材料期望产量</v-card-title>
      <v-card-text>
        <div class="riic-recycle-output-toolbar">
          <span>额外池已计入长期平均</span>
          <v-btn-toggle
            v-model="grouping"
            mandatory
            density="compact"
            divided
            aria-label="回收站产出分组"
          >
            <v-btn value="rarity">按稀有度</v-btn>
            <v-btn value="material">按材料</v-btn>
          </v-btn-toggle>
        </div>
        <div class="riic-recycle-output-list">
          <div
            v-for="item in outputRows"
            :key="item.key"
            class="riic-recycle-output-row"
          >
            <ItemImage
              v-if="item.itemId"
              :item-id="item.itemId"
              :size="32"
              :mobile-size="32"
            />
            <v-icon v-else icon="mdi-package-variant-closed" size="24" />
            <span>{{ item.label }}</span>
            <strong>{{ formatAmount(item.amountPerDay) }} 件/天</strong>
          </div>
        </div>
        <section
          v-if="boostItems.length"
          class="riic-recycle-boost-consumption"
        >
          <strong>加速材料消耗</strong>
          <div
            v-for="item in boostItems"
            :key="item.itemId"
            class="riic-recycle-output-row"
          >
            <ItemImage
              :item-id="item.itemId"
              :size="32"
              :mobile-size="32"
            />
            <span>{{ item.name }}</span>
            <strong>{{ formatAmount(item.amountPerDay) }} 件/天</strong>
          </div>
        </section>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="dialogOpen = false">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.riic-recycle-output-dialog {
  border-radius: 4px;
}

.riic-recycle-output-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--c-text-color-secondary, var(--riic-muted, #6b7280));
  font-size: 12px;
}

.riic-recycle-output-list {
  display: grid;
  gap: 6px;
}

.riic-recycle-boost-consumption {
  display: grid;
  gap: 6px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--c-border-color);
  color: var(--c-text-color);
  font-size: 12px;
}

.riic-recycle-output-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 40px;
  gap: 8px;
  border-bottom: 1px solid var(--c-border-color);
  color: var(--c-text-color);
  font-size: 13px;
}

.riic-recycle-output-row strong {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
</style>
