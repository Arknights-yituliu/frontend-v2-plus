<script setup>
import SpriteImage from "@/components/SpriteImage.vue";
import {formatNumber} from "/src/utils/format.js";
import {ref} from "vue";

const props = defineProps(['modelValue'])

let sortBy = ref([
  {key: 'stageEfficiency', order: 'desc'},
])

const headers = [
  {title: '关卡名', sortable: false, key: 'stageCode'},
  {title: '主产物', sortable: false, key: 'itemId'},
  {title: '主产物掉率', key: 'knockRating'},
  {title: '期望理智', key: 'apExpect'},
  {title: '副产物', sortable: false, key: 'secondaryItemId'},
  {title: '综合效率', key: 'stageEfficiency'},
  {title: 'spm', key: 'SPM'},
  {title: 'T4效率', key: 'leT4Efficiency'},
  {title: 'T3效率', key: 'leT3Efficiency'},
  {title: 'T2效率', key: 'leT2Efficiency'},
]

function replaceZoneName(str) {
  if (typeof str === "undefined") return ''
  return str.replace("(标准)", '')
}

</script>

<template>
  <v-card>
    <v-data-table
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="props.modelValue"
        density="compact">
      <template v-slot:item.stageCode="{ item }">
        {{ replaceZoneName(item.stageCode) }}
      </template>
      <template v-slot:item.itemId="{ item }">
        <SpriteImage :image-name="item.itemId" display-size="40" original-size="183"></SpriteImage>
      </template>
      <template v-slot:item.knockRating="{ item }">
        {{ formatNumber(item.knockRating * 100, 1) }}%
      </template>
      <template v-slot:item.apExpect="{ item }">
        {{ formatNumber(item.apExpect, 1) }}
      </template>
      <template v-slot:item.secondaryItemId="{ item }">
        <SpriteImage :image-name="item.secondaryItemId" display-size="40" original-size="183"></SpriteImage>
      </template>
      <template v-slot:item.stageEfficiency="{ item }">
        {{ formatNumber(item.stageEfficiency * 100, 1) }}%
      </template>
      <template v-slot:item.SPM="{ item }">
        {{ item.SPM }}
      </template>
      <template v-slot:item.leT4Efficiency="{ item }">
        {{ formatNumber(item.leT4Efficiency * 100, 1) }}%
      </template>
      <template v-slot:item.leT3Efficiency="{ item }">
        {{ formatNumber(item.leT3Efficiency * 100, 1) }}%
      </template>
      <template v-slot:item.leT2Efficiency="{ item }">
        {{ formatNumber(item.leT2Efficiency * 100, 1) }}%
      </template>
    </v-data-table>

    <v-alert  type="info" variant="tonal" id="description">

        <p>*主产物/副产物：价值占比最高/第二高的产物</p>
        <p>*综合效率：产物的总价值 / 关卡理智消耗，长期囤材料建议以这个为参考依据</p>
        <p>*T4效率 = (对应紫材料价值+对应蓝材料价值+对应绿材料价值+对应白材料价值) / 关卡理智消耗 </p>
        <p>*T3效率 = (对应蓝材料价值+对应绿材料价值+对应白材料价值) / 关卡理智消耗</p>
        <p>*T2效率 = (对应绿材料价值+对应白材料价值) / 关卡理智消耗</p>
        <p>*SPM：1倍速下每分钟消耗的理智，假设所有敌人均被秒杀，实际可能略大于该值</p>

    </v-alert>
  </v-card>
</template>