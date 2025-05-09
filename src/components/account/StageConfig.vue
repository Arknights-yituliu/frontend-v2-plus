<script setup>
import { onMounted, ref, watch } from "vue";
import { formatNumber } from "/src/utils/format.js";
import itemCache from "/src/utils/indexedDB/itemCache.js";
import ItemImage from "@/components/sprite/ItemImage.vue";
import { getUid } from "/src/utils/user/userInfo.js";
import { getStageConfig } from "@/utils/user/userConfig.js";

// 数据源映射与正则校验
const stageTypeMap = {
  ACT: "SideStory",
  ACT_REP: "SideStory",
  MAIN: "主线",
  ACT_PERM: "插曲别传"
};

// 正则表达式：用于验证0到1之间的数字，包括小数
const numberRegex = /^(0|[1-9]\d*)(\.\d+)?$/;

// 输入规则：校验数字格式和范围
const inputRules = [
  value => numberRegex.test(value) || '仅可输入0.0-1.0间的小数，小数点后位数不限',
  value => (value === 0 || (value != null && value !== '')) || '不能为空',
  value => (value >= 0 && value <= 1) || '仅可输入0.0-1.0间的小数，小数点后位数不限',
];

// 响应式数据
const stageList = ref([]);
const zoneOptions = ref([]);
const stageGroupByZoneName = ref({});
const selectedZoneName = ref('');
const itemList = ref([]);
const customItemDialog = ref(false);
const customItem = ref({ itemId: '30073', itemValue: 1.8 });
const debugText = ref('');

// 初始化默认配置
const stageConfig = ref({
  id: getUid(),
  expCoefficient: 0.633, // 经验书价值系数
  lmdCoefficient: 1, // 龙门币价值系数
  useActivityStage: false, // 是否使用活动本定价
  stageBlacklist: [], // 关卡黑名单
  source: 'penguin', // 数据来源
  customItem: [{ itemId: '30073', itemValue: 1.8 }] // 自定义物品列表
});

// 合并本地配置
const config = getStageConfig();
for (const key in config) {
  stageConfig.value[key] = config[key]; // 合并配置
}
stageConfig.value.source = 'penguin';

// 获取分区信息并构建阶段数据
function getStageCollectByZone() {
  itemCache.getStageInfoCache().then(response => {
    const zoneMap = new Map(); // 存储分区数据
    const zoneTmp = {}; // 临时存储区，用于去重

    for (const stage of response) {
      const { zoneName, stageType } = stage;
      if (!stageTypeMap[stageType]) continue; // 过滤掉不需要的阶段类型

      // 初始化分区数据
      if (!zoneTmp[zoneName]) {
        if (zoneMap.get(stageType)) {
          zoneMap.get(stageType).children.push({ value: zoneName, label: zoneName });
        } else {
          zoneMap.set(stageType, {
            value: stageType,
            label: stageTypeMap[stageType],
            children: [{ value: zoneName, label: zoneName }]
          });
        }
        zoneTmp[zoneName] = true;
      }

      // 根据分区名称分组阶段数据
      if (!stageGroupByZoneName.value[zoneName]) {
        stageGroupByZoneName.value[zoneName] = [];
      }
      stageGroupByZoneName.value[zoneName].push(stage);
    }

    // 填充zoneOptions
    for (const [, v] of zoneMap) {
      zoneOptions.value.push(v);
    }
  });
}

// 获取指定分区下的所有阶段
function getStageList(value) {
  stageList.value = stageGroupByZoneName.value[value[1]];
}

// 添加关卡到黑名单
function addStageBlackList(stage) {
  if (!stageConfig.value.stageBlacklist.find(item => item.stageId === stage.stageId)) {
    stageConfig.value.stageBlacklist.push({ stageId: stage.stageId, stageCode: stage.stageCode });
  }
}

// 从黑名单中删除关卡
function deleteStageBlackList(stageId) {
  stageConfig.value.stageBlacklist = stageConfig.value.stageBlacklist.filter(e => e.stageId !== stageId);
}

// 选择自定义物品
function chooseCustomItem(item) {
  customItem.value = { itemId: item.itemId, itemValue: item.itemValueAp };
}

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

// 删除自定义物品
function deleteCustomItem(itemId) {
  stageConfig.value.customItem = stageConfig.value.customItem.filter(e => e.itemId !== itemId);
}

// 校验阶段配置是否正确
function checkStageConfig() {
  function _check(value) {
    return numberRegex.test(value) && (value === 0 || (value != null && value !== '')) && (value >= 0 && value <= 1);
  }

  if (!_check(stageConfig.value.expCoefficient)) stageConfig.value.expCoefficient = 0; // 设置默认值
  if (!_check(stageConfig.value.lmdCoefficient)) stageConfig.value.lmdCoefficient = 0; // 设置默认值
}

// 获取物品列表
function getItemList() {
  checkStageConfig(); // 校验配置
  itemCache.getItemValueCacheByConfig(stageConfig.value).then(response => {
    itemList.value = response; // 更新物品列表
  });
}

// 强制刷新物品价值
function forceRefreshItemValue() {
  checkStageConfig(); // 校验配置
  localStorage.setItem("StageConfig", JSON.stringify(stageConfig.value)); // 保存配置
  itemCache.getItemValueCacheByConfig(stageConfig.value, true); // 强制刷新
}

// 监听stageConfig的变化，保存配置到localStorage
watch(stageConfig, () => {
  debugText.value = JSON.stringify(stageConfig.value, null, 2);
  localStorage.setItem("StageConfig", JSON.stringify(stageConfig.value));
}, { deep: true });

// 初始化数据
onMounted(() => {
  getStageCollectByZone(); // 获取关卡信息
  getItemList(); // 获取物品列表
  debugText.value = JSON.stringify(stageConfig.value, null, 2);
});
</script>


<template>
  <!-- 材料价值自定义参数主卡片 -->
  <v-card title="材料价值自定义参数" class="user-card m-4">
    <!-- 说明：材料参数目前仅保存在本地，后续会通过账号同步至服务器 -->
    <span class="card-description m-0-16">
      材料价值自定义参数暂时只能保存于当前设备，后续将会通过一图流账号保存至服务器
    </span>

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
              <v-btn>恢复默认</v-btn>
              <v-divider></v-divider>
              <v-btn>我是萌新</v-btn>
              <v-btn>我是成长中的博士</v-btn>
              <v-btn>我是老登</v-btn>
              <v-divider></v-divider>
              <v-btn>我是无氪党</v-btn>
              <v-btn>我是月卡党</v-btn>
              <v-btn>我嘎嘎氪金</v-btn>
              <v-divider></v-divider>
              <v-btn>还没想好要加什么</v-btn>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-expansion-panels multiple>
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
        </v-expansion-panels>



        <!-- 折叠面板：关卡选择范围 -->

        <v-expansion-panels>
          <v-expansion-panel title="关卡计算范围选择">
            <v-expansion-panel-text>

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

              <!-- 新增模块：选择计算范围的关卡区域 -->
              <v-list-item>
                <v-list-item-title>这里用于选择材料价值计算的基准关卡</v-list-item-title>
                <span class="card-description">
                  深色为选中，默认为全主线关卡+常驻SideStory关卡：
                </span>
                <div class="flex flex-wrap gap-2 mt-2">
                  <!-- <v-btn v-for="zone in zoneOptions" :key="zone.zoneCode"
                    :color="selectedZones.includes(zone.zoneCode) ? 'primary' : 'default'"
                    :variant="selectedZones.includes(zone.zoneCode) ? 'flat' : 'outlined'" size="small"
                    @click="toggleZone(zone.zoneCode)">
                    {{ zone.zoneName }}
                  </v-btn> -->
                  <v-btn>恢复默认</v-btn>
                  <v-divider></v-divider>
                  <v-btn>第0章</v-btn>
                  <v-btn>第1章</v-btn>
                  <v-btn>第2章</v-btn>
                  <v-divider></v-divider>
                  <v-btn>骑兵与猎人</v-btn>
                  <v-divider></v-divider>
                  <v-btn>SideStory活动期间</v-btn>

                </div>
              </v-list-item>

            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>


        <!-- 折叠面板：自定义材料价值设置 -->
        <v-expansion-panels>
          <v-expansion-panel title="自定义材料价值">
            <v-expansion-panel-text>
              <v-list-item>
                <v-list-item-title>
                  材料退环境预测
                </v-list-item-title>
                这里糊一排材料，点哪个自动添加到哪个材料为止，再点全部取消
              </v-list-item>


              <v-list-item>
                <v-list-item-title>
                  自定义材料价值
                </v-list-item-title>
                <!-- 按钮：打开自定义材料弹窗 -->
                <v-btn color="primary" variant="outlined" size="small" text="新增自定义材料"
                  @click="customItemDialog = true"></v-btn>

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
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>


        <!-- 刷新材料参数按钮 -->
        <div class="flex justify-center">
          <v-btn text="加载新的材料参数" color="primary" @click="forceRefreshItemValue()"></v-btn>
        </div>

        <!-- 调试文本区域 -->

        <v-expansion-panels>
          <v-expansion-panel title="debug区">
            <v-expansion-panel-text></v-expansion-panel-text>
            <v-list-item>
              <v-list-item-title>
                debug
              </v-list-item-title>
              <!-- 显示调试信息 -->
              <textarea v-model="debugText" style="height: 300px;width: 80%" class="m-4">
          </textarea>
            </v-list-item>
          </v-expansion-panel>
        </v-expansion-panels>


    </div>
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
