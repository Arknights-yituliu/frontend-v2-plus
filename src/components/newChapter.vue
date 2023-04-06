<template>
  <!-- <div style="display: none;"> -->
  <div>
    <!-- 地图效率Start -->
    <div id="newChapter">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">新章数据一览</div>
          <div :class="opETextTheme">New Chapter</div>
        </div>
        <div class="op_title_tag" style="height: 28px">
          <div class="tab_text">
            <!-- *更新时间{{stageActHistory}} -->
            *更新时间 {{ updateTime }}
          </div>
        </div>
      </div>
      <!-- <div class="op_warning">
        新章节开放期间样本量阈值临时下调，刷图时请注意甄别<br>
        小样活动约可提供25%额外效率
      </div> -->
      <!-- 头图 -->
      <!-- <div> -->
      <a id="ep12_pic" href="/ep12" style="margin: 4px 4px 0 4px; text-align: center">
        <img
          src="/img/temp/ep12.webp"
          style="width: 300px; display: block; margin: auto; border-radius: 12px"
          alt="ep12"
        />
      </a>
      <!-- </div> -->
      <div class="ep12_content" style="display: flex; flex-wrap: wrap">
        <div class="ep12_half" id="ep12_left" v-for="r in [0, 1]" :key="r">
          <table class="popup_table">
            <tbody>
              <tr class="popup_table_title">
                <td class="popup_table_c1" style="width: 55px; width: 65px">关卡名</td>
                <td class="popup_table_c2" style="width: 65px; width: 75px">主产物</td>
                <td class="popup_table_c4" style="width: 50px; width: 60px">样本数</td>
                <td class="popup_table_c5" style="width: 80px; width: 90px">置信度</td>
                <td class="popup_table_c6" style="width: 80px; width: 90px">SPM</td>
                <td class="popup_table_c7" style="width: 70px; width: 80px">关卡效率</td>
                <!-- <td class="popup_table_c7" style="width:64px;">小样提升<br>(理论值)</td> -->
              </tr>
              <!-- <tr
                v-for="(stage, index) in newChapter"
                :key="index"
                :class="getColor(stage.stageColor)"
                class="stage_table_r"
              >
                <td class="popup_table_c1" :style="getHardcoreMark(stage.chapterName)">
                  {{ stage.stageCode }}
                </td>
                <td class="popup_table_c2" style="font-size: 14px">
                  {{ shrinkTimes(stage.sampleSize) }}<br />({{ stage.sampleConfidence }}%)
                </td>
                <td class="popup_table_c3">{{ getEfficiency(stage.spm, 1) }}</td>
                <td style="padding-left: 20px">
                  <div :class="getSpriteImg(stage.secondaryId, 'sec')"></div>
                </td>
                <td class="popup_table_c5">{{ getEfficiency(stage.knockRating * 100, 1) }}%</td>
                <td class="popup_table_c6">
                  {{ getEfficiency(stage.apExpect) }}
                </td>
                <td class="popup_table_c7" :style="getUpMark(stage.stageState)">
                  {{ getEfficiency(stage.stageEfficiency, 1) }}%
                </td>
              </tr> -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- 地图效率End -->
  </div>
</template>

<script>
import stageApi from "@/api/stage";
import cookie from "js-cookie";
import { usePageContext } from "@/renderer/usePageContext";
// import stageJson from "static/json-video/stage.json";
export default {
  setup() {
    const pageContext = usePageContext();
    return { pageContext };
  },
  data() {
    return {
      popupData: [], //关卡弹窗用集合
      // stageRankT3: stageJson.data, //关卡效率集合
      stageRankT3: this.pageContext.pageProps.t3, //关卡效率集合
      stageRankT2: this.pageContext.pageProps.t2, //关卡效率集合
      stageRankOrundum: this.pageContext.pageProps.orundum, //关卡效率集合
      stageActHistory: this.pageContext.pageProps.closed,
      newChapter: this.pageContext.pageProps.newChapter,
      actStageOnly: 0,
      cardList: [0, 1, 2, 3, 4, 5, 6, 7],
      itemType: "",
      updateTime: this.pageContext.pageProps.t3[0][0].updateTime,
      itemId: "",
      opETextTheme: "op_title_etext_light",
      stageVersion: 0.625,
    };
  },
  mounted() {
    // this.getStageResultDateT3();
    // this.getStageResultDateT2();
    // this.getStageResultDateOrundum();
    // this.getStageResultDateClosed();
    this.getRoute();
    cookie.set("updateTime", this.updateTime, { expires: 30 });
  },
  methods: {
    getCookies() {
      let theme = cookie.get("theme");
      if (typeof theme == "undefined" || theme === undefined) {
        theme = "op_title_etext_light";
      }
      //  console.log('stage',theme);
      this.opETextTheme = "op_title_etext_" + theme;
    },
    sleep(d) {
      return new Promise((resolve) => setTimeout(resolve, d));
    },
    async getRoute() {
      const item = this.pageContext.urlParsed.search.item;
      if (item !== undefined) console.log("要展示的材料：", item);
      for (let i = 0; i < 40; i++) {
        await this.sleep(500);
        if (this.stageRankT3.length > 5) {
          if ("全新装置" === item) this.showPopup(0);
          if ("异铁组" === item) this.showPopup(1);
          if ("轻锰矿" === item) this.showPopup(2);
          if ("凝胶" === item) this.showPopup(3);
          if ("扭转醇" === item) this.showPopup(4);
          if ("酮凝集组" === item) this.showPopup(5);
          if ("RMA70-12" === item) this.showPopup(6);
          if ("炽合金" === item) this.showPopup(7);
          if ("研磨石" === item) this.showPopup(8);
          if ("糖组" === item) this.showPopup(9);
          if ("聚酸酯组" === item) this.showPopup(10);
          if ("晶体元件" === item) this.showPopup(11);
          if ("固源岩组" === item) this.showPopup(12);
          if ("半自然溶剂" === item) this.showPopup(13);
          if ("化合切削液" === item) this.showPopup(14);
          if ("转质盐组" === item) this.showPopup(15);
          if ("Orundum" === item) this.showOrundumPopup();
          break;
        }
      }
    },
    showPopup(index) {
      document.getElementById("popup_card").style.display = "block";
      document.getElementById("popup_background").style.display = "block";
      document.getElementById("popup_content").style.display = "block";
      if (index < 100) {
        this.popupData = [];
        this.popupData = this.stageRankT3[index];
        this.itemType = this.stageRankT3[index][0].itemType;
        this.itemId = this.stageRankT3[index][0].itemId;
      } else {
        this.popupData = [];
        this.popupData = this.stageRankT2[index - 100];
        console.log(this.stageRankT2[index - 100][0].itemType);
        this.itemType = this.stageRankT2[index - 100][0].itemType;
        if (this.itemType === "全新装置") this.itemType = "装置";
        if (this.itemType === "聚酸酯组") this.itemType = "聚酸酯";
        if (this.itemType === "固源岩组") this.itemType = "固源岩";
        if (this.itemType === "异铁组") this.itemType = "异铁";
        if (this.itemType === "糖组") this.itemType = "糖";
        if (this.itemType === "酮凝集组") this.itemType = "酮凝集";
        this.itemId = this.stageRankT2[index - 100][0].itemId;
      }
    },
    showOrundumPopup() {
      document.getElementById("popup_card_orundum").style.display = "block";
      document.getElementById("popup_background").style.display = "block";
      document.getElementById("popup_content").style.display = "block";
    },
    showHistoryPopup() {
      document.getElementById("popup_card_history").style.display = "block";
      document.getElementById("popup_background").style.display = "block";
      document.getElementById("popup_content").style.display = "block";
    },
    hidePopup() {
      document.getElementById("popup_card").style.display = "none";
      document.getElementById("popup_card_orundum").style.display = "none";
      document.getElementById("popup_card_history").style.display = "none";
      document.getElementById("popup_background").style.display = "none";
      document.getElementById("popup_content").style.display = "none";
    },
    getPenguinUrl(num) {
      return "https://penguin-stats.cn/result/item/" + num;
    },
    getSpriteImg(id, index) {
      if (id === "30012" && index !== "t2") id = "30013";
      if (index === "type") return "bg-" + id + "large" + " sprite_type";
      if (index === "sec") return "bg-" + id + " sprite_secondary";
      if (index === "title") return "bg-" + id + " sprite_title";
      if (index === 3) return "bg-" + id + " sprite_secondary_dialog";
      if (index === 4) return "bg-" + id + "_icon sprite_icon";
      if (index === 5) return "bg-" + id + "_icon sprite_icon_small";
      if (index === 6) return "bg-" + id + "_icon sprite_icon_up";
      if (index === 7) return "bg-" + id + "_icon sprite_icon_el";
      if (index === "t2") return "bg-" + id + " sprite_T2";
      return "bg-" + id;
    },
    getImgUrl(img, source) {
      source = typeof source !== "undefined" ? type : 1;
      if (source > 2.1) return "https://image.yituliu.site/ activity_picture /" + img + ".png";
      if (source > 1.1) return "https://image.yituliu.site/item/" + img + ".png";
      else if (source > 0.1) return "/img/materials/" + img + ".png";
      else return "https://cdn.jsdelivr.net/gh/zirun-wang/OnePicCDN/img/" + img + ".png";
    },
    getCardBackground(url) {
      return "background: linear-gradient(rgba(144, 164, 174, 0), rgba(144, 164, 174, 0)), url(https://yygh-atbriup.oss-cn-beijing.aliyuncs.com/sprite/mix.png) no-repeat 85% 50% /100%;margin-left:-32px";
    },
    getEfficiency(num, acc) {
      acc = typeof acc !== "undefined" ? acc : 2;
      return parseFloat(num).toFixed(acc);
    },
    getBoxEfficiency(state, effex, eff) {
      if (state === 3)
        // return effex
        return "+" + (effex - eff).toFixed(0).toString() + "%";
      else if (state === 4) return "样本少";
      else return "无小样";
    },
    shrinkTimes(times) {
      if (times > 9999) return "9999+";
      else return times;
    },
    getCardId(num) {
      return "stage_card" + num.toString();
    },
    getDialogId(num) {
      return "detail_card" + num.toString();
    },
    getHardcoreMark(area) {
      if (area === "tough_10") return "background: url(" + "/static/img_website/hcbg.png" + ") no-repeat;";
      else return "";
    },
    getUpMark(state) {
      if (state === "1")
        return "background: linear-gradient(#ffffff4a, rgba(144, 164, 174, 0)), url(/img/website/up.png) 106% 50% / 30% no-repeat;";
      else return "";
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
    getFontSize(eff) {
      if (eff > 99) return "font-size:20px;";
      else return "font-size:16px;font-weight:500;";
    },
    getTimesColor(times) {
      if (times < 1000) return "color_t6 fb";
      else if (times < 2000) return "color_t6";
      else return "";
    },
    judgeActive(index) {
      if (this.stageRankT3[index][0].stageState > 0.1) return "";
      return "display:none";
    },
    showNowActive() {
      if (this.actStageOnly % 2 === 0) {
        document.getElementById("stage_t3_content_plus").style.display = "flex";
        document.getElementById("stage_t3_content").style.display = "none";
        document.getElementById("nowActStageKey").className = "op_tag_1";
      } else {
        document.getElementById("stage_t3_content").style.display = "flex";
        document.getElementById("stage_t3_content_plus").style.display = "none";
        document.getElementById("nowActStageKey").className = "op_tag_0";
      }
      this.actStageOnly++;
    },
    getStageResultDateT3() {
      stageApi.findStageDateByTypeOrderByEfficiencyDesc(this.stageVersion).then((response) => {
        this.stageRankT3 = [];
        this.stageRankT3 = response.data;
        this.updateTime = response.data[0][0].updateTime;
        cookie.set("updateTime", this.updateTime, { expires: 30 });
        // this.$message({
        //       message: '切换成功' ,
        //       type: "success",
        //       showClose: true,
        //       duration: 2000,
        //     });
      });
    },
    getStageResultDateT2() {
      stageApi.findStageDateByMainOrderByExpectDesc(this.stageVersion).then((response) => {
        this.stageRankT2 = [];
        this.stageRankT2 = response.data;
      });
    },
    getStageResultDateOrundum() {
      stageApi.findStageDataOfOrundum().then((response) => {
        this.stageRankOrundum = [];
        this.stageRankOrundum = response.data;
      });
    },
    getStageResultDateClosed() {
      stageApi.findClosedActivStageByStageId(this.stageVersion).then((response) => {
        this.stageActHistory = [];
        this.stageActHistory = response.data;
      });
    },
  },
};
</script>

<style scoped>
.el-divider--horizontal {
  margin: 6px 0;
}
.ep12_half {
  margin-top: 8px;
  display: flex;
  flex: 1;
  max-width: 720px;
  min-width: 360px;
  justify-content: space-around;
  border: 1px solid #000000;
}
</style>
