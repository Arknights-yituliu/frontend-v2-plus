<script setup>
import developmentRelated from "/src/static/json/about/developmentRelated.json";
import developmentChat from "/src/static/json/about/developmentChat.json";
import informationRelease from "/src/static/json/about/informationRelease.json";
import DevCard from "/src/components/dev/DevCard.vue";
import IndexCardItem from "../components/index/index-card-item.vue";

const colors = [
  'indigo',
  'warning',
  'pink darken-2',
  'red lighten-1',
  'deep-purple accent-4',
]
const slides = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
]
</script>

<template>

  <div class="index-page">

    <v-carousel
        height="400"
        show-arrows="hover"
        cycle
        hide-delimiter-background
    >
      <v-carousel-item
          v-for="(slide, i) in slides"
          :key="i"
      >
        <v-sheet
            :color="colors[i]"
            height="100%"
        >
          <div class="d-flex fill-height justify-center align-center">
            <div class="text-h2">
              {{ slide }} Slide
            </div>
          </div>
        </v-sheet>
      </v-carousel-item>
    </v-carousel>

    <div class="tool-card-group">

      <v-card class="tool-card">
        <v-card-title>
          参与开发
        </v-card-title>
        <v-card-text>
          <v-card class="m-8 v-card-deep-box-shadow">
            <v-card-title>
              前端仓库
            </v-card-title>
            <v-card-subtitle>
              技术栈
            </v-card-subtitle>
            <v-card-text>
              <div class="flex-wrap flex">
                <v-chip color="green" class="m-4">
                  <img src="https://v2.cn.vuejs.org/images/logo.svg" alt="" style="width: 20px">
                  <div class="m-0-4">vue.js</div>
                </v-chip>

                <v-chip color="primary" class="m-4">
                  <img src="/image/icon/element-plus-logo.png" alt="" style="width: 20px">
                  <div class="m-0-4">element-plus</div>
                </v-chip>

                <v-chip color="primary" class="m-4">
                  <img src="/image/icon/vuetify-logo.png" alt="" style="width: 20px">
                  <div class="m-0-4">vuetify</div>
                </v-chip>
              </div>
            </v-card-text>

            <v-btn
                color="primary"
                variant="tonal"
                class="m-8"
            >
              <img alt="" src="/image/website/GitHub.webp" style="width: 16px">
              前端仓库
            </v-btn>

          </v-card>
          <v-card class="m-8 v-card-deep-box-shadow">
            <v-card-title>
              后端仓库
            </v-card-title>
            <v-card-subtitle>
              技术栈
            </v-card-subtitle>
            <v-card-text>
              <div class="flex-wrap flex">
                <v-chip color="green" class="m-4">
                  <img src="https://spring.io/img/projects/spring-boot.svg" alt="" style="width: 20px">
                  <div class="m-0-4">Spring Boot</div>
                </v-chip>
                <v-chip color="primary" class="m-4">
                  <img src="/image/icon/mysql-svgrepo-com.svg" alt="" style="width: 20px">
                  <div class="m-0-4">mysql</div>
                </v-chip>
                <v-chip color="red" class="m-4">
                  <img src="/image/icon/redis.svg" alt="" style="width: 20px">
                  <div class="m-0-4">redis</div>
                </v-chip>
              </div>
            </v-card-text>
            <v-btn
                color="primary"
                variant="tonal"
                class="m-8"
            >
              <img alt="" src="/image/website/GitHub.webp" style="width: 16px">
              后端仓库
            </v-btn>
          </v-card>

        </v-card-text>
      </v-card>
      <v-card class="tool-card">
        <v-card-title>

        </v-card-title>
        <v-card-text>
          攒抽计算器
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<style scoped>

.index-page {
  max-width: 1080px;

  .tool-card-group {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;

    .tool-card {
      margin: 8px 0;
      width: calc(50% - 8px);
    }
  }

  .v-card-deep-box-shadow {
    box-shadow: 0 2px 1px -1px rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14), 0 1px 3px 0 rgba(0, 0, 0, 0.3)
  }

}

</style>