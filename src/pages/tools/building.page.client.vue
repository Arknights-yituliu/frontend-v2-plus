<script setup>
import buildingData from '/src/static/json/build/building_table.json'
</script>
<template>
  <div v-for="(list,type) in buildingData" :key="type">
    <div v-for="(skill,index) in list" :key="index" style="margin: 8px">
         {{skill.description}}
    </div>
  </div>

</template>