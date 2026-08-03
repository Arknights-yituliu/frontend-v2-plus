<script setup>
import '/src/assets/css/material/stage.scss'

defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
})

function getDetailTableItemSprite(id) {
  return `bg-${id || ''} table-item-sprite`
}

function formatNumber(value, digits = 1) {
  if (typeof value === 'undefined' || value === null) {
    return ''
  }

  return Number(value).toFixed(digits)
}

function replaceZoneName(stage) {
  return String(stage?.zoneName || '').replace('(标准)', '')
}
</script>

<template>
  <div
    class="stage-page material-detail-table"
    style="width: 850px; font-size: 18px !important; color: #000 !important; background: #fff;"
  >
    <el-table stripe :data="rows" max-height="495" max-width="892" class="stage-detail-table">
      <el-table-column fixed prop="stageCode" label="关卡名" width="120px">
        <template #default="scope">
          <div style="font-size: 18px; line-height: 18px; font-weight: 400; color: #000000; height: 44px;">
            <span style="font-size: 12px; line-height: 8px; font-weight: 400; color: #000000;">
              {{ replaceZoneName(scope.row) }}
            </span><br>
            {{ scope.row.stageCode }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="itemId" label="主产物" width="78px">
        <template #default="scope">
          <div class="stage-detail-table-item-icon" style="margin-left: 6px;">
            <div :class="getDetailTableItemSprite(scope.row.itemId)"></div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="secondaryItemId" label="副产物" width="78px">
        <template #default="scope">
          <div class="stage-detail-table-item-icon" style="margin-left: 6px;">
            <div :class="getDetailTableItemSprite(scope.row.secondaryItemId)"></div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="knockRating" label="主产物掉率" width="120px">
        <template #default="scope">
          <div style="margin-left: 8px;">{{ formatNumber(scope.row.knockRating * 100, 1) }}%</div>
        </template>
      </el-table-column>
      <el-table-column prop="apExpect" label="期望理智" width="96px">
        <template #default="scope">
          <div style="margin-left: 8px;">{{ formatNumber(scope.row.apExpect, 1) }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="stageEfficiency" label="综合收益率" width="120px">
        <template #default="scope">
          <div style="margin-left: 4px;">{{ formatNumber(scope.row.stageEfficiency * 100, 1) }}%</div>
        </template>
      </el-table-column>
      <el-table-column prop="leT4Efficiency" label="T4材料效率" width="120px">
        <template #default="scope">
          <div style="margin-left: 16px;">{{ formatNumber(scope.row.leT4Efficiency * 100, 1) }}%</div>
        </template>
      </el-table-column>
      <el-table-column prop="leT3Efficiency" label="T3材料效率" width="120px">
        <template #default="scope">
          <div style="margin-left: 16px;">{{ formatNumber(scope.row.leT3Efficiency * 100, 1) }}%</div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
