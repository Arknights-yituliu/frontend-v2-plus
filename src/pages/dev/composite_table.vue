<script setup>
import composite_table from '/src/static/json/material/composite_table.v2.json'
import ItemImage from "@/components/sprite/ItemImage.vue";
</script>

<template>
  <div style="display: flex;flex-wrap: wrap">
    <div v-for="item in composite_table" style="border: 1px solid black;margin: 8px;width: 200px">
      <ItemImage :item-id="item.itemId" :size="50" style="margin: auto"></ItemImage>

      <div style="border-top: 1px solid black;display: flex">
        <div v-for="path in item.pathway" style="width: 50px;margin: 8px">
          <ItemImage :item-id="path.itemId" :size="50"></ItemImage>
          <div style="text-align: center">{{ path.count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>