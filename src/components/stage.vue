<template>
  <div>
    <!-- 地图效率Start -->
    <div id="stage">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">地图效率</div>
          <div class="op_title_etext_light">Best Stages</div>
        </div>
        <div class="op_title_tag">
          <div id="upStageKey" class="op_tag_0" @click="showNowActive()">只显示up</div>
          <div id="orundumStageKey" class="op_tag_0" @click="showOrundumPopup()">搓玉版</div>
          <div id="historyStageKey" class="op_tag_0" @click="showHistoryPopup()">往期活动效率</div>

          <div class="tab_text">*点击卡片查看详情</div>
        </div>
        <div class="op_title_tag" style="height: 24px">
          <div class="tab_text">
            <!-- *更新时间{{stageActHistory}} -->
            *更新时间 {{ updateTime }}
          </div>
        </div>
      </div>
      <!-- <div class="op_warning">
        新章节开放期间样本量阈值临时下调至300，刷图时请注意甄别<br>
        小样活动约可提供25%的效率1
      </div> -->
      <!-- <div class="stage_hint">
        <div class="stage_hint_t5">
          30日嘉年华会有实体卡片发放，详情请关注
          <a style="text-decoration: none" href="https://space.bilibili.com/688411531/">'罗德岛基建BETA'</a>
          动态
        </div>
      </div> -->
      <div class="stage_hint">
        <div class="stage_hint_t5">橙：双最优</div>
        <div class="stage_hint_t4">紫：效率最高(长期最优)</div>
        <div class="stage_hint_t2">绿：期望最低(短期最优)</div>
        <div class="stage_hint_t0">红：计算了无限龙门币</div>
      </div>
      <!-- <div class="stage_hint">
        <div class="stage_hint_t5">
          当前企鹅物流CF-7数据有污染，正在等待修复，请谨慎参考
        </div>
      </div> -->
      <!-- t3内容区域 -->
      <div class="op_content" id="stage_t3_content">
        <!-- 基础卡 -->
        <div v-for="(materialRankT3, indexAll) in stageRankT3" :key="indexAll" class="stage_card_t3 uni_shadow_2"
             @click="showPopup(indexAll)">
          <!-- <div v-show="materialRankT3[0].itemType=='兽之泪'"  class="stage_card_t3_img" :style="getCardBackground(materialRankT3[1].itemType)"></div>  -->
          <div class="stage_sprite_t3_wrap">
            <div :class="getSpriteImg(materialRankT3[0].itemId, 't3')"></div>
          </div>

          <div class="stage_card_t3_table">
            <table>
              <tbody>
              <tr
                  :class="getColor(stage.stageColor)"
                  class="stage_table_r"
                  :style="getFontSize(stage.stageEfficiency)"
                  v-for="(stage, index) in materialRankT3.slice(0, 3)"
                  :key="index"
              >
                <td class="stage_table_c1">{{ stage.stageCode }}</td>
                <!-- <td> <div v-show="stage.stageId.indexOf('perm')!=-1" style='font-size: 12px;line-height:12px;'> 常 <br> 驻 </div></td> -->
                <!-- <td class="stage_table_c2" ><img class="stage_img_secondary" :src="getImgUrl(stage.secondary)" alt=""></td> -->
                <td>
                  <div class="stage_sprite_sec_wrap">
                    <div :class="getSpriteImg(stage.secondaryId, 'sec')"></div>
                  </div>
                </td>
                <td class="stage_table_c3">{{ formatNumber(stage.stageEfficiency, 1) }}%</td>
                <!-- <td class="stage_table_c4"><img v-show="stage.stageId.indexOf('perm')==-1" src="/image/icon/up.png" alt=""></td> -->
              </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- 排版占位用卡片 -->
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
      </div>
      <!-- 扩展卡 -->
      <div class="op_content" id="stage_t3_content_plus" style="display: none">
        <div
            v-for="(materialRankT3, index) in stageRankT3"
            :key="index"
            class="stage_card_t3 uni_shadow_2"
            :style="judgeActive(index)"
            @click="showPopup(index)"
        >
          <div class="stage_sprite_t3_wrap">
            <div :class="getSpriteImg(materialRankT3[0].itemId, 't3')"></div>
          </div>

          <div class="stage_card_t3_table">
            <table>
              <tbody>
              <tr
                  :class="getColor(stage.stageColor)"
                  class="stage_table_r"
                  :style="getFontSize(stage.stageEfficiency)"
                  v-for="(stage, index) in materialRankT3.slice(0, 6)"
                  :key="index"
              >
                <td class="stage_table_c1">{{ stage.stageCode }}</td>
                <!-- <td class="stage_table_c2" ><img class="stage_img_secondary" :src="getImgUrl(stage.secondary)" alt=""></td> -->
                <td>
                  <div class="stage_sprite_sec_wrap">
                    <div :class="getSpriteImg(stage.secondaryId, 'sec')"></div>
                  </div>
                </td>
                <td class="stage_table_c3">{{ formatNumber(stage.stageEfficiency, 1) }}%</td>
                <!-- <td class="stage_table_c4">{{getBoxEfficiency(stage.stageState, stage.stageEfficiencyEx, stage.stageEfficiency)}}</td> -->
              </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- 排版占位用卡片 -->
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
        <el-card class="stage_card_t3" style="height: 0px; margin-bottom: 0px"></el-card>
      </div>
      <!-- t2内容区域 -->
      <div class="op_content" id="stage_t2_content">
        <div class="stage_card_t2 uni_shadow_2">
          <div v-for="(materialRankT2, index) in stageRankT2.slice(0, 6)" :key="index" class="stage_card_t2_img"
               @click="showPopup(index + 100)">
            <div class="stage_sprite_t3_wrap">
              <div :class="getSpriteImg(materialRankT2[0].itemId, 't2')"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 地图效率End -->

    <!-- 弹窗Start -->
    <div id="popup_background" @click="hidePopup()"></div>
    <div id="popup_content">
      <!-- 散装标题Start -->
      <div class="popup_card" id="popup_card">
        <div class="popup_header">
          <div class="stage_sprite_popup_wrap">
            <div :class="getSpriteImg(itemId, 'popup')"></div>
          </div>

          <div class="popup_header_text">{{ itemType }}</div>

          <a :href="getPenguinUrl(itemId)" class="t3 popup_header_penguin">
            <div>查看企鹅物流原始数据</div>
            <div :class="getSpriteImg('el', 'el')"></div>
          </a>
        </div>
        <!-- 散装标题End -->
        <el-divider></el-divider>
        <!-- 数据表Start -->
        <table class="popup_table">
          <tbody>
          <tr class="popup_table_title">
            <td class="popup_table_c1" style="width: 55px; width: 65px">关卡名</td>
            <td class="popup_table_c2" style="width: 65px; width: 75px">样本数<br/>(置信度)</td>
            <td class="popup_table_c3" style="width: 40px; width: 50px">SPM</td>
            <td class="popup_table_c4" style="width: 50px; width: 60px" colspan="1">副产品</td>
            <!-- <td class="popup_table_c5" style="width: 80px; width: 90px">主产物掉率</td> -->
            <!-- <td class="popup_table_c6" style="width: 80px; width: 90px">主产物期望</td> -->
            <td class="popup_table_c7" style="width: 70px; width: 80px">总效率</td>
            <td class="popup_table_c7" style="width: 70px; width: 80px">T4效率</td>
            <td class="popup_table_c7" style="width: 70px; width: 80px">T3效率</td>
            <!-- <td class="popup_table_c7" style="width:64px;">小样提升<br>(理论值)</td> -->
          </tr>
          <tr v-for="(stage, index) in popupData.slice(0,7)" :key="index" :class="getColor(stage.stageColor)"
              class="stage_table_r">
            <td class="popup_table_c1" :style="getHardcoreMark(stage.chapterName)">
              {{ stage.stageCode }}
            </td>
            <td class="popup_table_c2" style="font-size: 14px">{{shrinkTimes(stage.sampleSize)
              }}<br/>({{ formatNumber(stage.sampleConfidence,1) }}%)
            </td>
            <td class="popup_table_c3">{{ formatNumber(stage.spm, 1) }}</td>
            <!-- <td class="popup_table_c4" ><img class="stage_img_secondary" :src="getImgUrl(stage.secondary)" alt=""></td> -->
            <td style="padding-left: 20px">
              <div class="stage_sprite_sec_wrap">
                <div :class="getSpriteImg(stage.secondaryId, 'sec')"></div>
              </div>
            </td>
            <!-- <td style="padding-left: 20px;" >
                <div v-show="stage.stageId.indexOf('perm')==-1" :class="getSpriteImg('ap_supply_lt_010', 'sec')"></div>
            </td> -->
            <!-- <td class="popup_table_c5">{{ getEfficiency(stage.knockRating * 100, 1) }}%</td>
            <td class="popup_table_c6">
              {{ getEfficiency(stage.apExpect) }}
            </td> -->
            <td class="popup_table_c7">{{ formatNumber(stage.stageEfficiency, 1) }}%</td>
            <td class="popup_table_c7">{{ formatNumber(stage.leT5Efficiency, 1) }}%</td>
            <td class="popup_table_c7">{{ formatNumber(stage.leT4Efficiency, 1) }}%</td>
            <!-- <td class="popup_table_c7">{{getBoxEfficiency(stage.stageState, stage.stageEfficiencyEx, stage.stageEfficiency)}}</td> -->
          </tr>
          </tbody>
        </table>
        <!-- 数据表End -->
        <el-divider></el-divider>
        <div class="popup_text f12">
          <div class="popup_item">效率基准:<b>常驻图</b>中综合效率最高者</div>
          <div class="popup_item">
            置信度:掉率对关卡效率误差影响在3%前提下的可信度范围&emsp;
            <a href="https://www.bilibili.com/video/BV1yL4y1P7K1">
              <div style="display: flex">
                详细介绍
                <div :class="getSpriteImg('el', 'el')"></div>
              </div>
            </a>
          </div>
          <div class="popup_item">SPM:假设敌人被秒杀，1倍速下每分钟消耗的理智量，实际可能略有出入</div>
          <div class="popup_item">总效率:<b>所有产物</b>的价值之和占理智消耗的比例</div>
          <div class="popup_item">T4效率:<b>紫材料+蓝材料+绿材料+白材料</b>的价值之和占理智消耗的比例</div>
          <div class="popup_item">T3效率:<b>蓝材料+绿材料+白材料</b>的价值之和占理智消耗的比例</div>
          <div class="popup_item">例如:糖系T4效率=(糖聚块价值+糖组价值+糖价值+代糖价值)/理智消耗</div>
        </div>
      </div>
      <!-- 搓玉 -->
      <div class="popup_card" id="popup_card_orundum">
        <!-- 数据表Start -->
        <table class="popup_table" style="padding-top: 6px">
          <tbody style="font-size: 20px">
          <tr class="popup_table_title" style="height: 36px">
            <td class="popup_table_c1" style="width: 85px">关卡名</td>
            <td class="popup_table_c2" style="width: 120px">每理智可搓玉</td>
            <td class="popup_table_c3" style="width: 120px">每搓1抽消耗</td>
            <td class="popup_table_c5" style="width: 95px">关卡效率</td>
            <td class="popup_table_c6" style="width: 95px">搓玉效率</td>
          </tr>
          </tbody>
        </table>
        <el-divider></el-divider>
        <div style="height: 550px; overflow: auto; margin-top: -6px">
          <table class="popup_table">
            <tbody style="font-size: 20px; vertical-align: baseline">
            <tr
                style="height: 36px"
                v-for="(stage, index) in stageRankOrundum"
                :key="index"
                :class="getColor(stage.stageEfficiency, 90, 20)"
                class="stage_table_r"
            >
              <td class="popup_table_c1" style="width: 85px">
                {{ stage.stageCode }}
              </td>
              <td class="popup_orundum_c2" style="width: 120px">
                <!-- <div>1</div> -->
                <!-- <div :class="getSpriteImg('AP_GAMEPLAY', 5)" ></div> -->
                <div>{{ formatNumber(stage.orundumPerAp) }}</div>
                <div style="margin-bottom: -15px" :class="getSpriteImg(4003, 'icon_small')"></div>
              </td>
              <td class="popup_orundum_c3" style="width: 120px">
                <div>{{ formatNumber(stage.lmdcost) }}w</div>
                <div style="margin-bottom: -8px" :class="getSpriteImg(4001, 'icon_small')"></div>
              </td>
              <td class="popup_table_c5" style="width: 95px">{{ formatNumber(stage.stageEfficiency) }}%</td>
              <td class="popup_table_c6" style="width: 95px">{{ formatNumber(stage.orundumPerApEfficiency) }}%</td>
            </tr>
            </tbody>
          </table>
        </div>
        <!-- 数据表End -->
        <el-divider></el-divider>
        <div class="popup_text f12 t1">
          关卡效率:该关卡掉落物价值之和与理智消耗之比，颜色用于区分数值大小<br/>
          搓玉效率:该关卡的转化率与无加成1-7的转化率之比
        </div>
      </div>
      <!-- 往期活动 -->
      <div id="popup_card_history">
        <div v-for="(closedAct, index) in stageActHistory" :key="index" class="popup_card">
          <div v-show="closedAct[0].zoneName != null" class="history_actName">
            {{ closedAct[0].zoneName }}
          </div>
          <div v-show="closedAct[0].zoneName == null" class="history_actName">
            {{ closedAct[0].activityName }}
          </div>
          <div class="history_actStages">
            <div v-for="(stage, index) in closedAct" :key="index" class="history_stage">
              <div class="stage_sprite_closed_wrap">
                <div :class="getSpriteImg(stage.itemId, 'closed')"></div>
              </div>
              <div class="history_stage_table">{{ stage.stageCode }}<br/>{{ formatNumber(stage.stageEfficiency) }}%
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- </div> -->
      <!-- 弹窗End -->
    </div>
    <!-- 新卡片 -->
    <div id="stage_3" style="display: none;">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">地图效率</div>
          <div class="op_title_etext_light">Best Stages</div>
        </div>
        <div class="op_title_tag">
          <div id="upStageKey" class="op_tag_0" @click="showNowActive()">只显示up</div>
          <div id="orundumStageKey" class="op_tag_0" @click="showOrundumPopup()">搓玉版</div>
          <div id="historyStageKey" class="op_tag_0" @click="showHistoryPopup()">往期活动效率</div>

          <div class="tab_text">*点击卡片查看详情</div>
        </div>
        <div class="op_title_tag" style="height: 24px">
          <div class="tab_text">
            <!-- *更新时间{{stageActHistory}} -->
            *更新时间 {{ updateTime }}
          </div>
        </div>
      </div>
      <div class="op_content" id="stage_t3_content_3">
        <div class="stage_card_3">
          <div class="stage_card_3_left">
            <div class="stage_card_3_mainImg"></div>
            <div class="stage_card_3_best">9-10</div>
            <div class="stage_card_3_markText">长期最优</div>
          </div>
          <div class="stage_card_3_right">
            <div class="stage_card_3_list">
              <div class="stage_card_3_line">
                <div class="stage_card_3_line_text">9-10</div>
                <div class="stage_card_3_img"></div>
                <div class="stage_card_3_img"></div>
              </div>
              <div class="stage_card_3_line">

              </div>
              <div class="stage_card_3_line">

              </div>
            </div>
            <div class="stage_card_3_markText">短期最优</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import stageApi from "@/api/stage";
import cookie from "js-cookie";
import {usePageContext} from "@/renderer/usePageContext";

// import stageJson from "static/json-video/stage.json";

export default {
  setup() {
    const pageContext = usePageContext();
    return {pageContext};
  },
  data() {
    return {
      popupData: [], //弹窗展示数据
      // stageRankT3: stageJson.data, //关卡效率集合
      stageRankT3: this.pageContext.pageProps.t3, //T3材料关卡推荐数据
      stageRankT2: this.pageContext.pageProps.t2, //T2材料关卡推荐数据
      stageRankOrundum: this.pageContext.pageProps.orundum, //搓玉推荐关卡数据
      stageActHistory: this.pageContext.pageProps.closed, //历史关卡数据
      actStageOnly: 0,
      itemType: "",
      updateTime: this.pageContext.pageProps.t3[0][0].updateTime, //更新时间
      itemId: "",
      stageVersion: 0.625,
      popupRank: 3,
    };
  },
  mounted() {
    this.getUrlParm();
    cookie.set("updateTime", this.updateTime, {expires: 30});
  },
  methods: {

    sleep(d) {
      return new Promise((resolve) => setTimeout(resolve, d));
    },
    async getUrlParm() {
      const item = this.pageContext.urlParsed.search.item;
      if (item != undefined) console.log("要展示的材料：", item);

      for (const index in this.stageRankT3) {
        if (this.stageRankT3[index][0].itemType == item) {
          this.showPopup(index);
        }
      }

      if ("Orundum" === item) this.showOrundumPopup();

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
        this.popupRank = 3;
      } else {
        this.popupData = [];
        this.popupData = this.stageRankT2[index - 100];
        console.log(this.stageRankT2[index - 100][0].itemType);
        this.popupRank = 2;
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

    getSpriteImg(id, type) {
      if (id === "30012" && type === "t3") id = "30013";
      if (id === "30012" && this.popupRank === 3 && "popup" === type) id = "30013";
      if ("t3" === type) return "bg-" + id + " stage_sprite_t3";
      if ("sec" === type) return "bg-" + id + " stage_sprite_sec";
      if ("t2" === type) return "bg-" + id + " stage_sprite_t2";
      if ("popup" === type) return "bg-" + id + " stage_sprite_popup";
      if ("closed" === type) return "bg-" + id + " stage_sprite_closed";
      if (type === "icon_small") return "bg-" + id + "_icon sprite_icon_small";
      if (type === "up") return "bg-" + id + "_icon sprite_icon_up";
      if (type === "el") return "bg-" + id + "_icon sprite_icon_el";

      // return "bg-" + id;
    },
    getImgUrl(img, source) {
      source = typeof source !== "undefined" ? source : 1;
      if (source > 2.1) return "/image/ activity_picture /" + img + ".png";
      if (source > 1.1) return "/image/item/" + img + ".png";
      else if (source > 0.1) return "/image/materials/" + img + ".png";
      else return "https://cdn.jsdelivr.net/gh/zirun-wang/OnePicCDN/image/" + img + ".png";
    },

    getCardBackground() {
      return "background: linear-gradient(rgba(144, 164, 174, 0), rgba(144, 164, 174, 0)), url(https://yygh-atbriup.oss-cn-beijing.aliyuncs.com/sprite/mix.png) no-repeat 85% 50% /100%;margin-left:-32px";
    },

    formatNumber(num, acc) {
      acc = typeof acc !== "undefined" ? acc : 2;
      num = num < 1.5 ? num * 100 : num;
      return parseFloat(num).toFixed(acc);
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
      if (state === "1") return "background: linear-gradient(#ffffff4a, rgba(144, 164, 174, 0)), url(/image/website/up.png) 106% 50% / 30% no-repeat;";
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
      let showFlag = false;
      for (let i = 0; i < this.stageRankT3[index][i].length > 3 ? 3 : this.stageRankT3[index][i].length; ++i) {
        if (this.stageRankT3[index][i].stageColor < 0) {
          showFlag = true;
          break;
        }
      }
      if (showFlag) return "";
      return "display:none";
    },
    showNowActive() {
      if (this.actStageOnly % 2 === 0) {
        document.getElementById("stage_t3_content_plus").style.display = "flex";
        document.getElementById("stage_t3_content").style.display = "none";
        document.getElementById("upStageKey").className = "op_tag_1";
      } else {
        document.getElementById("stage_t3_content").style.display = "flex";
        document.getElementById("stage_t3_content_plus").style.display = "none";
        document.getElementById("upStageKey").className = "op_tag_0";
      }
      this.actStageOnly++;
    },

    getStageResultDateT3() {
      stageApi.findStageDateByTypeOrderByEfficiencyDesc(this.stageVersion).then((response) => {
        this.stageRankT3 = [];
        this.stageRankT3 = response.data;
        this.updateTime = response.data[0][0].updateTime;
        cookie.set("updateTime", this.updateTime, {expires: 30});
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
</style>
