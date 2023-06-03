<template>
  <div class="score_page">
    <div>
    <div v-for="(char, charId) in scoreList.slice(0)" :key="charId" class="char_wrap" v-show="char.rarity > 5">
      <div>
        <div class="score_avatar_wrap">
          <div :class="getSprite(char.charId)"></div>
        </div>
        <div class="char_name">{{ char.name }}</div>
      </div>
      <div class="score_bar_wrap">
        <div class="score_bar">
          <div class="score_name">日常：</div>
          <img class="score_icon" :src="scoreSelected(rank, char.daily)" alt="" v-for="rank in 10" @click="updateScore(charId, 'daily', rank)" />
        </div>
        <div class="score_bar">
          <div class="score_name">肉鸽：</div>
          <img class="score_icon" :src="scoreSelected(rank, char.rogue)" alt="" v-for="rank in 10" @click="updateScore(charId, 'rogue', rank)" />
        </div>
        <div class="score_bar">
          <div class="score_name">高难：</div>
          <img class="score_icon" :src="scoreSelected(rank, char.hard)" alt="" v-for="rank in 10" @click="updateScore(charId, 'hard', rank)" />
        </div>
        <div class="score_bar">
          <div class="score_name">保全：</div>
          <img class="score_icon" :src="scoreSelected(rank, char.securityService)" alt="" v-for="rank in 10" @click="updateScore(charId, 'securityService', rank)" />
        </div>
        <div class="score_bar">
          <div class="score_name">泛用：</div>
          <img class="score_icon" :src="scoreSelected(rank, char.universal)" alt="" v-for="rank in 10" @click="updateScore(charId, 'universal', rank)" />
        </div>
        <div class="score_bar">
          <div class="score_name">对策：</div>
          <img class="score_icon" :src="scoreSelected(rank, char.countermeasures)" alt="" v-for="rank in 10" @click="updateScore(charId, 'countermeasures', rank)" />
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { scoreListInit, professionDict, rarityDict, yearDict } from "./baseData";
let scoreList = ref(scoreListInit());

let selectedCharId = 1;

function updateScore(charId, attribute, score) {
  scoreList.value[charId][attribute] = score;
}

function scoreSelected(rank, score) {
  if (rank <= score) return "/image/rank2/score_selected.png";
  return "/image/rank2/score.png";
}

function getSprite(id, type) {
  return "bg-" + id + " score_avatar";
}
</script>

<style scoped></style>
