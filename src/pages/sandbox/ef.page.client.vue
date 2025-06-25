<template>
  <div id="addDevice">
    添加机器
    <el-form :inline="true" class="demo-form-inline">
      <el-form-item label="机器">
        <el-select v-model="selected_device.device.name" placeholder="选择机器" clearable>
          <el-option v-for="(device,index) in device_table" :key="index" :label="device.name" :value="device.name"
                     @click="formula_table=device.formula;selected_device.device=device"/>
        </el-select>
      </el-form-item>
      <el-form-item label="配方">
        <el-select v-model="selected_device.formula.name" placeholder="选择配方" clearable>
          <el-option v-for="(formula,index) in formula_table" :key="index" :label="formula.name" :value="formula.name"
                     @click="selected_device.formula=formula"/>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="addDevice">添加机器</el-button>
      </el-form-item>
    </el-form>
  </div>

  <div id="deviceList">
    机器列表

    <table class="device_table">
      <tbody>
      <tr>
        <td style="width: 80px;">机器</td>
        <td style="width: 200px;">配方</td>
        <td style="width: 80px;">消耗材料</td>
        <td style="width: 80px;">消耗速度</td>
        <td style="width: 80px;">生产材料</td>
        <td style="width: 80px;">生产速度</td>
      </tr>
      <tr v-for="(device,index) in selected_device_table" :key="index">
        <td>{{ device.device }}</td>
        <td>{{ device.formula }}</td>
        <td>
          <div v-for="(rawMaterials,index) in  device.rawMaterials" :key="index" class="result">
            {{ rawMaterials.input }}
          </div>
        </td>
        <td>
          <div v-for="(rawMaterials,index) in  device.rawMaterials" :key="index" class="result">
            {{ rawMaterials.spend }}/min
          </div>
        </td>
        <td>
          <div v-for="(product,index) in  device.product" :key="index" class="result">
            {{ product.output }}
          </div>
        </td>
        <td>
          <div v-for="(product,index) in  device.product" :key="index" class="result">
            {{ product.produce }}/min
          </div>
        </td>
      </tr>
      </tbody>
    </table>

    <!--    <el-table :data="selected_device_table" stripe style="width: 100%">-->
    <!--      <el-table-column prop="device" label="机器" width="120"/>-->
    <!--      <el-table-column prop="formula" label="配方" width="120"/>-->
    <!--      <el-table-column prop="input0" label="消耗材料1"/>-->
    <!--      <el-table-column prop="spend0" label="消耗速度1"/>-->
    <!--      <el-table-column prop="input1" label="消耗材料2"/>-->
    <!--      <el-table-column prop="spend1" label="消耗速度2"/>-->
    <!--      <el-table-column prop="output0" label="生产材料1"/>-->
    <!--      <el-table-column prop="produce0" label="生产速度1"/>-->
    <!--      <el-table-column prop="output1" label="生产材料2"/>-->
    <!--      <el-table-column prop="produce1" label="生产速度2"/>-->
    <!--      <el-table-column fixed="right" label="操作" width="180">-->
    <!--        <template #default>-->
    <!--          <el-button link type="primary" size="small">更换配方</el-button>-->
    <!--          <el-button link type="primary" size="small">删除机器</el-button>-->
    <!--        </template>-->
    <!--      </el-table-column>-->
    <!--    </el-table>-->
  </div>
  <div id="deviceCal">
    配平计算器
    <!--    <el-table :data="statisticalData" stripe style="width: 100%">-->
    <!--      <el-table-column prop="material" label="材料" width="120"/>-->
    <!--      <el-table-column prop="totalProduction" label="理论生产速度" width="120"/>-->
    <!--      <el-table-column prop="totalConsume" label="理论消耗速度"/>-->
    <!--      <el-table-column prop="netProduction" label="净产量"/>-->
    <!--    </el-table>-->

    <table class="device_table">
      <tbody>
      <tr>
        <td style="width: 80px;">材料</td>
        <td style="width: 120px;">理论生产速度</td>
        <td style="width: 120px;">理论消耗速度</td>
        <td style="width: 80px;">净产量</td>
      </tr>
      <tr v-for="(statistical,item) in statistical_data" :key="item">
        <td>{{ item }}</td>
        <td>{{ statistical.produce }}</td>
        <td>{{ statistical.spend }}</td>
        <td>

        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>


<script setup>

import device_table from '/src/static/json/endfield/device_table.json'
import {ref} from "vue";

let selected_device_table = ref([])

const deviceData = [
  {
    device: '精炼炉',
    formula: '源石-外壳',
    input: '源石',
    spend: '30/min',
    output: '晶体外壳',
    produce: '30/min',
    output2: '无',
    produce2: '0/min',
  },
  {
    device: '精炼炉',
    formula: '源石-外壳',
    input: '源石',
    spend: '30/min',
    output: '晶体外壳',
    produce: '30/min',
    output2: '晶体外壳',
    produce2: '30/min',
  },
]


const statisticalData = [
  {
    material: '源石',
    totalProduction: '源石-外壳',
    totalConsume: '源石',
    netProduction: '-30/min'
  },
  {
    material: '外壳',
    totalProduction: '源石-外壳',
    totalConsume: '源石',
    netProduction: '30/min'
  },
]

let formula_table = ref({})

let selected_device = ref({device: {}, formula: {}})

function addDevice() {
  let data = {
    device: selected_device.value.device.name,
    formula: selected_device.value.formula.name,
    rawMaterials: [],
    product: []
  }

  let spend = 60 / selected_device.value.formula.time

  const rawMaterials = selected_device.value.formula.rawMaterials;
  for (const index in rawMaterials) {

    data.rawMaterials.push({
      input: rawMaterials[index].material,
      spend: spend * rawMaterials[index].quantity
    })
  }

  const product = selected_device.value.formula.product;
  for (const index in product) {

    data.product.push({
      output: product[index].material,
      produce: spend * product[index].quantity
    })
  }
  selected_device_table.value.push(data)
  statistical()
}

let statistical_data = ref({})

function statistical() {
  statistical_data.value = {}
  for (const item of selected_device_table.value) {
    for (const rawMaterials of item.rawMaterials) {
      if (statistical_data.value[rawMaterials.input] == void 0) {
        statistical_data.value[rawMaterials.input] = {}
      }
      if (statistical_data.value[rawMaterials.input].spend == void 0) {
        statistical_data.value[rawMaterials.input].spend = 0
      }
      statistical_data.value[rawMaterials.input].spend -= rawMaterials.spend
    }

    for (const product of item.product) {
      if (statistical_data.value[product.output] == void 0) {
        statistical_data.value[product.output] = {}
      }
      if (statistical_data.value[product.output].produce == void 0) {
        statistical_data.value[product.output].produce = 0
      }
      statistical_data.value[product.output].produce += product.produce
    }
  }


}


</script>


<style>
.device_table {
  text-align: center;
  border-collapse: collapse;
  margin:20px;
}

.device_table tr {
  border-bottom: 1px solid var(--c-border-color);
}


.device_table td {
  padding: 4px 8px;

}

.result {
  margin: 4px;
}

</style>



