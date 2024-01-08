<script setup>
import logTable from '/src/static/json/log.json'

</script>

<template>

  <div class="log-list">
    <h1>网站维护日志</h1>
    <div class="log-item" v-for="({date,logs},index) in logTable" :key="index">
      <h2>{{ date }}</h2>
      <ul>
        <li class="log-content" v-for="(log,index) in logs" :key="index">{{`【${log.tag}】`}}&emsp;{{log.text}}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.log-list{
  width: 90%;
  margin: auto;
}

.log-item {

}

.log-content{
  padding: 4px;
}
</style>