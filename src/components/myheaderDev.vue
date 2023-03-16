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
      <el-menu-item index="0" v-show="menu_phone" @click="emnu_collapse()"><i class="el-icon-menu"></i></el-menu-item>
      <el-menu-item v-show="menu_pc" index="1" @click="mainSite()">材料一图流</el-menu-item>
      <el-menu-item v-show="menu_pc" index="2" @click="gachaCal()">攒抽规划</el-menu-item>
      <el-menu-item v-show="menu_pc" index="3" @click="schedule()">排班生成器</el-menu-item>
      <el-submenu v-show="menu_pc" index="4">
        <template slot="title">其它工具</template>
        <el-menu-item index="4-1" @click="recruit()">公开招募</el-menu-item>
      </el-submenu>
      <el-menu-item
        v-show="('/' === routePath || '/recruit/' === routePath) && menu_pc"
        index="5"
        @click="switchTheme()"
        >{{ ThemeText }}</el-menu-item
      >
    </el-menu>

    <div @click="emnu_collapse()" class="menu_div">
      <div class="menu-collapse" id="menu">
        <h1>明日方舟一图流</h1>
        <table>
          <tbody>
            <tr>
              <td><i class="el-icon-menu"></i></td>
              <td @click="mainSite()">材料一图流</td>
            </tr>
            <tr>
              <td><i class="el-icon-menu"></i></td>
              <td @click="gachaCal()">攒抽规划</td>
            </tr>
            <tr>
              <td><i class="el-icon-menu"></i></td>
              <td @click="schedule()">排班生成器</td>
            </tr>
            <tr>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style></style>

<script>
var count = 0;

import cookie from "js-cookie";
import Vue from "vue";
import toolApi from "@/api/tool";

export default {
  data() {
    return {
      activeIndex: "0",
      isCollapse: "true",
      routePath: "/",
      ThemeText: "暗色",
      menu_flag: false,
      menu_height: 0,
      menu_pc: false,
      menu_phone: false,
    };
  },
  created() {
    this.showPath();
  },
  mounted() {
    this.getClientWidth();
  },
  methods: {
    getClientWidth() {
      var width = document.body.clientWidth;
      this.menu_height = document.body.clientHeight;
      if (width < 600) {
        this.menu_phone = true;
        this.menu_pc = false;
      } else {
        this.menu_phone = false;
        this.menu_pc = true;
      }
    },
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
      if ("/gachaCal/" === this.routePath) {
        this.activeIndex = "2";
        this.updateVisits("gacha");
      }
      if ("/riicCal/" === this.routePath) {
        this.activeIndex = "3";
        this.updateVisits("building");
      }
      if ("/recruit/" === this.routePath) {
        this.activeIndex = "4";
        this.updateVisits("index");
      }
      if ("/expCal/" === this.routePath) {
        this.activeIndex = "4";
        this.updateVisits("index");
      }
      if ("/maaRecruitData/" === this.routePath) {
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
    handleSelect(key, keyPath) {
      console.log(key, keyPath);
    },

    emnu_collapse() {
      if (this.menu_flag) {
        document.getElementById("menu").className = "menu-collapse";
        this.menu_flag = false;
      } else {
        document.getElementById("menu").className = "menu-collapse ";
        setTimeout(function () {
          document.getElementById("menu").className = "menu-collapse menu-open";
        }, 10);
        this.menu_flag = true;
      }
    },
  },
};
</script>

<style>
/* .menu-button{
  width:66px ;
  background-color: #409EFF;
} */

.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  min-height: 400px;
}

.menu_div {
  width: 0;
  height: 0;
  position: absolute;
  top: -20px;
  z-index: 200;
  border: solid red 1px;
}

.menu-collapse {
  transform: translateX(-290px);
}

.menu-open {
  background-color: white;
  width: 200px;
  height: 1000px;
  white-space: nowrap;
  text-align: center;
  transition: all 0.3s;
  transform: translateX(0) !important;
}

.el-icon-menu {
  margin: 4px;
  font-size: 40px;
  color: rgb(255, 255, 255);
}
</style>
