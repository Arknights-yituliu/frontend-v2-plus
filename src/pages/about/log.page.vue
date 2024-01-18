<script setup>
import logTable from '/src/static/json/log.json'
import {ref} from "vue";

const logType = {
  "新增":"新增",
  "调整":"调整",
  "修改":"修改",
  "替换":"替换",
  "优化":"优化",
  "更新":"更新",
  "修复":"修复",
  "测试":"测试",
  "重构":"重构",
}




</script>

<template>

  <div class="log-list">
    <h1>网站维护日志</h1>
    <div class="log-item" v-for="({date,logs},index) in logTable" :key="index">
      <h2>{{ date }}</h2>
      <ul>
        <li class="log-content" v-for="(log,index) in logs" :key="index" >
          <span >{{ `【${log.tag}】` }}</span>
          <span >{{ log.text }}</span>
          <span >@{{ log.author }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.log-list {
  width: 90%;
  margin: auto;
}

.log-content {
  padding: 4px;
  display: flex;
}

.log-content span{
  padding:0 8px;
}

.log-item {

}

.log-tag {
  width: 200px;
}

.log-text {
  width: 200px;
}

.log-author {
  width: 200px;
}



</style>