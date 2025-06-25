<script setup>

import {formatNumber} from "/src/utils/format.js";

let props = defineProps(["data"])


function formatText(item, index) {
  if (index === 'count') {
    return void 0
  }

  if (index === 'rank0') {
    index = '未强化：'
  }

  return `${index}：${formatNumber(item,1)}%`
}


</script>

<template>

  <v-card width="140">
      <v-list density="compact">
        <v-list-item v-for="(item,index) in props.data" v-show="index!=='count'">
          {{ formatText(item*100, index) }}
        </v-list-item>
      </v-list>
  </v-card>
</template>