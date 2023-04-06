<template>
  <div id="ep12" style="font-size: 20px">
    <!-- 占位 -->
    <div style="height: 210px"></div>
    <!-- 标题 -->
    <div style="text-align: center; background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px">
      <img src="/img/website/ico64.png" style="padding: 4px 0px 0px 0px; border-radius: 8px" />
      <div style="font-size: 32px; vertical-align: top; margin: 12px; display: inline-block">
        明日方舟一图流 EP12专题页面
      </div>
    </div>
    <!-- 简单说明 -->
    <div
      style="
        padding: 8px 16px;
        font-style: italic;
        line-height: 32px;
        background-color: #ffffff0f;
        backdrop-filter: blur(8px);
        margin: 12px;
      "
    >
      上半页集中展示新章节<b>掉落数据</b><br />
      下半页推荐<b>[后勤特别许可证]</b>的使用优先级
      <div style="font-size: 14px">*转载本页内容需注明来源</div>
    </div>
    <!-- 数据补全计划 -->
    <div style="background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px">
      <div style="text-align: center; font-size: 24px; font-weight: 600; padding-top: 6px">数据补全计划</div>
      <div style="margin: 0px 6px">
        <img src="/img/temp/ep12_drb.png" style="width: 100%" />
      </div>
      <div style="font-style: italic; padding: 0px 12px 12px 12px">
        新章节开放时往往伴有明显的马太效应，即刷的人越多，数据越可靠，越能吸引更多的博士去刷；反之亦然。<br />
        为了找到隐藏的高效率关卡，我们联合！缺少样本的关卡，我们碎石刷！<br />
        同时欢迎大家参与提交数据！
      </div>
    </div>
    <!-- 数据补全计划表格 -->
    <div style="background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px">
      <table class="popup_table" style="margin: auto">
        <tbody>
          <tr class="popup_table_title">
            <td class="popup_table_c1" style="width: 72px">关卡</td>
            <td class="popup_table_c2" style="width: 72px">主产物</td>
            <td v-if="show_secondary" class="popup_table_c2" style="width: 72px">副产物</td>
            <td class="popup_table_c4" style="width: 80px">样本数</td>
            <td class="popup_table_c5" style="width: 80px">置信度</td>
            <td class="popup_table_c6" style="width: 54px">SPM</td>
            <td class="popup_table_c7" style="width: 96px">综合效率</td>
            <!-- <td class="popup_table_c7" style="width: 80px">效率排名</td> -->
            <td class="popup_table_c7" style="width: 96px">原始数据</td>
            <!-- <td class="popup_table_c7" style="width:64px;">小样提升<br>(理论值)</td> -->
          </tr>
          <tr v-for="(stage, index) in table_data" :key="index" class="stage_table_r">
            <td>
              {{ stage.stageCode }}
            </td>
            <td>
              <div :class="`bg-${stage.itemId}`" style="transform: scale(0.8)"></div>
            </td>
            <td v-if="show_secondary"><div :class="`bg-${stage.secondaryId}`" style="transform: scale(0.6)"></div></td>
            <td>
              {{ stage.sampleSize }}
            </td>
            <td>
              {{ stage.sampleConfidence }}
            </td>
            <td>
              {{ stage.spm }}
            </td>
            <td>
              {{ stage.stageEfficiency }}
            </td>
            <td>链接？</td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- 后勤特别许可证 -->
    <div style="height: 192px; background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px">
      <div style="text-align: center; font-size: 24px; font-weight: 600; padding: 6px 0px">后勤特别许可证</div>
      <div style="vertical-align: top; height: 144px; margin: auto">
        <div
          style="
            width: 96px;
            height: 96px;
            background: url('/img/temp/permit.webp');
            display: inline-block;
            vertical-align: top;
            margin: 18px 12px 24px 12px;
          "
        ></div>
        <div style="display: inline-block; max-width: 540px; line-height: 32px;">
          <div>◆本次活动新增后勤特别许可证：</div>
          <div>
            在【惊霆无声】任一可三星代理作战的关卡中，每日前两次作战可使用后勤特别许可证，使用后的当次作战不消耗理智且原常规掉落的报酬改为固定掉落且数量增加至三倍
          </div>
        </div>
      </div>
    </div>
    <!-- 推荐表-占位 -->
    <div
      style="height: 192px; background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px; text-align: center"
    >
      机制、数值研究中<br />
      数据参考<br />
      【这里放价值表】
    </div>
    <div style="display: flex; flex-wrap: wrap; justify-content: space-evenly">
      <a class="ep12_support" href="https://space.bilibili.com/21342479">
        <img class="ep12_support_img" src="/img/website/babel.jpg" />
        <div class="ep12_support_text">
          <div class="ep12_support_org">巴别塔攻略组</div>
          <div class="ep12_support_role">数据提供</div>
        </div>
      </a>
      <a class="ep12_support" href="https://penguin-stats.cn/">
        <img class="ep12_support_img" src="/img/website/ps_logo.png" />
        <div class="ep12_support_text">
          <div class="ep12_support_org">企鹅物流数据统计</div>
          <div class="ep12_support_role">数据收集</div>
        </div>
      </a>
      <a class="ep12_support" href="https://yituliu.site/">
        <img class="ep12_support_img" src="/img/website/ico64.png" />
        <div class="ep12_support_text">
          <div class="ep12_support_org">明日方舟一图流</div>
          <div class="ep12_support_role">数据分析</div>
        </div>
      </a>
      <a class="ep12_support" href="https://space.bilibili.com/688411531">
        <img class="ep12_support_img" src="/img/website/beta_logo_yw.png" />
        <div class="ep12_support_text">
          <div class="ep12_support_org">罗德岛基建BETA</div>
          <div class="ep12_support_role">信息发布</div>
        </div>
      </a>
      <!-- <a class="ep12_support">
        <img class="ep12_support_img" src="/img/website/beta_logo_yw.png">
        <div class="ep12_support_text">
          <div class="ep12_support_org">xxxx</div>
          <div class="ep12_support_role">页面设计</div>
        </div>
      </a>         -->
    </div>
  </div>
</template>

<script setup>
import { usePageContext } from "@/renderer/usePageContext";
import { ref } from "vue";
const show_secondary = ref(false);
const pageContext = usePageContext();
const table_data = ref(pageContext.pageProps.newChapter);
</script>

<style scoped>
a {
  color: #ffffff;
}

#ep12 {
  /* background-color: rgb(0, 162, 255); */
  max-width: 720px;
  margin: auto;
  background-image: url(/img/temp/ep12_background2.png);
  background-size: 100%;
  color: antiquewhite;
}

.ep12_support {
  background-color: #ffffff0f;
  backdrop-filter: blur(8px);
  margin: 8px;
  width: 258px;
  height: 96px;
  display: inline-block;
}
.ep12_support_img {
  width: 96px;
  margin: 0px;
}
.ep12_support_text {
  width: 160px;
  font-size: 18px;
  display: inline-block;
  height: 80px;
  vertical-align: bottom;
}
.ep12_support_text div {
  height: 36px;
  text-align: center;
}

.popup_table {
  text-align: center;
}

.popup_table_title {
  font-size: 22px;
  line-height: 60px;
  color: white;
}

td > div {
  display: inline-block;
}
</style>
