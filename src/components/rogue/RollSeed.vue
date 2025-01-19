<script setup>
import {ref} from "vue";
import rogueSeedAPI from "@/api/rogueSeed.js";
import {copyTextToClipboard} from "@/utils/copyText.js";

let rogueSeed = ref({})

function rollSeed(seedType) {

  // rogueSeedAPI.rollRogueSeed({seedType: seedType}).then(response => {
  //   rogueSeed.value = response.data;
  // })
}


</script>


<template>
  <div class="m-12-a">

    <div class="flex justify-center">
      <v-chip text="当前种子数量过少，后续开放" color="red" class="m-a"></v-chip>
    </div>

    <div class="flex justify-center m-12-a">
      <v-btn disabled text="给我一个胡种" color="primary" class="m-0-12" @click="rollSeed(1)">

      </v-btn>
      <v-btn disabled text="给我一个毒种" color="primary" class="m-0-12" @click="rollSeed(2)">

      </v-btn>
    </div>

    <v-card class="roll-rogue-seed-card" v-show="rogueSeed" disabled>
      <!-- 标题和复制按钮 -->
      <v-card-text>

        <div class="flex align-center m-4-0">
          <span class="rogue-seed" style="border-radius: 8px;padding: 8px;">{{ rogueSeed.seed }}</span>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="copyTextToClipboard(rogueSeed)">
            <template v-slot:prepend>
              <v-icon icon="mdi-clipboard"></v-icon>
            </template>
            复制
          </v-btn>
        </div>


        <!-- 标签区域 -->
        <div class="flex flex-wrap m-12-0">
          <v-chip color="green" class="m-4" size="small" text="已复制" v-show="rogueSeed.copyFlag">
          </v-chip>
          <v-chip v-for="(tag, tagIndex) in rogueSeed.tags" :key="tagIndex" color="primary" class="m-4" size="small"
                  :text="tag">
          </v-chip>
        </div>

        <!-- 描述区域 -->
        <v-alert :icon="false"
                 :text=" rogueSeed.description"
                 type="info"
                 variant="tonal"
                 height="100"
                 class="m-8-0">

        </v-alert>

        <v-row justify="center" align="center" dense>
          <v-rating v-model="rogueSeed.rating" color="primary" half-increments density="compact" readonly></v-rating>
        </v-row>

      </v-card-text>
    </v-card>
  </div>
</template>