<template>
  <div id="addDevice">
    添加机器
    <el-form :inline="true" :model="formInline" class="demo-form-inline">
      <el-form-item label="机器">
        <el-select v-model="formInline.device" placeholder="选择机器" clearable>
          <el-option label="Zone one" value="shanghai" />
          <el-option label="Zone two" value="beijing" />
        </el-select>
      </el-form-item>
      <el-form-item label="配方">
        <el-select v-model="formInline.region" placeholder="选择配方" clearable>
          <el-option label="Zone one" value="shanghai" />
          <el-option label="Zone two" value="beijing" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSubmit">添加机器</el-button>
      </el-form-item>
    </el-form>
  </div>

  <div id="deviceList">
    机器列表
    <el-table :data="deviceData" stripe style="width: 100%">
      <el-table-column prop="device" label="机器" width="120" />
      <el-table-column prop="formula" label="配方" width="120" />
      <el-table-column prop="input" label="消耗材料" />
      <el-table-column prop="spend" label="消耗速度" />
      <el-table-column prop="output" label="生产材料" />
      <el-table-column prop="produce" label="生产速度" />
      <el-table-column prop="output2" label="生产材料2" />
      <el-table-column prop="produce2" label="生产速度2" />
      <el-table-column fixed="right" label="操作" width="180">
        <template #default>
          <el-button link type="primary" size="small" @click="handleClick">更换配方</el-button>
          <el-button link type="primary" size="small">删除机器</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <div id="deviceCal">
    配平计算器
    <el-table :data="statisticalData" stripe style="width: 100%">
      <el-table-column prop="device" label="材料" width="120" />
      <el-table-column prop="formula" label="理论生产速度" width="120" />
      <el-table-column prop="input" label="理论消耗速度" />
      <el-table-column prop="spend" label="净产量" />
    </el-table>
  </div>
</template>


<script setup>



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

import { reactive } from 'vue'

const formInline = reactive({
  user: '',
  region: '',
  date: '',
})

const onSubmit = () => {
  console.log('submit!')
}
</script>




