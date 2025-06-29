<script setup>
import customItemInfo from '/src/static/json/material/custom_item_info.json'
import ItemImage from "@/components/sprite/ItemImage.vue";
</script>

<template>

  <div v-for="customItem in customItemInfo">
    <table class="dev-custom-item-table">
      <tbody>
      <tr>
        <td>{{ customItem.itemId }}</td>
        <td>{{ customItem.itemName }}</td>
        <td>{{ customItem.description }}</td>
      </tr>
      <tr>
        <td colspan="3">
          <div class="flex flex-wrap">
            <div v-for="item in customItem.list" class="item">
              <ItemImage :item-id="item.itemId"></ItemImage>
              <div>{{ item.itemName }}</div>
              <div>{{ item.count }}</div>
            </div>

          </div>
        </td>
      </tr>
      </tbody>
    </table>

  </div>

</template>

<style>

.dev-custom-item-table {
  margin: 4px;
  border-collapse: collapse;

  td {
    border: 1px solid gray;
    padding: 4px;
  }

  .item{
    padding:  0 4px;
    border: 1px solid gray;
    text-align: center;
  }

}



</style>