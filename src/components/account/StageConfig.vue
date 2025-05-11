<script setup>
import { onMounted, ref, watch } from "vue";
import { formatNumber } from "/src/utils/format.js";
import itemCache from "/src/utils/indexedDB/itemCache.js";
import ItemImage from "@/components/sprite/ItemImage.vue";
import { getUid } from "/src/utils/user/userInfo.js";
import { getStageConfig } from "@/utils/user/userConfig.js";
import ActionButton from "@/components/account/ActionButton.vue";
import ActStoreUnlimitedExchangeItem from '/src/static/json/material/act_store_unlimited_exchange_item.json'
import PresetParameter from "/src/static/json/material/preset_parameter.json"
import { createMessage } from "/src/utils/message.js";

const presetParameter = ref(PresetParameter)

// 数据源映射与正则校验

// 正则表达式：用于验证0到1之间的数字，包括小数
const numberRegex = /^(0|[1-9]\d*)(\.\d+)?$/;

// 输入规则：校验数字格式和范围
const inputRules = [
  value => numberRegex.test(value) || '仅可输入0.0-1.0间的小数，小数点后位数不限',
  value => (value === 0 || (value != null && value !== '')) || '不能为空',
  value => (value >= 0 && value <= 1) || '仅可输入0.0-1.0间的小数，小数点后位数不限',
];


//Beasts

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

// 响应式数据

const stageCollect = ref({
  "Open": [],
  "Main": [],
  "Act": [],
  "ActPerm": []
});
const itemList = ref([]);
const customItemDialog = ref(false);
const customItem = ref({ itemId: '30073', itemName: "扭转醇", itemValue: 1.8 });
const debugText = ref('');

const actStoreUnlimitedExchangeItem = ref(ActStoreUnlimitedExchangeItem.slice(6, 12))


// 初始化默认配置
const stageConfig = ref({
  id: getUid(),
  expCoefficient: 0.633, // 经验书价值系数
  lmdCoefficient: 1, // 龙门币价值系数
  useActivityStage: false, // 是否使用活动本定价
  stageBlacklist: [], // 关卡黑名单
  source: 'penguin', // 数据来源
  customItem: [{ itemId: '30073', itemName: "扭转醇", itemValue: 1.8 }] // 自定义物品列表
});

// 合并本地配置
const config = getStageConfig();
for (const key in config) {
  stageConfig.value[key] = config[key]; // 合并配置
}

stageConfig.value.source = 'penguin';


function choosePresetParameter(presetParameter) {
  const parameters = presetParameter.parameters

  let text = ""
  for (const name in parameters) {
    _buildMessage(name, parameters[name])
    stageConfig.value[name] = parameters[name];
  }

  createMessage({
    type: 'info',
    text: text,
    duration: 1000000
  })

  function _buildMessage(key, value) {
    if (key === "expCoefficient") {
      text += `经验书系数已修改为${value}；`
    }
    if (key === "lmdCoefficient") {
      text += `龙门币系数已修改为${value}；`
    }
    if (key === "useActivityStage") {
      if (value) {
        text += '已使用活动关卡作为基准；'
      } else {
        text += '已使用主线与常驻活动关卡作为基准；'
      }
    }
  }
}

//------------------从这里开始是关卡相关的代码------------------

const stageTypeMap = {
  ACT: "SideStory",
  ACT_REP: "SideStory",
  MAIN: "主线",
  ACT_PERM: "插曲别传"
};

// 获取分区信息并构建阶段数据
function getStageCollectByZone() {
  itemCache.getStageInfoCache().then(response => {
    response = response.sort((a, b) => b.end - a.end)
    const indexMap = new Map();
    for (const stage of response) {
      const { zoneName, zoneId, stageCode, stageType, end } = stage;
      stage.active = true
      // 过滤掉不需要的阶段类型
      if (!stageTypeMap[stageType]) {
        continue;
      }

      if (zoneId.indexOf('tough') > -1) {
        continue
      }

      if (stageType === "MAIN") {
        if (!indexMap.has(zoneName)) {
          stageCollect.value.Main.push({
            zoneName, zoneId, list: []
          })
          indexMap.set(zoneName, stageCollect.value.Main.length - 1)
        }
        const index = indexMap.get(zoneName);
        if (BeastsStage.value[stageCode]) {
          BeastsStage.value[stageCode] = {
            zoneIndex: index,
            stageIndex: stageCollect.value.Main[index].list.length,
            active: true
          }
        }
        stageCollect.value.Main[index].list.push(stage);
        continue;
      }

      if (stageType === "ACT_PERM") {
        if (!indexMap.has(zoneName)) {
          stageCollect.value.ActPerm.push({
            zoneName, zoneId, list: []
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
            zoneName, zoneId, list: []
          })
          indexMap.set(zoneName, stageCollect.value.Open.length - 1)
        }
        const index = indexMap.get(zoneName);
        stageCollect.value.Open[index].list.push(stage);
        continue;
      }


      if (!indexMap.has(zoneName)) {
        stageCollect.value.Act.push({
          zoneName, zoneId, list: []
        })
        indexMap.set(zoneName, stageCollect.value.Act.length - 1)
      }
      const index = indexMap.get(zoneName);
      stageCollect.value.Act[index].list.push(stage);
    }
    // console.log(stageCollect.value)
  });
}

function updateStageBlacklist(stage) {
  stage.active = !stage.active
  updateStageConfig()
}

function updateBeastsStageActive(stage) {
  stage.active = !stage.active
  stageCollect.value.Main[stage.zoneIndex].list[stage.stageIndex].active = stage.active
  updateStageConfig()
}


//------------------从这里开始是自定义材料价值相关的代码------------------

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
    deleteCustomItem(item.itemId)
  } else {
    const existing = stageConfig.value.customItem.find(e => e.itemId === item.itemId);
    if (existing) {
      existing.itemValue = item.itemValue; // 更新现有物品
    } else {
      stageConfig.value.customItem.push(item); // 新增物品
    }
  }
  item.active = !item.active
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
  if (existing) {
    existing.itemValue = customItem.value.itemValue; // 更新现有物品
  } else {
    stageConfig.value.customItem.push({ ...customItem.value }); // 新增物品
  }
  customItemDialog.value = false; // 关闭对话框
}


/**
 * 根据材料id删除自定义一图流配置中的自定义材料
 * @param itemId 材料id
 */
function deleteCustomItem(itemId) {
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
  localStorage.setItem("StageConfig", JSON.stringify(stageConfig.value)); // 保存配置
  itemCache.getItemValueCacheByConfig(stageConfig.value, true); // 强制刷新
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
        if (!stage.active) {
          stageConfig.value.stageBlacklist.push(stage.stageId)
        }
      }
    }
  }
  debugText.value = JSON.stringify(stageConfig.value, null, 2);
}


//定时更新自定义一图流配置
setInterval(updateStageConfig, 2000)

// // 监听stageConfig的变化，保存配置到localStorage
// watch(stageConfig, () => {
//   debugText.value = JSON.stringify(stageConfig.value, null, 2);
//   localStorage.setItem("StageConfig", JSON.stringify(stageConfig.value));
// }, {deep: true});

// 初始化数据
onMounted(() => {
  getStageCollectByZone(); // 获取关卡信息
  getItemList(); // 获取物品列表

});
</script>


<template>
  <!-- 材料价值自定义参数主卡片 -->
  <v-card>
    <v-card-item>
      <v-card-title>自定义材料价值参数</v-card-title>

      <v-card-subtitle>自定义参数用于定制更适合自己的刷图方案和购买策略<br>自定义参数保存于当前设备，后续将可通过一图流账号保存和同步</v-card-subtitle>
    </v-card-item>

    <v-card-text>
      <!-- 刷新材料参数按钮 -->
      <div class="flex justify-center m-8">
        <v-btn text="修改参数后点我应用新的参数" color="primary" @click="forceRefreshItemValue()"></v-btn>
      </div>

      <!-- 主体内容 -->
      <div>
        <!-- <v-list> -->
        <!-- 重要参数设置 -->
        <!-- 折叠面板：基础价值参数 -->
        <v-expansion-panels multiple>
          <v-expansion-panel>
            <v-expansion-panel-title>
              快速设置
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              这里预制了一些参数，供大家快速选择

              <v-divider></v-divider>
              <div v-for="group in presetParameter">
                <v-btn v-for="item in group" class="m-4" @click="choosePresetParameter(item)" :color="item.color">
                  {{ item.name }}
                </v-btn>
                <v-divider class="m-8-0"></v-divider>
              </div>

            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-title>
              基础材料价值参数设置
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- 经验书价值系数设置 -->
              <v-list-item>
                <v-list-item-title>
                  经验书价值系数 — {{ formatNumber(stageConfig.expCoefficient, 4) }}
                </v-list-item-title>
                <span class="card-description">
                  用于调整经验书的价值，经验书价值 = 0.0036 × 价值系数
                </span>
                <v-text-field v-model="stageConfig.expCoefficient" :rules="inputRules" variant="outlined"
                  density="compact"></v-text-field>
              </v-list-item>

              <!-- 龙门币价值系数设置 -->
              <v-list-item>
                <v-list-item-title>
                  龙门币价值系数 — {{ formatNumber(stageConfig.lmdCoefficient, 4) }}
                </v-list-item-title>
                <span class="card-description">
                  用于调整龙门币的价值，龙门币价值 = 0.0036 × 价值系数
                </span>
                <v-text-field v-model="stageConfig.lmdCoefficient" :rules="inputRules" variant="outlined"
                  density="compact"></v-text-field>
              </v-list-item>
            </v-expansion-panel-text>
          </v-expansion-panel>


          <!-- 折叠面板：关卡选择范围 -->


          <v-expansion-panel title="关卡计算范围选择">
            <v-expansion-panel-text>
              <span class="card-description">
                这里用于选择材料价值计算的基准关卡
              </span>


              <div class="stage-checkbox">
                <v-switch hide-details label="是否使用活动关为基准" color="primary" v-model="stageConfig.useActivityStage">

                </v-switch>
                <div class="m-8-0 font-bold color-primary">主线三幻神</div>
                <ActionButton v-for="(stage, stageCode) in BeastsStage" :btn-text="stageCode" :active="stage.active"
                  @click="updateBeastsStageActive(stage)">
                </ActionButton>

                <div class="m-8-0 font-bold color-primary">正在开放的活动</div>
                <v-divider color="primary" class="opacity-70"></v-divider>
                <div v-for="(collect, index) in stageCollect.Open" :key="index">
                  <div class="m-4"> {{ collect.zoneName }}</div>
                  <ActionButton v-for="(stage, index) in collect.list" :btn-text="stage.stageCode"
                    :active="stage.active" @click="updateStageBlacklist(stage)">
                  </ActionButton>
                  <!--              <v-divider class="opacity-70 m-4-0"></v-divider>-->
                </div>

                <div class="m-8-0 font-bold color-primary">主题曲</div>
                <v-divider color="primary" class="opacity-50"></v-divider>
                <div v-for="(collect, index) in stageCollect.Main" :key="index">

                  <!--              <div class="m-4">  {{ collect.zoneName}} </div>-->
                  <v-checkbox density="compact" hide-details>
                    <template v-slot:prepend>
                      {{ collect.zoneName }}
                    </template>
                  </v-checkbox>
                  <ActionButton v-for="(stage, index) in collect.list" :btn-text="stage.stageCode"
                    :active="stage.active" @click="updateStageBlacklist(stage)">
                  </ActionButton>
                  <!--              <v-divider class="opacity-70 m-4-0"></v-divider>-->
                </div>


                <div class="m-8-0 font-bold color-primary">别传/插曲</div>
                <v-divider color="primary" class="opacity-50"></v-divider>
                <div v-for="(collect, index) in stageCollect.ActPerm" :key="index">
                  <div class="m-4"> {{ collect.zoneName }}</div>
                  <ActionButton v-for="(stage, index) in collect.list" :btn-text="stage.stageCode"
                    :active="stage.active" @click="updateStageBlacklist(stage)">
                  </ActionButton>
                  <!--              <v-divider class="opacity-70 m-4-0"></v-divider>-->
                </div>

              </div>
              <!-- 是否使用活动本定价 -->
              <!-- <v-list-item>
              <v-list-item-title>
                是否使用活动本定价 {{ stageConfig.useActivityStage }}
              </v-list-item-title>
              <span class="card-description">
                选择此选项后，计算过程将会包括过去的所有活动本<br>
                由于掉率有统计浮动，因此可能出现当期活动本不为100%，实际的最高收益本为过去的活动本<br>
                此选项对尚未up过的新材料无效，同时不建议新玩家完全了解方舟活动收益机制前打开此开关
              </span>
              <v-switch hide-details color="primary" v-model="stageConfig.useActivityStage"></v-switch>
            </v-list-item> -->
            </v-expansion-panel-text>
          </v-expansion-panel>


          <!-- 折叠面板：自定义材料价值设置 -->

          <v-expansion-panel title="自定义材料价值">
            <v-expansion-panel-text>

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
                </v-list-item>

                <v-list-item>
                  <v-list-item-title>
                    自定义材料价值
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
                <textarea v-model="debugText" style="height: 700px;width: 100%" class="m-4">
        </textarea>
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
            <ItemImage v-for="item in itemList" :item-id="item.itemId" :size="60" :mobile-size="40"
              @click="chooseCustomItem(item)">
            </ItemImage>
          </div>
        </v-list-item>
      </v-list>
    </v-card>
  </v-dialog>
</template>
