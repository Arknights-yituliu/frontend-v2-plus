<script setup>
import operatorAddTime from '/src/static/json/operator/operator_add_time.json'


</script>
<template>
  <table class="add-table">
    <tbody>
    <tr v-for="(item,name) in operatorAddTime">
      <td >
          {{name}}
      </td>
      <td>
        {{item.addTime}}
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