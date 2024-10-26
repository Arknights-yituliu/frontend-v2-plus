<script lang="ts" setup>
import { reactive } from 'vue'

// do not use same name with ref
const form = reactive({
  name: '',
  region: '',
  delivery: false,
  type: [],
  resource: '',
  desc: '',
})

const onSubmit = () => {
  console.log('submit!')
}

//总打分数、总星数
const links = [
  {
    "seed": "ROGUE114514",
    "text": "种子简介文本种子简介文本种子简介文本种子简介文本种子简介文本",
    "users": ["第一个提名的用户", "第二个提名的用户"],
    "totalRank": 114,
    "totalStar": 514,
    "lastDate": "2024/10/20",
    "version": "3.3",
  },
  {
    "seed": "ROGUE1919810",
    "text": "悬赏114514龙门币过这个天谴局，觉得够坑请打高分",
    "users": ["第一个提名的用户", "第二个提名的用户"],
    "totalRank": 114,
    "totalStar": 514,
    "lastDate": "2024/10/20",
    "version": "3.3",
  },
  {
    "seed": "ROGUE1048576",
    "text": "请自备999源石锭",
    "users": ["第一个提名的用户", "第二个提名的用户"],
    "totalRank": 114,
    "totalStar": 514,
    "lastDate": "2024/10/20",
    "version": "3.3",
  },
  {
    "seed": "ROGUE8388608",
    "text": "开局记得选维什戴尔",
    "users": ["第一个提名的用户", "第二个提名的用户"],
    "totalRank": 114,
    "totalStar": 514,
    "lastDate": "2024/10/20",
    "version": "3.3",
  }
]


function openNewPage(url) {
  window.open(url)
}

</script>

<template>
  <!-- 提名区域 -->
  <el-card style="max-width: 480px">
    <el-form :model="form" label-width="auto" style="max-width: 600px">
      <el-form-item label="版本">
        <el-select v-model="form.region" placeholder="选择肉鸽版本（这个可以默认最新）">
          <el-option label="水月DLC3" value="shanghai" />
          <el-option label="萨米DLC3" value="beijing" />
          <el-option label="萨卡兹DLC2" value="beijing" />
        </el-select>
      </el-form-item>
      <el-form-item label="seed">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="种子简介">
        <el-input v-model="form.desc" type="textarea" />
      </el-form-item>
      <el-button type="primary" @click="onSubmit">提名种子！</el-button>

      <el-button type="primary" @click="onSubmit">随机来一个Seed让我爽爽！</el-button>
      <div>
        种子 : KFCVME50 天胡国王套200源石锭戒律酒杯胡局
      </div>

    </el-form>
  </el-card>

  <!-- 展示区域 -->
  <el-radio-group size="large">
    <el-radio-button label="#1 傀影与猩红血钻" value="New York" />
    <el-radio-button label="#2 水月" value="Washington" />
    <el-radio-button label="#3 萨米" value="Los Angeles" />
    <el-radio-button label="#4 萨卡兹" value="" />
  </el-radio-group>
  <div class="flex flex-wrap gap-4" style="display: flex;">
    <!-- 版本热门seeds -->
    <el-card style="max-width: 720px">
      <template #header>
        <div class="card-header">
          <span>版本热门seeds</span>
        </div>
      </template>
      <el-table :data="links" style="width: 100%">
        <el-table-column fixed prop="text" label="简介" width="240" />
        <el-table-column prop="seed" label="seed" width="180" />
        <el-table-column prop="rank" label="有多爽/有多坑" width="150">
          <el-rate v-model="value" clearable />
        </el-table-column>
        <el-table-column label="操作" min-width="120">
          <template #default>
            <el-button link type="primary" size="small" @click="handleClick">
              复制
            </el-button>
            <el-button link type="primary" size="small" disabled @click="handleClick">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <!-- 本周热门seeds -->
    <el-card style="max-width: 720px">
      <template #header>
        <div class="card-header">
          <span>本周热门seeds</span>
        </div>
      </template>
      <el-table :data="links" style="width: 100%">
        <el-table-column fixed prop="text" label="简介" width="240" />
        <el-table-column prop="seed" label="seed" width="180" />
        <el-table-column prop="rank" label="有多爽/有多坑" width="150">
          <el-rate v-model="value" clearable />
        </el-table-column>
        <el-table-column label="操作" min-width="120">
          <template #default>
            <el-button link type="primary" size="small" @click="handleClick">
              复制
            </el-button>
            <el-button link type="primary" size="small" disabled @click="handleClick">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>


</template>

<style scoped></style>