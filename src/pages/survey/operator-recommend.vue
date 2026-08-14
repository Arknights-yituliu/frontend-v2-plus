<script setup>
import {onMounted, ref} from "vue";
import {createMessage} from "/src/utils/message.js";
import operatorDataAPI from "/src/api/operatorData.js";
import {operatorRecommend} from "/src/utils/survey/operatorRecommend";
import {operatorTableV2} from "/src/utils/gameData.js";
import deepClone from "/src/utils/deepClone.js";
import operatorProgressionStatisticsDataCache from "@/plugins/indexedDB/operatorProgressionStatisticsData.js";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import SkillIcon from "@/components/sprite/SkillIcon.vue";
import EquipIcon from "/src/components/sprite/EquipIcon.vue";
import {formatNumber} from "/src/utils/format.js";

import "/src/assets/css/survey/operator.scss";
import "/src/assets/css/survey/operator.phone.scss";

const loading = ref(false);
const operatorRecommendList = ref([]);

const headers = [
  {title: '干员', key: "charId"},
  {title: '图标'},
  {title: '模组/技能名称'},
  {title: '当前等级'},
  {title: '一级占比'},
  {title: '二级占比'},
  {title: '三级占比'},
];

async function getOperatorData() {
  const response = await operatorDataAPI.getOperatorData();
  const list = response.data || [];
  const operatorMap = {};

  for (const item of list) {
    operatorMap[item.charId] = item;
  }

  const result = [];
  for (const charId in operatorTableV2) {
    const formatData = deepClone(operatorTableV2[charId]);
    const item = operatorMap[charId] || {
      elite: 0,
      level: 0,
      mainSkill: 0,
      skill1: 0,
      skill2: 0,
      skill3: 0,
      modX: 0,
      modY: 0,
      modD: 0,
      modA: 0,
      own: false,
    };

    formatData.elite = item.elite;
    formatData.level = item.level;
    formatData.potential = item.potential;
    formatData.mainSkill = item.mainSkill;
    formatData.skill1 = item.skill1;
    formatData.skill2 = item.skill2;
    formatData.skill3 = item.skill3;
    formatData.modX = item.modX;
    formatData.modY = item.modY;
    formatData.modD = item.modD;
    formatData.modA = item.modA;
    formatData.own = item.own;

    result.push(formatData);
  }

  return result;
}

async function loadOperatorRecommend() {
  loading.value = true;

  try {
    const [operatorList, operatorProgressionStatistics] = await Promise.all([
      getOperatorData(),
      operatorProgressionStatisticsDataCache.getData(),
    ]);

    operatorRecommendList.value = await operatorRecommend(operatorList, operatorProgressionStatistics);
  } catch (error) {
    console.error(error);
    createMessage({type: 'error', text: '获取干员练度推荐失败'});
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadOperatorRecommend();
});
</script>

<template>
  <div class="survey-operator-page">
    <v-card title="干员练度推荐">
      <v-card-text>
        <v-data-table
            :headers="headers"
            :items="operatorRecommendList"
            :loading="loading"
            hide-default-footer
            items-per-page="-1"
            class="operator-recommend-table"
            no-data-text="暂无推荐">
          <template v-slot:item="{ item }">
            <tr>
              <td>
                <OperatorAvatar :size="50" :mobile-size="50" :border="true" :char-id="item.charId"></OperatorAvatar>
              </td>
              <td>
                <SkillIcon :icon="item.info.iconId" size="40" mobile-size="40" v-show="item.info.type==='skill'">
                </SkillIcon>
                <div class="operator-equip-group" v-show="item.info.type==='equip'">
                  <div class="operator-equip">
                    <EquipIcon :icon="item.info.iconId" mobile-size="30" size="30" class="block m-a"></EquipIcon>
                    <div class="equip-name">{{ item.info.iconId }}</div>
                  </div>
                </div>
              </td>
              <td>
                {{ item.info.name }}
              </td>
              <td>
                {{ item.current }}级
              </td>
              <td v-for="rank in item.ranks" :key="rank">
                {{ formatNumber(rank * 100, 2) }}%
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </div>
</template>
