<template>
  <div>
    <!-- 采购中心 -->
    <div id="store">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">采购中心</div>
          <div :class="opETextTheme">Store Ranking</div>
        </div>
        <div class="op_title_tag">
          <div style="display: flex; align-items: flex-end">
            <div
              :class="tagColor[0]"
              style="height: 45px; width: 45px; margin: 0px 4px; box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3); border-radius: 4px; background: #f0f0f0"
              id="store_tag_0"
              @click="switch_store('0')"
            >
              <div style="margin: 3px" :class="getSpriteImg(4005, 0)"></div>
            </div>
            <div
              :class="tagColor[1]"
              style="height: 45px; width: 45px; margin: 0px 4px; box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3); border-radius: 4px; background: #f0f0f0"
              id="store_tag_1"
              @click="switch_store('1')"
            >
              <div style="margin: 3px" :class="getSpriteImg(4004, 0)"></div>
            </div>
            <div
              :class="tagColor[2]"
              style="height: 45px; width: 45px; margin: 0px 4px; box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3); border-radius: 4px; background: #f0f0f0"
              id="store_tag_2"
              @click="switch_store('2')"
            >
              <div style="margin: 0px 2px" :class="getSpriteImg('EPGS_COIN', 0)"></div>
            </div>
            <div
              :class="tagColor[3]"
              style="height: 45px; width: 45px; margin: 0px 4px; box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3); border-radius: 4px; background: #f0f0f0"
              id="store_tag_3"
              @click="switch_store('3')"
            >
              <div style="margin: 0px 5px" :class="getSpriteImg('REP_COIN', 0)"></div>
            </div>
            <div
              :class="tagColor[4]"
              style="height: 45px; width: 45px; margin: 0px 4px; box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3); border-radius: 4px; background: #f0f0f0"
              id="store_tag_4"
              @click="switch_store('4')"
            >
              <div style="margin: 3px" :class="getSpriteImg('SOCIAL_PT', 0)"></div>
            </div>
            <div class="tab_text">*点击图标切换</div>
          </div>
        </div>
      </div>
      <!-- 标题区域end -->
    </div>
  </div>
</template>

<script>
import storeApi from "@/api/store";

// import storeJson from "static/json-video/store.json";
import { usePageContext } from "@/renderer/usePageContext";

export default {
  setup() {
    const pageContext = usePageContext();
    return { pageContext };
  },
  data() {
    return {
      // storeList: storeJson.data, //常驻商店性价比集合
      storeList: this.pageContext.pageProps.perm, //常驻商店性价比集合
      actStoreList: this.pageContext.pageProps.act, //活动商店的json
      storeVisiable: ["display:flex;", "display:flex;", "display:flex;", "display:flex;", "display:flex;"],
      tagColor: ["n", "n", "n", "n", "n"],
      opETextTheme: "op_title_etext_light",
    };
  },
  mounted() {
    // this.findPermStorePer();
    // this.getCookies();
    // this.findActStorePer();
  },
  methods: {
    getSpriteImg(id, index) {
      if (index == 0) return "bg-" + id + "_icon sprite_store_icon";
      if (index == 1) return "bg-" + id + " sprite_store_perm";
      if (index == 2) return "bg-" + id + " sprite_store_act";
      if (index == 3) return "bg-" + id + " sprite_secondary";
      return "bg-" + id;
    },

    getImgUrl(img, source) {
      source = typeof source !== "undefined" ? source : 1;
      if (source > 4.1) return "/image/materials/道具_" + img + ".png";
      else if (source > 3.1) return "/image/icon/图标_" + img + ".png";
      else if (source > 2.1) return "https://image.yituliu.site/ activity_picture /" + img + ".png";
      else if (source > 1.1) return "https://image.yituliu.site/item/" + img + ".png";
      else if (source > 0.1) return "/image/materials/" + img + ".png";
      else return "https://cdn.jsdelivr.net/gh/zirun-wang/OnePicCDN/image/" + img + ".png";
    },
    getEfficiency(num, acc) {
      acc = typeof acc !== "undefined" ? acc : 2;
      return parseFloat(num).toFixed(acc);
    },
    getEfficiencyPlus(num) {
      num = num + 0.1;
      return parseFloat(num).toFixed(2);
    },
    getBackground(url) {
      return "background: linear-gradient(rgba(144, 164, 174, 0.7), rgba(144, 164, 174, 0.7)), url(" + url + ") no-repeat 50% 50% /cover;";
    },
    getColor(color, dividing, tier) {
      tier = typeof tier !== "undefined" ? tier : 1;
      dividing = typeof dividing !== "undefined" ? dividing : 4;
      if (color < 0) return "color_t6";
      else if (color < dividing - 3 * tier) return "color_t1";
      else if (color < dividing - 2 * tier) return "color_t2";
      else if (color < dividing - 1 * tier) return "color_t3";
      else if (color < dividing) return "color_t4";
      else return "color_t5";
    },
    getTagClass(tier) {
      return "stage_hint_t" + tier.toString();
    },
    getBorderColor(area) {
      area = typeof area !== "undefined" ? area : 1;
      if (area < 0.1) return "act_area0_border";
      else if (area < 1.1) return "act_area1_border";
      else if (area < 2.1) return "act_area2_border";
      else if (area < 3.1) return "act_area3_border";
      else if (area < 4.1) return "act_area4_border";
      else return "act_area5_border";
    },
    getDivVisible(index) {
      if (index < 0 || index > 1) return "uni_invisible";
    },

    switch_store(index) {
      if (document.getElementById("store_tag_" + index.toString()).className == "n") {
        document.getElementById("store_" + index.toString()).style.display = "none";
        document.getElementById("store_tag_" + index.toString()).className = "uni_gray";

      } else {
        document.getElementById("store_" + index.toString()).style.display = "flex";
        document.getElementById("store_tag_" + index.toString()).className = "n";

      }
    },

    findPermStorePer() {
      storeApi.findPermStore().then((response) => {
        this.storeList = [];
        this.storeList = response.data;
      });
    },
    findActStorePer() {
      storeApi.findActStore().then((response) => {
        this.actStoreList = [];
        this.actStoreList = response.data;
      });
    },
  },
};
</script>
