<script setup>
import Table from "./components/table"; // 模组排名表
import DetailDialog from "./components/detailDialog"; // 详情弹窗
import CreateOperatorDialog from "./components/createOperatorDialog"; // 新建自定义干员弹窗

import { ref } from 'vue';
import { exportExcel } from "@/utils/ExportExcel"; // 表格导出
import { useJSONData } from './js/maps'
import { useOperatorData } from './js/formatOperatorData'
import { useBaseData } from './js/baseData'
import { initTableData, usePaginationParams } from './js/table'

initTableData() // 初始化表格数据

const { professionDictJSON } = useJSONData() // 职业字典JSON
const { rarityList } = useBaseData() // 星级列表
const { operatorList } = useOperatorData() // 干员列表
const { searchParams } = usePaginationParams()

const opETextTheme = ref("op_title_etext_light"); // 主题颜色
const placeholder = ref('干员名称')
const tabsActiveName = ref('operatorTable')
const detailDialog = ref(false)
const createDialog = ref(false)
const tableRefs = ref([])

const tabs = [
  { label: '干员排名表', name: 'operatorTable', ref: 'operatorTableRef', tableKey: 'elite', options: [
    { prop: 'index', label: '排名', width: '60', fixed: true },
    { prop: 'name', label: '干员代号', minWidth: '140' },
    { prop: 'elite.rank2.rate', label: '精二率', minWidth: '120', sortable: true },
    { prop: 'elite.totalCost', label: '材料开销', minWidth: '140', sortable: true },
    { prop: 'professionName', label: '职业', minWidth: '80' },
    { prop: 'subProfessionName', label: '分支', minWidth: '100' },
    { prop: 'itemObtainApproach', label: '获取方式', minWidth: '100' },
  ] },
  { label: '技能排名表', name: 'skillTable', ref: 'skillTableRef', tableKey: 'skills', options: [
    { prop: 'index', label: '排名', width: '60', fixed: true },
    { prop: 'name', label: '技能名称', minWidth: '140' },
    { prop: 'totalCost', label: '材料开销', minWidth: '120', sortable: true },
    { prop: 'rank3.rate', label: '专三率', minWidth: '100', sortable: true },
    { prop: 'operatorName', label: '所属干员', minWidth: '140' },
    ] },
  { label: '模组排名表', name: 'modTable', ref: 'modTableRef', tableKey: 'mods', options: [
    { prop: 'index', label: '排名', width: '60', fixed: true },
    { prop: 'uniEquipName', label: '模组名称', minWidth: '200' },
    { prop: 'typeName2', label: '模组类型', minWidth: '100' },
    { prop: 'rank1.rate', label: '开一级模组率', minWidth: '140', sortable: true },
    { prop: 'rank1.totalCost', label: '材料开销', minWidth: '120', sortable: true },
    { prop: 'rank2.rate', label: '开二级模组率', minWidth: '140', sortable: true },
    { prop: 'rank2.totalCost', label: '材料开销', minWidth: '120', sortable: true },
    { prop: 'rank3.rate', label: '开三级模组率', minWidth: '140', sortable: true },
    { prop: 'totalCost', label: '材料开销', minWidth: '120', sortable: true },
    { prop: 'operatorName', label: '所属干员', minWidth: '140' },
  ] },
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

const tabClick = ({props}) => {
  if (props.name === 'operatorTable') placeholder.value = '干员名称'
  else if (props.name === 'skillTable') placeholder.value = '干员/技能名称'
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
    <div class="op_title">
      <div class="op_title_text">
        <div class="op_title_ctext">精英化与专精性价比</div>
        <div :class="opETextTheme">Elite Efficiency</div>
      </div>
    </div>
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
    <el-tabs
      v-model="tabsActiveName"
      type="card"
      @tab-click="tabClick"
    >
      <el-tab-pane v-for="item in tabs" :key="item.name" :label="item.label" :name="item.name">
        <Table
          :tableKey="item.tableKey"
          ref="tableRefs"
          @openDetailDialog="openDetailDialog"
          :options="item.options"
        ></Table>
      </el-tab-pane>
    </el-tabs>
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
    margin-left: 10px;
    flex-wrap: wrap;

    .el-checkbox-group {
      margin-bottom: 6px;
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

  .el-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    .el-tabs__header {
      margin-bottom: 1px;
      border-bottom: none;
    }
    .el-tabs__content {
      flex: 1;
      display: flex;
      .el-tab-pane {
        flex: 1;
        overflow: hidden;
        .el-table {
          box-shadow: var(--el-box-shadow-light);
          .el-table__header .cell:has(.iconfont) {
            display: flex;
            align-items: center;
            .iconfont {
              padding-left: 5px;
            }
          }
          .clickable {
            cursor: pointer;
          }
        }
      }
    }
  }

  .el-cascader-menu__wrap.el-scrollbar__wrap {
    height: 285px;
  }
}
</style>
