<script setup>
import {ref} from 'vue'
import '/src/assets/css/rogue/seed-collect.scss'

import SeedTable from "/src/components/rogue/SeedTable.vue";
import UploadSeed from "/src/components/rogue/UploadSeed.vue";
import RollSeed from "@/components/rogue/RollSeed.vue";

let activeTab = ref('GoodSeed')

</script>

<template>
  <div class="rogue-seed-page">

    <!--      <v-row justify="center">-->
    <!--        <v-col cols="auto">-->
    <!--          <v-btn color="success" @click="generateHu">给我一个胡种</v-btn>-->
    <!--        </v-col>-->
    <!--        <v-col cols="auto">-->
    <!--          <v-btn color="error" @click="generateDu">给我一个毒种</v-btn>-->
    <!--        </v-col>-->
    <!--      </v-row>-->


    <!-- Tabs -->

    <RollSeed></RollSeed>


    <v-tabs v-model="activeTab" bg-color="primary" dark>
      <v-tab value="SpecialSeed">特殊种子</v-tab>
      <v-tab value="GoodSeed">胡种榜</v-tab>
      <v-tab value="BadSeeds">毒种榜</v-tab>
      <v-tab value="UploadSeeds">种子上传</v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="SpecialSeed">
        <SeedTable :seed-type="3"></SeedTable>
      </v-tabs-window-item>
      <v-tabs-window-item value="GoodSeed">
        <SeedTable :seed-type="1"></SeedTable>
      </v-tabs-window-item>
      <v-tabs-window-item value="BadSeeds">
        <SeedTable :seed-type="2"></SeedTable>
      </v-tabs-window-item>
      <v-tabs-window-item value="UploadSeeds">
        <UploadSeed></UploadSeed>
      </v-tabs-window-item>
      <!-- Tab content -->
    </v-tabs-window>


  </div>
</template>

<style scoped></style>