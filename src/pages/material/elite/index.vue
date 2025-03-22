<script setup>
import Table from './components/table'; // 模组排名表
import DetailDialog from './components/detailDialog'; // 详情弹窗
import CreateOperatorDialog from './components/createOperatorDialog'; // 新建自定义干员弹窗
import ModuleHeader from '@/components/ModuleHeader.vue';

import { ref } from 'vue';
import { exportExcel } from '@/utils/exportExcel.js'; // 表格导出
import { professionDictJSON } from './js/maps' // 职业字典JSON
import { operatorList } from './js/formatOperatorData' // 干员列表
import { rarityList } from './js/baseData' // 星级列表
import { initTableData, searchParams } from './js/table'

const placeholder = ref('干员名称')
const tabsActiveName = ref(null)
const detailDialog = ref(false)
const createDialog = ref(false)
const tableRefs = ref([])

const tabs = [
  { label: '干员排名表', name: 'operatorTable', ref: 'operatorTableRef', tableKey: 'elite' },
  { label: '技能排名表', name: 'skillTable', ref: 'skillTableRef', tableKey: 'skills' },
  { label: '模组排名表', name: 'modTable', ref: 'modTableRef', tableKey: 'mods' },
]

// 重置表格数据
const reset = () => {
  initTableData() // 初始化所有表格数据
  tableRefs.value.forEach(element => {
    element.current = 0 // 用于滚动到第一页
    element.getTableData() // 用于新增干员时刷新表格
  });
}

// 导出表格数据
const exportData = () => {
  const itemList = [[
    '干员代号', '精二率', '精二材料开销',
    '一技能专三率', '一技能专三材料开销',
    '二技能专三率', '二技能专三材料开销',
    '三技能专三率', '三技能专三材料开销',
    '职业', '分支', '获取方式'
  ]]
  for (const item of operatorList.value) {
    const { 
      name, elite, 
      skills: [ skill1, skill2, skill3 ], 
      professionName, subProfessionName , itemObtainApproach
    } = item
    const row = [
      name, elite.rank2?.rate, elite.totalCost,
      skill1?.rank3?.rate, skill1?.totalCost,
      skill2?.rank3?.rate, skill2?.totalCost,
      skill3?.rank3?.rate, skill3?.totalCost,
      professionName, subProfessionName, itemObtainApproach,
    ]

    itemList.push(row)
  }
  exportExcel('精英化与专精性价比', itemList)
}

const tabClick = (item) => {
  if (item.name === 'operatorTable') placeholder.value = '干员名称'
  else if (item.name === 'skillTable') placeholder.value = '干员/技能名称'
  else placeholder.value = '干员/模组名称'
}
// 唤起详情弹窗
const openDetailDialog = (v) => {
  detailDialog.value = v
}
</script>

<template>
  <div class="elite-page">
    <!-- 标题区域 -->
    <ModuleHeader title="精英化与专精性价比" title-en="Elite Efficiency"></ModuleHeader>
    <!-- 标题区域end -->
    <!-- 内容区域 -->
    <div class="option">
      <!-- 干员星级选择 -->
      <el-checkbox-group v-model="searchParams.rarityCheckedList" size="large" @change="reset">
        <el-checkbox-button v-for="(item, index) in rarityList" :key="index" :value="item.value">{{ item.label }}</el-checkbox-button>
      </el-checkbox-group>
      <div class="right">
        <!-- 干员名称/技能名称搜索 -->
        <el-input class="el-input-operator-name" v-model="searchParams.searchKey" :placeholder="placeholder" @input="reset"></el-input>
        <el-cascader
          class="el-cascader-profession"
          v-model="searchParams.professionCheckedList"
          :options="professionDictJSON"
          @change="reset"
          placeholder="选择干员子职业"
          clearable
        />
        <el-button @click="createDialog = true">新建自定义干员材料信息</el-button>
        <el-button @click="exportData">导出</el-button>
      </div>
    </div>
    <!-- 分页 -->
    <div>
    <v-tabs v-model="tabsActiveName" bg-color="primary">
      <v-tab v-for="item in tabs" :key="item.name" :value="item.name" @click="tabClick(item)">{{ item.label }}</v-tab>
    </v-tabs>
    </div>
    <v-card-text>
      <v-tabs-window v-model="tabsActiveName">
        <v-tabs-window-item v-for="item in tabs" :key="item.name" :value="item.name">
          <Table :tableKey="item.tableKey" ref="tableRefs" @openDetailDialog="openDetailDialog"></Table>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>
    <!-- 内容区域End -->

    <DetailDialog v-model="detailDialog" @reset="reset"></DetailDialog>
    <CreateOperatorDialog v-model="createDialog" @reset=reset></CreateOperatorDialog>
  </div>
</template>

<style lang="scss">
@import "./style.scss";

.elite-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 68px);

  .op_title {
    margin-bottom: 6px;
  }
  .option {
    display: flex;
    align-items: center;
    flex-wrap: wrap;


    .el-checkbox-group {
      margin-bottom: 12px;
      margin-right: 10px;

      .el-checkbox-button {
        &.is-focus .el-checkbox-button__inner {
          border-color: var(--el-checkbox-button-checked-border-color);
        }

        &:first-child .el-checkbox-button__inner {
          border-left: var(--el-border);
        }

        .el-checkbox-button__inner {
          border-left-style: solid;
          border-left-color: transparent;
          border-left-width: 1px;
        }
      }
    }

    .right {
      > .el-input, .el-cascader, .el-button {
        margin-bottom: 6px;
      }
    }

    .el-input {
      width: 200px;
      margin-right: 10px;
    }
  }

  .v-table__wrapper {
    border: 1px solid #eee;
    //tbody tr:nth-child(even) {
    //  background-color: #fafafa;
    //}
  }

  .v-card-text {
    padding: 0;
  }

  .el-cascader-menu__wrap.el-scrollbar__wrap {
    height: 285px;
  }
}
</style>
