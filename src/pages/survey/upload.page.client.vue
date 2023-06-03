<template>
  <div class="upload_page">
    <navBar></navBar>
    <character></character>
    <!-- <score></score> -->
    <a class="href"></a>
  </div>
</template>
<script setup>
import "@/assets/css/survey_common.css";
import "@/assets/css/sprite_char_6.css";
import "@/assets/css/sprite_char_5.css";
import "@/assets/css/sprite_char_4.css";
import "@/assets/css/sprite_skill.css";
import "@/assets/css/sprite_rank.css";

import "@/assets/css/survey_index.css";

import "@/assets/css/survey_character.css";
import "@/assets/css/survey_score.css";

import character from "./character.vue";
import navBar from "./navBar.vue";
import score from "./score.vue";

import { ref } from "vue";
</script>

<style scoped>
.upload_page {
  background: white;
}
</style>
