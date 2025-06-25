<script setup>
import operatorAddTime from '/public/json/operator_update_time.json'


</script>
<template>
  <table class="add-table">
    <tbody>
    <tr v-for="(item,name) in operatorAddTime">
      <td >
          {{name}}
      </td>
      <td>
        {{item.updateTime}}
      </td>
    </tr>
    </tbody>
  </table>

</template>

<style>
.add-table{
  border-collapse: collapse;
  td{
    border: 1px solid gray;
    padding: 12px;
  }
}
</style>