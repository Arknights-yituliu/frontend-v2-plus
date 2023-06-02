<template>
  <div class="upload_page"><navBar></navBar> <character></character></div>
</template>
<script setup>
import "@/assets/css/sprite_char_6_part1.css";
import "@/assets/css/sprite_char_5_part1.css";
import "@/assets/css/sprite_char_5_part2.css";
import "@/assets/css/sprite_char_4_part1.css";
import "@/assets/css/sprite_rank.css";
import "@/assets/css/survey_index.css";
import "@/assets/css/survey_character.css";
import "@/assets/css/sprite_skill.css";
import character from "./character.vue";
import navBar from "@/pages/survey/navBar.vue";
import { ref } from "vue";
</script>

<style scoped>
.upload_page {
  background: white;
}
</style>
