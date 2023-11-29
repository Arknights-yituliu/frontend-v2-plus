<template>
  <div class="optional_table">
    <div class="optional_avatar_wrap" v-for="(operator,index) in optional_table" :key="index">
      <div :class="`bg-${operator.charId} optional_avatar`">

      </div>
      <span class="optional_own" v-show="operator.own"> 已拥有</span>
      <span class="optional_not_own" v-show="!operator.own"> 未招募</span>
    </div>
  </div>

  <div style="display: flex;flex-wrap: wrap">
  <div class="optional_operator_recommend" v-for="(operator,index) in optional_table" :key="index">
    <div class="optional_avatar_wrap" >
      <div :class="`bg-${operator.charId} optional_avatar`">
      </div>
    </div>
    <span> 这是一条干员评价，这是一条干员评价，这是一条干员评价，这是一条干员评价,这是一条干员评价,这是一条干员评价</span>
  </div>
  </div>
</template>

<script setup>

import optional_table from '/src/static/json/survey/optional_table.json'

function updateOwn(){

}

</script>

<style scoped>

.optional_table {
  display: flex;
  flex-wrap: wrap;
}

.optional_avatar_wrap {
  position: relative;
  width: 60px;
  height: 60px;
  margin: 4px;

}

.optional_own{
  background: coral;
  position: absolute;
  top: 50px;
  left: 7px;
}

.optional_not_own{
  background: dodgerblue;
  position: absolute;
  top: 50px;
  left: 7px;
  color: #000000;
}

.optional_avatar {
  transform: scale(.33);
  top: -60px;
  left: -60px;
  position: absolute;
}


.optional_operator_recommend{
  display: flex;
  flex-wrap: wrap;
  width: 100px;
}

</style>