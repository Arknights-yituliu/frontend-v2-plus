<template>
  <div id="indexDiv" :class="pageTheme" style="max-width: 1080px; margin: auto">
    <stage></stage>
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
// import stage from "@/pages/module/stage.vue";
// import storeVue from "@/pages/module/store.vue";
// import pack from "@/pages/module/pack.vue";
// import itemVue from "@/pages/module/itemValue.vue";
// import foot from "@/pages/module/foot.vue";

import cookie from "js-cookie";
import toolApi from "@/api/tool";

export default {
  data() {
    return {
      pageTheme: "op_title_etext_light",
    };
  },
  created() {},
  mounted() {
    // this.updateVisits();
    this.getCookies();
  },
  methods: {
    updateVisits() {
      toolApi.updateVisits("index").then((response) => {});
    },
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
</script>

<style></style>
