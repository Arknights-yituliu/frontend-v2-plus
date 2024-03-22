<script setup>
import logTable from '/src/static/json/log.json'


const logType = {
  "新增": "feat",
  "调整": "update",
  "修改": "update",
  "替换": "update",
  "优化": "perf",
  "更新": "update",
  "修复": "fix",
  "测试": "test",
  "重构": "refactor",
}


let logCollect = []

for (const log of logTable) {
  let logItem = logCollect[logCollect.length-1]
  if (logItem) {
    if (logItem.date !== log.date) {
      logItem = {
        date: log.date,
        logs: []
      }
      logItem.logs.push(log)
      logCollect.push(logItem)
    } else {
      logItem.logs.push(log)
      logCollect[logCollect.length-1] = logItem
    }
  } else {
    logItem = {
      date: log.date,
      logs: []
    }
    logItem.logs.push(log)
    logCollect.push(logItem)
  }
}



</script>

<template>

  <div class="log-list">
    <h1>网站维护日志</h1>

    <div class="log-item" v-for="({date,logs},index) in logCollect" :key="index">
      <h2>{{ date }}</h2>
      <div v-for="(log,index) in logs" :key="index" class="log-content">
        <span class="log-type">{{ `${log.type}:` }}</span>
        <span class="log-module">【{{ `${log.module}` }}】</span>
        <span class="log-description">{{ log.description }}</span>
        <span class="log-author">@{{ log.author }}</span>
      </div>


<!--      <ul>-->
<!--        <li class="log-content" v-for="(log,index) in logs" :key="index">-->
<!--          <span>{{ `${log.type}:` }}</span>-->
<!--          <span>【{{ `${log.module}` }}】</span>-->
<!--          <span>{{ log.description }}</span>-->
<!--          <span>@{{ log.author }}</span>-->
<!--        </li>-->
<!--      </ul>-->
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
  text-align: center;
}

.log-type{
  display: block;
  width: 60px;
}

.log-module{
  display: block;
  width: 200px;
}

.log-content span {
  padding: 0 8px;
}

.log-description {
  display: block;
  width: 400px;
}

.log-author {
  display: block;
  width: 200px;
}





</style>