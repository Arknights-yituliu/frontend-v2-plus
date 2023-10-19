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
        <div v-for="(materialRank, indexAll) in stageRank" :key="indexAll" class="op_content" id="stage_t3_content_3">
          <div class="stage_card_3">
            <!-- 长期最优 -->
            <div class="stage_card_3_left">
              <div class="stage_card_3_mainImg"></div>
              <div class="stage_card_3_best">{{ materialRank.stageResultList[0].stageCode }}</div>
              <div class="stage_card_3_markText">长期最优</div>
            </div>
            <!-- 短期最优 -->
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
  </div>
</template>

<script>


</script>