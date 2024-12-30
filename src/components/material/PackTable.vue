<script setup>
import {ref} from "vue";
import {formatNumber} from "@/utils/format.js";

const saleTypes = [
  {value: 'newbie', text: '新人'},
  {value: 'monthly', text: '每月重置'},
  {value: 'weekly', text: '每周重置'},
  {value: 'elite', text: '直升礼包'},
  {value: 'chip', text: '芯片'},
  {value: 'lmd', text: '龙门币'},
  {value: 'activity', text: '活动礼包'},
  {value: 'originium', text: '非双倍源石'},
  {value: 'originium2', text: '双倍源石'},
]

const saleTypeMap = new Map()

for(const item of saleTypes){
  saleTypeMap.set(item.value,item.text)
}

let search = ref('')

const props = defineProps(['modelValue'])

let sortBy = ref([
  {key: 'stageEfficiency', order: 'desc'},
])

const headers = [
  {title: '名称', sortable: false, key: 'displayName'},
  {title: '类型',  key: 'saleType'},
  {title: '售价', key: 'price'},
  {title: '抽数(不含中坚)', key: 'draws'},
  {title: '抽数(含中坚)',  key: 'drawsKernel'},
  {title: '源石', key: 'originium'},
  {title: '抽卡性价比(不含中坚)', key: 'drawEfficiency'},
  {title: '综合性价比(不含中坚)', key: 'packEfficiency'},
  {title: '抽卡性价比(含中坚)', key: 'drawEfficiencyKernel'},
  {title: '综合性价比(含中坚)', key: 'packEfficiencyKernel'},
]

</script>

<template>
  <v-card
      title="礼包性价比总表"
  >
    <template v-slot:text>
      <v-text-field
          :sort="sortBy"
          v-model="search"
          label="Search"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          hide-details
          single-line
      ></v-text-field>
    </template>

    <v-data-table
        :headers="headers"
        :items="props.modelValue"
        :search="search"
        hide-default-footer
        items-per-page="-1"
        class="no-wrap"
    >

      <template v-slot:item.saleType="{ item }">
        {{saleTypeMap.get(item.saleType)}}
      </template>
      <template v-slot:item.price="{ item }">
        {{`${item.price}元`}}
      </template>
      <template v-slot:item.draws="{ item }">
        {{formatNumber(item.draws , 1)}}
      </template>
      <template v-slot:item.drawsKernel="{ item }">
        {{formatNumber(item.drawsKernel , 1)}}
      </template>
      <template v-slot:item.originium="{ item }">
        {{item.originium}}
      </template>
      <template v-slot:item.drawEfficiency="{ item }">
        {{formatNumber(item.drawEfficiency) }}
      </template>
      <template v-slot:item.packEfficiency="{ item }">
        {{formatNumber(item.packEfficiency) }}
      </template>
      <template v-slot:item.drawEfficiencyKernel="{ item }">
        {{formatNumber(item.drawEfficiencyKernel) }}
      </template>
      <template v-slot:item.packEfficiencyKernel="{ item }">
        {{formatNumber(item.packEfficiencyKernel) }}
      </template>

    </v-data-table>
  </v-card>
</template>


