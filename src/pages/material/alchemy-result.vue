<script setup>
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { RefreshLeft, Upload } from "@element-plus/icons-vue";

import {
    buildAlchemyResultRecord,
    buildMHDropResultRecord,
    uploadAlchemyResult,
    uploadMHDropResult,
} from "/src/api/statHarbor.js";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import { createMessage } from "/src/utils/message.js";
import itemInfoList from "/src/static/json/material/item_info.json";

const fallbackItemMap = new Map(itemInfoList.map((item) => [String(item.itemId), item]));
const fallbackItemNameMap = new Map(itemInfoList.map((item) => [item.itemName, String(item.itemId)]));
const lmdUnit = 10000;
const LMD_ID = getItemIdByName("龙门币");

const alchemyUploadFields = [
    { key: "solvent", label: "半自然溶剂", payloadKey: "半自然溶剂", step: 1, itemId: getItemIdByName("半自然溶剂") },
    { key: "hydrocarbon", label: "环烃聚质", payloadKey: "环烃聚质", step: 1, itemId: getItemIdByName("环烃聚质") },
    { key: "coagulatingGel", label: "类凝结核", payloadKey: "类凝结核", step: 1, itemId: getItemIdByName("类凝结核") },
    { key: "lmd", label: "龙门币", payloadKey: "龙门币", step: lmdUnit, itemId: LMD_ID },
];

const mhDropMaterialFields = [
    { key: "brokenBone", label: "破碎的骨片", payloadKey: "破碎的骨片", step: 1, icon: "/image/mh/破碎的骨片.png", alchemyValue: 2 },
    { key: "bamboo", label: "烈竹", payloadKey: "烈竹", step: 1, icon: "/image/mh/烈竹.png", alchemyValue: 3 },
    { key: "firefly", label: "萤虫", payloadKey: "萤虫", step: 1, icon: "/image/mh/萤虫.png", alchemyValue: 5 },
    { key: "charcoal", label: "火竹炭", payloadKey: "火竹炭", step: 1, icon: "/image/mh/火竹炭.png", alchemyValue: 10 },
    { key: "iceCrystal", label: "熔火冰晶", payloadKey: "熔火冰晶", step: 1, icon: "/image/mh/熔火冰晶.png", alchemyValue: 20 },
    { key: "zinogreJasper", label: "雷狼龙的碧玉", payloadKey: "雷狼龙的碧玉", step: 1, icon: "/image/mh/雷狼龙的碧玉.png", alchemyValue: 200 },
];

const mhDropUploadFields = [
    {
        key: "times",
        label: "次数",
        payloadKey: "times",
        type: "buttonGroup",
        defaultValue: 1,
        badge: "T",
        options: [1, 2, 3, 4, 5, 6],
        groupWidth: "240px",
    },
    {
        key: "stage",
        label: "关卡",
        payloadKey: "stage",
        type: "buttonGroup",
        defaultValue: "TD-8",
        badge: "S",
        options: ["TD-6", "TD-7", "TD-8"],
        groupWidth: "200px",
    },
    ...mhDropMaterialFields,
];

const lmdUnitWarning = "龙门币必须是 10000 的整数倍";
const uploadCooldownSeconds = 3;

const uploadCards = reactive([
    createUploadCardState({
        key: "mhDrop",
        title: "怪猎关卡掉落统计",
        category: "MHDropResult",
        fields: mhDropUploadFields,
        buildRecord: buildMHDropResultRecord,
        upload: uploadMHDropResult,
        payloadGetter: (form) => createPayloadFromFields(mhDropUploadFields, form),
        timesGetter: (form) => form.times,
        formulaTextGetter: (form) => `材料炼金值合计 = ${formatNumber(calculateMHDropAlchemyValue(form), 4)}；平均每理智转化炼金值 = ${formatNumber(calculateMHDropAverageAlchemyValue(form), 4)}`,
        extraPreviewItemsGetter: (form) => [
            {
                key: "alchemyValue",
                label: "炼金值",
                value: calculateMHDropAlchemyValue(form),
                badge: "V",
            },
            {
                key: "averageAlchemyValue",
                label: "平均每理智转化炼金值",
                value: calculateMHDropAverageAlchemyValue(form),
                badge: "AP",
            },
        ],
    }),
    createUploadCardState({
        key: "alchemy",
        title: "怪猎炼金池数据统计",
        category: "AlchemyResult",
        fields: alchemyUploadFields,
        requiresLmdUnitCheck: true,
        buildRecord: buildAlchemyResultRecord,
        upload: uploadAlchemyResult,
        payloadGetter: (form) => ({
            龙门币: form.lmd,
            半自然溶剂: form.solvent,
            环烃聚质: form.hydrocarbon,
            类凝结核: form.coagulatingGel,
            times: form.lmd / lmdUnit + form.solvent + form.hydrocarbon + form.coagulatingGel,
        }),
        timesGetter: (form) => form.lmd / lmdUnit + form.solvent + form.hydrocarbon + form.coagulatingGel,
        formulaTextGetter: (form) => `炼金次数=龙门币 / 10000 + 半自然溶剂 + 环烃聚质 + 类凝结核 = ${formatNumber(form.lmd / lmdUnit + form.solvent + form.hydrocarbon + form.coagulatingGel, 6)}`,
    }),
]);

const defaultDrawCost = 60;
const defaultSanityToAlchemyRate = 2;

const calculatorRewardItems = [
    { key: "lmdBundle", itemName: "龙门币", baseQuantity: 10000 },
    { key: "solvent", itemName: "半自然溶剂", baseQuantity: 1 },
    { key: "hydrocarbon", itemName: "环烃聚质", baseQuantity: 1 },
    { key: "coagulatingGel", itemName: "类凝结核", baseQuantity: 1 },
].map((material) => ({
    ...material,
    itemId: getItemIdByName(material.itemName),
    label: material.baseQuantity > 1 ? `${material.itemName}x${material.baseQuantity}` : material.itemName,
}));

const sanityToAlchemyRate = ref(defaultSanityToAlchemyRate);
const rewardRows = ref(createDefaultRewardRows());
const materialProbabilities = reactive({
    solvent: 25,
    hydrocarbon: 25,
    coagulatingGel: 25,
});

const probabilityRows = computed(() => [
    {
        key: "solvent",
        label: "半自然溶剂",
        itemId: getItemIdByName("半自然溶剂"),
        value: materialProbabilities.solvent,
    },
    {
        key: "hydrocarbon",
        label: "环烃聚质",
        itemId: getItemIdByName("环烃聚质"),
        value: materialProbabilities.hydrocarbon,
    },
    {
        key: "coagulatingGel",
        label: "类凝结核",
        itemId: getItemIdByName("类凝结核"),
        value: materialProbabilities.coagulatingGel,
    },
    {
        key: "lmdBundle",
        label: "龙门币x10000",
        itemId: LMD_ID,
        value: lmdProbability.value,
        readonly: true,
    },
]);

const materialProbabilitySum = computed(() => {
    return toNumber(materialProbabilities.solvent)
        + toNumber(materialProbabilities.hydrocarbon)
        + toNumber(materialProbabilities.coagulatingGel);
});

const lmdProbability = computed(() => 100 - materialProbabilitySum.value);

const totalRewardValue = computed(() => {
    return rewardRows.value.reduce((sum, row) => {
        return sum + toNumber(row.value) * getRewardProbability(row) / 100;
    }, 0);
});

const alchemyYieldRate = computed(() => {
    return totalRewardValue.value * toNumber(sanityToAlchemyRate.value) / defaultDrawCost;
});

const lmdYieldRate = 12 * 0.0036;
const totalYieldRate = computed(() => alchemyYieldRate.value + lmdYieldRate);

function formatNumber(value, maximumFractionDigits = 4) {
    if (!Number.isFinite(value)) return "0";
    return value.toLocaleString("zh-CN", {
        maximumFractionDigits,
    });
}

function getItemIdByName(itemName) {
    const itemId = fallbackItemNameMap.get(itemName);
    if (!itemId) {
        throw new Error(`未找到物品：${itemName}`);
    }
    return itemId;
}

function createPayloadFromFields(fields, form) {
    return fields.reduce((payload, field) => {
        payload[field.payloadKey] = form[field.key];
        return payload;
    }, {});
}

function calculateMHDropAlchemyValue(form) {
    return mhDropMaterialFields.reduce((sum, field) => {
        return sum + toNumber(form[field.key]) * field.alchemyValue;
    }, 0);
}

function calculateMHDropAverageAlchemyValue(form) {
    const times = toNumber(form.times);
    if (times <= 0) return 0;
    return calculateMHDropAlchemyValue(form) / times / 21;
}

function createUploadCardState({
    key,
    title,
    category,
    fields,
    buildRecord,
    upload,
    payloadGetter = (form) => createPayloadFromFields(fields, form),
    timesGetter = () => 0,
    formulaTextGetter = () => "",
    extraPreviewItemsGetter = () => [],
    requiresLmdUnitCheck = false,
}) {
    const form = reactive(
        fields.reduce((defaultForm, field) => {
            defaultForm[field.key] = field.defaultValue ?? 0;
            return defaultForm;
        }, {})
    );
    const times = computed(() => timesGetter(form));
    const formulaText = computed(() => formulaTextGetter(form));
    const payloadPreview = computed(() => payloadGetter(form));
    const recordPreview = computed(() => buildRecord(payloadPreview.value));
    const cooldownRemaining = ref(0);
    return {
        key,
        title,
        category,
        fields,
        form,
        times,
        formulaText,
        payloadPreview,
        recordPreview,
        debugPreviewText: computed(() => JSON.stringify(recordPreview.value, null, 2)),
        previewItems: computed(() => [
            ...fields.map((field) => ({
                ...field,
                value: form[field.key],
            })),
            ...extraPreviewItemsGetter(form),
        ]),
        hasInvalidInput: computed(() => fields.some((field) => {
            if (field.type === "buttonGroup") return !field.options.includes(form[field.key]);
            return !Number.isFinite(form[field.key]) || form[field.key] < 0;
        })),
        isLmdUnitAligned: computed(() => {
            if (!requiresLmdUnitCheck) return true;
            return Number.isFinite(form.lmd) && form.lmd % lmdUnit === 0;
        }),
        isUploadCoolingDown: computed(() => cooldownRemaining.value > 0),
        cooldownRemaining,
        upload,
        submitting: false,
        lastUploadedAt: "",
        uploadFeedback: null,
        lastDebugInfo: null,
        cooldownTimer: null,
    };
}

function normalizeUploadNumber(card, key) {
    if (!Number.isFinite(card.form[key]) || card.form[key] < 0) {
        card.form[key] = 0;
    }
}

function resetUploadForm(card) {
    for (const field of card.fields) {
        card.form[field.key] = field.defaultValue ?? 0;
    }
}

function resetCalculator() {
    sanityToAlchemyRate.value = defaultSanityToAlchemyRate;
    materialProbabilities.solvent = 25;
    materialProbabilities.hydrocarbon = 25;
    materialProbabilities.coagulatingGel = 25;
    rewardRows.value = createDefaultRewardRows();
}

function setUploadFeedback(card, type, text) {
    card.uploadFeedback = {
        type,
        text,
        time: new Date().toLocaleString("zh-CN"),
    };
}

function startUploadCooldown(card) {
    card.cooldownRemaining = uploadCooldownSeconds;
    if (card.cooldownTimer) {
        clearInterval(card.cooldownTimer);
    }
    card.cooldownTimer = setInterval(() => {
        card.cooldownRemaining = Math.max(0, card.cooldownRemaining - 1);
        if (card.cooldownRemaining === 0) {
            clearInterval(card.cooldownTimer);
            card.cooldownTimer = null;
        }
    }, 1000);
}

onBeforeUnmount(() => {
    for (const card of uploadCards) {
        if (card.cooldownTimer) {
            clearInterval(card.cooldownTimer);
        }
    }
});

async function submitUploadCard(card) {
    if (card.hasInvalidInput) {
        const message = "请检查输入，数值不能为负数或空值";
        setUploadFeedback(card, "warn", message);
        createMessage({ text: message, type: "warn" });
        return;
    }
    if (!card.isLmdUnitAligned) {
        setUploadFeedback(card, "warn", lmdUnitWarning);
        createMessage({ text: lmdUnitWarning, type: "warn" });
        return;
    }
    if (card.isUploadCoolingDown) {
        const message = `上传过于频繁，请 ${card.cooldownRemaining} 秒后再试`;
        setUploadFeedback(card, "warn", message);
        createMessage({ text: message, type: "warn" });
        return;
    }

    startUploadCooldown(card);
    card.submitting = true;
    card.lastDebugInfo = {
        status: "uploading",
        request: card.recordPreview,
        startedAt: new Date().toLocaleString("zh-CN"),
    };
    try {
        const result = await card.upload(card.payloadPreview);
        card.lastUploadedAt = new Date().toLocaleString("zh-CN");
        const message = result?.data || "上传成功";
        setUploadFeedback(card, "success", message);
        card.lastDebugInfo = {
            ...card.lastDebugInfo,
            status: "success",
            response: result,
            finishedAt: new Date().toLocaleString("zh-CN"),
        };
        createMessage({ text: message, type: "success" });
    } catch (error) {
        const message = error?.msg || error?.data?.msg || "上传失败，请稍后再试";
        setUploadFeedback(card, "error", message);
        card.lastDebugInfo = {
            ...card.lastDebugInfo,
            status: "error",
            error,
            finishedAt: new Date().toLocaleString("zh-CN"),
        };
        createMessage({ text: message, type: "error" });
    } finally {
        card.submitting = false;
    }
}

function createDefaultRewardRows() {
    return calculatorRewardItems.map((item, index) => {
        const referenceValue = getItemReferenceValue(item.itemId) * item.baseQuantity;
        return {
            id: index + 1,
            key: item.key,
            itemId: item.itemId,
            label: item.label,
            referenceValue,
            value: referenceValue,
        };
    });
}

function getRewardProbability(row) {
    if (row.key === "lmdBundle") return lmdProbability.value;
    return materialProbabilities[row.key] ?? 0;
}

function getItemReferenceValue(itemId) {
    if (!itemId) return 0;
    const item = fallbackItemMap.get(String(itemId));
    const itemValue = Number(item?.itemValue ?? item?.itemValueAp);
    return Number.isFinite(itemValue) ? itemValue : 0;
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function formatValue(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return (Object.is(number, -0) ? 0 : number).toLocaleString("zh-CN", {
        maximumFractionDigits: digits,
    });
}

</script>

<template>
  <main class="alchemy-result-page">
    <section v-for="card in uploadCards" :key="card.key" class="alchemy-card">
      <header class="alchemy-card-header">
        <div class="alchemy-card-title">
          <div class="collapse-title-icon"></div>
          <span class="collapse-title-font">{{ card.title }}</span>
        </div>
        <div class="alchemy-card-meta">
          <span>ArknightsMHV2</span>
          <span>{{ card.category }}</span>
        </div>
      </header>

      <div class="collapse-content-subheading">
        <span></span>
        上传内容
      </div>

      <div class="alchemy-card-body">
        <label
          v-for="field in card.fields"
          :key="field.key"
          class="resources-line"
          :class="{ 'resources-line-wide': field.type === 'buttonGroup' }"
        >
          <span class="resources-line-label">
            <ItemImage v-if="field.itemId" :item-id="field.itemId" :size="28" :mobile-size="24" fallback-image />
            <img v-else-if="field.icon" :src="field.icon" alt="" />
            <span v-else class="field-badge">{{ field.badge || field.label.slice(0, 1) }}</span>
            {{ field.label }}
          </span>
          <el-radio-group
            v-if="field.type === 'buttonGroup'"
            v-model="card.form[field.key]"
            class="alchemy-stage-group"
            :style="{ width: field.groupWidth || '200px' }"
          >
            <el-radio-button
              v-for="option in field.options"
              :key="option"
              :label="option"
            />
          </el-radio-group>
          <el-input-number
            v-else
            v-model="card.form[field.key]"
            :min="0"
            :precision="0"
            :step="field.step"
            class="alchemy-number-input"
            @change="normalizeUploadNumber(card, field.key)"
            @blur="normalizeUploadNumber(card, field.key)"
          />
        </label>
      </div>

      <div v-if="card.key === 'alchemy' && card.formulaText" class="times-formula upload-times-formula">
        {{ card.formulaText }}
      </div>

      <div class="collapse-content-subheading">
        <span></span>
        上传预览
      </div>

      <pre class="debug-preview">{{ card.debugPreviewText }}</pre>

      <div class="resources-result-bar result-preview-bar">
        <div v-for="field in card.previewItems" :key="field.key" class="resources-result-single">
          <div v-if="field.itemId || field.icon" class="image-wrap">
            <ItemImage v-if="field.itemId" :item-id="field.itemId" :size="32" :mobile-size="28" fallback-image />
            <img v-else :src="field.icon" alt="" />
          </div>
          <div v-else class="times-icon">{{ field.badge || field.label.slice(0, 1) }}</div>
          <div>
            <span class="resources-label">{{ field.payloadKey || field.label }}</span>
            <span class="resources-quantity">{{ field.type === "buttonGroup" ? field.value : formatNumber(field.value, 4) }}</span>
          </div>
        </div>
      </div>

      <footer class="alchemy-card-footer">
        <div v-if="!card.isLmdUnitAligned" class="upload-warning">
          {{ lmdUnitWarning }}
        </div>
        <div v-if="card.uploadFeedback" class="feedback-message" :class="`feedback-${card.uploadFeedback.type}`">
          {{ card.uploadFeedback.text }}<span>{{ card.uploadFeedback.time }}</span>
        </div>
        <div v-if="card.formulaText && card.key !== 'alchemy'" class="times-formula">
          {{ card.formulaText }}
        </div>
        <div v-if="card.lastUploadedAt" class="upload-status">
          上次上传：{{ card.lastUploadedAt }}
        </div>
        <details class="debug-details">
          <summary>调试信息</summary>
          <pre>{{ JSON.stringify(card.lastDebugInfo || { status: "ready", request: card.recordPreview }, null, 2) }}</pre>
        </details>
        <div class="action-row">
          <el-button :icon="RefreshLeft" @click="resetUploadForm(card)">重置</el-button>
          <el-button type="primary" :icon="Upload" :loading="card.submitting" @click="submitUploadCard(card)">
            {{ card.isUploadCoolingDown ? `${card.cooldownRemaining}s` : "上传" }}
          </el-button>
        </div>
      </footer>
    </section>

    <section class="alchemy-card">
      <header class="alchemy-card-header">
        <div class="alchemy-card-title">
          <div class="collapse-title-icon profit-title-icon"></div>
          <span class="collapse-title-font">无限池收益计算器</span>
        </div>
        <div class="alchemy-card-meta">
          <span>{{ defaultDrawCost }} 炼金材料 / 抽</span>
        </div>
      </header>

      <div class="collapse-content-subheading">
        <span></span>
        收益参数
      </div>
      <p class="material-value-tip times-formula">当前参数为估算预设值，需要等统计出足够多的数据，才可以计算精确值，统计数据我们会定时更新</p>

      <div class="reward-config sanity-rate-config">
        <label class="draw-cost-field">
          <span>每理智兑换炼金材料</span>
          <el-input-number
            v-model="sanityToAlchemyRate"
            :min="0"
            :precision="2"
            :step="0.1"
            class="profit-number-input"
          />
        </label>
      </div>

      <div class="probability-list">
        <div
          v-for="row in probabilityRows"
          :key="row.key"
          class="probability-row"
        >
          <div class="profit-material-name">
            <ItemImage :item-id="row.itemId" :size="32" :mobile-size="28" fallback-image />
            <strong>{{ row.label }}</strong>
          </div>
          <div v-if="row.readonly" class="readonly-probability">
            {{ formatValue(row.value) }}%
          </div>
          <el-input-number
            v-else
            v-model="materialProbabilities[row.key]"
            :min="0"
            :precision="2"
            :step="1"
            class="profit-number-input"
          />
        </div>
      </div>

      <div class="collapse-content-subheading">
        <span></span>
        材料价值
      </div>
      <p class="material-value-tip times-formula">如果有自己不需要的材料，可以调低该材料的价值</p>

      <div class="reward-config">
        <div class="reward-row-list">
          <div v-for="row in rewardRows" :key="row.id" class="reward-row">
            <div class="profit-material-name">
              <ItemImage :item-id="row.itemId" :size="36" :mobile-size="32" fallback-image />
              <div>
                <strong>{{ row.label }}</strong>
                <span>参考 {{ formatValue(row.referenceValue) }} 理智</span>
              </div>
            </div>
            <label>
              <span>理智价值</span>
              <el-input-number
                v-model="row.value"
                :min="0"
                :precision="2"
                :step="1"
                class="reward-number-input"
              />
            </label>
          </div>
        </div>
      </div>

      <footer class="alchemy-card-footer">
        <div class="profit-result-grid yield-formula-grid">
          <div class="profit-final-result">
            <span>炼金收益率</span>
            <strong>{{ formatValue(alchemyYieldRate * 100) }}%</strong>
          </div>
          <span class="yield-operator">+</span>
          <div class="profit-final-result">
            <span>刷图龙门币收益</span>
            <strong>{{ formatValue(lmdYieldRate * 100) }}%</strong>
          </div>
          <span class="yield-operator">=</span>
          <div class="profit-final-result">
            <span>总收益率</span>
            <strong>{{ formatValue(totalYieldRate * 100) }}%</strong>
          </div>
        </div>
        <div class="action-row">
          <el-button :icon="RefreshLeft" @click="resetCalculator">重置收益计算</el-button>
        </div>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.alchemy-result-page {
  min-height: calc(100vh - 160px);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: start;
  gap: 16px;
  padding: 12px 0 32px;
}

.alchemy-card {
  container-type: inline-size;
  flex: 1 1 440px;
  min-width: 0;
  width: 100%;
  max-width: 640px;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--c-card-background-color, var(--index-div-bg));
  color: var(--c-text-color, var(--index-div-fg));
  box-shadow: 1px 1px 8px var(--c-box-shadow-color, rgba(0, 0, 0, 0.2));
}

.alchemy-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  gap: 12px;
  padding-right: 14px;
  border-bottom: 1px solid #80808080;
}

.alchemy-card-title {
  display: flex;
  align-items: center;
  min-width: 0;
}

.collapse-title-icon {
  width: 22px;
  height: 22px;
  padding: 12px;
  margin: 12px;
  border-radius: 4px;
  background-color: #4380ff;
  box-sizing: border-box;
}

.profit-title-icon {
  background-color: #0f7a64;
}

.collapse-title-font {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0;
}

.alchemy-card-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.alchemy-card-meta span {
  padding: 3px 8px;
  border-radius: 4px;
  background-color: rgba(89, 157, 255, 0.14);
  color: #599dff;
  font-size: 12px;
  font-weight: 700;
}

.collapse-content-subheading {
  position: relative;
  width: 100%;
  height: 32px;
  padding: 0 32px;
  background-color: rgba(196, 196, 196, 0.5);
  font-size: 18px;
  line-height: 32px;
  box-sizing: border-box;
}

.collapse-content-subheading > span {
  position: absolute;
  top: 8px;
  left: 4px;
  border-top: 16px solid rgb(255, 255, 255);
  border-right: 12px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 12px solid transparent;
}

.alchemy-card-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 8px 10px;
  padding: 10px 12px;
}

.resources-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 6px 8px;
  border: 1px solid #80808030;
  border-radius: 4px;
  font-size: 15px;
}

.resources-line-wide {
  grid-template-columns: 72px minmax(220px, 1fr);
}

.resources-line-label {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
  font-weight: 600;
  white-space: nowrap;
}

.resources-line-label img,
.field-badge {
  width: 30px;
  height: 30px;
}

.resources-line-label img {
  object-fit: contain;
}

.field-badge {
  flex: 0 0 auto;
  border-radius: 4px;
  background-color: #4380ff;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  line-height: 30px;
  text-align: center;
}

.alchemy-number-input,
.alchemy-stage-group {
  display: inline-flex;
  flex-wrap: nowrap;
  justify-self: end;
}

.alchemy-stage-group :deep(.el-radio-button) {
  flex: 1 1 0;
  min-width: 0;
}

.alchemy-stage-group :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 8px 0;
}

.resources-result-bar {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid #80808080;
}

.debug-preview {
  max-height: 200px;
  margin: 0;
  padding: 10px 16px;
  overflow: auto;
  border-top: 1px solid #80808080;
  background-color: rgba(0, 0, 0, 0.06);
  color: var(--c-text-color, var(--index-div-fg));
  font-size: 13px;
  line-height: 18px;
  white-space: pre-wrap;
  word-break: break-word;
}

.result-preview-bar {
  flex-wrap: wrap;
}

.resources-result-single {
  display: flex;
  align-items: center;
  flex: 1 1 112px;
  min-width: 96px;
  gap: 6px;
}

.image-wrap,
.times-icon {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.times-icon {
  border-radius: 4px;
  background-color: #4380ff;
  color: #ffffff;
  font-size: 20px;
  font-weight: 900;
  line-height: 36px;
  text-align: center;
}

.result-preview-bar .times-icon {
  font-size: 13px;
}

.resources-label {
  display: block;
  color: #7b8794;
  font-size: 12px;
  font-weight: 700;
}

.resources-quantity {
  display: block;
  font-size: 20px;
  font-weight: bolder;
  line-height: 24px;
}

.alchemy-card-footer {
  display: grid;
  gap: 10px;
  padding: 10px 16px 14px;
  border-top: 1px solid #80808080;
}

.times-formula {
  color: #599dff;
  font-size: 16px;
  font-style: italic;
  line-height: 24px;
}

.upload-times-formula {
  padding: 0 16px 10px;
}

.times-formula strong {
  font-style: normal;
  font-size: 20px;
}

.upload-status {
  color: #1f7a5c;
  font-size: 13px;
  font-weight: 700;
}

.upload-warning {
  color: #fc7303;
  font-size: 13px;
  font-weight: 700;
}

.feedback-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
}

.feedback-message span {
  flex: 0 0 auto;
  opacity: 0.75;
  font-size: 12px;
  font-weight: 600;
}

.feedback-success {
  background-color: rgba(76, 175, 80, 0.12);
  color: #4caf50;
}

.feedback-warn {
  background-color: rgba(252, 115, 3, 0.12);
  color: #fc7303;
}

.feedback-error {
  background-color: rgba(255, 78, 78, 0.12);
  color: #ff4e4e;
}

.debug-details {
  font-size: 13px;
}

.debug-details summary {
  width: fit-content;
  cursor: pointer;
  color: #599dff;
  font-weight: 700;
}

.debug-details pre {
  max-height: 220px;
  margin: 8px 0 0;
  padding: 10px;
  overflow: auto;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.06);
  color: var(--c-text-color, var(--index-div-fg));
  font-size: 12px;
  line-height: 17px;
  white-space: pre-wrap;
  word-break: break-word;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.profit-material-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.profit-material-name strong,
.profit-material-name span {
  display: block;
}

.profit-material-name span,
.reward-row label > span,
.profit-material-result span,
.draw-cost-field > span {
  color: #7b8794;
  font-size: 12px;
  font-weight: 700;
}

.reward-row label {
  display: grid;
  gap: 4px;
}

.profit-number-input {
  width: 100%;
}

.profit-material-result {
  display: grid;
  gap: 4px;
  justify-items: end;
}

.profit-material-result strong {
  font-size: 18px;
}

.calculator-summary-bar {
  flex-wrap: wrap;
}

.profit-times-icon {
  background-color: #0f7a64;
}

.reward-config {
  display: grid;
  gap: 10px;
  padding: 10px 12px;
}

.material-value-tip {
  margin: 0;
  padding: 8px 14px 0;
}

.draw-cost-field {
  display: grid;
  gap: 4px;
  width: 100%;
}

.sanity-rate-config {
  grid-template-columns: minmax(160px, 220px);
}

.probability-list {
  display: grid;
  gap: 8px;
  padding: 8px 10px;
}

.probability-row {
  display: grid;
  grid-template-columns: minmax(170px, 1fr) minmax(124px, 160px);
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #80808040;
  border-radius: 4px;
}

.readonly-probability {
  min-height: 32px;
  padding: 0 11px;
  border-radius: 4px;
  background-color: rgba(128, 128, 128, 0.1);
  color: var(--c-text-color, var(--index-div-fg));
  font-size: 16px;
  font-weight: 700;
  line-height: 32px;
  text-align: center;
}

.reward-row-list {
  display: grid;
  gap: 8px;
}

.reward-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(124px, 160px);
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #80808040;
  border-radius: 4px;
}

.reward-number-input {
  width: 100%;
}

.reward-row strong {
  justify-self: end;
}

.profit-result-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.yield-formula-grid {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
}

.profit-result-grid > div {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid #80808040;
  border-radius: 4px;
}

.profit-result-grid span {
  color: #7b8794;
  font-size: 12px;
  font-weight: 700;
}

.profit-result-grid .yield-operator {
  color: #599dff;
  font-size: 20px;
  font-weight: 900;
}

.profit-result-grid strong {
  font-size: 18px;
}

.profit-result-grid strong.warning {
  color: #fc7303;
}

.profit-final-result strong {
  font-size: 22px;
  color: #0f7a64;
}

.profit-result-grid strong.profit-positive,
.resources-quantity.profit-positive {
  color: #0f7a64;
}

.profit-result-grid strong.profit-negative,
.resources-quantity.profit-negative {
  color: #d64f4f;
}

@container (max-width: 560px) {
  .reward-row,
  .probability-row {
    grid-template-columns: minmax(0, 1fr) minmax(124px, 160px);
  }

  .reward-row strong {
    justify-self: start;
  }

  .yield-formula-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .alchemy-result-page {
    padding: 8px 0 24px;
  }

  .alchemy-card {
    border-radius: 6px;
  }

  .alchemy-card-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 0 10px 10px 0;
  }

  .collapse-title-icon {
    width: 18px;
    height: 18px;
    padding: 8px;
    margin: 8px;
  }

  .collapse-title-font {
    font-size: 16px;
  }

  .collapse-content-subheading {
    height: 24px;
    padding: 0 24px;
    font-size: 12px;
    line-height: 24px;
  }

  .collapse-content-subheading > span {
    top: 6px;
    border-top-width: 12px;
    border-right-width: 8px;
    border-bottom-width: 2px;
    border-left-width: 8px;
  }

  .alchemy-card-body {
    grid-template-columns: 1fr;
    padding: 8px;
  }

  .resources-line {
    grid-template-columns: minmax(0, 1fr) minmax(104px, 118px);
    align-items: center;
    gap: 6px;
    padding: 6px;
    font-size: 14px;
  }

  .resources-line-wide {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .resources-line-label img,
  .field-badge,
  .image-wrap,
  .times-icon {
    width: 32px;
    height: 32px;
  }

  .field-badge,
  .times-icon {
    font-size: 18px;
    line-height: 32px;
  }

  .field-badge,
  .result-preview-bar .times-icon {
    font-size: 12px;
  }

  .alchemy-number-input {
    width: 100%;
  }

  .resources-result-bar {
    padding: 6px;
  }

  .resources-result-single {
    flex-basis: calc(50% - 8px);
  }

  .resources-quantity {
    font-size: 14px;
    line-height: 18px;
  }

  .times-formula {
    font-size: 12px;
    line-height: 18px;
  }

  .action-row {
    flex-direction: column;
  }

  .profit-material-row,
  .reward-row,
  .profit-result-grid {
    grid-template-columns: 1fr;
  }

  .profit-material-result,
  .reward-row strong {
    justify-items: start;
    justify-self: start;
  }

  .draw-cost-field {
    width: 100%;
  }

  .action-row :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
