<template>
  <div id="ep12">
    <div >明日方舟一图流 EP12专题页面</div>
    <div>
      说明模块<br>
      本页面主要包括两部分，一部分用于展示新章节的掉落数据，另一部分用于推荐每天嫖两次的那个券怎么用
    </div>
    <div style="height: 400px;">
      数据补全计划<br>
      【这里放图片】<br>
      新章节开放时往往会有很明显的马太效应，刷的人越多，数据越可靠，越能吸引更多的博士去刷；反之亦然。
      为了破解这个局面，我们（以下省略xx字）
    </div>
    <div style="height: 400px;">
      数据表<br>
      【这里放数据表】
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
                v-for="(stage, index) in popupData"
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
    <div>
      每天嫖两次推荐表<br>
      新玩意
    </div>
    <div>
      推荐表-占位<br>
      机制研究中【来个倒计时，6日20:00归零】
    </div>
    <div>
      推荐表-正式版<br>
      【这里放推荐表排名】<br>
      数据来源<br>
      【这里放价值表】
    </div>
    <div>
      <div class="ep12_support">巴别塔攻略组<br>（数据提供）</div>
      <div class="ep12_support">企鹅物流数据统计<br>（数据收集）</div>
      <div class="ep12_support">明日方舟一图流<br>（数据分析） </div>
      <div class="ep12_support">罗德岛基建BETA<br>（信息发布） </div>
      <div class="ep12_support">xxxx<br>（页面设计）</div>
        
    </div>
  </div>
</template>

<script>


export default {
  layout: "poster",
  data() {
    return {
    };
  },

  methods: {},
};
</script>

<style scoped>


#ep12{
  background-color: rgb(0, 162, 255);
  max-width: 720px;
  margin: auto;
  background-image: url(/img/temp/ep12_background.png);
}

#ep12 div{
  margin: 12px;
  border: 1px solid #000000;
}

.ep12_support{
  display: inline-block;
}
</style>
