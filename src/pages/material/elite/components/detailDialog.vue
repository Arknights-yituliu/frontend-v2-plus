<script setup>
// import RankBar from "./rankBar";
// import RankBarContent from "./rankBarContent";
import MaterialItem from "./materialItem";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import SkillIcon from "/src/components/sprite/SkillIcon.vue";
import EquipIcon from "/src/components/sprite/EquipIcon.vue";

import { ref } from 'vue';
import { detailData, detailTableData, costFormatter, percentFormatter } from '../js/table'
import {
  totalCostObj, // 总材料消耗对象
  deleteOperatorData, initOperatorData
} from '../js/formatOperatorData'
import { noModIcon } from '../js/baseData' // 无模组图片的图标

const props = defineProps({
  modelValue: Boolean,
})
const collapseActive = ref(['1'])

const emits = defineEmits(['update:modelValue', 'reset'])

const options = [
  { key: 'name', title: '开销项目', minWidth: '100' },
  { key: 'icon', title: '图标', width: '100' },
  { key: 'totalCost', title: '材料开销', formatter: costFormatter },
  { key: 'position', title: '排名' },
  { key: 'percent', title: '位于' },
  { key: 'rank3', title: '精二/专三/开三级模组率' },
]

// 删除自定义干员
const deleteOperator = () => {
  deleteOperatorData(detailData.value.charId) // 删除此自定义干员
  initOperatorData() // 重新初始化干员数据列表
  emits('reset') // 刷新所有表格
  emits('update:modelValue', false)
}

function getEquipIcon(typeIcon){
  return typeIcon ? `https://cos.yituliu.cn/equip-icon/${typeIcon}.png` : noModIcon
}

</script>

<template>
  <el-dialog class="detail-dialog" :model-value="modelValue" title="干员分析" @closed="emits('update:modelValue', false)">
    <template #header="{ titleId, titleClass }">
      <div class="dialog-header">
        <h4 :id="titleId" :class="titleClass">干员分析</h4>
        <el-button type="danger" @click="deleteOperator" v-if="detailData.charId.includes('custom')">删除此自定义干员</el-button>
      </div>
    </template>
    <h3>干员代号: <span>{{ detailData.name }}</span></h3>
    <template v-if="detailData.rarity > 3">
      <!-- <p>精二材料开销在<span>{{ detailData.rarity }}</span>星干员中排名:<span>{{ detailData.elite.position }}</span>/{{ detailData.elite.totalPosition }}, 位于<span>{{ ((detailData.elite.position - 1) / (detailData.elite.totalPosition - 1) * 100).toFixed(1) }}</span>%。</p>
      <p v-for="(item, index) in detailData.skills" :key="index">{{ index + 1 }}技能:{{ item.name }} 材料开销在<span>{{ detailData.rarity }}</span>星干员的技能中排名:<span>{{ item.position }}</span>/{{ item.totalPosition }}, 位于<span>{{ ((item.position - 1) / (item.totalPosition - 1) * 100).toFixed(1) }}</span>%。</p>
      <p v-for="(item, index) in detailData.mods" :key="index">{{ item.typeName2 }}模组:{{ item.uniEquipName }} 材料开销在<span>{{ detailData.rarity }}</span>星干员的模组中排名:<span>{{ item.position }}</span>/{{ item.totalPosition }}, 位于<span>{{ ((item.position - 1) / (item.totalPosition - 1) * 100).toFixed(1) }}</span>%。</p> -->
      <el-collapse v-model="collapseActive">
        <el-collapse-item name="1">
          <template #title>
            <h3>在 <span>{{ detailData.rarity }}</span> 星干员中, 材料消耗排名表:</h3>
          </template>
          <!-- 表格 -->
          <v-data-table
            :headers="options"
            :items="detailTableData"
            hide-default-footer
            striped
            items-per-page="-1"
          >
            <template v-slot:item="{ item }">
              <tr>
                <!-- 开销项目 -->
                <td>{{ item.name }}</td>
                <!-- 图标 -->
                <td>
                  <div class="icon-container">
                    <OperatorAvatar :size="48" :mobile-size="40" :char-id="item.charId" v-if="item.iconType === 'operator'"></OperatorAvatar>
                    <SkillIcon :size="50" :mobile-size="42" :icon="item.iconId" v-else-if="item.iconType === 'skill'"></SkillIcon>
                    <EquipIcon :size="50" :mobile-size="42" :icon="item.typeIcon" class="equip-icon" v-else="item.iconType === 'equip'"></EquipIcon>
                  </div>
                </td>
                <!-- 材料开销 -->
                <td>{{ costFormatter(item, 'totalCost') }}</td>
                <!-- 排名 -->
                <td>{{ item.position }}/{{ item.totalPosition }}</td>
                <!-- 位于 -->
                <td>{{ ((item.position - 1) / (item.totalPosition - 1) * 100).toFixed(1) }}%</td>
                <!-- 精二/专三/开三级模组率 -->
                <td>{{ percentFormatter(item, item.rank3 ? 'rank3.rate' : 'rank2.rate') }}</td>
              </tr>
            </template>
          </v-data-table>
        </el-collapse-item>
        <!-- 感觉没人看这个, 维护还麻烦, 扬了
        <el-collapse-item title="消耗排名柱状图" name="2">
          <div class="bar-group">
            <RankBar>
              <RankBarContent :costs="totalCostObj[detailData.rarity].eliteCosts" :items="[detailData.elite]">
                <template #label>
                  <p>{{ detailData.name }} - 精二</p>
                </template>
              </RankBarContent>
            </RankBar>
            <RankBar>
              <RankBarContent :costs="totalCostObj[detailData.rarity].skillCosts" :items="detailData.skills">
                <template #label="{ item, index }">
                  <p>{{ item.charId.includes('custom') ? item.name : `${index + 1}技能：${item.name}` }}</p>
                </template>
              </RankBarContent>
            </RankBar>
            <RankBar>
              <RankBarContent :costs="totalCostObj[detailData.rarity].modCosts" :items="detailData.mods">
                <template #label="{ item }">
                  <p>{{ item.charId.includes('custom') ? item.typeName2 : `${item.typeName2}模组：${item.uniEquipName}` }}</p>
                </template>
              </RankBarContent>
            </RankBar>
          </div>
        </el-collapse-item> 
        -->
        <el-collapse-item title="消耗材料一览" name="3">
          <div class="material-list">
            <MaterialItem v-for="(item, index) in [detailData.elite]" :info="item" :skillIndex="index" :key="index">
              <template #block-label>
                <label>精英化</label>
              </template>
              <template #row-label="{ rankIndex }">
                <label>精 {{ rankIndex + 1 }} ：</label>
              </template>
            </MaterialItem>
            <MaterialItem v-for="(item, index) in detailData.skills" :info="item" :skillIndex="index" :key="index">
              <template #block-label>
                <label>{{ item.charId.includes('custom') ? item.name : `${index + 1}技能：${item.name}` }}</label>
              </template>
              <template #row-label="{ rankIndex }">
                <label>专 {{ rankIndex + 1 }} ：</label>
              </template>
            </MaterialItem>
            <MaterialItem v-for="(item, index) in detailData.mods" :info="item" :skillIndex="index" :key="index">
              <template #block-label>
                <label>{{ item.charId.includes('custom') ? item.typeName2 : `${item.typeName2}模组：${item.uniEquipName}` }}</label>
              </template>
              <template #row-label="{ rankIndex }">
                <label>{{ rankIndex + 1 }} 级：</label>
              </template>
            </MaterialItem>
          </div>
        </el-collapse-item>
      </el-collapse>

    </template>
    <template v-else>
      <p>本干员无法精二，无更多数据</p>
    </template>
  </el-dialog>
</template>

<style lang="scss">
@import "../style.scss";

.detail-dialog {
  min-width: 400px;
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    h4 {
      margin: 0;
    }
  }
  .el-dialog__body {
    h3 {
      font-weight: normal;
      & > span {
        font-weight: bold;
        color: var(--el-color-primary);
        font-size: 16px;
        display: inline-block;
        padding: 0 5px;
      }
    }
    > p {
      margin: 10px 0;
      & > span {
        font-weight: bold;
        color: var(--el-color-primary);
        font-size: 16px;
        display: inline-block;
        padding: 0 5px;
      }
    }
    .el-collapse {
      .el-collapse-item__content {
        overflow-x: auto;
      }
      .bg-custom {
        width: 180px;
        height: 180px;
        background-image: url('../imgs/no_mod_icon_180.png');
      }
      .bg-skill_icon_undefined {
        width: 128px;
        height: 128px;
        background-image: url('../imgs/no_mod_icon_128.png');
      }
      .v-table__wrapper tr td {
        padding-top: 6px;
        .icon-container {
          position: relative;
          height: 55px;
          line-height: 55px;
        }
      }
    
      .bar-group {
        display: flex;
        justify-content: space-around;
        align-items: center;
        height: 500px; /* 设置容器高度 */
        width: 650px;
        padding: 0 50px;
      }
    }
  }
}
</style>