<script setup>
import {ref} from 'vue'
import '/src/assets/css/rogue/seed-collect.scss'


import goodSeeds from "/src/components/tools/goodSeeds.vue";
import badSeeds from "/src/components/tools/badSeeds.vue";
import uploadSeeds from "/src/components/tools/uploadSeeds.vue";


let activeTab = ref('GoodSeed')


</script>

<template>
  <div class="rogue-seed-page">

      <v-row justify="center">
        <v-col cols="auto">
          <v-btn color="success" @click="generateHu">给我一个胡种</v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn color="error" @click="generateDu">给我一个毒种</v-btn>
        </v-col>
      </v-row>



      <v-card>
        <v-row>
          <!-- 左栏 -->
          <v-col cols="6">
            <div>
              <h4 class="text-primary">此处为种子</h4>
            </div>
            <div>
              <p class="text-secondary">此处为肉鸽版本</p>
            </div>
            <div>
              <p class="text-secondary">此处为难度</p>
            </div>
          </v-col>

          <!-- 右栏 -->
          <v-col cols="6">
            <!-- 首次体验得分 -->
            <div>
              <h5 class="text-primary">首次体验得分</h5>
            </div>

            <!-- 四个方框 -->
            <div class="d-flex align-center my-2">
              <v-btn outlined color="primary" class="mr-4">分队</v-btn>
              <v-divider vertical class="mx-2"></v-divider>
              <v-btn outlined color="primary" class="mx-1">干员</v-btn>
              <v-btn outlined color="primary" class="mx-1">干员</v-btn>
              <v-btn outlined color="primary" class="mx-1">干员</v-btn>
            </div>

            <!-- 五分制评分组件 -->
            <div>
              <v-rating
                  value="3"
                  length="5"
                  color="warning"
                  background-color="grey lighten-2"
                  dense
              ></v-rating>
            </div>
          </v-col>
        </v-row>
      </v-card>



      <!-- Tabs -->
      <v-card>
        <v-tabs v-model="activeTab" bg-color="primary" dark>
          <v-tab value="GoodSeed">胡种榜</v-tab>
          <v-tab value="BadSeeds">毒种榜</v-tab>
          <v-tab value="UploadSeeds">种子上传</v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab">
          <v-tabs-window-item value="GoodSeed">
            <goodSeeds/>
          </v-tabs-window-item>
          <v-tabs-window-item value="BadSeeds">
            <badSeeds/>
          </v-tabs-window-item>
          <v-tabs-window-item value="UploadSeeds">
            <uploadSeeds/>
          </v-tabs-window-item>
          <!-- Tab content -->
        </v-tabs-window>
      </v-card>






  </div>
</template>

<style scoped></style>