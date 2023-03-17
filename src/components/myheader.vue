<template>
  <div>
    <el-menu
      :default-active="activeIndex"
      class="el-menu-demo op_header"
      mode="horizontal"
      @select="handleSelect"
      text-color="#fff"
      active-text-color="#ffd04b"
      style="border: 0px"
    >
      <el-menu-item v-show="menu_pc" index="1" @click="mainSite()">材料一图流</el-menu-item>
      <el-menu-item v-show="menu_pc" index="2" @click="gachaCal()">攒抽规划</el-menu-item>
      <el-menu-item v-show="menu_pc" index="3" @click="schedule()">排班生成器</el-menu-item>
      <el-menu-item v-show="menu_pc" index="4" @click="pack()">礼包性价比</el-menu-item>
      <!-- <el-submenu v-show="menu_pc" index="4">
        <template slot="title">其它工具</template>
        <el-menu-item index="4-1" @click="recruit()">公开招募</el-menu-item>
      </el-submenu> -->
      <el-menu-item
        v-show="('/' === routePath || '/recruit/' === routePath) && menu_pc"
        index="5"
        @click="switchTheme()"
        >{{ ThemeText }}</el-menu-item
      >
    </el-menu>
  </div>
</template>

<style></style>

<script>
var count = 0;

import cookie from "js-cookie";
import toolApi from "@/api/tool";

export default {
  data() {
    return {
      activeIndex: "1",
      isCollapse: "true",
      routePath: "/",
      ThemeText: "暗色",
      menu_width: 0,
      menu_height: 0,
      menu_pc: true,
      menu_phone: false,
    };
  },
  created() {
    this.showPath();
  },
  mounted() {},
  methods: {
    getTest() {
      console.log(navigator.userAgent.toLowerCase());
    },
    updateVisits(domain) {
      toolApi.updateVisits(domain).then((response) => {});
    },
    switchTheme() {
      this.activeIndex = "1";
      if (cookie.get("theme") === "dark") {
        document.getElementById("indexDiv").style.background = "#f0f0f0";
        document.getElementById("indexDiv").style.color = "#000000";
        var titles = document.getElementsByClassName("op_title_ctext");
        for (var i = 0; i < titles.length; i++) titles[i].style.color = "#000000dd";
        var titles = document.getElementsByClassName("op_title_etext");
        for (var i = 0; i < titles.length; i++) titles[i].style.WebkitTextStroke = "0.6px black";
        cookie.set("theme", "light", { expires: 30 });
        console.log("nowlight");
        this.ThemeText = "亮色";
      } else {
        document.getElementById("indexDiv").style.background = "#222222";
        document.getElementById("indexDiv").style.color = "#ffffff";
        var titles = document.getElementsByClassName("op_title_ctext");
        for (var i = 0; i < titles.length; i++) titles[i].style.color = "#ffffffdd";
        var titles = document.getElementsByClassName("op_title_etext");
        for (var i = 0; i < titles.length; i++) titles[i].style.WebkitTextStroke = "0.3px white";
        cookie.set("theme", "dark", { expires: 30 });
        console.log("nowdark");
        this.ThemeText = "暗色";
      }
    },
    handleOpen(key, keyPath) {
      console.log(key, keyPath);
    },
    handleClose(key, keyPath) {
      console.log(key, keyPath);
    },
    menuCollapse() {
      this.isCollapse = !this.isCollapse;
      console.log(this.isCollapse);
    },

    showPath() {
      this.routePath = this.$route.path;
      if ("/" === this.routePath) {
        this.activeIndex = "1";
        this.updateVisits("index");
      }
      console.log(this.routePath.indexOf("pack"));
      if (this.routePath.indexOf("gachaCal") != -1) {
        this.activeIndex = "2";
        this.updateVisits("gacha");
      }
      if (this.routePath.indexOf("riicCal") != -1) {
        this.activeIndex = "3";
        this.updateVisits("building");
      }
      if (this.routePath.indexOf("pack") != -1) {
        this.activeIndex = "4";
        this.updateVisits("pack");
      }
      if (this.routePath.indexOf("maaRecruitData") != -1) {
        this.activeIndex = "4";
        this.updateVisits("index");
      }
    },

    mainSite() {
      window.location.href = "/";
    },
    expCal() {
      window.location.href = "/expCal/";
    },
    recruit() {
      window.location.href = "/recruit/";
    },
    riicSkill() {
      window.location.href = "/riicSkill/";
    },
    gachaCal() {
      window.location.href = "/gachaCal/";
    },
    schedule() {
      window.location.href = "/riicCal/";
    },
    pack() {
      window.location.href = "/pack/";
    },
    handleSelect(key, keyPath) {
      console.log(key, keyPath);
    },
  },
};
</script>

<style scoped>
/* .menu-button{
  width:66px ;
  background-color: #409EFF;
} */

.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  min-height: 400px;
}
</style>
