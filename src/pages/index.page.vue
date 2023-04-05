<template>
  <div id="indexDiv" :class="pageTheme" style="max-width: 1080px; margin: auto">
    <stage />
    <!-- <newChapter /> -->
    <store-value />
    <div class="title_null"></div>
    <!-- <pack> </pack> -->
    <div class="title_null"></div>
    <item-value />
    <div class="title_null"></div>
    <foot-component />
    <div class="title_null"></div>
  </div>
</template>

<script>
import stage from "@/components/stage.vue";
import newChapter from "@/components/newChapter.vue";
import StoreValue from "@/components/StoreValue.vue";
// import pack from "@/pages/module/pack.vue";
import ItemValue from "@/components/ItemValue.vue";
import FootComponent from "@/components/FootComponent.vue";

import cookie from "js-cookie";
import toolApi from "@/api/tool";

export default {
  components: {
    stage,
    StoreValue,
    ItemValue,
    FootComponent,
    newChapter,
  },
  data() {
    return {
      pageTheme: "op_title_etext_light",
    };
  },
  mounted() {
    toolApi.updateVisits("index");
    this.getCookies();
  },
  methods: {
    getCookies() {
      let theme = cookie.get("theme");
      if (typeof theme == "undefined" || theme == undefined) {
        theme = "light";
        cookie.set("theme", theme, { expires: 30 });
      }
      // console.log("index", theme);
      this.pageTheme = theme;
    },
  },
};

export const documentProps = {
  title: "明日方舟一图流",
  description: "明日方舟材料掉落地图效率，采购中心性价比，活动商店性价比，物品价值一览",
};
</script>
