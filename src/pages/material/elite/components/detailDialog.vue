<script setup>
import RankBar from "./rankBar";
import RankBarContent from "./rankBarContent";
import MaterialItem from "./materialItem";

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

// 删除自定义干员
const deleteOperator = () => {
  deleteOperatorData(detailData.value.charId) // 删除此自定义干员
  initOperatorData() // 重新初始化干员数据列表
  emits('reset') // 刷新所有表格
  emits('update:modelValue', false)
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
          <el-table :data="detailTableData">
            <el-table-column prop="name" label="开销项目" min-width="100"/>
            <el-table-column label="图标" v-slot="{ row }">
              <div :class="['bar-icon', row.iconClass]" :style="row.style" v-if="row.iconClass"></div>
              <div :class="['mod-icon', 'bar-icon']"  v-else>
                <img class="operator-equip-image" :src="row.typeIcon ? `/image/survey/mod-icon/${row.typeIcon}.png` : noModIcon">
              </div>
            </el-table-column>
            <el-table-column prop="totalCost" label="材料开销" :formatter="costFormatter"/>
            <el-table-column label="排名" v-slot="{ row }">
              {{ row.position }}/{{ row.totalPosition }}
            </el-table-column>
            <el-table-column label="位于" v-slot="{ row }">
              {{ ((row.position - 1) / (row.totalPosition - 1) * 100).toFixed(1) }}%
            </el-table-column>
            <el-table-column label="精二/专三/开三级模组率" v-slot="{ row }" width="200">
              {{ percentFormatter(row, {property: row.rank3 ? 'rank3.rate' : 'rank2.rate' }) }}
            </el-table-column>
          </el-table>
        </el-collapse-item>
        <el-collapse-item title="消耗排名柱状图" name="2">
          <!-- 柱状图 -->
          <div class="bar-group">
            <!-- 精二材料消耗排名 -->
            <RankBar>
              <RankBarContent :costs="totalCostObj[detailData.rarity].eliteCosts" :items="[detailData.elite]">
                <template #label>
                  <p>{{ detailData.name }} - 精二</p>
                </template>
              </RankBarContent>
            </RankBar>
            <!-- 技能材料消耗排名 -->
            <RankBar>
              <RankBarContent :costs="totalCostObj[detailData.rarity].skillCosts" :items="detailData.skills">
                <template #label="{ item, index }">
                  <p>{{ item.charId.includes('custom') ? item.name : `${index + 1}技能：${item.name}` }}</p>
                </template>
              </RankBarContent>
            </RankBar>
            <!-- 模组材料消耗排名 -->
            <RankBar>
              <RankBarContent :costs="totalCostObj[detailData.rarity].modCosts" :items="detailData.mods">
                <template #label="{ item }">
                  <p>{{ item.charId.includes('custom') ? item.typeName2 : `${item.typeName2}模组：${item.uniEquipName}` }}</p>
                </template>
              </RankBarContent>
            </RankBar>
          </div>
        </el-collapse-item>
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
      .el-table__row .cell {
        position: relative;
        height: 55px;
        line-height: 55px;
        padding-left: 0;
        margin-left: 12px;
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