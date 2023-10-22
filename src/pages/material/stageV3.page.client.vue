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
      <!-- 说明区域 -->
      <div id="stage_3_intro">
        <!-- 说明卡片1 -->
        <div class="stage_card_3">
          <!-- 长期最优 -->
          <div class="stage_card_3_left">
            <div class="img_wrap" style="position: relative;">
              <div class="stage_card_3_mainImg"  style="transform: scale(1);">
                <div class="stage_card_3_cover"></div>
                <div class="stage_card_3_best" style="font-size: 16px;">
                  <div class="stage_card_3_best_chapter">区域</div>
                  综合最优关卡
                  <div class="stage_card_3_markText_l">综合最优</div>
                </div>
              </div>
            </div>
          </div>
          <!-- 短期最优 -->
          <div class="stage_card_3_right">
            <div class="stage_card_3_list">
              <div class="stage_card_3_line">
                <div class="stage_card_3_line_text" style="font-size: 16px;">T4最优</div>
                <div class="stage_card_3_line_text" style="font-size: 16px;">T4效率 </div>
                <!-- <div class="stage_card_3_img"><img :src="`/image/items/${item_card_data[1].series.r4}.png`" alt=""
                    style="height: 32px"></div> -->
              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_line_text" style="font-size: 16px;">T3最优</div>
                <div class="stage_card_3_line_text" style="font-size: 16px;">T3效率 </div>
                <!-- <div class="stage_card_3_img"><img :src="`/image/items/${item_card_data[1].series.r3}.png`" alt=""
                    style="height: 32px"></div> -->
              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_line_text" style="font-size: 16px;">T2最优</div>
                <div class="stage_card_3_line_text" style="font-size: 16px;">T2效率 </div>
                <!-- <div class="stage_card_3_img"><img :src="`/image/items/${item_card_data[1].series.r2}.png`" alt=""
                    style="height: 32px"></div> -->
              </div>
            </div>
            <div class="stage_card_3_markText">短期最优</div>
          </div>
        </div>
        <!-- 说明卡片2 -->
        <div class="stage_card_3">

        </div>
      </div>

      
      <!-- 卡片区域 -->
      <div id="stage_3">
        <!-- 正式卡片 -->
        <div class="stage_card_3" v-for="(stage, index) in item_card_data" :key="index" @click="getItemTableData(index)">
          <!-- 长期最优 -->
          <div class="stage_card_3_left">
            <div class="img_wrap" style="position: relative;">
              <div class="stage_card_3_mainImg" :class="getSpriteImg(stage.series.r3, 't3')" style="transform: scale(1);">
                <!-- <img :src="`/image/items/${stage.series.r3}.png`" alt="" style="height: 96px"> -->
                <div class="stage_card_3_cover"></div>
                <div class="stage_card_3_best">
                  <div class="stage_card_3_best_chapter">{{ stage.maxEfficiencyStage.zoneName }}</div>
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
                <div class="stage_card_3_line_text">{{ formatNumber(stage.leT5MaxEfficiencyStage.efficiency, 1) }}% </div>
                <div class="stage_card_3_img"><img :src="`/image/items/${stage.series.r4}.png`" alt=""
                    style="height: 32px"></div>
              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_line_text">{{ stage.leT4MaxEfficiencyStage.stage_code }}</div>
                <div class="stage_card_3_line_text">{{ formatNumber(stage.leT4MaxEfficiencyStage.efficiency, 1) }}%</div>
                <div class="stage_card_3_img"><img :src="`/image/items/${stage.series.r3}.png`" alt=""
                    style="height: 32px"></div>
              </div>
              <div class="stage_card_3_line" v-show="stage.series.r2">
                <div class="stage_card_3_line_text">{{ stage.leT3MaxEfficiencyStage.stage_code }}</div>
                <div class="stage_card_3_line_text">{{ formatNumber(stage.leT3MaxEfficiencyStage.efficiency, 1) }}%</div>
                <div class="stage_card_3_img"><img :src="`/image/items/${stage.series.r2}.png`" alt=""
                    style="height: 32px"></div>

              </div>
            </div>
            <div class="stage_card_3_markText">短期最优</div>
          </div>
        </div>
        <!-- 占位卡片 -->
        <div class="stage_card_3 " v-for="(times, index) in 4" style="height: 0px; margin-bottom: 0px;opacity: 0;">
        </div>
      </div>
      <!-- 详情表 -->
      <el-table id="detailTable" :data="current_page_data" style="width: 100%" max-height="450">
        <el-table-column fixed prop="stageCode" label="关卡名" width="120" sortable>
          <template #default="scope">
            <div>
              <span style="font-size: 8px;line-height: 8px;">{{ scope.row.zoneName }}</span><br>
              {{scope.row.stageCode}}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="primary" label="主产品" width="90">
          <template #default="scope">
            <img :src="`/image/items/${scope.row.itemId}.png`" alt="" style="height: 36px">
          </template>
        </el-table-column>
        <el-table-column prop="secondary" label="副产品" width="90">
          <template #default="scope">
            <img :src="`/image/items/${scope.row.secondaryItemId}.png`" alt="" style="height: 36px">
          </template>
        </el-table-column>
        <el-table-column prop="eff" label="综合效率" width="108" sortable>
          <template #default="scope">
            {{ formatNumber(scope.row.stageEfficiency * 100, 1) }}%
          </template>
        </el-table-column>
        <el-table-column prop="spm" label="SPM" width="96" sortable/>
        <el-table-column prop="effT4" label="T4效率" width="96" sortable>
          <template #default="scope">
            {{ formatNumber(scope.row.leT5Efficiency * 100, 1) }}%
          </template>
        </el-table-column>
        <el-table-column prop="effT3" label="T3效率" width="96" sortable>
          <template #default="scope">
            {{ formatNumber(scope.row.leT4Efficiency * 100, 1) }}%
          </template>
        </el-table-column>
        <el-table-column prop="effT2" label="T2效率" width="96" sortable>
          <template #default="scope">
            {{ formatNumber(scope.row.leT3Efficiency * 100, 1) }}%
          </template>
        </el-table-column>
      </el-table>
      <!-- <table class="stage_detail_table_3">
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
                       <div class="zone_name"> {{ stage.stageId.indexOf("LMD")>0?'计入商店龙门币':'' }} </div>
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
      </table> -->

      <!-- <div style="display: flex;justify-content: center">
        <div style="margin: 12px"> page to</div>
        <div @click="currentPage(index - 1)" style="margin: 12px" v-for="index in page_count" :key="index">{{ index }}
        </div>
      </div> -->

    </div>
  </div>
</template>

<script setup>
import stageApi from '/src/api/stage'
import { onMounted, ref } from "vue";
import item_series from '/src/static/json/item_series.json'
import stage_api_data from '/src/static/json/stage_api_data.v2.json'

// 根据物品系列进行分组的推荐关卡
let stage_result_group = ref(stage_api_data.data.recommendedStage)

//材料卡片数据
let item_card_data = ref([])

//当前时间的时间戳
let nowTimeStamp = new Date().getTime();


// stageApi.getStageResultGroupByItemSeries(0.625,300).then(response=>{
//        stage_result_group.value = response.data.recommendedStage
//        getItemCardData()
//        getItemTableData(8)
// })

/**
 * 拼接材料卡片的数据
 */
function getItemCardData() {
  for (let index in stage_result_group.value) {
    //每一种材料系列的推荐关卡
    let recommended_stage = stage_result_group.value[index]
    //推荐关卡集合
    let stage_result_list = recommended_stage.stageResultList;

    //获得每种评价标准的最优关和效率
    const item_recommend_stage = {
      maxEfficiencyStage: getStageDataByProperty(stage_result_list, 'stageEfficiency'),
      leT5MaxEfficiencyStage: getStageDataByProperty(stage_result_list, 'leT5Efficiency'),
      leT4MaxEfficiencyStage: getStageDataByProperty(stage_result_list, 'leT4Efficiency'),
      leT3MaxEfficiencyStage: getStageDataByProperty(stage_result_list, 'leT3Efficiency'),
      series: { r4: '', r3: '', r2: '', r1: '' }
    }

    //获得该材料系列的上下级材料的物品id
    item_recommend_stage.series = item_series[recommended_stage.itemSeriesId]

    item_card_data.value.push(item_recommend_stage)
    // console.log(item_recommend_stage)
  }
}

/**
 * 根据传入的对象属性进行倒序排序,获得该属性最优关卡
 * @param stageList 推荐关卡集合
 * @param property 要排序的属性
 * @returns {{efficiency, stage_code}} 该属性最优关卡效率和关卡名称
 */
function getStageDataByProperty(stageList, property) {
  stageList.sort((a, b) => {
    return b[property] - a[property]
  })
  for (const index in stageList) {
    const stage = stageList[index]
    if (stage.endTime < nowTimeStamp) continue;
    return {
      stage_code: stage.stageCode,
      efficiency: stage[property] * 100,
      zoneName:stage.zoneName.replace(" (标准)","")
    }
  }
}


//根据物品id获得对应的关卡推荐数据集合
let item_table_data_by_item_id = ref([])
//材料表格当前页数据
let current_page_data = ref([])
//页大小
let page_size = ref(8);
//总页数
let page_count = ref(0)

/**
 * 根据页数跳转
 */
function currentPage(page_num) {
  //起始数据索引
  page_num = page_num * page_size.value
  current_page_data.value = []
  //拼接表格数据
  for (let i = page_num; i < item_table_data_by_item_id.value.length; i++) {
    //当表格数据长度大于页大小时跳出
    if (i > page_num + page_size.value) break;
    current_page_data.value.push(item_table_data_by_item_id.value[i])
  }
}

/**
 * 获取数据总页数
 */
function getPageCount() {
  page_count.value = parseInt((item_table_data_by_item_id.value.length / page_size.value).toString()) + 1
}

/**
 * 根据索引获得对应材料系列的所有推荐关卡
 * @param index 集合索引,卡片展示的材料和索引对应  简单例子[0:xxx材料的所有数据]
 */
function getItemTableData(index) {
  //当前材料系列的推荐关卡
  let recommended_stage = stage_result_group.value[index];
  //推荐关卡集合
  let stage_result_list = recommended_stage.stageResultList;
  //拼接表格数据,默认按总效率排序
  item_table_data_by_item_id.value = stage_result_list.sort((a, b) => b.stageEfficiency - a.stageEfficiency)
  console.log(item_table_data_by_item_id.value)

  getPageCount()
  currentPage(0)
  jumpToTable()
}



function jumpToTable(){
  window.scrollTo({
        top:100,
        behavior:'smooth'
    })
}
/**
 * 获取雪碧图样式
 * @param id 图片id
 * @param type 图片类型,对应着一个css
 * @returns {string} 样式
 */
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

/**
 * 格式化数字
 * @param num 数字
 * @param acc 位数
 * @returns {string} 格式化后的数字
 */
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