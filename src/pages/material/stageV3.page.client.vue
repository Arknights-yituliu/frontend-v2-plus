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
          <!--          <div id="upStageKey" class="op_tag_0" @click="showNowActive()">只显示up</div>-->
          <!--          <div id="orundumStageKey" class="op_tag_0" @click="showOrundumPopup()">搓玉版</div>-->
          <!--          <div id="historyStageKey" class="op_tag_0" @click="showHistoryPopup()">往期活动效率</div>-->

          <div class="tab_text">*点击卡片查看详情</div>
        </div>
        <div class="op_title_tag" style="height: 24px">
          <div class="tab_text">
            <!-- *更新时间{{stageActHistory}} -->
            <!--            *更新时间 {{ updateTime }}-->
          </div>
        </div>
      </div>

      <div id="stage_3">
        <div class="stage_card_3" v-for="(stage, index) in item_card_data" :key="index"
            @click="getItemTableData(index)">
            <!-- 长期最优 -->
            <div class="stage_card_3_left">
              <div class="img_wrap" style="position: relative;">
                <div class="stage_card_3_mainImg" :class="getSpriteImg(stage.series.r3, 't3')"
                  style="transform: scale(1);">
                  <!-- <img :src="`/image/items/${stage.series.r3}.png`" alt="" style="height: 96px"> -->
                  <div class="stage_card_3_cover"></div>
                  <div class="stage_card_3_best">
                    <div class="stage_card_3_best_chapter">第九章</div>
                    {{ stage.maxEfficiencyStage.stage_code }}
                    <div class="stage_card_3_markText_l">综合最优</div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 短期最优 -->
            <div class="stage_card_3_right">
              <div class="stage_card_3_list">
                <div class="stage_card_3_line">
                  <div class="stage_card_3_line_text">{{ stage.leT5MaxEfficiencyStage.stage_code }}</div>
                  <div class="stage_card_3_line_text">65%</div>
                  <div class="stage_card_3_img"><img :src="`/image/items/${stage.series.r4}.png`" alt=""
                      style="height: 32px"></div>
                </div>
                <div class="stage_card_3_line">
                  <div class="stage_card_3_line_text">{{ stage.leT4MaxEfficiencyStage.stage_code }}</div>
                  <div class="stage_card_3_line_text">55%</div>
                  <div class="stage_card_3_img"><img :src="`/image/items/${stage.series.r3}.png`" alt=""
                      style="height: 32px"></div>
                </div>
                <div class="stage_card_3_line" v-show="stage.series.r2">
                  <div class="stage_card_3_line_text">{{ stage.leT3MaxEfficiencyStage.stage_code }}</div>
                  <div class="stage_card_3_line_text">45%</div>
                  <div class="stage_card_3_img"><img :src="`/image/items/${stage.series.r2}.png`" alt=""
                      style="height: 32px"></div>

                </div>
              </div>
              <div class="stage_card_3_markText">短期最优</div>
            </div>
        </div>
        <div class="stage_card_3 " v-for="(times, index) in 4" style="height: 0px; margin-bottom: 0px;opacity: 0;">
        </div>
      </div>

      <table class="stage_detail_table_3">
        <tr>
          <td style="width: 150px;">
            关卡名
          </td>
          <td>
            主掉落物
          </td>
          <td>
            副掉落物
          </td>
          <td>
            t4效率
          </td>
          <td>
            t3效率
          </td>
          <td>
            t2效率
          </td>
          <td>
            总效率
          </td>
          <td>
            spm
          </td>
        </tr>
        <tr v-for="(stage, index) in current_page_data" :key="index">
          <td>
            <div> {{ stage.stageCode }} </div>
            <div class="zone_name"> {{ stage.zoneName }} </div>
            <!--            <div class="zone_name"> {{ stage.stageId.indexOf("LMD")>0?'计入商店龙门币':'' }} </div>-->
          </td>
          <td>
            <img :src="`/image/items/${stage.itemId}.png`" alt="" style="height: 36px">
          </td>
          <td>
            <img :src="`/image/items/${stage.secondaryItemId}.png`" alt="" style="height: 36px">
          </td>

          <td>
            {{ formatNumber(stage.leT5Efficiency * 100, 1) }}%
          </td>
          <td>
            {{ formatNumber(stage.leT4Efficiency * 100, 1) }}%
          </td>
          <td>
            {{ formatNumber(stage.leT3Efficiency * 100, 1) }}%
          </td>
          <td>
            {{ formatNumber(stage.stageEfficiency * 100, 1) }}%
          </td>
          <td>
            {{ formatNumber(stage.spm, 2) }}
          </td>
        </tr>
      </table>

      <div style="display: flex;justify-content: center">
        <div style="margin: 12px"> page to</div>
        <div @click="currentPage(index - 1)" style="margin: 12px" v-for="index in page_count" :key="index">{{ index }}
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import stageApi from '/src/api/stage'
import { onMounted, ref } from "vue";
import item_series from '/src/static/json/item_series.json'
import stage_api_data from '/src/static/json/stage_api_data.v2.json'

let stage_result_group = ref(stage_api_data.data.recommendedStage)

let item_card_data = ref([])

let nowTimeStamp = new Date().getTime();


// stageApi.getStageResultGroupByItemSeries(0.625,300).then(response=>{
//        stage_result_group.value = response.data.recommendedStage
//        getItemCardData()
//        getItemTableData(8)
// })

function getItemCardData() {
  for (let index in stage_result_group.value) {
    let recommended_stage = stage_result_group.value[index]

    let stage_result_list = recommended_stage.stageResultList;
    const item_recommend_stage = {
      maxEfficiencyStage: getStageCode(stage_result_list, 'stageEfficiency'),
      leT5MaxEfficiencyStage: getStageCode(stage_result_list, 'leT5Efficiency'),
      leT4MaxEfficiencyStage: getStageCode(stage_result_list, 'leT4Efficiency'),
      leT3MaxEfficiencyStage: getStageCode(stage_result_list, 'leT3Efficiency'),
      series: { r4: '', r3: '', r2: '', r1: '' }
    }

    item_recommend_stage.series = item_series[recommended_stage.itemSeriesId]

    item_card_data.value.push(item_recommend_stage)
    // console.log(item_recommend_stage)
  }
}

function getStageCode(stageList, property) {
  stageList.sort((a, b) => {
    return b[property] - a[property]
  })
  for (const index in stageList) {
    const stage = stageList[index]
    if (stage.endTime < nowTimeStamp) continue;
    return {
      stage_code: stage.stageCode,
    }
  }
}


let stage_result_by_item_id = ref([])
let current_page_data = ref([])
let page_size = ref(10);
let page_count = ref(0)

function currentPage(page_num) {
  page_num = page_num * page_size.value
  current_page_data.value = []
  for (let i = page_num; i < stage_result_by_item_id.value.length; i++) {
    if (i > page_num + page_size.value) break;
    current_page_data.value.push(stage_result_by_item_id.value[i])
  }
}

function getPageCount() {
  page_count.value = parseInt((stage_result_by_item_id.value.length / page_size.value).toString()) + 1
}

function getItemTableData(index) {
  let recommended_stage = stage_result_group.value[index];
  console.log(recommended_stage)
  let stage_result_list = recommended_stage.stageResultList;

  let table_data = []
  for (const index in stage_result_list) {
    let stage_result = stage_result_list[index];
    // const element = {
    //   stageCode: stage_result.stageCode,
    //   itemId: stage_result.itemId,
    //   secondaryItemId: stage_result.secondaryItemId,
    //   leT5Efficiency: stage_result.leT5Efficiency,
    //   leT4Efficiency: stage_result.leT4Efficiency,
    //   leT3Efficiency: stage_result.leT3Efficiency,
    //   stageEfficiency:stage_result.stageEfficiency,
    //   endTime:stage_result.endTime
    // }
    table_data.push(stage_result)
  }

  stage_result_by_item_id.value = table_data.sort((a, b) => b.stageEfficiency - a.stageEfficiency)
  console.log(stage_result_by_item_id.value)

  getPageCount()
  currentPage(0)
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
  return parseFloat(num).toFixed(acc);
}


onMounted(() => {
  getItemCardData()
  getItemTableData(8)
  // currentPage(1)
})

// for(let id in item_series){
//   item_series[id] =  {
//     t4:id.substring(0,4)+'4',
//     t3:id.substring(0,4)+'3',
//     t2:id.substring(0,4)+'2',
//     t1:id.substring(0,4)+'1',
//   }
// }
</script>