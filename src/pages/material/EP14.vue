<template>
  <div id="ep12" style="font-size: 20px" class="EP-page">
    <!-- 占位 -->
    <div class="placeholder"></div>
    <!-- 标题 -->
    <div class="page-title-wrap">
      <img src="/image/website/ico64.png" class="web-icon" alt=""/>
      <div class="page-title">明日方舟一图流 EP14专题页面</div>
    </div>
    <!-- 简单说明 -->
    <div
        style="padding: 8px 16px; font-style: italic; line-height: 32px; background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px">
      <!--      上半页集中展示新章节<b>掉落数据</b><br />-->
      <!--      下半页为战备支援的<b>刷图攻略</b>-->
      <div style="font-size: 14px">*转载本页内容需注明来源</div>
    </div>
    <!-- 数据补全计划 -->
    <div style="background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px">
      <div style="text-align: center; font-size: 24px; font-weight: 600; padding-top: 6px">数据补全计划</div>
      <div style="margin: 0px 6px">
        <img src="/image/temp/ep12_drb.webp" style="width: 100%"/>
      </div>
      <div class="page-description">
        新章节开放时往往伴有明显的马太效应，即刷的人越多，数据越可靠，越能吸引更多的博士去刷；反之亦然。<br/>
        为了找到隐藏的高效率关卡，我们联合！缺少样本的关卡，我们碎石刷！<br/>
        同时欢迎大家参与提交数据！
      </div>
    </div>
    <!-- 数据补全计划表格 -->
    <div class="popup_table-wrap">
      <table class="popup_table" style="margin: auto">
        <tbody>
        <tr class="popup_table_title">
          <td class="popup_table_c1">关卡</td>
          <td class="popup_table_c2">主产物</td>
          <td class="popup_table_c2" v-if="show_secondary">副产物</td>
          <td class="popup_table_c4">样本数</td>
          <td class="popup_table_c5">置信度</td>
          <td class="popup_table_c6" style="width: 54px">SPM</td>
          <td class="popup_table_c7">综合效率</td>
          <!-- <td class="popup_table_c7" style="width: 80px">效率排名</td> -->
          <td class="popup_table_c7">原始数据</td>
          <!-- <td class="popup_table_c7" style="width:64px;">小样提升<br>(理论值)</td> -->
        </tr>
        <tr v-for="(stage, index) in tableData" :key="index" class="">
          <td>
            {{ stage.stageCode }}
          </td>
          <td>
            <!--              <div :class="`bg-${stage.itemId}`" style="transform: scale(0.8)"></div>-->
            <div class="item-sprite">
              <div :class="`bg-${stage.itemId}`"></div>
            </div>
          </td>
          <td v-if="show_secondary">
            <div class="item-sprite">
              <div :class="`bg-${stage.secondaryItemId}`"></div>
            </div>
            <!--              <div :class="`bg-${stage.secondaryId}`" style="transform: scale(0.6)"></div>-->
          </td>
          <td>
            {{ stage.sampleSize }}
          </td>
          <td>
            {{ sampleConfidenceFormat(stage.sampleConfidence, 1) }}
          </td>
          <td>
            {{ stage.spm }}
          </td>
          <td>{{ efficiencyFormat(stage.stageEfficiency * 100, 1) }}</td>
          <td><a :href="'https://penguin-stats.cn/report/stage/main_12/' + stage.stageId">企鹅物流</a></td>
        </tr>
        </tbody>
      </table>
    </div>
    <!-- 后勤特别许可证 -->
    <!--    <div style="background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px">-->
    <!--      <div style="text-align: center; font-size: 24px; font-weight: 600; padding: 12px 0px">后勤特别许可证</div>-->
    <!--      <div style="vertical-align: top; margin: auto">-->
    <!--        <div-->
    <!--          style="width: 96px; height: 96px; background: url('/image/temp/permit.webp'); display: inline-block; vertical-align: top; margin: 18px 12px 24px 12px"-->
    <!--        ></div>-->
    <!--        <div style="display: inline-block; max-width: 75%; line-height: 32px; padding-bottom: 8px">-->
    <!--          <div>◆本次活动新增后勤特别许可证：</div>-->
    <!--          <div>-->
    <!--            在【惊霆无声】任一可三星代理作战的关卡中，每日前两次作战可使用后勤特别许可证，使用后的当次作战不消耗理智且原常规掉落的报酬改为固定掉落且数量增加至三倍-->
    <!--          </div>-->
    <!--        </div>-->
    <!--      </div>-->
    <!--    </div>-->
    <!-- 推荐表-占位 -->

    <div
        style="background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px; text-align: center;display: none">
      <div style="text-align: center; font-size: 24px; font-weight: 600; padding: 12px 0px">不同主线进度收益率</div>
      <table style="margin: auto; padding: 8px" class="table_tip">
        <tr>
          <td style="width: 180px"> 通关进度</td>
          <td style="width: 180px"> 激励提升幅度</td>
          <td style="width: 180px"> 等效理智收益</td>
        </tr>
        <tr>
          <td> 基础激励</td>
          <td> 40%</td>
          <td> 117.5%</td>
        </tr>
        <tr>
          <td> 通关标准9-10</td>
          <td> +50%</td>
          <td> 118.8%</td>
        </tr>
        <tr>
          <td> 通关标准10-7</td>
          <td> +60%</td>
          <td> 120%</td>
        </tr>
        <tr>
          <td> 通关标准11-18</td>
          <td> +70%</td>
          <td> 121.3%</td>
        </tr>
        <tr>
          <td> 通关标准12-7</td>
          <td> +80%</td>
          <td> 122.5%</td>
        </tr>
        <tr>
          <td> 通关标准12-20</td>
          <td> +100%</td>
          <td> 125%</td>
        </tr>
      </table>
    </div>

    <div
        style="background-color: #ffffff0f; backdrop-filter: blur(8px); margin: 12px; text-align: center;display: none">
      <div style="text-align: center; font-size: 24px; font-weight: 600; padding: 12px 0px">不同活动刷图效率对比</div>
      <table style="margin: auto; padding: 8px" class="table_tip">
        <tr>
          <td style="width: 120px"> 材料类型</td>
          <td style="width: 100px"> 长草期</td>
          <td style="width: 100px"> Side Story</td>
          <td style="width: 100px"> 故事集</td>
          <td style="width: 100px">战备物资</td>
        </tr>
        <tr>
          <td> 固源岩系<br>(1-7)</td>
          <td rowspan="4">100%</td>
          <td> 101% <br> 活动关卡</td>
          <td rowspan="4"> 105%</td>
          <td rowspan="4"> 125%<br>(需通关12-20)</td>
        </tr>
        <tr>
          <td>晶体元件<br>(R8-11) <br>化合切削液<br>(12-17)</td>
          <td> 92% <br> 活动关卡</td>

        </tr>
        <tr>
          <td> 资源本<br>龙门币/芯片/红票等</td>
          <td> 100%</td>

        </tr>
        <tr>
          <td> 其他精英材料</td>
          <td> 110%-120%</td>
        </tr>
      </table>
    </div>


    <div style="display: flex; flex-wrap: wrap; justify-content: space-evenly">
      <a class="ep12_support" href="https://space.bilibili.com/21342479">
        <img class="ep12_support_img" src="/image/temp/babel.jpg"/>
        <div class="ep12_support_text">
          <div class="ep12_support_org">巴别塔攻略组</div>
          <div class="ep12_support_role">数据补全</div>
        </div>
      </a>
      <a class="ep12_support" href="https://penguin-stats.cn/">
        <img class="ep12_support_img" src="/image/temp/ps_logo.png"/>
        <div class="ep12_support_text">
          <div class="ep12_support_org">企鹅物流数据统计</div>
          <div class="ep12_support_role">数据收集</div>
        </div>
      </a>
      <a class="ep12_support" href="https://ark.yituliu.cn/">
        <img class="ep12_support_img" src="/image/website/ico64.png"/>
        <div class="ep12_support_text">
          <div class="ep12_support_org">明日方舟一图流</div>
          <div class="ep12_support_role">数据分析</div>
        </div>
      </a>
      <a class="ep12_support" href="https://space.bilibili.com/688411531">
        <img class="ep12_support_img" src="/image/temp/beta_logo_yw.png"/>
        <div class="ep12_support_text">
          <div class="ep12_support_org">逻辑元LogicalByte</div>
          <div class="ep12_support_role">信息发布</div>
        </div>
      </a>
      <!-- <a class="ep12_support">
        <img class="ep12_support_img" src="/image/temp/beta_logo_yw.png">
        <div class="ep12_support_text">
          <div class="ep12_support_org">xxxx</div>
          <div class="ep12_support_role">页面设计</div>
        </div>
      </a>         -->
    </div>
  </div>
</template>

<script setup>

import {onMounted, ref} from "vue";

const show_secondary = ref(true);

import materialAPI from '/src/api/material.js'

onMounted(() => {
  materialAPI.getNewChapterStage().then(response => {
    tableData.value = response.data
  })
})

const tableData = ref([]);

function sampleConfidenceFormat(confidence, digit) {
  digit = digit == void 0 ? 1 : digit;
  if (confidence == void 0 || confidence < 1) return ''
  return confidence.toFixed(digit) + "%"
}

function efficiencyFormat(efficiency, digit) {
  digit = digit == void 0 ? 1 : digit;
  if (efficiency == void 0 || efficiency < 1) return '样本不足'
  return efficiency.toFixed(digit) + "%"
}
</script>

<style scoped>
a {
  color: #ffffff;
}

#ep12 {
  /* background-color: rgb(0, 162, 255); */

}

.EP-page {
  max-width: 720px;
  margin: auto;
  background-image: url(/image/temp/EP14.jpg);
  background-size: 100%;
  color: antiquewhite;

  .web-icon {
    padding: 4px 0px 0px 0px;
    border-radius: 8px
  }

  .page-title-wrap {
    text-align: center;
    background-color: #ffffff0f;
    backdrop-filter: blur(8px);
    margin: 12px;
    display: flex;
    align-items: center;
  }

  .page-title {
    font-size: 32px;
    vertical-align: top;
    margin: 12px;
    display: inline-block
  }

  .placeholder {
    height: 210px;
  }

  .page-description {
    font-style: italic;
    padding: 0px 12px 12px 12px
  }

  .popup_table-wrap {
    background-color: #ffffff0f;
    backdrop-filter: blur(8px);
    margin: 12px
  }

  .popup_table {
    text-align: center;
  }

  .popup_table_title {
    font-size: 22px;
    line-height: 60px;
    color: white;
  }


  .item-sprite {
    width: 40px;
    height: 40px;
    position: relative;
  }

  .item-sprite div {
    position: absolute;
    transform: scale(0.2186);
    top: -72px;
    left: -72px;
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


  .table_tip {
    border-collapse: collapse;
  }

  .table_tip td {
    padding: 8px;
    border: 1px solid antiquewhite;
  }
}


@media screen and (max-width: 600px) {
  .EP-page {
    width: 360px;
    margin: auto;
    background-image: url(/image/temp/EP14.jpg);
    background-size: 100%;
    color: antiquewhite;

    .web-icon {
      width: 28px;
    }

    .placeholder {
      height: 90px;
    }

    .page-title {
      font-size: 20px;
      vertical-align: top;
      margin: 8px;
      display: inline-block
    }

    .page-description {
      font-style: italic;
      font-size: 14px;
      padding: 0 12px 12px 12px
    }

    .popup_table_title {
      font-size: 10px;
      line-height: 40px;
      color: white;
    }

    .popup_table {
      font-size: 10px;
    }

    .item-sprite {
      width: 24px;
      height: 24px;
      position: relative;
    }

    .item-sprite div {
      position: absolute;
      transform: scale(0.1311);
      top: -80px;
      left: -80px;
    }

    .ep12_support {
      margin: 4px;
      width: 160px;
      height: 48px;
    }

    .ep12_support_img {
      width: 48px;
    }

    .ep12_support_text {
      width: 100px;
      font-size: 12px;
      height: 48px;
    }

    .ep12_support_text div {
      height: 16px;
      text-align: center;
    }

  }
}


</style>
