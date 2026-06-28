<script setup>
import ItemImage from "/src/components/sprite/ItemImage.vue";
import { formatNumber } from "/src/utils/format.js";
import { ref } from "vue";
import ModuleHeader from "@/components/layout/ModuleHeader.vue";

const props = defineProps(['modelValue'])

let sortBy = ref([])

const descendingFirstSortKeys = [
  'knockRating',
  'apExpect',
  'stageEfficiency',
  'leT4Efficiency',
  'leT3Efficiency',
  'leT2Efficiency',
  'sampleSize'
]

const customKeySort = Object.fromEntries(
  descendingFirstSortKeys.map(key => [key, descendingFirstCompare])
)

const headers = [
  { title: '关卡名', sortable: false, key: 'stageCode' },
  { title: '主产物', sortable: false, key: 'itemId' },
  { title: '主产物掉率', key: 'knockRating' },
  { title: '期望理智', key: 'apExpect' },
  { title: '副产物', sortable: false, key: 'secondaryItemId' },
  { title: '综合效率', key: 'stageEfficiency' },
  // { title: 'SPM', key: 'spm' },
  { title: 'T4效率', key: 'leT4Efficiency' },
  { title: 'T3效率', key: 'leT3Efficiency' },
  { title: 'T2效率', key: 'leT2Efficiency' },
  { title: '样本量', key: 'sampleSize' }
]

function replaceZoneName(str) {
  if (typeof str === "undefined") return ''
  return str.replace("(标准)", '')
}

function descendingFirstCompare(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (a instanceof Date && b instanceof Date) {
    return b.getTime() - a.getTime()
  }

  const numA = Number(a)
  const numB = Number(b)
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
    return numB - numA
  }

  return String(b).localeCompare(String(a), 'zh-Hans-CN', {
    sensitivity: 'accent',
    numeric: true
  })
}
</script>

<template>
  <div class="flex flex-wrap align-center">
    <ModuleHeader title="材料详情" title-en="Item Info"></ModuleHeader>
    <span class="module-tip">*移动端可左右拖动查看</span>
  </div>
  <span id="StageDetailTable"></span>
  <v-card>
    <v-data-table
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="props.modelValue"
      :custom-key-sort="customKeySort"
      density="compact"
      sort-asc-icon="$sortDesc"
      sort-desc-icon="$sortAsc"
      class="freeze-table-first-column"
    >
      <template v-slot:item.stageCode="{ item }">
        {{ replaceZoneName(item.stageCode) }}
      </template>
      <template v-slot:item.itemId="{ item }">
        <ItemImage :item-id="item.itemId"></ItemImage>
      </template>
      <template v-slot:item.knockRating="{ item }">
        {{ formatNumber(item.knockRating * 100, 1) }}%
      </template>
      <template v-slot:item.apExpect="{ item }">
        {{ formatNumber(item.apExpect, 1) }}
      </template>
      <template v-slot:item.secondaryItemId="{ item }">
        <ItemImage :item-id="item.secondaryItemId"></ItemImage>
      </template>
      <template v-slot:item.stageEfficiency="{ item }">
        {{ formatNumber(item.stageEfficiency * 100, 1) }}%
      </template>
      <!-- <template v-slot:item.spm="{ item }">
        {{ item.spm }}
      </template> -->
      <template v-slot:item.leT4Efficiency="{ item }">
        {{ formatNumber(item.leT4Efficiency * 100, 1) }}%
      </template>
      <template v-slot:item.leT3Efficiency="{ item }">
        {{ formatNumber(item.leT3Efficiency * 100, 1) }}%
      </template>
      <template v-slot:item.leT2Efficiency="{ item }">
        {{ formatNumber(item.leT2Efficiency * 100, 1) }}%
      </template>
      <template v-slot:item.sampleSize="{ item }">
        {{ item.sampleSize }}
      </template>
    </v-data-table>

    <v-alert type="info" variant="tonal" id="description">
      <p>*主产物/副产物：价值占比最高/第二高的产物</p>
      <p>*综合效率：产物的总价值 / 关卡理智消耗，长期囤材料建议以这个为参考依据</p>
      <p>*T4效率 = (对应紫材料价值 + 对应蓝材料价值 + 对应绿材料价值 + 对应白材料价值) / 关卡理智消耗</p>
      <p>*T3效率 = (对应蓝材料价值 + 对应绿材料价值 + 对应白材料价值) / 关卡理智消耗</p>
      <p>*T2效率 = (对应绿材料价值 + 对应白材料价值) / 关卡理智消耗</p>
      <p>*SPM：倍速下每分钟消耗的理智，假设所有敌人均被秒杀，实际可能略大于该值</p>
      <p>*期望理智：获取单个主产物所需的理智期望</p>
    </v-alert>
  </v-card>
</template>
