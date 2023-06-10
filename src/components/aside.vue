<template>
  <div class="aside_table">
    <div class="aside_title">明日方舟一图流</div>

    <div v-for="(r, index) in routes" :key="index">
      <div :class="navSelected(nav_collapseFlag[index])" @click="navChildOpen(index, r.child.length)" v-show="r.isChild">
        <div class="nav_text">{{ r.text }}</div>
        <div>
          <el-icon class="child_icon"><ArrowDownBold :style="nav_collapseFlag[index] ? 'transform:rotate(180deg)' : ''" /></el-icon>
        </div>
      </div>
      <div class="nav_child_wrap" :id="'nav' + index" v-show="r.isChild">
        <a :href="c.path" class="href" v-for="c in r.child">
          <div class="nav_child">{{ c.text }}</div></a
        >
      </div>
      <div class="nav" v-show="!r.isChild">
        <a :href="r.path" class="href">
          <div class="nav_text">{{ r.text }}</div></a
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { mdiChartBoxOutline, mdiGiftOutline, mdiCalculator, mdiCalendarCursorOutline, mdiGold } from "@mdi/js";

let nav_collapseFlag = ref([false, false, false, false, false, false]);

function navChildOpen(index, childNum) {
  nav_collapseFlag.value[index] = !nav_collapseFlag.value[index];
  console.log(index, childNum);
  if (nav_collapseFlag.value[index]) {
    document.getElementById("nav" + index).style.height = childNum * 34 + "px";
    document.getElementById("nav" + index).style.overflow = "";
  } else {
    document.getElementById("nav" + index).style.height = "0px";
    document.getElementById("nav" + index).style.overflow = "hidden";
  }
}

function navSelected(flag) {
  if (flag) return "nav aside_nav_selected";
  return "nav";
}

const routes = [
  {
    path: "/",
    text: "材料一图流",
    isChild: true,
    child: [
      {
        path: "/",
        text: "材料一图流",
      },
      {
        path: "/store",
        text: "商店性价比",
      },
      {
        path: "/value",
        text: "物品价值",
      },
    ],
  },

  {
    path: "/survey",
    text: "干员调查",
    isChild: true,
    child: [
      {
        path: "/survey",
        text: "调查简介",
      },
      {
        path: "/survey/character",
        text: "干员练度调查",
      },
      {
        path: "/survey/score",
        text: "干员风评调查",
      },
      {
        path: "/survey/rank",
        text: "调查结果",
      },
    ],
  },
  {
    path: "/gachaCal",
    text: "攒抽规划",
    isChild: false,
  },
  {
    path: "/riicCal",
    text: "排班生成器",
    isChild: false,
  },
  {
    path: "/pack",
    text: "礼包性价比",
    isChild: false,
  },
];

onMounted(() => {
  for (let i in routes) {
    if (routes[i].isChild) {
      navChildOpen(i, routes[i].child.length);
    }
  }
});
</script>

<style>
.aside_table {
  color: white;
  font-family: "Microsoft YaHei", 微软雅黑, "MicrosoftJhengHei", 华文细黑, STHeiti, MingLiu;
}

.aside_title {
  font-size: 30px;
  text-align: center;
  height: 54px;
  line-height: 54px;
  /* margin-bottom: 50px; */
  font-weight: 900;
  background-color: rgb(52, 68, 104);
}

.nav {
  margin-top: 20px;
  margin-left: 10px;
  margin-right: 10px;
  display: flex;
  height: 30px;
  padding-left: 4px;
  /* border: 1px red solid; */
  /* border-left: 2px solid rgb(255, 255, 255); */
}

.aside_nav_selected {
  color: rgb(255, 217, 0);
  border-left: 2px solid rgb(255, 217, 0);
}

.nav_child_wrap {
  overflow: hidden;
  height: 0px;
  transition: all 0.2s;
  margin-right: 10px;
  margin-left: 10px;
  padding-left: 6px;
  /* border: 1px red solid; */
}

.nav_text {
  font-size: 24px;
  width: 200px;
}

.nav_child {
  font-size: 18px;
  margin-top: 10px;
}

.child_icon {
  height: 30px;
  width: 30px;
}

.href {
  color: white;
  text-decoration: none;
  display: flex;
}
</style>
