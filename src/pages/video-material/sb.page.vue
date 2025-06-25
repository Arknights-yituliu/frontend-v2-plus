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
      <!-- 内容区域 -->
      <div id="stage_3">
        <div v-for="(materialRank, indexAll) in stageRank" :key="indexAll" class="op_content" id="stage_t3_content_3">
          <div class="stage_card_3">
            <!-- 长期最优 -->
            <div class="stage_card_3_left">
              <div class="stage_card_3_mainImg"></div>
              <div class="stage_card_3_best">{{materialRank.stageResultList[0].stageCode}}</div>
              <div class="stage_card_3_markText">长期最优</div>
            </div>
            <!-- 短期最优 -->
            <div class="stage_card_3_right">
              <div class="stage_card_3_list">
                <div class="stage-card-bar">
                  <div class="stage_card_3_line_text">9-10</div>
                  <div class="stage_card_3_img"></div>
                  <div class="stage_card_3_img"></div>
                </div>
                <div class="stage-card-bar">

                </div>
                <div class="stage-card-bar">

                </div>
              </div>
              <div class="stage_card_3_markText">短期最优</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {{ chartData }}
    {{ stageRank[6] }}
    {{ stageRank[6].itemType }}
    <!-- 地图效率End -->
    <!-- 材料详情表Start -->
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>xxxx</span>
        </div>
      </template>
      <el-table :data="tableData" :default-sort="{ prop: 'date', order: 'descending' }" style="width: 100%">
        <el-table-column prop="date" label="关卡" sortable width="180" />
        <el-table-column prop="name" label="Name" width="180" />
        <el-table-column prop="address" label="Address" :formatter="formatter" />
      </el-table>
    </el-card>
    <!-- 材料详情表End -->
  </div>
</template>


<script setup>

import { ref } from "vue";
import stageApi from "/src/api/material";


import { usePageContext } from "/src/renderer/usePageContext";

const pageContext = usePageContext();
const stageRank = pageContext.pageProps.t3;

// this.chartData = detailDemo.data;

let closedStageList = ref([]);

stageApi.findClosedStage(0.625).then((response) => {
  closedStageList.value = [];
  closedStageList.value = response.data;
});



let itemArr = [
  { name: "RMA70-12", id: "30103" },
  { name: "全新装置", id: "30063" },
  { name: "扭转醇", id: "30073" },
  { name: "轻锰矿", id: "30083" },
  { name: "研磨石", id: "30093" },
  { name: "酮凝集组", id: "30053" },
  { name: "糖组", id: "30023" },
  { name: "凝胶", id: "30043" },
  { name: "异铁组", id: "30073" },
  { name: "半自然溶剂", id: "31043" },
  { name: "聚酸酯组", id: "30033" },
  { name: "转质盐组", id: "31063" },
  { name: "炽合金", id: "31023" },
  { name: "固源岩组", id: "31033" },
  { name: "晶体元件", id: "30073" },
  { name: "化合切削液", id: "31053" },
];

function getSpriteImg(id, index) {
  return "bg-" + id;
}
</script>

