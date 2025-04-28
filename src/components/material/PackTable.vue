<script setup>
import {onMounted, ref} from "vue";
import {formatNumber} from "/src/utils/format.js";

const saleTypes = [
  {value: 'newbie', text: '新人'},
  {value: 'monthly', text: '每月重置'},
  {value: 'weekly', text: '每周重置'},
  {value: 'elite', text: '直升礼包'},
  {value: 'chip', text: '芯片'},
  {value: 'lmd', text: '龙门币'},
  {value: 'return', text: '回归'},
  {value: 'activity', text: '活动礼包'},
  {value: 'originium', text: '非双倍源石'},
  {value: 'originium2', text: '双倍源石'},
]

const saleTypeMap = new Map()

for (const item of saleTypes) {
  saleTypeMap.set(item.value, item.text)
}

let search = ref('')

const props = defineProps(['modelValue'])

let sortBy = ref([
  {key: 'stageEfficiency', order: 'desc'},
])




const headers = ref([])

let displayKernel = ref(true)

function hiddenKernel() {
  displayKernel.value = !displayKernel.value
  if (displayKernel.value) {
    headers.value = [
      {title: '名称', sortable: false, key: 'displayName'},
      {title: '类型', key: 'saleType'},
      {title: '售价', key: 'price'},
      {title: '抽数(不含中坚)', key: 'draws'},
      {title: '抽数(含中坚)', key: 'drawsKernel'},
      {title: '源石', key: 'originium'},
      {title: '源石单价', key: 'originiumUnitPrice'},
      {title: '抽卡性价比(不含中坚)', key: 'drawEfficiency'},
      {title: '综合性价比(不含中坚)', key: 'packEfficiency'},
      {title: '抽卡性价比(含中坚)', key: 'drawEfficiencyKernel'},
      {title: '综合性价比(含中坚)', key: 'packEfficiencyKernel'},
    ]
  } else {
    headers.value = [
      {title: '名称', sortable: false, key: 'displayName'},
      {title: '类型', key: 'saleType'},
      {title: '售价', key: 'price'},
      {title: '抽数', key: 'draws'},
      {title: '源石', key: 'originium'},
      {title: '源石单价', key: 'originiumUnitPrice'},
      {title: '抽卡性价比', key: 'drawEfficiency'},
      {title: '综合性价比', key: 'packEfficiency'},
    ]
  }
}

hiddenKernel()

</script>

<template>
  <v-card
      title="礼包性价比总表"
  >

    <v-switch label="是否显示包含中坚寻访的性价比" color="primary" v-model="displayKernel" @click="hiddenKernel()" >

    </v-switch>

    <template v-slot:text>
      <v-text-field
          :sort="sortBy"
          v-model="search"
          label="Search"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
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
        class="v-mobile-table freeze-first-column"
    >
      <template v-slot:item="{ item }">
        <tr>
          <td>{{ item.displayName }}</td>
          <td> {{ saleTypeMap.get(item.saleType) }}</td>
          <td> {{ `${item.price}元` }}</td>
          <td>{{ formatNumber(item.draws, 1) }}</td>
          <td v-show="displayKernel"> {{ formatNumber(item.drawsKernel, 1) }}</td>
          <td> {{ item.originium }}</td>
          <td> {{ formatNumber(item.originiumUnitPrice) }}</td>
          <td> {{ formatNumber(item.drawEfficiency) }}</td>
          <td> {{ formatNumber(item.packEfficiency) }}</td>
          <td v-show="displayKernel"> {{ formatNumber(item.drawEfficiencyKernel) }}</td>
          <td v-show="displayKernel">{{ formatNumber(item.packEfficiencyKernel) }}</td>
        </tr>
      </template>
    </v-data-table>
  </v-card>
</template>


