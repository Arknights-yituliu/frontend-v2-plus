<script setup>
import { nextTick, onMounted, ref, watch } from "vue";
import { formatNumber } from "/src/utils/format.js";
import itemCache from "/src/plugins/indexedDB/itemCache.js";
import ItemImage from "@/components/sprite/ItemImage.vue";
import {
  getStageConfig,
  defaultConfig,
  parseConfig,
  stringifyConfig,
  orundumValueMap,
  originitePrimeCoefficientMap,
  kernalHeadhuntingPermitCoefficientMap,
  lmdCoefficientMap,
  expCoefficientMap,
  modUnlockTokenValueMap,
  recruitmentPermitValueMap,
  expeditedPlanValueMap,
  furniturePartValueMap
} from "@/utils/user/userConfig.js";
import ActionButton from "@/components/account/ActionButton.vue";
import ActStoreUnlimitedExchangeItem from '/src/static/json/material/act_store_unlimited_exchange_item.json';
import PresetParameter from "../../static/json/material/preset_parameter.json";
import { createMessage } from "/src/utils/message.js";
import { stringToNumber } from '/src/utils/stringUtils.js';

const presetParameter = ref(PresetParameter)

// 数据源映射与正则校验

// 正则表达式：用于验证0到1之间的数字，包括小数
const numberRegex = /^(0|[1-9]\d*)(\.\d+)?$/;

// 输入规则：校验数字格式和范围
const numberBetween0And1 = [
  value => numberRegex.test(value) || '仅可输入0.0-1.0间的小数，小数点后位数不限',
  value => (value === 0 || (value != null && value !== '')) || '不能为空',
  value => (value >= 0 && value <= 1) || '仅可输入0.0-1.0间的小数，小数点后位数不限',
];
const numberGe0 = [(value) => parseFloat(value) >= 0 || "值必须大于或等于 0"];


// Beasts

const BeastsStage = ref({
  "1-7": {
    zoneIndex: 0,
    stageIndex: 0,
    active: true
  },
  "12-17": {
    zoneIndex: 0,
    stageIndex: 0,
    active: true
  },
  "R8-11": {
    zoneIndex: 0,
    stageIndex: 0,
    active: true
  },
})

const stageConfigPanel = ref(['preset-parameter'])

// 响应式数据
const itemList = ref([]);

const debugText = ref('');


function resetConfig() {
  console.log("重置配置");
  console.log(defaultConfig);
  stageConfig.value = JSON.parse(JSON.stringify(defaultConfig));  // 重置为默认配置，用 JSON 深拷贝
  forceRefreshItemValue();
}

// 初始化默认配置
const stageConfig = ref({});


function loadingStageConfig() {
  // 合并本地配置
  stageConfig.value = getStageConfig(); // 合并配置

  stageConfig.value.useActivityStage = false

  let customItemMap = new Map()

  for (const item of stageConfig.value.customItem) {
    customItemMap.set(item.itemId, item.itemValue)
  }



  for (const item of actStoreUnlimitedExchangeItem.value) {
    if (customItemMap.has(item.itemId)) {
      if (customItemMap.get(item.itemId) < 3) {
        item.active = true
      }
    }
  }

  // stageConfig.value =stageConfigDebug
  getStageCollectByZone(); // 获取关卡信息
}


function choosePresetParameter(presetParameter) {
  const parameters = presetParameter.parameters
  for (const name in parameters) {
    stageConfig.value[name] = parameters[name];
  }
  updateStageActive()
  createMessage({
    type: 'info',
    text: presetParameter.message,
    duration: 4000
  })
}


// 输入框 ref
const orundumValueInput = ref(null);
const originitePrimeCoefficientInput = ref(null);
const kernalHeadhuntingPermitCoefficientInput = ref(null);
const lmdCoefficientInput = ref(null);
const expCoefficientInput = ref(null);
const modUnlockTokenValueInput = ref(null);
const recruitmentPermitValueInput = ref(null);
const expeditedPlanValueInput = ref(null);
const furniturePartValueInput = ref(null);

// 监听 orundumPricingStrategy 变化
watch(
  () => stageConfig.value.orundumPricingStrategy,
  (orundumPricingStrategy) => {
    const orundumValue = orundumValueMap[orundumPricingStrategy];
    if (orundumValue !== undefined) {  // 如果选中预设项
      stageConfig.value.orundumValue = orundumValue;
    } else {
      nextTick(() => orundumValueInput.value?.focus()); // 如果选中自定义，聚焦到输入框
    }
  },
  { immediate: true },
);

// 监听 originitePrimePricingStrategy 变化
watch(
  () => stageConfig.value.originitePrimePricingStrategy,
  (originitePrimePricingStrategy) => {
    const originitePrimeCoefficient = originitePrimeCoefficientMap[originitePrimePricingStrategy];
    if (originitePrimeCoefficient !== undefined) {  // 如果选中预设项
      stageConfig.value.originitePrimeCoefficient = originitePrimeCoefficient;
    } else {
      nextTick(() => originitePrimeCoefficientInput.value?.focus()); // 如果选中自定义，聚焦到输入框
    }
  },
  { immediate: true },
);

// 监听 kernalHeadhuntingPermitPricingStrategy 变化
watch(
  () => stageConfig.value.kernalHeadhuntingPermitPricingStrategy,
  (kernalHeadhuntingPermitPricingStrategy) => {
    const kernalHeadhuntingPermitCoefficient = kernalHeadhuntingPermitCoefficientMap[kernalHeadhuntingPermitPricingStrategy];
    if (kernalHeadhuntingPermitCoefficient !== undefined) {  // 如果选中预设项
      stageConfig.value.kernalHeadhuntingPermitCoefficient = kernalHeadhuntingPermitCoefficient;
    } else {
      nextTick(() => kernalHeadhuntingPermitCoefficientInput.value?.focus()); // 如果选中自定义，聚焦到输入框
    }
  },
  { immediate: true },
);

// 监听 lmdPricingStrategy 变化
watch(
  () => stageConfig.value.lmdPricingStrategy,
  (lmdPricingStrategy) => {
    const lmdCoefficient = lmdCoefficientMap[lmdPricingStrategy];
    if (lmdCoefficient !== undefined) {  // 如果选中预设项
      stageConfig.value.lmdCoefficient = lmdCoefficient;
    } else {
      nextTick(() => lmdCoefficientInput.value?.focus()); // 如果选中自定义，聚焦到输入框
    }
  },
  { immediate: true },
);

// 监听 expPricingStrategy 变化
watch(
  () => stageConfig.value.expPricingStrategy,
  (expPricingStrategy) => {
    const expCoefficient = expCoefficientMap[expPricingStrategy];
    if (expCoefficient !== undefined) {  // 如果选中预设项
      stageConfig.value.expCoefficient = expCoefficient;
    } else {
      nextTick(() => expCoefficientInput.value?.focus()); // 如果选中自定义，聚焦到输入框
    }
  },
  { immediate: true },
);

// 监听 modUnlockTokenPricingStrategy 变化
watch(
  () => stageConfig.value.modUnlockTokenPricingStrategy,
  (modUnlockTokenPricingStrategy) => {
    const modUnlockTokenValue = modUnlockTokenValueMap[modUnlockTokenPricingStrategy];
    if (modUnlockTokenValue !== undefined) {  // 如果选中预设项
      stageConfig.value.modUnlockTokenValue = modUnlockTokenValue;
    } else {
      nextTick(() => modUnlockTokenValueInput.value?.focus()); // 如果选中自定义，聚焦到输入框
    }
  },
  { immediate: true },
);

// 监听 recruitmentPermitPricingStrategy 变化
watch(
  () => stageConfig.value.recruitmentPermitPricingStrategy,
  (recruitmentPermitPricingStrategy) => {
    const recruitmentPermitValue = recruitmentPermitValueMap[recruitmentPermitPricingStrategy];
    if (recruitmentPermitValue !== undefined) {  // 如果选中预设项
      stageConfig.value.recruitmentPermitValue = recruitmentPermitValue;
    } else {
      nextTick(() => recruitmentPermitValueInput.value?.focus()); // 如果选中自定义，聚焦到输入框
    }
  },
  { immediate: true },
);

// 监听 expeditedPlanPricingStrategy 变化
watch(
  () => stageConfig.value.expeditedPlanPricingStrategy,
  (expeditedPlanPricingStrategy) => {
    const expeditedPlanValue = expeditedPlanValueMap[expeditedPlanPricingStrategy];
    if (expeditedPlanValue !== undefined) {  // 如果选中预设项
      stageConfig.value.expeditedPlanValue = expeditedPlanValue;
    } else {
      nextTick(() => expeditedPlanValueInput.value?.focus()); // 如果选中自定义，聚焦到输入框
    }
  },
  { immediate: true },
);

// 监听 furniturePartPricingStrategy 变化
watch(
  () => stageConfig.value.furniturePartPricingStrategy,
  (furniturePartPricingStrategy) => {
    const furniturePartValue = furniturePartValueMap[furniturePartPricingStrategy];
    if (furniturePartValue !== undefined) {  // 如果选中预设项
      stageConfig.value.furniturePartValue = furniturePartValue;
    } else {
      nextTick(() => furniturePartValueInput.value?.focus()); // 如果选中自定义，聚焦到输入框
    }
  },
  { immediate: true },
);


// ------------------从这里开始是关卡相关的代码------------------


const stageCollect = ref({
  "Open": [],
  "Main": [],
  "Act": [],
  "ActPerm": []
});

const stageTypeMap = {
  ACT: "SideStory",
  ACT_REP: "SideStory",
  MAIN: "主线",
  ACT_PERM: "插曲别传"
};

// 获取分区信息并构建阶段数据
function getStageCollectByZone() {


  const stageBlacklist = stageConfig.value.stageBlacklist

  itemCache.getStageInfoCache().then(response => {
    response = response.sort((a, b) => b.end - a.end)
    const indexMap = new Map();

    for (const stage of response) {
      const { zoneName, zoneId, stageCode, stageId, stageType, start, end } = stage;

      // 过滤掉不需要的阶段类型
      if (!stageTypeMap[stageType]) {
        continue;
      }

      if (zoneId.indexOf('tough') > -1) {
        continue
      }

      stage.active = stageBlacklist.indexOf(stageId) <= -1;


      if (stageType === "MAIN") {
        if (!indexMap.has(zoneName)) {
          stageCollect.value.Main.push({
            zoneName, zoneId, selectAll: true, list: []
          })
          indexMap.set(zoneName, stageCollect.value.Main.length - 1)
        }

        const index = indexMap.get(zoneName);
        if (BeastsStage.value[stageCode]) {
          BeastsStage.value[stageCode] = {
            zoneIndex: index,
            stageIndex: stageCollect.value.Main[index].list.length,
            active: stage.active
          }
        }
        stageCollect.value.Main[index].list.push(stage);
        continue;
      }

      if (stageType === "ACT_PERM") {
        if (!indexMap.has(zoneName)) {
          stageCollect.value.ActPerm.push({
            zoneName, zoneId, selectAll: true, list: []
          })
          indexMap.set(zoneName, stageCollect.value.ActPerm.length - 1)
        }
        const index = indexMap.get(zoneName);
        stageCollect.value.ActPerm[index].list.push(stage);
        continue;
      }

      if (end > Date.now()) {
        if (!indexMap.has(zoneName)) {
          stageCollect.value.Open.push({
            zoneName, zoneId, selectAll: true, list: []
          })
          indexMap.set(zoneName, stageCollect.value.Open.length - 1)
        }
        const index = indexMap.get(zoneName);
        stageCollect.value.Open[index].list.push(stage);
        continue;
      }


      if (!indexMap.has(zoneName)) {
        stageCollect.value.Act.push({
          zoneName, zoneId, selectAll: true, list: []
        })
        indexMap.set(zoneName, stageCollect.value.Act.length - 1)
      }
      const index = indexMap.get(zoneName);
      stageCollect.value.Act[index].list.push(stage);
    }
    // console.log(stageCollect.value)
  });
}

function updateStageActive() {

}

function selectAllStage(collect) {

  for (const item of collect.list) {
    item.active = !collect.selectAll
  }

  collect.selectAll = !collect.selectAll
}


function updateStageBlacklist(collect, stage) {
  stage.active = !stage.active
  let selectAll = true
  for (const item of collect.list) {
    selectAll = selectAll && item.active
  }
  collect.selectAll = selectAll
  updateStageConfig()
}

function updateBeastsStageActive(stage) {
  stage.active = !stage.active
  stageCollect.value.Main[stage.zoneIndex].list[stage.stageIndex].active = stage.active
  updateStageConfig()
}

function useActivityAverageStage() {
  stageConfig.value.useActivityAverageStage = !stageConfig.value.useActivityAverageStage
}


//------------------从这里开始是自定义材料价值相关的代码------------------

const customItemDialog = ref(false);
const customItem = ref({ itemId: '30073', itemName: "扭转醇", itemValue: 1.8 });
const actStoreUnlimitedExchangeItem = ref(ActStoreUnlimitedExchangeItem.slice(6, 12))

/**
 * 判断物品是否为精英材料
 * 直接使用物品 ID 判断，不一定准确
 * @param {string} item_id 物品 ID
 * @return {boolean} 是否为精英材料
 */
function isEliteMaterial(item_id) {
  return /^3[01]\d{3}/.test(item_id);
}

/**
 * 获取物品列表
 */
function getItemList() {
  checkStageConfig(); // 校验配置
  itemCache.getItemValueCacheByConfig(stageConfig.value).then(response => {
    itemList.value = response; // 更新物品列表
  });
}

/**
 * 选择预设材料，参数为一个材料对象
 * @param {{itemId:string,itemName:string,itemValue:number}} item 预设材料
 */
function chooseActStoreUnlimitedExchangeItem(item) {
  if (item.active) {
    console.log("删除")
    deleteCustomItem(item.itemId)
  } else {
    const existing = stageConfig.value.customItem.find(e => e.itemId === item.itemId);
    if (existing) {
      console.log("更新")
      existing.itemValue = item.itemValue; // 更新现有物品
    } else {
      console.log("新增")
      stageConfig.value.customItem.push(item); // 新增物品
    }
    item.active = true
  }

}

/**
 * 传入预设材料的状态，返回对应的样式
 * @param {boolean} active 是否选中，false返回灰度样式
 * @returns {string} 灰度样式
 */
function actStoreUnlimitedExchangeItemActiveClass(active) {
  if (!active) {
    return "out-item-unselected"
  }
}

/**
 * 选择自定义材料，参数为一个材料对象
 * @param {{itemId:string,itemName:string,itemValue:number}} item 自定义材料
 */
function chooseCustomItem(item) {
  customItem.value = { itemId: item.itemId, itemName: item.itemName, itemValue: item.itemValue };
}


/**
 * 添加自定义材料
 */
// 添加或更新自定义物品
function addCustomItem() {
  const existing = stageConfig.value.customItem.find(item => item.itemId === customItem.value.itemId);
  let { itemId, itemValue, itemName } = customItem.value
  itemValue = stringToNumber(itemValue)
  for (const item of actStoreUnlimitedExchangeItem.value) {
    if (item.itemId === itemId) {
      if (itemValue < 5) {
        item.active = true;
      }
    }
  }
  if (existing) {
    existing.itemValue = itemValue; // 更新现有物品
  } else {
    stageConfig.value.customItem.push({ itemId, itemValue, itemName }); // 新增物品
  }
  customItemDialog.value = false; // 关闭对话框
}


/**
 * 根据材料id删除自定义一图流配置中的自定义材料
 * @param itemId 材料id
 */
function deleteCustomItem(itemId) {
  for (const item of actStoreUnlimitedExchangeItem.value) {
    if (item.itemId === itemId) {
      item.active = false;
    }
  }
  stageConfig.value.customItem = stageConfig.value.customItem.filter(e => e.itemId !== itemId);
}


/**
 * 校验自定义一图流配置是否正确
 */
function checkStageConfig() {
  function _check(value) {
    return numberRegex.test(value) && (value === 0 || (value != null && value !== '')) && (value >= 0 && value <= 1);
  }

  if (!_check(stageConfig.value.expCoefficient)) stageConfig.value.expCoefficient = 0; // 设置默认值
  if (!_check(stageConfig.value.lmdCoefficient)) stageConfig.value.lmdCoefficient = 0; // 设置默认值
}


/**
 * 强制刷新物品价值
 */
function forceRefreshItemValue() {
  updateStageConfig()
  checkStageConfig(); // 校验配置
  localStorage.setItem("StageConfig", stringifyConfig(stageConfig.value)); // 保存配置
  itemCache.getItemValueCacheByConfig(stageConfig.value, true); // 强制刷新
  location.reload();
}

/**
 * 保存自定义一图流配置
 */
function updateStageConfig() {
  stageConfig.value.stageBlacklist = []
  for (const type in stageCollect.value) {
    const collect = stageCollect.value[type]
    for (const element of collect) {
      for (const stage of element.list) {
        // console.log(stage.stageCode,stage.active)
        if (!stage.active) {
          stageConfig.value.stageBlacklist.push(stage.stageId)
        }
      }
    }
  }
  debugText.value = stringifyConfig(stageConfig.value);
}


// 定时更新自定义一图流配置
// setInterval(updateStageConfig, 2000)

// 监听 stageConfig 的变化，保存配置到 localStorage
watch(
  stageConfig,
  (newConfig) => {
    debugText.value = stringifyConfig(newConfig);
    localStorage.setItem("StageConfig", stringifyConfig(newConfig));
  },
  { deep: true },
);

// 初始化数据
onMounted(() => {
  loadingStageConfig()
  getItemList(); // 获取物品列表
})
</script>


<template>
  <!-- 材料价值自定义参数主卡片 -->
  <v-card class="stage-config-card">
    <v-card-item>
      <v-card-title>物品定价策略设置</v-card-title>
      <div class="cover-v-card-subtitle">
        <span>自定义参数用于定制更适合自己的刷图方案和购买策略<br>自定义参数保存于当前设备，后续将可通过一图流账号保存和同步</span>
      </div>

    </v-card-item>

    <v-card-text class="stage-config-card-text">
      <!-- 刷新材料参数按钮 -->
      <div class="flex justify-center m-8">
        <v-btn text="修改参数后点我应用新的参数" color="primary" @click="forceRefreshItemValue()" class="m-4"></v-btn>
        <v-btn text="重置为初始参数" color="red" @click="resetConfig()" class="m-4"></v-btn>
      </div>

      <!-- 主体内容 -->
      <div>
        <!-- 重要参数设置 -->
        <!-- 折叠面板：基础价值参数 -->
        <v-expansion-panels multiple v-model="stageConfigPanel">
          <v-expansion-panel class="cover-v-expansion-panel" value="preset-parameter">
            <v-expansion-panel-title>
              快速设置
            </v-expansion-panel-title>

            <v-expansion-panel-text class="expansion-panel-text">
              <span class="cover-v-expansion-panel-subtitle">
                这里预制了一些参数，供大家快速选择
              </span>
              <v-divider></v-divider>
              <div v-for="group in presetParameter" class="flex flex-wrap">
                <v-card v-for="item in group" class="preset-parameter-card">
                  <v-card-title>{{ item.name }}</v-card-title>
                  <div class="player-description" v-for="d in item.description">
                    {{ d }}
                  </div>
                  <div class="parameter-description" v-for="pd in item.paramDescription">
                    {{ pd }}
                  </div>

                  <div style="height: 50px"></div>

                  <v-btn class="m-4 preset-parameter-card-action" @click="choosePresetParameter(item)"
                    :color="item.color">
                    应用
                  </v-btn>
                </v-card>

              </div>

            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel value="base-item-parameter">
            <v-expansion-panel-title>
              基础材料价值参数设置
            </v-expansion-panel-title>
            <v-expansion-panel-text class="expansion-panel-text">

              <!-- 合成玉定价策略 -->
              <v-radio-group v-model="stageConfig.orundumPricingStrategy">
                <template v-slot:label>
                  <div>
                    合成玉定价策略
                    <span class="card-description"
                      v-if="stageConfig.orundumPricingStrategy === 'ORUNDUM_PRICING_ORIGINITE_PRIME'">
                      180 合成玉 = 135 理智，1 合成玉 = 0.75 理智
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.orundumPricingStrategy === 'ORUNDUM_PRICING_ORININUM_FARMING_ORIROCK_CUBE'">
                      10 合成玉 = 2 固源岩 + 1600 龙门币 + 40 无人机
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.orundumPricingStrategy === 'ORUNDUM_PRICING_ORININUM_FARMING_DEVICE'">
                      10 合成玉 = 1 装置 + 1000 龙门币 + 40 无人机
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.orundumPricingStrategy === 'ORUNDUM_PRICING_INFINITY'">
                      仅计算抽卡资源的价值，认为养成资源无价值（1 合成玉 = ∞ 理智）
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.orundumPricingStrategy === 'ORUNDUM_PRICING_CUSTOM'">
                      1 合成玉 = {{ typeof stageConfig.orundumValue === "number" ? stageConfig.orundumValue : "?" }} 理智
                    </span>
                  </div>
                </template>
                <v-radio value="ORUNDUM_PRICING_ORIGINITE_PRIME" label="碎石途径定价（默认）"></v-radio>
                <v-radio value="ORUNDUM_PRICING_ORININUM_FARMING_ORIROCK_CUBE" label="搓玉途径定价（用固源岩搓玉）"></v-radio>
                <v-radio value="ORUNDUM_PRICING_ORININUM_FARMING_DEVICE" label="搓玉途径定价（用装置搓玉）"></v-radio>
                <v-radio value="ORUNDUM_PRICING_INFINITY" label="仅抽卡"></v-radio>
                <v-radio value="ORUNDUM_PRICING_CUSTOM" label="自定义"></v-radio>
                <v-text-field ref="orundumValueInput" v-model.number='stageConfig.orundumValue' :rules="numberGe0"
                  label="1 合成玉 = ? 理智" @focus="stageConfig.orundumPricingStrategy = 'ORUNDUM_PRICING_CUSTOM'"
                  placeholder="1 合成玉 = ? 理智" variant="outlined" density="compact"
                  style="margin-left: 40px; width: 200px;">
                </v-text-field>
              </v-radio-group>

              <!-- 至纯源石定价策略 -->
              <v-divider></v-divider>
              <v-radio-group v-model="stageConfig.originitePrimePricingStrategy">
                <template v-slot:label>
                  <div>
                    至纯源石价值系数 — {{ formatNumber(stageConfig.originitePrimeCoefficient, 4) }}
                    <span class="card-description">
                      用于计算礼包性价比，至纯源石价值 = 合成玉价值 × 至纯源石价值系数
                    </span>
                  </div>
                </template>
                <v-radio value="ORIGINITE_PRIME_PRICING_ORUNDUM" label="1 至纯源石 = 180 合成玉（默认）"></v-radio>
                <v-radio value="ORIGINITE_PRIME_PRICING_INFINITY" label="1 至纯源石 = ∞ 合成玉（源石仅买装扮）"></v-radio>
                <v-radio value="ORIGINITE_PRIME_PRICING_CUSTOM" label="自定义"></v-radio>
                <v-text-field ref="originitePrimeCoefficientInput"
                  v-model.number='stageConfig.originitePrimeCoefficient' :rules="numberGe0" label="至纯源石价值系数"
                  @click="stageConfig.originitePrimePricingStrategy = 'ORIGINITE_PRIME_PRICING_CUSTOM'"
                  @focus="stageConfig.originitePrimePricingStrategy = 'ORIGINITE_PRIME_PRICING_CUSTOM'"
                  placeholder="1 至纯源石 = ? 合成玉" variant="outlined" density="compact"
                  style="margin-left: 40px; width: 200px;">
                </v-text-field>
              </v-radio-group>

              <!-- 中坚寻访系数 -->
              <v-divider></v-divider>
              <v-radio-group v-model="stageConfig.kernalHeadhuntingPermitPricingStrategy">
                <template v-slot:label>
                  <div>
                    中坚寻访系数
                    <span class="card-description">
                      1 中坚寻访凭证 = {{ typeof stageConfig.kernalHeadhuntingPermitCoefficient === "number" ?
                        stageConfig.kernalHeadhuntingPermitCoefficient : "?" }} 寻访凭证
                    </span>
                  </div>
                </template>
                <v-radio value="KERNAL_HEADHUNTING_PERMIT_PRICING_DISTINCTION_CERTIFICATE"
                  label="38 中坚寻访凭证 = 216 高级凭证（默认）"></v-radio>
                <v-radio value="KERNAL_HEADHUNTING_PERMIT_PRICING_ZERO" label="中坚寻访凭证价值为 0"></v-radio>
                <v-radio value="KERNAL_HEADHUNTING_PERMIT_PRICING_CUSTOM" label="自定义"></v-radio>
                <v-text-field ref="kernalHeadhuntingPermitCoefficientInput"
                  v-model.number='stageConfig.kernalHeadhuntingPermitCoefficient' :rules="numberGe0"
                  @focus="stageConfig.kernalHeadhuntingPermitPricingStrategy = 'KERNAL_HEADHUNTING_PERMIT_PRICING_CUSTOM'"
                  label="1 中坚寻访凭证 = ? 寻访凭证" placeholder="1 中坚寻访凭证 = ? 寻访凭证" variant="outlined" density="compact"
                  style="margin-left: 40px; width: 200px;">
                </v-text-field>
              </v-radio-group>

              <!-- 龙门币定价策略 -->
              <v-divider></v-divider>
              <v-radio-group v-model="stageConfig.lmdPricingStrategy">
                <template v-slot:label>
                  <div>
                    龙门币价值系数 — {{ formatNumber(stageConfig.lmdCoefficient, 4) }}
                    <span class="card-description">
                      用于调整龙门币的价值，龙门币价值 = 0.0036 × 龙门币价值系数
                    </span>
                  </div>
                </template>
                <v-radio value="LMD_PRICING_CE-6" label="按 CE-6 定价（默认）"></v-radio>
                <v-radio value="LMD_PRICING_ZERO" label="龙门币价值为 0"></v-radio>
                <v-radio value="LMD_PRICING_CUSTOM" label="自定义"></v-radio>
                <v-text-field ref="lmdCoefficientInput" v-model.number='stageConfig.lmdCoefficient'
                  :rules="numberBetween0And1" label="龙门币价值系数"
                  @focus="stageConfig.lmdPricingStrategy = 'LMD_PRICING_CUSTOM'" placeholder="0 ~ 1 之间的数字"
                  variant="outlined" density="compact" style="margin-left: 40px; width: 200px;">
                </v-text-field>
              </v-radio-group>

              <!-- EXP 定价策略 -->
              <v-divider></v-divider>
              <v-radio-group v-model="stageConfig.expPricingStrategy">
                <template v-slot:label>
                  <div>
                    EXP 价值系数 — {{ formatNumber(stageConfig.expCoefficient, 4) }}
                    <span class="card-description">
                      用于调整 EXP 的价值，EXP 价值 = 0.0036 × EXP 价值系数
                    </span>
                  </div>
                </template>
                <!-- 按 LS-6 定价 -->
                <v-radio value="EXP_PRICING_LS-6" label="按 LS-6 定价"></v-radio>
                <!-- EXP 价值为 0 -->
                <v-radio value="EXP_PRICING_ZERO" label="EXP 价值为 0"></v-radio>
                <!-- 按无人机定价（默认），3 级贸易站，不使用龙舌兰、但书、裁缝类技能 -->
                <v-radio value="EXP_PRICING_BASE_LVL_3_TP">
                  <template v-slot:label>
                    <div>
                      按无人机定价（默认）
                      <span class="card-description">
                        3 级贸易站，不使用龙舌兰、但书、裁缝类技能
                      </span>
                    </div>
                  </template>
                </v-radio>
                <!-- 按无人机定价，3 级贸易站，使用精 2 龙舌兰、精 2 但书、不使用裁缝类技能 -->
                <v-radio value="EXP_PRICING_BASE_LVL_3_TP_TEQUILA_2_PROVISO_2">
                  <template v-slot:label>
                    <div>
                      按无人机定价
                      <span class="card-description">
                        3 级贸易站，使用精 2 龙舌兰、精 2 但书，不使用裁缝类技能
                      </span>
                    </div>
                  </template>
                </v-radio>
                <!-- 按无人机定价，2 级贸易站，使用精 2 但书，不使用龙舌兰、裁缝类技能 -->
                <v-radio value="EXP_PRICING_BASE_LVL_2_TP_PROVISO_2">
                  <template v-slot:label>
                    <div>
                      按无人机定价
                      <span class="card-description">
                        2 级贸易站，使用精 2 但书，不使用龙舌兰、裁缝类技能
                      </span>
                    </div>
                  </template>
                </v-radio>
                <!-- 按无人机定价，1 级贸易站，使用精 2 但书，不使用龙舌兰、裁缝类技能 -->
                <v-radio value="EXP_PRICING_BASE_LVL_1_TP_PROVISO_2">
                  <template v-slot:label>
                    <div>
                      按无人机定价
                      <span class="card-description">
                        1 级贸易站，使用精 2 但书，不使用龙舌兰、裁缝类技能
                      </span>
                    </div>
                  </template>
                </v-radio>
                <!-- 自定义 -->
                <v-radio value="EXP_PRICING_CUSTOM" label="自定义"></v-radio>
                <v-text-field ref="expCoefficientInput" v-model.number='stageConfig.expCoefficient'
                  :rules="numberBetween0And1" label="EXP 价值系数"
                  @focus="stageConfig.expPricingStrategy = 'EXP_PRICING_CUSTOM'" placeholder="0 ~ 1 之间的数字"
                  variant="outlined" density="compact" style="margin-left: 40px; width: 200px;">
                </v-text-field>
              </v-radio-group>

              <!-- 模组数据块定价策略 -->
              <v-divider></v-divider>
              <v-radio-group v-model="stageConfig.modUnlockTokenPricingStrategy">
                <template v-slot:label>
                  <div>
                    模组数据块定价策略
                    <span class="card-description"
                      v-if="stageConfig.modUnlockTokenPricingStrategy === 'MOD_UNLOCK_TOKEN_PRICING_PURCHASE_CERTIFICATE'">
                      1 模组数据块 = 120 采购凭证
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.modUnlockTokenPricingStrategy === 'MOD_UNLOCK_TOKEN_PRICING_DISTINCTION_CERTIFICATE'">
                      1 模组数据块 = 20 高级凭证
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.modUnlockTokenPricingStrategy === 'MOD_UNLOCK_TOKEN_PRICING_CUSTOM'">
                      1 模组数据块 = {{ typeof stageConfig.modUnlockTokenValue === "number" ? stageConfig.modUnlockTokenValue
                        : "?" }} 理智
                    </span>
                  </div>
                </template>
                <v-radio value="MOD_UNLOCK_TOKEN_PRICING_PURCHASE_CERTIFICATE" label="采购凭证区定价（默认）"></v-radio>
                <v-radio value="MOD_UNLOCK_TOKEN_PRICING_DISTINCTION_CERTIFICATE" label="高级凭证区定价"></v-radio>
                <v-radio value="MOD_UNLOCK_TOKEN_PRICING_CUSTOM" label="自定义"></v-radio>
                <v-text-field ref="modUnlockTokenValueInput" v-model.number='stageConfig.modUnlockTokenValue'
                  :rules="numberGe0" label="1 模组数据块 = ? 理智"
                  @focus="stageConfig.modUnlockTokenPricingStrategy = 'MOD_UNLOCK_TOKEN_PRICING_CUSTOM'"
                  placeholder="1 模组数据块 = ? 理智" variant="outlined" density="compact"
                  style="margin-left: 40px; width: 200px;">
                </v-text-field>
              </v-radio-group>

              <!-- 招聘许可定价策略 -->
              <v-divider></v-divider>
              <v-radio-group v-model="stageConfig.recruitmentPermitPricingStrategy">
                <template v-slot:label>
                  <div>
                    招聘许可定价策略
                    <span class="card-description"
                      v-if="stageConfig.recruitmentPermitPricingStrategy === 'RECRUITMENT_PERMIT_PRICING_3_4'">
                      认为公开招募范围内的 3★、4★ 干员潜能均已满，5★、6★ 干员均已获得但潜能未满
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.recruitmentPermitPricingStrategy === 'RECRUITMENT_PERMIT_PRICING_3_4_5'">
                      认为公开招募范围内的 3★、4★、5★ 干员潜能均已满，6★ 干员均已获得但潜能未满
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.recruitmentPermitPricingStrategy === 'RECRUITMENT_PERMIT_PRICING_3_4_5_6'">
                      认为公开招募范围内的干员潜能均已满
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.recruitmentPermitPricingStrategy === 'RECRUITMENT_PERMIT_PRICING_CUSTOM'">
                      1 招聘许可 = {{ typeof stageConfig.recruitmentPermitValue === "number" ?
                        stageConfig.recruitmentPermitValue : "?" }} 理智
                    </span>
                  </div>
                </template>
                <v-radio value="RECRUITMENT_PERMIT_PRICING_3_4" label="5★、6★ 未满潜（默认）"></v-radio>
                <v-radio value="RECRUITMENT_PERMIT_PRICING_3_4_5" label="5★ 全满潜，6★ 未满潜"></v-radio>
                <v-radio value="RECRUITMENT_PERMIT_PRICING_3_4_5_6" label="全满潜"></v-radio>
                <v-radio value="RECRUITMENT_PERMIT_PRICING_CUSTOM" label="自定义"></v-radio>
                <v-text-field ref="recruitmentPermitValueInput" v-model.number='stageConfig.recruitmentPermitValue'
                  :rules="numberGe0" label="1 招聘许可 = ? 理智"
                  @focus="stageConfig.recruitmentPermitPricingStrategy = 'RECRUITMENT_PERMIT_PRICING_CUSTOM'"
                  placeholder="1 招聘许可 = ? 理智" variant="outlined" density="compact"
                  style="margin-left: 40px; width: 200px;">
                </v-text-field>
              </v-radio-group>

              <!-- 加急许可定价策略 -->
              <v-divider></v-divider>
              <v-radio-group v-model="stageConfig.expeditedPlanPricingStrategy">
                <template v-slot:label>
                  <div>
                    加急许可定价策略
                    <span class="card-description"
                      v-if="stageConfig.expeditedPlanPricingStrategy === 'EXPEDITED_PLAN_PRICING_ZERO'">
                      1 加急许可 = 0 理智
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.expeditedPlanPricingStrategy === 'EXPEDITED_PLAN_PRICING_RECRUITMENT_PERMIT'">
                      1 加急许可 = 1 招聘许可
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.expeditedPlanPricingStrategy === 'EXPEDITED_PLAN_PRICING_CUSTOM'">
                      1 加急许可 = {{ typeof stageConfig.expeditedPlanValue === "number" ? stageConfig.expeditedPlanValue :
                        "?" }} 理智
                    </span>
                  </div>
                </template>
                <v-radio value="EXPEDITED_PLAN_PRICING_ZERO" label="加急许可价值为 0（默认）"></v-radio>
                <v-radio value="EXPEDITED_PLAN_PRICING_RECRUITMENT_PERMIT" label="等于招聘许可的价值"></v-radio>
                <v-radio value="EXPEDITED_PLAN_PRICING_CUSTOM" label="自定义"></v-radio>
                <v-text-field ref="expeditedPlanValueInput" v-model.number='stageConfig.expeditedPlanValue'
                  :rules="numberGe0" label="1 加急许可 = ? 理智"
                  @focus="stageConfig.expeditedPlanPricingStrategy = 'EXPEDITED_PLAN_PRICING_CUSTOM'"
                  placeholder="1 加急许可 = ? 理智" variant="outlined" density="compact"
                  style="margin-left: 40px; width: 200px;">
                </v-text-field>
              </v-radio-group>

              <!-- 家具零件定价策略 -->
              <v-divider></v-divider>
              <v-radio-group v-model="stageConfig.furniturePartPricingStrategy">
                <template v-slot:label>
                  <div>
                    家具零件定价策略
                    <span class="card-description"
                      v-if="stageConfig.furniturePartPricingStrategy === 'FURNITURE_PART_PRICING_ZERO'">
                      1 家具零件 = 0 理智
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.furniturePartPricingStrategy === 'FURNITURE_PART_PRICING_SK-5'">
                      刷 SK-5 获取家具零件
                    </span>
                    <span class="card-description"
                      v-else-if="stageConfig.furniturePartPricingStrategy === 'FURNITURE_PART_PRICING_CUSTOM'">
                      1 家具零件 = {{ typeof stageConfig.furniturePartValue === "number" ? stageConfig.furniturePartValue :
                        "?" }} 理智
                    </span>
                  </div>
                </template>
                <v-radio value="FURNITURE_PART_PRICING_ZERO" label="家具零件价值为 0（默认）"></v-radio>
                <v-radio value="FURNITURE_PART_PRICING_SK-5" label="按 SK-5 定价（暂未实现）"></v-radio>
                <v-radio value="FURNITURE_PART_PRICING_CUSTOM" label="自定义"></v-radio>
                <v-text-field ref="furniturePartValueInput" v-model.number='stageConfig.furniturePartValue'
                  :rules="numberGe0" @focus="stageConfig.furniturePartPricingStrategy = 'FURNITURE_PART_PRICING_CUSTOM'"
                  label="1 家具零件 = ? 理智" placeholder="1 家具零件 = ? 理智" variant="outlined" density="compact"
                  style="margin-left: 40px; width: 200px;">
                </v-text-field>
              </v-radio-group>
            </v-expansion-panel-text>
          </v-expansion-panel>


          <!-- 折叠面板：关卡选择范围 -->


          <v-expansion-panel title="关卡计算范围选择" value="stage-range-parameter">
            <v-expansion-panel-text class="expansion-panel-text">
              <span class="card-description">
                这里用于选择材料价值计算的基准关卡
              </span>


              <div class="stage-checkbox">

                <div class="m-8-0 font-bold color-primary">快捷选择</div>
                <ActionButton v-for="(stage, stageCode) in BeastsStage" :btn-text="stageCode" :active="stage.active"
                  @click="updateBeastsStageActive(stage)">
                </ActionButton>


                <div class="m-8-0 font-bold color-primary">活动关</div>
                <ActionButton :btn-text="'SideStory定价测试集'" :active="stageConfig.useActivityAverageStage"
                  @click="useActivityAverageStage()">
                </ActionButton>

                <div class="m-8-0 font-bold color-primary">主题曲</div>
                <v-divider color="primary" class="opacity-50"></v-divider>
                <div v-for="(collect, index) in stageCollect.Main" :key="index">

                  <!--              <div class="m-4">  {{ collect.zoneName}} </div>-->
                  <v-checkbox density="compact" hide-details color="primary" v-model="collect.selectAll"
                    @click="selectAllStage(collect)">
                    <template v-slot:prepend>
                      {{ collect.zoneName }}
                    </template>
                  </v-checkbox>
                  <ActionButton v-for="(stage, index) in collect.list" :btn-text="stage.stageCode"
                    :active="stage.active" @click="updateStageBlacklist(collect, stage)">
                  </ActionButton>
                  <!--              <v-divider class="opacity-70 m-4-0"></v-divider>-->
                </div>


                <div class="m-8-0 font-bold color-primary">别传/插曲</div>
                <v-divider color="primary" class="opacity-50"></v-divider>
                <div v-for="(collect, index) in stageCollect.ActPerm" :key="index">
                  <v-checkbox density="compact" hide-details color="primary" v-model="collect.selectAll"
                    @click="selectAllStage(collect)">
                    <template v-slot:prepend>
                      {{ collect.zoneName }}
                    </template>
                  </v-checkbox>
                  <ActionButton v-for="(stage, index) in collect.list" :btn-text="stage.stageCode"
                    :active="stage.active" @click="updateStageBlacklist(collect, stage)">
                  </ActionButton>
                  <!--              <v-divider class="opacity-70 m-4-0"></v-divider>-->
                </div>

              </div>


            </v-expansion-panel-text>
          </v-expansion-panel>


          <!-- 折叠面板：自定义精英材料价值设置 -->

          <v-expansion-panel title="自定义精英材料价值" value="custom-item-value">
            <v-expansion-panel-text class="expansion-panel-text">

              <v-list>
                <v-list-item>
                  <v-list-item-title>
                    材料退环境预测
                  </v-list-item-title>
                  <div class="flex flex-wrap">
                    <ItemImage v-for="item in actStoreUnlimitedExchangeItem" :item-id="item.itemId" :size="50"
                      :mobile-size="40" :class="actStoreUnlimitedExchangeItemActiveClass(item.active)"
                      @click="chooseActStoreUnlimitedExchangeItem(item)"></ItemImage>
                  </div>
                  <!--                  {{actStoreUnlimitedExchangeItem}}-->
                </v-list-item>

                <v-list-item>
                  <v-list-item-title>
                    自定义精英材料价值
                  </v-list-item-title>
                  <!-- 按钮：打开自定义材料弹窗 -->
                  <v-btn color="primary" variant="outlined" size="small" text="新增自定义材料" @click="customItemDialog = true"
                    class="m-12-0"></v-btn>
                  <!-- 自定义材料列表：显示已添加的自定义材料及其价值 -->
                  <v-table>
                    <thead>
                      <tr>
                        <th>材料</th>
                        <th>自定义价值</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in stageConfig.customItem">
                        <td>
                          <!-- 显示材料的图标 -->
                          <ItemImage :size="60" :mobile-size="40" :item-id="item.itemId"></ItemImage>
                        </td>
                        <td>{{ item.itemValue }}</td>
                        <td>
                          <!-- 删除按钮：用于移除自定义材料 -->
                          <v-btn color="red" text="删除" @click="deleteCustomItem(item.itemId)"></v-btn>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>


        <!-- 调试文本区域 -->
        <v-expansion-panels>
          <v-expansion-panel title="debug区">
            <v-expansion-panel-text>
              <v-list-item>
                <v-list-item-title>
                  debug
                </v-list-item-title>
                <!-- 显示调试信息 -->
                <pre><code style="white-space: pre-wrap; font-family: 'Jetbrains Mono', Consolas, 'Courier New', monospace;">{{
                  debugText }}</code></pre>
              </v-list-item>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>


      </div>

    </v-card-text>
  </v-card>


  <!-- 自定义材料弹窗 -->
  <v-dialog v-model="customItemDialog" max-width="800">
    <v-card>
      <v-list>
        <!-- 自定义材料输入框 -->
        <v-list-item>
          <div>
            <v-text-field density="compact" v-model="customItem.itemValue" variant="outlined">
              <template v-slot:prepend>
                <!-- 材料图标预览 -->
                <ItemImage :size="60" :mobile-size="40" :item-id="customItem.itemId"></ItemImage>
              </template>
              <template v-slot:append>
                <!-- 按钮：新增自定义材料 -->
                <v-btn color="primary" text="新增" @click="addCustomItem()"></v-btn>
              </template>
            </v-text-field>
          </div>
        </v-list-item>

        <!-- 可选材料列表 -->
        <v-list-item title="可选材料">
          <div class="flex flex-wrap justify-center">
            <!-- 显示所有可选的材料图标，点击后选择该材料 -->
            <ItemImage v-for="item in itemList.filter((item) => isEliteMaterial(item.itemId))" :item-id="item.itemId"
              :size="60" :mobile-size="40" @click="chooseCustomItem(item)">
            </ItemImage>
          </div>
        </v-list-item>
      </v-list>
    </v-card>
  </v-dialog>
</template>
