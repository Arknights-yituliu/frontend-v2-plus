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
             @click="showT3Popup(indexAll)">
          <div class="stage_sprite_t3_wrap">
            <div :class="getSpriteImg(materialRankT3.itemTypeId, 't3')"></div>
          </div>

          <div class="stage_card_t3_table">
            <table>
              <tbody>
              <tr
                  :class="getColor(stage.stageColor)"
                  class="stage_table_r"
                  :style="getFontSize(stage.stageEfficiency*100)"
                  v-for="(stage, index) in materialRankT3.stageResultList.slice(0, 3)"
                  :key="index"
              >
                <td class="stage_table_c1">{{ stage.stageCode }}</td>

                <td>
                  <div class="stage_sprite_sec_wrap">
                    <div :class="getSpriteImg(stage.secondaryItemId, 'sec')"></div>
                  </div>
                </td>
                <td class="stage_table_c3">{{ formatNumber(stage.stageEfficiency * 100, 1) }}%</td>

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
            @click="showT3Popup(index)"
        >
          <div class="stage_sprite_t3_wrap">
            <div :class="getSpriteImg(materialRankT3.itemTypeId, 't3')"></div>
          </div>

          <div class="stage_card_t3_table">
            <table>
              <tbody>
              <tr
                  :class="getColor(stage.stageColor)"
                  class="stage_table_r"
                  :style="getFontSize(stage.stageEfficiency*100)"
                  v-for="(stage, index) in materialRankT3.stageResultList.slice(0, 3)"
                  :key="index"
              >
                <td class="stage_table_c1">{{ stage.stageCode }}</td>

                <td>
                  <div class="stage_sprite_sec_wrap">
                    <div :class="getSpriteImg(stage.secondaryItemId, 'sec')"></div>
                  </div>
                </td>
                <td class="stage_table_c3">{{ formatNumber(stage.stageEfficiency * 100, 1) }}%</td>

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
               @click="showT2Popup(index)">
            <div class="stage_sprite_t3_wrap">
              <div :class="getSpriteImg(materialRankT2.itemTypeId, 't2')"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 地图效率End -->

    <!--    c-popup是一个自定义组件，位置在/src/custom/popup.vue里-->
    <!--    给:visible传入一个Boolean变量，通过改变变量来控制弹窗隐藏和展开，width可以控制宽度-->
    <!--    给:visible前面加上v-model可以接收弹窗隐藏后的返回值-->
    <!--    <template #header> </template> 是组件的头部-->
    <!--    <template #footer> </template> 是组件的尾部-->
    <c-popup v-model:visible="popup_t3" :width="'500px'" :height="'380px'">
      <template #header>
        <div class="popup_header_v2">
          <div class="stage_sprite_popup_wrap">
            <div :class="getSpriteImg(popupData.itemTypeId, 'popup')"></div>
          </div>
          <div class="popup_header_title_v2">{{ popupData.itemType }}</div>
          <a :href="getPenguinUrl(popupData.itemTypeId)" class="t3 popup_header_penguin">
            <div>查看企鹅物流原始数据</div>
            <div :class="getSpriteImg('el', 'el')"></div>
          </a>
        </div>
      </template>
      <table class="popup_table_v2">
        <tbody>
        <tr class="popup_table_title">
          <td class="popup_table_c1" style="width: 60px">关卡名</td>
          <td class="popup_table_c2" style="width: 60px">样本数<br/>(置信度)</td>
          <td class="popup_table_c3" style="width: 40px">SPM</td>
          <td class="popup_table_c4" style="width: 50px" colspan="1">副产品</td>
          <td class="popup_table_c5" style="width: 80px">主产物掉率</td>
          <td class="popup_table_c6" style="width: 80px">主产物期望</td>
          <!--            <td class="popup_table_c7" style="width: 70px; width: 80px">T4效率</td>-->
          <!--            <td class="popup_table_c7" style="width: 70px; width: 80px">T3效率</td>-->
          <td class="popup_table_c7" style="width: 70px">总效率</td>
        </tr>
        <tr v-for="(stage, index) in popupData.stageResultList" :key="index" :class="getColor(stage.stageColor)"
            class="stage_table_r">
          <td class="popup_table_c1">
            {{ stage.stageCode }}
          </td>
          <td class="popup_table_c2" style="font-size: 14px">{{shrinkTimes(stage.sampleSize)}}
            <br/>({{ formatNumber(stage.sampleConfidence, 1) }}%)
          </td>
          <td class="popup_table_c3">{{ formatNumber(stage.spm, 1) }}</td>
          <td style="padding-left: 20px">
            <div class="stage_sprite_sec_wrap">
              <div :class="getSpriteImg(stage.secondaryItemId, 'sec')"></div>
            </div>
          </td>
          <td class="popup_table_c5">{{ formatNumber(stage.knockRating * 100, 1) }}%</td>
          <td class="popup_table_c6">{{ formatNumber(stage.apExpect) }}</td>
          <!--            <td class="popup_table_c7">{{ formatNumber(stage.leT5Efficiency * 100, 1) }}%</td>-->
          <!--            <td class="popup_table_c7">{{ formatNumber(stage.leT4Efficiency * 100, 1) }}%</td>-->
          <td class="popup_table_c7">{{ formatNumber(stage.stageEfficiency * 100, 2) }}%</td>
        </tr>
        </tbody>
      </table>
      <!-- 数据表End -->

      <template #footer>
        <div class="popup_tip_v2">
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
          <!--          <div class="popup_item">T4效率:<b>紫材料+蓝材料+绿材料+白材料</b>的价值之和占理智消耗的比例</div>-->
          <!--          <div class="popup_item">T3效率:<b>蓝材料+绿材料+白材料</b>的价值之和占理智消耗的比例</div>-->
          <!--          <div class="popup_item">例如:糖系T4效率=(糖聚块价值+糖组价值+糖价值+代糖价值)/理智消耗</div>-->
        </div>
      </template>
    </c-popup>

<!--    搓玉-->
    <c-popup v-model:visible="popup_orundum" :width="'500px'" >
      <table class="popup_table" style="padding-top: 6px">
        <tbody style="font-size: 20px">
        <tr class="popup_table_title" style="height: 36px">
          <td class="popup_table_c1" style="width: 85px">关卡名</td>
          <td class="popup_table_c2" style="width: 80px">每理智可搓玉</td>
          <td class="popup_table_c3" style="width: 120px">每搓1抽消耗</td>
          <td class="popup_table_c5" style="width: 95px">关卡效率</td>
          <td class="popup_table_c6" style="width: 95px">搓玉效率</td>
        </tr>
        <tr
            style="height: 36px"
            v-for="(stage, index) in stageRankOrundum"
            :key="index"
            :class="getColor(stage.stageEfficiency*100, 90, 20)"
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
          <td class="popup_table_c5" style="width: 95px">{{ formatNumber(stage.stageEfficiency * 100) }}%</td>
          <td class="popup_table_c6" style="width: 95px">{{
              formatNumber(stage.orundumPerApEfficiency * 100)
            }}%
          </td>
        </tr>
        </tbody>
      </table>
    </c-popup>


    <c-popup v-model:visible="popup_act" :width="'500px'">
      <div v-for="(actStageVo, index) in stageActHistory" :key="index" class="popup_act_card">
        <div class="popup_act_card_left">

           {{ actStageVo.zoneName }}
<!--          <div> {{ actStageVo.endTime }}</div>-->
        </div>
        <div class="popup_act_stages">
          <div v-for="(stage, index) in actStageVo.actStageList" :key="index" class="history_stage">
            <div class="stage_sprite_closed_wrap">
              <div :class="getSpriteImg(stage.itemId, 'closed')"></div>
            </div>
            <div class="history_stage_table">{{ stage.stageCode }}<br/>{{
                formatNumber(stage.stageEfficiency * 100)
              }}%
            </div>
          </div>
        </div>
      </div>

    </c-popup>


  </div>
</template>
<script setup>
import {onMounted, ref} from 'vue'
import {usePageContext} from "@/renderer/usePageContext";

const pageContext = usePageContext();
let stageRankT3 = [];
const stageRankT2 = pageContext.pageProps.t2; //T2材料关卡推荐数据
const stageRankOrundum = pageContext.pageProps.orundum; //搓玉推荐关卡数据
const stageActHistory = pageContext.pageProps.closed; //历史关卡数据
let updateTime = pageContext.pageProps.t3.updateTime

if(pageContext.pageProps.t3.recommendedStageList){
  stageRankT3 = pageContext.pageProps.t3.recommendedStageList
}else {
  stageRankT3 = pageContext.pageProps.t3
}
let popupData = ref([])

async function getUrlParam() {
  const item = pageContext.urlParsed.search.item;
  if (typeof item === "undefined") return;
  for (const index in stageRankT3) {
    if (stageRankT3[index][0].itemType === item) {
      showT3Popup(index);
    }
  }
  if ("Orundum" === item) showOrundumPopup();
}

let popup_t3 = ref(false)

function showT3Popup(index) {
  popupData.value = [];
  popupData.value = stageRankT3[index];
  console.log("点击展开:", popup_t3.value)
  popup_t3.value = !popup_t3.value
}

function showT2Popup(index) {
  popupData.value = [];
  popupData.value = stageRankT2[index];
  popup_t3.value = !popup_t3.value
}

let popup_orundum = ref(false)

function showOrundumPopup() {
   popup_orundum.value = !popup_orundum.value
}

let popup_act = ref(false)

function showHistoryPopup() {
  popup_act.value = !popup_act.value
}

function getPenguinUrl(num) {
  return "https://penguin-stats.cn/result/item/" + num;
}

function shrinkTimes(times) {
  if (times > 9999) return "9999+";
  else return times;
}

function getSpriteImg(id, type) {
  // if (id === "30012" && type === "t3") id = "30013";
  // if (id === "30012" && this.popupRank === 3 && "popup" === type) id = "30013";
  if ("t3" === type) return "bg-" + id + " stage_sprite_t3";
  if ("sec" === type) return "bg-" + id + " stage_sprite_sec";
  if ("t2" === type) return "bg-" + id + " stage_sprite_t2";
  if ("popup" === type) return "bg-" + id + " stage_sprite_popup";
  if ("closed" === type) return "bg-" + id + " stage_sprite_closed";
  if (type === "icon_small") return "bg-" + id + "_icon sprite_icon_small";
  if (type === "up") return "bg-" + id + "_icon sprite_icon_up";
  if (type === "el") return "bg-" + id + "_icon sprite_icon_el";

  // return "bg-" + id;
}

function formatNumber(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  // num = num < 1.5 ? num * 100 : num;
  return parseFloat(num).toFixed(acc);
}

function getColor(color, dividing, tier) {
  tier = typeof tier !== "undefined" ? tier : 1;
  dividing = typeof dividing !== "undefined" ? dividing : 4;
  if (color < 0) return "color_t6";
  else if (color < dividing - 3 * tier) return "color_t1";
  else if (color < dividing - 2 * tier) return "color_t2";
  else if (color < dividing - 1 * tier) return "color_t3";
  else if (color < dividing) return "color_t4";
  else return "color_t5";
}

function getFontSize(eff) {
  if (eff > 99) return "font-size:20px;";
  else return "font-size:16px;font-weight:500;";
}

function judgeActive(index) {
  let showFlag = false;
  let stageResultList = stageRankT3[index].stageResultList
  let num = 0;
  for(let stageResult of stageResultList){
    if(stageResult.stageColor<0){
      showFlag = true;
    }
    if(num>3) break;
    num++
  }
  if (showFlag) return "";
  return "display:none";
}

let actStageOnly = 0;

function showNowActive() {
  if (actStageOnly % 2 === 0) {
    document.getElementById("stage_t3_content_plus").style.display = "flex";
    document.getElementById("stage_t3_content").style.display = "none";
    document.getElementById("upStageKey").className = "op_tag_1";
  } else {
    document.getElementById("stage_t3_content").style.display = "flex";
    document.getElementById("stage_t3_content_plus").style.display = "none";
    document.getElementById("upStageKey").className = "op_tag_0";
  }
  actStageOnly++;
}

onMounted(() => {
  getUrlParam()
})

</script>

<style scoped>


.popup_header_v2 {
  width: 100%;
  display: flex;
  border-bottom: var(--c-border);
  margin: auto auto 8px;

}

.popup_header_title_v2 {
  line-height: 66px;
  height: 66px;
  color: #3f51b5;
  width: 150px;
  font-size: 24px;
  font-weight: 600;
}

.popup_table_v2 {
  text-align: center;
  margin: auto;
}

.popup_tip_v2 {
  border-top: var(--c-border);
  color:var(--popup-text-fg);
  padding: 8px;
}

.popup_act_card{
  display: flex;
  align-items: center;
  margin: 8px 0;
  border-bottom: 1px solid #939393;
}

.popup_act_image{
  width: 150px;
}

.popup_act_card_left{
  width: 200px;
  text-align: center;
  font-size: 20px;
  color: var(--popup-history-act-name-fg);
  font-weight: 600;
  display: inline-block;
}


.popup_act_stages{
   display: flex;
}

</style>