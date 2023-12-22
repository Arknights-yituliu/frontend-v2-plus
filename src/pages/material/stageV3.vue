<template>
  <!-- 地图效率Start -->
  <div id="stage" style="font-family: Arial, Helvetica, sans-serif;">
    <!-- 标题区域 -->
    <div class="op_title">
      <div class="op_title_text">
        <div class="op_title_ctext">推荐关卡</div>
        <div class="op_title_etext_light">Best Stages</div>
      </div>
      <div class="op_title_tag">
        <!-- <div class="op_tag_0">图例</div> -->
        <div :class="efficiencyTypeBtnClass('single')" @click="displaySingleOrCompleteEfficiency('single')">
          单一材料效率
        </div>
        <div :class="efficiencyTypeBtnClass('complete')" @click="displaySingleOrCompleteEfficiency('complete')">
          关卡综合效率
        </div>
        <div class="op_tag_0" @click="scrollToOrundumTable()">搓玉数据</div>
        <div class="op_tag_0" @click="scrollToHistoryStageTable()">往期活动</div>
        <div class="op_tag_0" @click="scrollToFrequentlyAskedQuestion()">常见问题</div>
        <!-- <div id="upStageKey" class="op_tag_0" @click="showNowActive()">只显示up</div> -->
        <!--          <div id="orundumStageKey" class="op_tag_0" @click="showOrundumPopup()">搓玉版</div>-->
        <!--          <div id="historyStageKey" class="op_tag_0" @click="showHistoryPopup()">往期活动效率</div>-->

        <div class="tab_text">*点击卡片查看详情</div>
      </div>
      <!-- <div class="op_title_tag" style="height: 24px">
          <div class="tab_text">
            占位
          </div>
        </div> -->
    </div>
    <!-- 说明区域 -->
    <div class="stage_3_intro" :style="`display:${legendStyle} `">
      <!-- 长期最优 -->
      <div class="stage_card_3_intro_left">
        <div class="img_wrap" style="position: relative;">
          <div class="stage_card_3_mainImg" :class="getItemSeriesSprite('31013')">
            <div class="stage_card_3_cover" style="height:114px;"></div>
            <div class="stage_card_3_best" style="font-size: 16px;">
              <div class="stage_card_3_best_chapter" style="font-size: 12px;"><b style="font-weight: 600;">所有材料</b>都有需求
              </div>
              刷这个
              <div class="stage_card_3_markText_l">综合最优</div>
            </div>
          </div>
        </div>
      </div>
      <!-- 短期最优 -->
      <div class="stage_card_3_intro_right">
        <!-- 数值图例 -->
        <div id="stage_card_3_intro_block_1">
          <div class="stage_card_3_list" style="width:168px;height: 105px;font-size: 12px;line-height: 24px;">
            <div class="stage_card_3_line" style="width:168px;height: 32px;display: flex;">
              <div class="stage_card_3_img">
                <div :class="getItemT3Sprite(31014)"></div>
              </div>
              <div class="stage_card_3_line_text"
                   style="font-size: 12px;width: 75px;line-height: 16px;text-align: center;margin-top: 4px;">
                只需求<span style="color: blueviolet;">紫材料</span><br>刷这个
              </div>
              <div class="stage_card_3_line_text"
                   style="font-size: 12px;width: 54px;font-style: italic;margin-left: 8px;font-weight: 400;">T4效率值
              </div>
            </div>
            <div class="stage_card_3_line" style="width:168px;height: 32px;display: flex;flex-wrap: wrap;">
              <div class="stage_card_3_img">
                <div :class="getItemT3Sprite(31013)"></div>
              </div>
              <div class="stage_card_3_line_text"
                   style="font-size: 12px;width: 75px;line-height: 16px;text-align: center;margin-top: 4px;">
                只需求<span style="color:rgb(0, 125, 167);">蓝材料</span><br>刷这个
              </div>
              <div class="stage_card_3_line_text"
                   style="font-size: 12px;width: 54px;font-style: italic;margin-left: 8px;font-weight: 400;">T3效率值
              </div>
            </div>
            <div class="intro_effBar" style="width: 168px;height: 20px;">
              <div class="stage_card_3_line_bar" style="width: 96px;display: inline-block;margin: 2px 6px;"
                   :style="getLineBarLength(0, 0, 0.7, 0.9)"></div>
              <div class="intro_effBar_intro" style="display: inline-block;font-weight: 600;">效率指示条</div>
            </div>
          </div>
          <div class="stage_card_3_markText">短期最优</div>
        </div>
        <!-- 图表图例 -->
        <div id="stage_card_3_intro_block_2" style="width: 54%;font-size: 12px;border-left: 1px solid;">
          <div class="stage_card_3_list" style="width:210px;height: 108px;line-height: 24px;margin: 8px auto;">
            <div class="intro_effBar" style="height: 32px;">
              <div class="stage_card_3_line_bar" style="width: 96px;display: inline-block;margin: 2px 6px;"
                   :style="getLineBarLength(0, 0, 0, 0)"></div>
              <div class="intro_effBar_intro" style="display: inline-block;font-weight: 600;margin-left: -16px;">
                每格代表20%的效率
              </div>
            </div>
            <div class="intro_effBar" style="height: 32px;">
              <div class="stage_card_3_line_bar" style="width: 96px;display: inline-block;margin: 2px 6px;"
                   :style="getLineBarLength(0, 0, 0, 0.9)"></div>
              <div class="intro_effBar_intro" style="display: inline-block;font-weight: 600;margin-left: -16px;">
                所有掉落物的总效率
              </div>
            </div>
            <div class="intro_effBar" style="height: 32px;">
              <div class="stage_card_3_line_bar" style="width: 96px;display: inline-block;margin: 2px 6px;"
                   :style="getLineBarLength(0, 0, 0.7, 0.7)"></div>
              <div class="intro_effBar_intro" style="display: inline-block;font-weight: 600;margin-left: -16px;">
                T4/T3/T2材料的效率
              </div>
              <div style="font-size: 12px;"></div>
            </div>
            <div class="intro_effBar" style="height: 24px;margin-right: 8px;text-align: right;">
              <el-button type="primary" size="small" @click="scrollToLegendDescription">
                看看细节
              </el-button>
              <el-button type="primary" size="small" @click="hiddenLegend()">
                不再显示
              </el-button>
            </div>
          </div>
        </div>
        <!-- 操作区域 -->
        <!-- <div class="stage_card_3_intro_block" style="width: 15%;">
            </div> -->
      </div>
    </div>
    <!-- 卡片区域 -->
    <div id="stage_3">
      <!-- {{ item_card_data[10] }} -->
      <!-- 正式卡片 -->
      <div class="stage_card_3" v-for="(stage, index) in item_card_data" :key="index"
           @click="getItemTableData(index, true)">
        <!-- 长期最优 -->
        <div class="stage_card_3_left">
          <div class="img_wrap" style="position: relative;">
            <div class="stage_card_3_mainImg" :class="getItemSeriesSprite(stage.series.r3)">
              <div class="stage_card_3_cover"></div>
              <div class="stage_card_3_best">
                <div class="stage_card_3_best_chapter">{{ replaceZoneName(stage.maxEfficiencyStage.zoneName) }}</div>
                {{ stage.maxEfficiencyStage.stageCode }}
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
                <div class="stage_card_3_line_text">{{ stage.leT4MaxEfficiencyStage.stageCode }}</div>
                <div class="stage_card_3_line_text" style="font-style: italic;font-weight: 400;font-size: 15px;"
                     v-show="efficiencyType==='single'">
                  {{ formatNumber(stage.leT4MaxEfficiencyStage.leT4Efficiency * 100, 1) }}%
                </div>
                <div class="stage_card_3_line_text" style="font-style: italic;font-weight: 400;font-size: 15px;"
                     v-show="efficiencyType==='complete'">
                  {{ formatNumber(stage.leT4MaxEfficiencyStage.stageEfficiency * 100, 1) }}%
                </div>
                <div class="stage_card_3_line_bar"
                     :style="getLineBarLength(0, 0, stage.leT4MaxEfficiencyStage.leT4Efficiency , stage.leT4MaxEfficiencyStage.stageEfficiency)">
                </div>
              </div>
            </div>
            <div class="stage_card_3_line">
              <div class="stage_card_3_img">
                <div :class="getItemT3Sprite(stage.series.r3)"></div>
              </div>
              <div class="stage_card_3_data">
                <div class="stage_card_3_line_text">{{ stage.leT3MaxEfficiencyStage.stageCode }}</div>
                <div class="stage_card_3_line_text" style="font-style: italic;font-weight: 400;font-size: 15px;"
                     v-show="efficiencyType==='single'">
                  {{ formatNumber(stage.leT3MaxEfficiencyStage.leT3Efficiency * 100, 1) }}%
                </div>
                <div class="stage_card_3_line_text" style="font-style: italic;font-weight: 400;font-size: 15px;"
                     v-show="efficiencyType==='complete'">
                  {{ formatNumber(stage.leT3MaxEfficiencyStage.stageEfficiency * 100, 1) }}%
                </div>
                <div class="stage_card_3_line_bar"
                     :style="getLineBarLength(0, stage.leT3MaxEfficiencyStage.leT3Efficiency, 0, stage.leT3MaxEfficiencyStage.stageEfficiency)">
                </div>
                {{ stage.stageEfficiency }}
              </div>
            </div>
            <div class="stage_card_3_line" v-show="stage.series.r2">
              <div class="stage_card_3_img">
                <div :class="getItemT3Sprite(stage.series.r2)"></div>
              </div>
              <div class="stage_card_3_data">
                <div class="stage_card_3_line_text">{{ stage.leT2MaxEfficiencyStage.stageCode }}</div>
                <div class="stage_card_3_line_text" style="font-style: italic;font-weight: 400;font-size: 15px;"
                     v-show="efficiencyType==='single'">
                  {{ formatNumber(stage.leT2MaxEfficiencyStage.leT2Efficiency * 100, 1) }}%
                </div>
                <div class="stage_card_3_line_text" style="font-style: italic;font-weight: 400;font-size: 15px;"
                     v-show="efficiencyType==='complete'">
                  {{ formatNumber(stage.leT2MaxEfficiencyStage.stageEfficiency * 100, 1) }}%
                </div>
                <div class="stage_card_3_line_bar"
                     :style="getLineBarLength(stage.leT2MaxEfficiencyStage.leT2Efficiency , 0, 0, stage.leT2MaxEfficiencyStage.stageEfficiency)">
                </div>
              </div>
            </div>
          </div>
          <div class="stage_card_3_markText">短期最优 {{ stage.stageEfficiency }}</div>
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
        <div class="tab_text">*移动端可左右拖动查看</div>
      </div>
    </div>
    <!-- 材料信息 -->
    <!-- <div id="itemDetail">
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
      <div id="detailRight">
        绿票商店兑换优先级：0.6（低）[蓝材料]<br>
        寻访数据契约商店：0.4（低）/0.3（极低）[蓝/紫材料]<br>
        信用商店：0.4（低）/0.3（极低）[绿/白材料]<br>
        合约商店无限池：0.4（低）/0.3（极低）[蓝材料]<br>
        查看所有商店性价比
      </div>
    </div> -->
    <!-- 详情表 -->
    <div class="tableArea" style="margin : 8px;max-width: 1080px;" id="detail-table">
      <el-table class="detailTable" stripe :data="item_table_data_by_item_id" max-height="450">
        <el-table-column fixed prop="stageCode" label="关卡名" :width="td_6" sortable>
          <template #default="scope">
            <div>
              <span style="font-size: 10px;line-height: 8px;">{{ replaceZoneName(scope.row.zoneName) }}</span><br>
              {{ scope.row.stageCode }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="primary" label="主产物" :width="td_1">
          <template #default="scope">
            <div class="detail-table-item-wrap">
              <div :class="getDetailTableItemSprite(scope.row.itemId)"></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="primary" label="主产物掉率" :width="td_1">
          <template #default="scope">
            {{ formatNumber(scope.row.knockRating * 100, 1) }}%
          </template>
        </el-table-column>
        <el-table-column prop="secondary" label="副产物" :width="td_1">
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
        <el-table-column prop="spm" label="SPM" :width="td_4" sortable/>
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
      <div class="op_title_tag" id="description">
        <div class="tab_text">*主产物/副产物：价值占比最高/第二高的产物</div>
        <br>
        <div class="tab_text">*综合效率：产物的总价值 / 关卡理智消耗，长期囤材料建议以这个为参考依据</div>
        <br>
        <div class="tab_text">*T4效率 = (对应紫材料价值+对应蓝材料价值+对应绿材料价值+对应白材料价值) / 关卡理智消耗
        </div>
        <br>
        <div class="tab_text">*T3效率 = (对应蓝材料价值+对应绿材料价值+对应白材料价值) / 关卡理智消耗</div>
        <br>
        <div class="tab_text">*T2效率 = (对应绿材料价值+对应白材料价值) / 关卡理智消耗</div>
        <br>
        <div class="tab_text">*SPM：1倍速下每分钟消耗的理智，假设所有敌人均被秒杀，实际可能略大于该值</div>
      </div>
    </div>

    <!-- 搓玉 -->
    <div class="op_title" id="orundum-table">
      <div class="op_title_text">
        <div class="op_title_ctext">搓玉数据表</div>
        <div class="op_title_etext_light">Orundum</div>
      </div>
      <div class="op_title_tag">
        <!-- <div class="op_tag_0">图例</div> -->
        <div class="op_tag_0" @click="filterOrundumStage()">仅显示活动关</div>
      </div>
    </div>
    <div class="tableArea" style="margin : 8px;max-width: 720px;">
      <el-table class="detailTable" :data="displayOrundumRecommendedStage" stripe style="width: 100%;height: 400px;">
        <el-table-column prop="stageCode" label="关卡名"/>
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
        <el-table-column prop="orundumPerApEfficiency" label="搓玉效率"/>
        <el-table-column prop="stageEfficiency" label="关卡效率"/>
      </el-table>
    </div>
    <!-- 历史活动 -->
    <div class="op_title" id="history-stage-table">
      <div class="op_title_text">
        <div class="op_title_ctext">往期活动数据</div>
        <div class="op_title_etext_light">History Event</div>
      </div>
      <div class="op_title_tag">
        <!-- <div class="op_tag_0">图例</div> -->
        <div :class="historyActDeviceBtnClass('phone')" @click="chooseHistoryActDevice('phone')">紧密模式
        </div>
        <div :class="historyActDeviceBtnClass('pc')" @click="chooseHistoryActDevice('pc')">表格模式</div>
      </div>
    </div>
    <!-- pc端大表格 -->
    <div class="act-table-wrap" id="act-table-pc">
      <table class="act-table">
        <tbody>
        <tr>
          <td class="act-name">活动名称</td>
          <td v-for="(item, index) in itemIdList" :key="index">
            <div class="act-table-item-wrap" style="height: 42px;margin-top: 8px;">
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
    </div>
    <!-- 移动端小列表 -->
    <div class="act-table-simple-wrap detailTable" id="act-table-phone" style="max-width: 600px;">
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
                {{ formatNumber(stage.stageEfficiency * 100, 2) }}%
              </span>
            </div>
          </td>
        </tr>
      </table>
    </div>
    <!-- 常见问题 -->
    <div class="op_title" id="frequently-asked-question">
      <div class="op_title_text">
        <div class="op_title_ctext">常见问题</div>
        <div class="op_title_etext_light">FAQ</div>
      </div>
      <div class="op_title_tag" style="height: 24px">
        <div class="tab_text">
        </div>
      </div>
    </div>

    <div id="foot_main">
      <div class="foot_unit" style="width: 100%; white-space: normal">
        <el-card class="box-card">
          <el-collapse>
            <el-collapse-item name="1" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center">
                  <el-icon>
                    <Comment/>
                  </el-icon><b style="margin-left: 4px">网站反馈</b>
                </span>
              </template>
              <a href="https://docs.qq.com/form/page/DVVNyd2J5RmV2UndQ">点击此处</a>通过问卷反馈问题/提供建议，<a
                href="https://jq.qq.com/?_wv=1027&k=q1z3p9Yj">点击此处</a>加入粉丝群。
            </el-collapse-item>
            <el-collapse-item name="2" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center"><el-icon>
                    <TrendCharts/>
                  </el-icon><b style="margin-left: 4px">算法简述与图例</b></span>
              </template>
              <b>通过[物品价值表]中的物品价值和[企鹅物流数据统计]中的材料掉率计算各个关卡的效率</b>
              <hr/>
              <ul style="padding-left: 2em">
                <li>只有多于300样本的关卡才会被收录。</li>
                <li>仅收录由自动刷图软件上报的掉落数据。</li>
                <li>活动关卡只在活动期间出现。</li>
                <li>插曲和别传常驻后重新计算效率，该效率与活动时无关。</li>
              </ul>
              <b>图例</b>
              <hr/>
              <div class="stage_3_intro">
                <!-- 长期最优 -->
                <div class="stage_card_3_intro_left">
                  <div class="img_wrap" style="position: relative;">
                    <div class="stage_card_3_mainImg" :class="getItemSeriesSprite('31013')">
                      <div class="stage_card_3_cover" style="height:114px;"></div>
                      <div class="stage_card_3_best" style="font-size: 16px;">
                        <div class="stage_card_3_best_chapter" style="font-size: 12px;"><b
                            style="font-weight: 600;">所有材料</b>都有需求
                        </div>
                        刷这个
                        <div class="stage_card_3_markText_l">综合最优</div>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 短期最优 -->
                <div class="stage_card_3_intro_right">
                  <!-- 数值图例 -->
                  <div id="stage_card_3_intro_block_1">
                    <div class="stage_card_3_list" style="width:168px;height: 105px;font-size: 12px;line-height: 24px;">
                      <div class="stage_card_3_line" style="width:168px;height: 32px;display: flex;">
                        <div class="stage_card_3_img">
                          <div :class="getItemT3Sprite(31014)"></div>
                        </div>
                        <div class="stage_card_3_line_text"
                             style="font-size: 12px;width: 75px;line-height: 16px;text-align: center;margin-top: 4px;">
                          只需求<span style="color: blueviolet;">紫材料</span><br>刷这个
                        </div>
                        <div class="stage_card_3_line_text"
                             style="font-size: 12px;width: 54px;font-style: italic;margin-left: 8px;font-weight: 400;">
                          T4效率值
                        </div>
                      </div>
                      <div class="stage_card_3_line" style="width:168px;height: 32px;display: flex;flex-wrap: wrap;">
                        <div class="stage_card_3_img">
                          <div :class="getItemT3Sprite(31013)"></div>
                        </div>
                        <div class="stage_card_3_line_text"
                             style="font-size: 12px;width: 75px;line-height: 16px;text-align: center;margin-top: 4px;">
                          只需求<span style="color:rgb(0, 125, 167);">蓝材料</span><br>刷这个
                        </div>
                        <div class="stage_card_3_line_text"
                             style="font-size: 12px;width: 54px;font-style: italic;margin-left: 8px;font-weight: 400;">
                          T3效率值
                        </div>
                      </div>
                      <div class="intro_effBar" style="width: 168px;height: 20px;">
                        <div class="stage_card_3_line_bar" style="width: 96px;display: inline-block;margin: 2px 6px;"
                             :style="getLineBarLength(0, 0, 0.7, 0.9)"></div>
                        <div class="intro_effBar_intro" style="display: inline-block;font-weight: 600;">效率指示条</div>
                      </div>
                    </div>
                    <div class="stage_card_3_markText">短期最优</div>
                  </div>
                  <!-- 图表图例 -->
                  <div id="stage_card_3_intro_block_2" style="width: 54%;font-size: 12px;border-left: 1px solid;">
                    <div class="stage_card_3_list"
                         style="width:210px;height: 108px;line-height: 24px;margin: 8px auto;">
                      <div class="intro_effBar" style="height: 32px;">
                        <div class="stage_card_3_line_bar" style="width: 96px;display: inline-block;margin: 2px 6px;"
                             :style="getLineBarLength(0, 0, 0, 0)"></div>
                        <div class="intro_effBar_intro"
                             style="display: inline-block;font-weight: 600;margin-left: -16px;">
                          每格代表20%的效率
                        </div>
                      </div>
                      <div class="intro_effBar" style="height: 32px;">
                        <div class="stage_card_3_line_bar" style="width: 96px;display: inline-block;margin: 2px 6px;"
                             :style="getLineBarLength(0, 0, 0, 0.9)"></div>
                        <div class="intro_effBar_intro"
                             style="display: inline-block;font-weight: 600;margin-left: -16px;">
                          所有掉落物的总效率
                        </div>
                      </div>
                      <div class="intro_effBar" style="height: 32px;">
                        <div class="stage_card_3_line_bar" style="width: 96px;display: inline-block;margin: 2px 6px;"
                             :style="getLineBarLength(0, 0, 0.7, 0.7)"></div>
                        <div class="intro_effBar_intro"
                             style="display: inline-block;font-weight: 600;margin-left: -16px;">
                          T4/T3/T2材料的效率
                        </div>
                        <div style="font-size: 12px;"></div>
                      </div>
                    </div>
                  </div>
                  <!-- 操作区域 -->
                  <!-- <div class="stage_card_3_intro_block" style="width: 15%;">
            </div> -->
                </div>
              </div>
            </el-collapse-item>
            <el-collapse-item name="3" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center"><el-icon>
                    <Checked/>
                  </el-icon><b style="margin-left: 4px">算法公示卡</b></span>
              </template>
              <table id="al_card">
                <tbody>
                <tr>
                  <td>算法代号</td>
                  <td>一图流_标准 v6.0</td>
                  <td>更新时间</td>
                  <td>
                    <!-- {{ updateTime }} -->
                  </td>
                </tr>
                <tr>
                  <td>数据源</td>
                  <td>企鹅物流</td>
                  <td>基准</td>
                  <td>常驻关卡</td>
                </tr>
                <tr>
                  <td>计算引擎</td>
                  <td>yituliuBackEnd</td>
                  <td>样本阈值</td>
                  <td>300</td>
                </tr>
                <tr>
                  <td>需求目标</td>
                  <td>无限需求</td>
                  <td>EXP系数</td>
                  <td>0.625</td>
                </tr>
                </tbody>
              </table>
            </el-collapse-item>
            <el-collapse-item name="4" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center">
                  <el-icon>
                    <Warning/>
                  </el-icon><b style="margin-left: 4px">版权声明与许可协议</b>
                </span>
              </template>
              网站所涉及的公司名称、商标、产品等均为其各自所有者的资产，仅供识别。网站内使用的游戏图片、动画、音频、文本原文，仅用于更好地表现游戏资料，其版权属于
              Arknights/上海鹰角网络科技有限公司。<br>
              除非另有声明，网站其他内容采用<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh">知识共享
              署名-非商业性使用 4.0 国际
              许可协议</a>进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和直接指向被引用页面的链接；且未经许可不得将本站内容或由其衍生作品用于商业目的。<br>
              本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来<a
                href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">开发群</a>一叙。
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </div>
    </div>
    <!-- <foot-component></foot-component> -->

  </div>
</template>

<script setup>
import stageApi from '/src/api/stage'
import {onMounted, ref} from "vue";
import item_series from '/src/static/json/material/item_series.json'

// 根据物品系列进行分组的推荐关卡
let stageResultGroup = ref()
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
    {token: '4005', costPerf: 0.75},
    {token: 'EPGS_COIN', costPerf: 0.75},
    {token: 'REP_COIN', costPerf: 0.75},
    {token: '4004', costPerf: 0.75}
  ]
})

// 获取关卡推荐数据
stageApi.getStageResultGroupByItemSeries(0.625, 300).then(response => {
  stageResultGroup.value = response.data.recommendedStageList.sort((a, b) => a.itemSeriesId - b.itemSeriesId)
  //将后端返回的数据组装为卡片需要的数据格式
  getItemCardData()
  //获取材料价值数据
  stageApi.getItemValueTable(0.625).then(response => {
    for (const item of response.data) {
      item_value_obj.value[item.itemId] = item;
    }
    getItemTableData(0, false)
  })
})


/**
 * 拼接材料卡片的数据
 */
function getItemCardData() {
  for (let index in stageResultGroup.value) {
    //每一种材料系列的推荐关卡
    let recommended_stage = stageResultGroup.value[index]
    //推荐关卡集合
    let stageResultList = recommended_stage.stageResultList;

    let leT4MaxEfficiencyStage = {leT4Efficiency:0}
    let leT3MaxEfficiencyStage = {leT3Efficiency:0}
    let leT2MaxEfficiencyStage = {leT2Efficiency:0}
    let maxEfficiencyStage = {stageEfficiency:0}

    for (const stage of stageResultList) {

      const {stageEfficiency, leT4Efficiency, leT3Efficiency, leT2Efficiency} = stage

      console.log(leT4MaxEfficiencyStage.leT4Efficiency, '<' ,leT4Efficiency ,'---', leT4MaxEfficiencyStage.leT4Efficiency < leT4Efficiency  )

      if (maxEfficiencyStage.stageEfficiency < stageEfficiency) {
        maxEfficiencyStage = stage
      }
      if (leT4MaxEfficiencyStage.leT4Efficiency < leT4Efficiency) {
        leT4MaxEfficiencyStage = stage
      }
      if (leT3MaxEfficiencyStage.leT3Efficiency < leT3Efficiency) {
        leT3MaxEfficiencyStage = stage
      }
      if (leT2MaxEfficiencyStage.leT2Efficiency < leT2Efficiency) {
        leT2MaxEfficiencyStage = stage
      }


    }

    //获得每种评价标准的最优关和效率
    // const item_recommend_stage = {
    //   maxEfficiencyStage: getStageDataByProperty(stage_result_list, 'stageEfficiency'),
    //   leT4MaxEfficiencyStage: getStageDataByProperty(stage_result_list, 'leT5Efficiency'),
    //   leT3MaxEfficiencyStage: getStageDataByProperty(stage_result_list, 'leT4Efficiency'),
    //   leT2MaxEfficiencyStage: getStageDataByProperty(stage_result_list, 'leT3Efficiency'),
    //   series: {r4: '', r3: '', r2: '', r1: ''}
    // }

    const item_recommend_stage = {
      maxEfficiencyStage: maxEfficiencyStage,
      leT4MaxEfficiencyStage: leT4MaxEfficiencyStage,
      leT3MaxEfficiencyStage: leT3MaxEfficiencyStage,
      leT2MaxEfficiencyStage: leT2MaxEfficiencyStage,
      series: {r4: '', r3: '', r2: '', r1: ''}
    }

    //获得该材料系列的上下级材料的物品id
    item_recommend_stage.series = item_series[recommended_stage.itemSeriesId].series

    item_card_data.value.push(item_recommend_stage)
    // console.log(item_recommend_stage)
  }
}

let efficiencyType = ref('single')

/**
 * 显示单一材料效率或关卡综合效率
 */
function displaySingleOrCompleteEfficiency(type) {
  efficiencyType.value = type
}

function efficiencyTypeBtnClass(device) {
  if (device === efficiencyType.value) {
    return 'op_tag_1'
  }
  return 'op_tag_0'
}

/**
 * 根据传入的对象属性进行倒序排序,获得该属性最优关卡
 * @param stageList 推荐关卡集合
 * @param property 要排序的属性
 * @returns {{efficiency, stageCode}} 该属性最优关卡效率和关卡名称
 */
function getStageDataByProperty(stageList, property) {
  stageList.sort((a, b) => {
    return b[property] - a[property]
  })
  for (const index in stageList) {
    const stage = stageList[index]
    if (stage.endTime < nowTimeStamp) continue;
    return {
      stageCode: stage.stageCode,
      efficiency: stage[property],
      stageEfficiency: stage.stageEfficiency,
      zoneName: stage.zoneName
    }
  }
}

//根据物品id获得对应的关卡推荐数据集合
let item_table_data_by_item_id = ref([])

/**
 * 根据索引获得对应材料系列的所有推荐关卡
 * @param {number} index 集合索引,卡片展示的材料和索引对应  简单例子[0:xxx材料的所有数据]
 * @param {boolean} isJump 是否跳转到表格位置
 */
function getItemTableData(index, isJump) {
  //当前材料系列的推荐关卡
  let recommended_stage = stageResultGroup.value[index];
  //推荐关卡集合
  let stage_result_list = recommended_stage.stageResultList;
  //拼接表格数据,默认按总效率排序
  item_table_data_by_item_id.value = stage_result_list.sort((a, b) => b.stageEfficiency - a.stageEfficiency)

  if (isJump) {
    document.getElementById('detail-table').scrollIntoView({behavior: 'smooth', block: 'center'})
  }
}


function replaceZoneName(str) {
  if (typeof str === "undefined") return ''
  return str.replace("(标准)", '')
}

let legendStyle = ref('')
onMounted(() => {
  legendStyle.value = localStorage.getItem('itemLegend') ? localStorage.getItem('itemLegend') : ''
})

/**
 * 隐藏图例
 */
function hiddenLegend() {
  legendStyle.value = 'none'
  localStorage.setItem('itemLegend', 'none')
}

/**
 * 滚动到图例说明
 */
function scrollToLegendDescription() {
  document.getElementById('description').scrollIntoView({behavior: 'smooth'})
}

/**
 * 滚动到搓玉关卡表
 */
function scrollToOrundumTable() {
  document.getElementById('orundum-table').scrollIntoView({behavior: 'smooth'})
}

/**
 * 滚动到历史活动关卡表
 */
function scrollToHistoryStageTable() {
  document.getElementById('history-stage-table').scrollIntoView({behavior: 'smooth'})
}

/**
 * 滚动到常见问题
 */
function scrollToFrequentlyAskedQuestion() {
  document.getElementById('frequently-asked-question').scrollIntoView({behavior: 'smooth'})
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

let debug = "";

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
  // Tx效率层
  let T4Layer = "linear-gradient(to right ,";
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
  // Tx效率层
  let stageLayer = "linear-gradient(to right ,";
  if (stageEff < 0.2) {
    stageLayer = stageLayer + stageEffColor + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
  } else {
    stageLayer = stageLayer + stageEffColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ,"
    if (stageEff < 0.4) {
      stageLayer = stageLayer + stageEffColor + 0.2 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
    } else {
      stageLayer = stageLayer + stageEffColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ,"
      if (stageEff < 0.6) {
        stageLayer = stageLayer + stageEffColor + 0.4 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
      } else {
        stageLayer = stageLayer + stageEffColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ,"
        if (stageEff < 0.8) {
          stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
        } else {
          stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ,"
          if (stageEff < 1) {
            stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
          } else {
            stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 1 * 83.33 + "% ,"
            stageLayer = stageLayer + stageEffColor + 1 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
          }
        }
      }
    }
  }
  // 关卡效率层
  // let stageLayer = "linear-gradient(to right ," + stageEffColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ," + stageEffColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ," + stageEffColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ,";
  // if (stageEff < 0.8) {
  //   stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
  // } else {
  //   stageLayer = stageLayer + stageEffColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ,"
  //   if (stageEff < 1) {
  //     stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
  //   } else {
  //     stageLayer = stageLayer + stageEffColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 1 * 83.33 + "% ,"
  //     stageLayer = stageLayer + stageEffColor + 1 * 83.33 + "% " + stageEff * 83.33 + "%,rgba(0, 255, 0, 0) " + stageEff * 83.33 + "%)"
  //   }
  // }


  // 默认显示5个格子
  // let standardLayer = "linear-gradient(to right ," + standardColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ," + standardColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ," + standardColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ," + standardColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ," + standardColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.99 * 83.33 + "% " + 83.33 + "% ," + standardColor + 83.33 + "% 101%)";
  let standardLayer = "linear-gradient(to right ," + standardColor + 0.19 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.19 * 83.33 + "% " + 0.2 * 83.33 + "% ," + standardColor + 0.2 * 83.33 + "% " + 0.39 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.39 * 83.33 + "% " + 0.4 * 83.33 + "% ," + standardColor + 0.4 * 83.33 + "% " + 0.59 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.59 * 83.33 + "% " + 0.6 * 83.33 + "% ," + standardColor + 0.6 * 83.33 + "% " + 0.79 * 83.33 + "%,rgba(0, 255, 0, 0) " + 0.79 * 83.33 + "% " + 0.8 * 83.33 + "% ," + standardColor + 0.8 * 83.33 + "% " + 0.99 * 83.33 + "%,rgba(0, 255, 0, 0) " + 83.33 + "% 101%)";
  return "background:" + T4Layer + "," + stageLayer + "," + standardLayer + ";";
}


/**
 * 格式化数字
 * @param {number} num 数字
 * @param {number} acc 位数
 * @returns {string} 格式化后的数字
 */
function formatNumber(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  if (typeof num === "undefined") return ''
  return parseFloat(num.toString()).toFixed(acc);
}

onMounted(() => {

})

let td_1 = ref()
let td_2 = ref()
let td_3 = ref()
let td_4 = ref()
let td_5 = ref()
let td_6 = ref()


let itemIdList = [] // 材料表
let historyActItemTable = ref([]) // 历史活动up材料表
let historyActItemList = ref([])

let historyActDevice = ref('')

/**
 * 传入一个设备类型，将其赋值给 historyActDevice 按钮通过 historyActDevice 进行判断是什么模式
 * @param {string} device
 */
function chooseHistoryActDevice(device) {
  historyActDevice.value = device
  const pcElement = document.getElementById('act-table-pc')
  const phoneElement = document.getElementById('act-table-phone')
  if (device === 'pc') {
    pcElement.style.display = 'block'
    phoneElement.style.display = 'none'
  } else if (device === 'phone') {
    pcElement.style.display = 'none'
    phoneElement.style.display = 'block'
  }

}


function historyActDeviceBtnClass(device) {
  if (device === historyActDevice.value) {
    return 'op_tag_1'
  }
  return 'op_tag_0'
}

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


})


function getCellBgColor(flag) {

  if (flag) {
    return 'background-color: #82beff80'
  }
  return ''
}


let orundumRecommendedStage = ref([])
let displayOrundumRecommendedStage = ref([])
let onlyShowActStage = ref(false)

/**
 * 过滤搓玉推荐关卡，只显示1-7，CW-6和当前活动关
 */
function filterOrundumStage() {
  onlyShowActStage.value = !onlyShowActStage.value
  if (onlyShowActStage.value) {
    displayOrundumRecommendedStage.value = []
    for (const stage of orundumRecommendedStage.value) {
      if (stage.stageCode === '1-7' || stage.stageCode === 'CW-6' || stage.stageType === 'ACT') {
        displayOrundumRecommendedStage.value.push(stage)
      }
    }
  } else {
    displayOrundumRecommendedStage.value = orundumRecommendedStage.value
  }
}

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
  displayOrundumRecommendedStage.value = orundumRecommendedStage.value
})

// for(let id in item_series){
//   item_series[id] =  {
//     t4:id.substring(0,4)+'4',
//     t3:id.substring(0,4)+'3',
//     t2:id.substring(0,4)+'2',
//     t1:id.substring(0,4)+'1',
//   }
// }

onMounted(() => {
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
})
</script>


