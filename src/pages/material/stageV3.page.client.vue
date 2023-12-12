<template>
  <div>
    <!-- 地图效率Start -->
    <div id="stage">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">推荐关卡</div>
          <div class="op_title_etext_light">Best Stages</div>
        </div>
        <div class="op_title_tag">
          <!-- <div class="op_tag_0">图例</div> -->
          <div class="op_tag_0">搓玉版</div>
          <div class="op_tag_0">往期活动效率</div>
          <div class="op_tag_0">常见问题</div>
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
              <div class="stage_card_3_mainImg" :class="getItemSeriesSprite('30013')">
                <div class="stage_card_3_cover" style="height:114px;"></div>
                <div class="stage_card_3_best" style="font-size: 16px;">
                  <div class="stage_card_3_best_chapter">关卡所在区域</div>
                  综合最优关卡
                  <div class="stage_card_3_markText_l">综合最优</div>
                </div>
              </div>
            </div>
          </div>
          <!-- 短期最优 -->
          <div class="stage_card_3_right">
            <div class="stage_card_3_list" style="width:144px;">
              <div class="stage_card_3_line">
                <div class="stage_card_3_img">
                  <div :class="getItemT3Sprite(30014)"></div>
                </div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T4最优关</div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T4效率</div>

              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_img">
                  <div :class="getItemT3Sprite(30013)"></div>
                </div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T3最优关</div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T3效率</div>

              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_img">
                  <div :class="getItemT3Sprite(30012)"></div>
                </div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T2最优关</div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T2效率</div>

              </div>
            </div>
            <div class="stage_card_3_markText">短期最优</div>
          </div>
        </div>
        <!-- 说明卡片2 -->
        <div class="stage_card_3">
          <div>
            <div class="stage_card_3_list" style="width:244px;">
              <div class="stage_card_3_line">
                对所有材料有长期需求：<br>
                选择综合最优关卡
              </div>
              <div class="stage_card_3_line">
                只需要某系的紫、蓝、绿、白材料:<br>
                选择T4效率最高的关卡
              </div>

              <div class="stage_card_3_line">
                只需要某系的蓝、绿、白材料:<br>
                选择T3效率最高的关卡，以此类推
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 卡片区域 -->
      <div id="stage_3">
        {{ item_card_data[1] }}
        <!-- 正式卡片 -->
        <div class="stage_card_3" v-for="(stage, index) in item_card_data" :key="index" @click="getItemTableData(index)">
          <!-- 长期最优 -->
          <div class="stage_card_3_left">
            <div class="img_wrap" style="position: relative;">
              <div class="stage_card_3_mainImg" :class="getItemSeriesSprite(stage.series.r3)">
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
                <div class="stage_card_3_img">
                  <div :class="getItemT3Sprite(stage.series.r4)"></div>
                </div>
                <div class="stage_card_3_data">
                  <div class="stage_card_3_line_text">{{ stage.leT5MaxEfficiencyStage.stage_code }}</div>
                  <div class="stage_card_3_line_text">{{ formatNumber(stage.leT5MaxEfficiencyStage.efficiency, 1) }}%
                  </div>
                  <div class="stage_card_3_line_bar"
                    :style="getLineBarLength(0, 0, stage.leT5MaxEfficiencyStage.efficiency / 100, 1.1)"></div>
                </div>
              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_img">
                  <div :class="getItemT3Sprite(stage.series.r3)"></div>
                </div>
                <div class="stage_card_3_data">
                  <div class="stage_card_3_line_text">{{ stage.leT4MaxEfficiencyStage.stage_code }}</div>
                  <div class="stage_card_3_line_text">{{ formatNumber(stage.leT4MaxEfficiencyStage.efficiency, 1) }}%
                  </div>
                  <div class="stage_card_3_line_bar"
                    :style="getLineBarLength(0, stage.leT4MaxEfficiencyStage.efficiency / 100, 0, 0.95)"></div>
                </div>
              </div>
              <div class="stage_card_3_line" v-show="stage.series.r2">
                <div class="stage_card_3_img">
                  <div :class="getItemT3Sprite(stage.series.r2)"></div>
                </div>
                <div class="stage_card_3_data">
                  <div class="stage_card_3_line_text">{{ stage.leT3MaxEfficiencyStage.stage_code }}</div>
                  <div class="stage_card_3_line_text">{{ formatNumber(stage.leT3MaxEfficiencyStage.efficiency, 1) }}%
                  </div>
                  <div class="stage_card_3_line_bar"
                    :style="getLineBarLength(stage.leT3MaxEfficiencyStage.efficiency / 100, 0, 0, 0.90)"></div>
                </div>
              </div>
            </div>
            <div class="stage_card_3_markText">短期最优</div>
          </div>
        </div>
        <div class="stage_card_3 " v-for="index in 4" :key="index" style="height: 0; margin-bottom: 0;opacity: 0;">
        </div>
      </div>
      <!-- 材料情报卡 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">材料详情</div>
          <div class="op_title_etext_light">Item Info</div>
        </div>
        <div class="op_title_tag">
          <!--          <div id="upStageKey" class="op_tag_0" @click="showNowActive()">只显示up</div>-->
          <!--          <div id="orundumStageKey" class="op_tag_0" @click="showOrundumPopup()">搓玉版</div>-->
          <!--          <div id="historyStageKey" class="op_tag_0" @click="showHistoryPopup()">往期活动效率</div>-->

          <div class="tab_text">*表格可拖动查看</div>
        </div>
      </div>
      <!-- 材料信息 -->
      <div id="itemDetail">
        <div class="item-detail-bar">
          <div class="detail-bar-item-wrap">
            <div :class="getDetailTableHeaderItemSprite(selected_item.itemId)"></div>
            <span class="detail-bar-item-text">
              {{ selected_item.itemName }}
            </span>

            <div :class="`bg-AP_GAMEPLAY value-icon`"></div>
            <span class="item-value-text">
              {{ formatNumber(selected_item.itemValueAp, 2) }}
            </span>
          </div>


          <div class="activity-wrap">
            上次up：{{ selected_item.lastUp.activityName }}
          </div>
          <div class="activity-wrap">
            即将up：{{ selected_item.lastUp.activityName }}
          </div>

        </div>


        <div class="item-detail-bar">
          <div>
            <div class="cost-perf-bar" v-for="(costPerf, index) in selected_item.storeCostPerf" :key="index">
              <div :class="`bg-${costPerf.token} token-icon`"></div>
              <span class="cost-perf-text">
                {{ formatNumber(costPerf.costPerf, 2) }}
              </span>
            </div>
          </div>
        </div>
        <!--        <div id="detailRight">-->
        <!--          绿票商店兑换优先级：0.6（低）[蓝材料]<br>-->
        <!--          寻访数据契约商店：0.4（低）/0.3（极低）[蓝/紫材料]<br>-->
        <!--          信用商店：0.4（低）/0.3（极低）[绿/白材料]<br>-->
        <!--          合约商店无限池：0.4（低）/0.3（极低）[蓝材料]<br>-->
        <!--          查看所有商店性价比-->
        <!--        </div>-->
      </div>
      <!-- 详情表 -->
      <div style="margin : 8px;">
        <el-table id="detailTable" stripe :data="item_table_data_by_item_id" max-height="450">
          <el-table-column fixed prop="stageCode" label="关卡名" :width="td_6" sortable>
            <template #default="scope">
              <div>
                <span style="font-size: 10px;line-height: 8px;">{{ scope.row.zoneName }}</span><br>
                {{ scope.row.stageCode }}
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="primary" label="主产品" :width="td_1">
            <template #default="scope">
              <div class="detail-table-item-wrap">
                <div :class="getDetailTableItemSprite(scope.row.itemId)"></div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="secondary" label="副产品" :width="td_1">
            <template #default="scope">
              <div class="detail-table-item-wrap">
                <div :class="getDetailTableItemSprite(scope.row.secondaryItemId)"></div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="eff" label="综合效率" :width="td_5" sortable>
            <template #default="scope">
              {{ formatNumber(scope.row.stageEfficiency * 100, 1) }}%
            </template>
          </el-table-column>
          <el-table-column prop="spm" label="SPM" :width="td_4" sortable />
          <el-table-column prop="leT5Efficiency" label="T4效率" :width="td_4" sortable>
            <template #default="scope">
              {{ formatNumber(scope.row.leT5Efficiency * 100, 1) }}%
            </template>
          </el-table-column>
          <el-table-column prop="leT4Efficiency" label="T3效率" :width="td_4" sortable>
            <template #default="scope">
              {{ formatNumber(scope.row.leT4Efficiency * 100, 1) }}%
            </template>
          </el-table-column>
          <el-table-column prop="leT3Efficiency" label="T2效率" :width="td_4" sortable>
            <template #default="scope">
              {{ formatNumber(scope.row.leT3Efficiency * 100, 1) }}%
            </template>
          </el-table-column>
        </el-table>
        <div class="op_title_tag">
          <div class="tab_text">*副产品：</div>
          <div class="tab_text">*综合效率：</div>
          <div class="tab_text">*SPM：</div>
          <div class="tab_text">*T4/T3/T2效率：</div>
        </div>
      </div>

      <!-- 搓玉 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">搓玉数据表</div>
          <div class="op_title_etext_light">Orundum</div>
        </div>
        <div class="op_title_tag">
          <!-- <div class="op_tag_0">图例</div> -->
          <div class="op_tag_0">简略版</div>
          <div class="op_tag_0">完整版</div>
          <div class="tab_text">*简略版仅包括活动关</div>
        </div>
      </div>

      <el-table :data="orundumRecommendedStage" stripe style="width: 100%;height: 400px">
        <el-table-column prop="stageCode" label="关卡名" />
        <el-table-column label="每理智可搓玉">
          <template #default="scope">
            <div style="display: flex; align-items: center">
              <span style="margin-left: 10px">{{ scope.row.orundumPerAp }}</span>
              <div class="orundum-table-icon">
                <div class="bg-4003_icon sprite-icon"></div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="每搓1抽消耗">
          <template #default="scope">
            <div style="display: flex; align-items: center">
              <span style="margin-left: 10px">{{ scope.row.lmdcost }}</span>
              <div class="orundum-table-icon">
                <div class="bg-4001_icon sprite-icon" style="top:-8px"></div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="orundumPerApEfficiency" label="搓玉效率" />
        <el-table-column prop="stageEfficiency" label="关卡效率" />
      </el-table>

      <!-- 历史活动 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">往期活动数据</div>
          <div class="op_title_etext_light">History Event</div>
        </div>
        <div class="op_title_tag">
          <!-- <div class="op_tag_0">图例</div> -->
          <div class="op_tag_0">列表版</div>
          <div class="op_tag_0">表格版</div>
        </div>
      </div>


      <table class="act-table">
        <tbody>
          <tr>
            <td class="act-name">活动名称</td>
            <td v-for="(item, index) in itemIdList" :key="index">
              <div class="act-table-item-wrap" style="height: 36px">
                <div :class="getActTableItemSprite(item.id)"></div>
              </div>
            </td>
          </tr>
          <tr v-for="(act, index) in historyActItemTable" :key="index">
            <td class="act-name">{{ act.zoneName }}</td>
            <td v-for="(item, index) in act.itemList" :key="index" :style="getCellBgColor(item.cellBgColor)">
              <div class="act-table-item-wrap" v-if="item.isUp">
                <div :class="getActTableItemSprite(item.itemId)"></div>
                <span v-show="typeof item.stageEfficiency !== 'undefined'" class="act-stage-efficiency">
                  {{ formatNumber(item.stageEfficiency, 2) }}%
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="act-table-simple-wrap">
        <table class="act-table-simple">
          <tr v-for="(act, index) in historyActItemList" :key="index">
            <td class="act-name-simple">{{ act.zoneName }}</td>
            <td v-for="(stage, index) in  act.actStageList" :key="index">
              <div class="act-drop-table">
                <div class="act-table-simple-item-wrap">
                  <div :class="getActTableSimpleItemSprite(stage.itemId)"></div>
                </div>
                <span class="act-drop-detail">
                  {{ stage.stageCode }} <br>
                  {{ formatNumber(stage.stageEfficiency, 2) }}%
                </span>
              </div>
            </td>
          </tr>
        </table>
      </div>
      <!-- 常见问题 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">常见问题</div>
          <div class="op_title_etext_light">FAQ</div>
        </div>
        <div class="op_title_tag" style="height: 24px">
          <div class="tab_text">
          </div>
        </div>
      </div>

      <foot-component></foot-component>

    </div>
  </div>
</template>

<script setup>
import stageApi from '/src/api/stage'
import { onMounted, ref } from "vue";
import item_series from '/src/static/json/material/item_series.json'
import footComponent from "/src/components/FootComponentV3.vue";

// 根据物品系列进行分组的推荐关卡
let stage_result_group = ref()
// let stage_result_group = ref(stage_api_data.data.recommendedStage.sort((a,b)=>a.itemSeriesId-b.itemSeriesId))

//材料卡片数据
let item_card_data = ref([])

//当前时间的时间戳
let nowTimeStamp = new Date().getTime();

let item_value_obj = ref({})

let selected_item = ref({
  itemId: '30013',
  itemValueAp: 17.32,
  itemName: '固源岩组',
  lastUp: {
    activityName: '叙拉古人',
    date: '2023-12-31'
  },
  nextUp: {
    activityName: '叙拉古人',
    date: '2023-12-31'
  },
  storeCostPerf: [
    { token: '4005', costPerf: 0.75 },
    { token: 'EPGS_COIN', costPerf: 0.75 },
    { token: 'REP_COIN', costPerf: 0.75 },
    { token: '4004', costPerf: 0.75 }
  ]
})

// 获取关卡推荐数据
stageApi.getStageResultGroupByItemSeries(0.625, 300).then(response => {
  stage_result_group.value = response.data.recommendedStageList.sort((a, b) => a.itemSeriesId - b.itemSeriesId)
  //将后端返回的数据组装为卡片需要的数据格式
  getItemCardData()
  //获取材料价值数据
  stageApi.getItemValueTable(0.625).then(response => {
    for (const item of response.data) {
      item_value_obj.value[item.itemId] = item;
    }
    getItemTableData(0)
  })
})


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
    item_recommend_stage.series = item_series[recommended_stage.itemSeriesId].series

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
      zoneName: stage.zoneName.replace(" (标准)", "")
    }
  }
}

//根据物品id获得对应的关卡推荐数据集合
let item_table_data_by_item_id = ref([])

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

  jumpToTable()
  // selected_item.value = item_value_obj.value[recommended_stage.itemSeriesId]
  // console.log(recommended_stage)
  // console.log(item_value_obj)
  // console.log('当前选中的材料是：', selected_item.value)
}


function jumpToTable() {
  window.scrollTo({
    top: 100,
    behavior: 'smooth'
  })
}

function getItemSeriesSprite(id) {
  return "bg-" + id + " item_series_sprite";
}

function getItemT3Sprite(id) {
  return "bg-" + id + " item-t3-sprite";
}

function getDetailTableHeaderItemSprite(id) {
  return "bg-" + id + " detail-bar-item-sprite";
}

function getDetailTableItemSprite(id) {
  return "bg-" + id + " table-item-sprite";
}

function getActTableItemSprite(id) {
  return "bg-" + id + " act-table-item-sprite";
}

function getActTableSimpleItemSprite(id) {
  return "bg-" + id + " act-table-simple-item-sprite";
}

function getLineBarLength(T2eff, T3eff, T4eff, stageEff) {
  // 暂时是单层的，所以代码看起来可能比较乱
  let T2Color = "#00a2a2 ";
  let T3Color = "#168afa ";
  let T4Color = "#7446ff ";
  let T5Color = "#e85d06";
  if (T2eff > 0.1) {
    T4Color = T2Color;
    T4eff = T2eff;
  }
  if (T3eff > 0.1) {
    T4Color = T3Color;
    T4eff = T3eff;
  }
  let stageEffColor = "rgba(0, 0, 0, 0.3) ";
  let standardColor = "rgba(0, 0, 0, 0.1) ";
  let T4Layer = "linear-gradient(to right ,";
  // Tx效率层
  if (T4eff < 0.2) {
    T4Layer = T4Layer + T4Color + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
  } else {
    T4Layer = T4Layer + T4Color + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ,"
    if (T4eff < 0.4) {
      T4Layer = T4Layer + T4Color + 0.2 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
    } else {
      T4Layer = T4Layer + T4Color + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ,"
      if (T4eff < 0.6) {
        T4Layer = T4Layer + T4Color + 0.4 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
      } else {
        T4Layer = T4Layer + T4Color + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ,"
        if (T4eff < 0.8) {
          T4Layer = T4Layer + T4Color + 0.6 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
        } else {
          T4Layer = T4Layer + T4Color + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ,"
          if (T4eff < 1) {
            T4Layer = T4Layer + T4Color + 0.8 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
          } else {
            T4Layer = T4Layer + T4Color + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 1 * 83.33 + "% ,"
            T4Layer = T4Layer + T5Color + 1 * 83.33 + "% " + T4eff * 83.33 + "%,rgba(0, 255, 0, 0) " + T4eff * 83.33 + "%)"
          }
        }
      }
    }
  }
  // 关卡效率层
  let stageLayer = "linear-gradient(to right ," + stageEffColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ," + stageEffColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ," + stageEffColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ,";
  if (stageEff < 0.8) {
    stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
  } else {
    stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ,"
    if (T4eff < 1) {
      stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
    } else {
      stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 1 * 83.33 + "% ,"
      stageLayer = stageLayer + stageEffColor + 1 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
    }
  }


  // 默认显示5个格子
  // let standardLayer = "linear-gradient(to right ," + standardColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ," + standardColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ," + standardColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ," + standardColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ," + standardColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 83.33 + "% ," + standardColor + 83.33 + "% 101%)";
  let standardLayer = "linear-gradient(to right ," + standardColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ," + standardColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ," + standardColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ," + standardColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ," + standardColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 83.33 + "% 101%)";
  // return "background:" +  stageLayer + ";"
  return "background:" + T4Layer +"," + stageLayer + "," + standardLayer + ";";
}

/**
 * 格式化数字
 * @param num 数字
 * @param acc 位数
 * @returns {string} 格式化后的数字
 */
function formatNumber(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  if (typeof num === "undefined") return ''
  return parseFloat(num).toFixed(acc);
}

onMounted(() => {

})

let td_1 = ref()
let td_2 = ref()
let td_3 = ref()
let td_4 = ref()
let td_5 = ref()
let td_6 = ref()

window.addEventListener("resize", function () {
  if (window.innerWidth < 800) {
    td_1.value = 70
    td_2.value = 80
    td_3.value = 90
    td_4.value = 100
    td_5.value = 110
    td_6.value = 120
  } else {
    td_1.value = ''
    td_2.value = ''
    td_3.value = ''
    td_4.value = ''
    td_5.value = ''
    td_6.value = ''
  }
})


let itemIdList = [] // 材料表
let historyActItemTable = ref([]) // 历史活动up材料表
let historyActItemList = ref([])

// 获取历史活动up材料信息
stageApi.getHistoryActStage(0.625, 300).then(response => {
  // 先把材料系列表转为一个集合
  for (const itemId in item_series) {
    const item = item_series[itemId]
    itemIdList.push({
      id: item.id,
      name: item.name,
      lastUp: false
    })
  }
  historyActItemList.value = response.data
  // 循环历史活动数据
  for (const index in response.data) {
    const act = response.data[index]
    //复刻不计入
    // if(act.zoneName.indexOf('复刻')>-1) {
    //   continue;
    // }
    //每行数据
    const rowData = {
      zoneName: act.zoneName, //活动名
      itemList: [] //材料up情况
    }
    for (const itemIndex in itemIdList) {
      const item = itemIdList[itemIndex]
      let cellBgColor = false; //格子背景颜色
      let isUpFlag = false; //材料up标记
      // 循环每个活动up的蓝材料
      let stageEfficiency = void 0
      for (const stage of act.actStageList) {
        //up了材料则标记已经up
        if (stage.itemId === item.id) {
          stageEfficiency = stage.stageEfficiency * 100
          isUpFlag = true
          break
        }
      }
      //如果这个up上个活动没up则将格子标记为true，添加背景色
      if (!itemIdList[itemIndex].lastUp) {
        cellBgColor = true;
      }
      //如果这个材料已经up了，则将这个材料的上次up标记为true
      if (isUpFlag) {
        itemIdList[itemIndex].lastUp = true;
      }

      rowData.itemList.push({
        itemId: item.id,
        stageEfficiency: stageEfficiency,
        isUp: isUpFlag,
        cellBgColor: cellBgColor,
      })
    }
    historyActItemTable.value.push(rowData)
  }

  console.log(historyActItemTable.value)
})


function getCellBgColor(flag) {
  console.log(flag)
  if (flag) {
    return 'background-color: #82beff'
  }
  return ''
}


let orundumRecommendedStage = ref([])

stageApi.getOrundumRecommendedStage().then(response => {
  for (const stage of response.data) {
    orundumRecommendedStage.value.push({
      stageCode: stage.stageCode,
      orundumPerAp: stage.orundumPerAp.toFixed(2),
      lmdcost: stage.lmdcost.toFixed(2) + 'w',
      orundumPerApEfficiency: (stage.orundumPerApEfficiency * 100).toFixed(2) + '%',
      stageEfficiency: (stage.stageEfficiency * 100).toFixed(2) + '%',
    })
  }

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


