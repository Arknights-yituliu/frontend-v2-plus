<script setup>

const props = defineProps(['modelValue'])


const headers = [
  {title: '关卡名', key: 'stageCode'},
  {title: '每理智可搓玉', key: 'orundumPerAp'},
  {title: '每搓1抽消耗龙门币', key: 'lmdcost'},
  {title: '搓玉效率', key: 'orundumPerApEfficiency'},
  {title: '关卡效率', key: 'stageEfficiency'},
]


</script>

<template>
  <v-card >
    <v-data-table
        :headers="headers"
        :items="props.modelValue"
        density="compact">
      <template v-slot:item.orundumPerAp="{ item }">
        <div style="display: flex;align-items: center">
          {{ item.orundumPerAp }}
          <div class="orundum-table-icon">
            <div class="bg-4003_icon sprite-icon" ></div>
          </div>
        </div>
      </template>
      <template v-slot:item.lmdcost="{ item }">
        <div style="display: flex;align-items: center">
          {{ item.lmdcost }}
          <div class="orundum-table-icon">
            <div class="bg-4001_icon sprite-icon" style="top:-8px"></div>
          </div>
        </div>
      </template>
      <template v-slot:item.orundumPerApEfficiency="{ item }">
        {{ item.orundumPerApEfficiency }}
      </template>
      <template v-slot:item.stageEfficiency="{ item }">
        {{ item.stageEfficiency }}
      </template>
    </v-data-table>
  </v-card>
</template>