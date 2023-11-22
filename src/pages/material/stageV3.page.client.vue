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
              <div class="stage_card_3_mainImg bg-30013 stage_sprite_t3" style="transform: scale(1);">
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
                <div class="stage_card_3_img"><img :src="`/image/items/30014.png`" alt="" style="height: 32px"></div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T4最优关</div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T4效率 </div>

              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_img"><img :src="`/image/items/30013.png`" alt="" style="height: 32px"></div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T3最优关</div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T3效率 </div>

              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_img"><img :src="`/image/items/30012.png`" alt="" style="height: 32px"></div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T2最优关</div>
                <div class="stage_card_3_line_text" style="font-size: 12px;">T2效率 </div>

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
              <!-- <div class="stage_card_3_line">
                <div class="stage_card_3_line_text" style="font-size: 12px;width:48px;">综合最优</div>
                <div class="stage_card_3_line_text" style="font-size: 12px;font-weight:500;width:180px;">
                  该关卡所有掉落物的<b>总价值</b>最高 </div>
              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_img"><img :src="`/image/items/30014.png`" style="height: 28px;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30013.png`" style="height: 28px;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30012.png`" style="height: 28px;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30041.png`" style="height: 28px;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30051.png`" style="height: 28px;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30061.png`" style="height: 28px;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30023.png`" style="height: 28px;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30033.png`" style="height: 28px;"></div>
              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_line_text" style="font-size: 12px;width:48px;">T3效率</div>
                <div class="stage_card_3_line_text" style="font-size: 12px;font-weight:500;width:180px;">
                  T3+T2+T1材料总价值/理智消耗 </div>
              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_img"><img :src="`/image/items/30014.png`"
                    style="height: 28px;filter: grayscale(1);opacity:0.7;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30013.png`" style="height: 28px;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30012.png`" style="height: 28px;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30041.png`"
                    style="height: 28px;filter: grayscale(1);opacity:0.7;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30051.png`"
                    style="height: 28px;filter: grayscale(1);opacity:0.7;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30061.png`"
                    style="height: 28px;filter: grayscale(1);opacity:0.7;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30023.png`"
                    style="height: 28px;filter: grayscale(1);opacity:0.7;"></div>
                <div class="stage_card_3_img"><img :src="`/image/items/30033.png`"
                    style="height: 28px;filter: grayscale(1);opacity:0.7;"></div>
              </div> -->
            </div>
          </div>
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
                <div class="stage_card_3_img"><img :src="`/image/items/${stage.series.r4}.png`" alt=""
                    style="height: 32px"></div>
                <div class="stage_card_3_line_text">{{ stage.leT5MaxEfficiencyStage.stage_code }}</div>
                <div class="stage_card_3_line_text">{{ formatNumber(stage.leT5MaxEfficiencyStage.efficiency, 1) }}% </div>

              </div>
              <div class="stage_card_3_line">
                <div class="stage_card_3_img"><img :src="`/image/items/${stage.series.r3}.png`" alt=""
                    style="height: 32px"></div>
                <div class="stage_card_3_line_text">{{ stage.leT4MaxEfficiencyStage.stage_code }}</div>
                <div class="stage_card_3_line_text">{{ formatNumber(stage.leT4MaxEfficiencyStage.efficiency, 1) }}%</div>

              </div>
              <div class="stage_card_3_line" v-show="stage.series.r2">
                <div class="stage_card_3_img"><img :src="`/image/items/${stage.series.r2}.png`" alt=""
                    style="height: 32px"></div>
                <div class="stage_card_3_line_text">{{ stage.leT3MaxEfficiencyStage.stage_code }}</div>
                <div class="stage_card_3_line_text">{{ formatNumber(stage.leT3MaxEfficiencyStage.efficiency, 1) }}%</div>

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
        <div id="detailLeft">
          <div class="stage_card_3_img"><img :src="`/image/items/30013.png`" alt="" style="height: 32px"></div>
          <div>固源岩组</div>
          价值：114理智<br>
          上次up（不计复刻）：叙拉古人<br>
          下次up预计：
          查看
        </div>
        <div id="detailRight">
          绿票商店兑换优先级：0.6（低）[蓝材料]<br>
          寻访数据契约商店：0.4（低）/0.3（极低）[蓝/紫材料]<br>
          信用商店：0.4（低）/0.3（极低）[绿/白材料]<br>
          合约商店无限池：0.4（低）/0.3（极低）[蓝材料]<br>
          查看所有商店性价比
        </div>
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
              <img :src="`/image/items/${scope.row.itemId}.png`" alt="" style="height: 36px">
            </template>
          </el-table-column>
          <el-table-column prop="secondary" label="副产品" :width="td_1">
            <template #default="scope">
              <img :src="`/image/items/${scope.row.secondaryItemId}.png`" alt="" style="height: 36px">
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
      <!-- 搓玉 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">搓玉数据表</div>
          <div class="op_title_etext_light">Orundum</div>
        </div>

      </div>
      <!-- 历史活动 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">往期活动数据</div>
          <div class="op_title_etext_light">History Event</div>
        </div>

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
      <div id="foot_main">
        <div class="foot_unit" style="width: 100%; white-space: normal">
          <el-card class="box-card">
            <el-collapse accordion>
              <el-collapse-item name="1" style="">
                <template #title>
                  <span style="font-size: large; display: flex; align-items: center">
                    <el-icon>
                      <Comment />
                    </el-icon><b style="margin-left: 4px">网站反馈</b>
                  </span>
                </template>
                <a href="https://docs.qq.com/form/page/DVVNyd2J5RmV2UndQ">点击此处</a>通过问卷反馈问题/提供建议。
              </el-collapse-item>
              <el-collapse-item name="2" style="">
                <template #title>
                  <span style="font-size: large; display: flex; align-items: center"><el-icon>
                      <TrendCharts />
                    </el-icon><b style="margin-left: 4px">动态平衡算法简述</b></span>
                </template>
                <b>算法核心思路为“掉率越高，则价值越低”且“物品价值仅受获取成本影响”</b>
                <hr />
                <ul style="padding-left: 2em">
                  <li>第1步：取所有<b>常驻关卡</b>的掉率，以材料价格计算关卡效率</li>
                  <li>第2步：以关卡效率修正材料价格</li>
                  <li>第3步：重复操作(1)(2)，直至材料价格和关卡效率收敛于误差小于万分之一，实现动态平衡，此时得出<b>关卡效率</b>和<b>材料价值</b></li>
                  <li>第4步：根据商店售价和物品价值，计算常驻商店和活动商店性价比</li>
                </ul>

                <b>FAQ</b>
                <hr />
                <ul style="padding-left: 2em">
                  <li>Q：你怎么知道数列是收敛的？</li>
                  <li><b>A：如果不收敛网站就崩了，你也看不到这句话了。</b></li>
                  <li>Q：为什么不用线性规划进行计算？</li>
                  <li>
                    <b>A：人无法两次踏进同一条河流，线性规划的目标时刻都在变动，随活动UP起伏的价值你喜欢吗？</b>
                  </li>
                  <li>Q：你这结果有问题啊，XX关的x材料期望明显更低，为什么XX关不是效率最高？</li>
                  <li>
                    <b>A：大部分关卡都掉落多种材料，单一材料的期望只能说明短期最优，长期最优是要计算副产物的。</b>
                  </li>
                </ul>
              </el-collapse-item>
              <el-collapse-item name="3" style="">
                <template #title>
                  <span style="font-size: large; display: flex; align-items: center"><el-icon>
                      <Opportunity />
                    </el-icon><b style="margin-left: 4px">图例与计算细节</b></span>
                </template>
                <b>刷图规划</b>
                <hr />

                <ul style="padding-left: 2em">
                  <li>根据价值一览中的价格和企鹅物流的关卡掉落数据计算。</li>
                  <li>只有多于300样本的关卡才会被收录。</li>
                  <li>仅收录由自动刷图软件上报的掉落数据。</li>
                  <li>活动关卡只在活动期间出现。</li>
                  <li>插曲和别传常驻后重新计算效率，该效率与活动时无关。</li>
                </ul>

                <b>商店性价比</b>
                <hr />
                单位：理智/各货币
                <ul style="padding-left: 2em">
                  <li>各商店之间货币不同，故<b>不可跨店对比数值</b>。</li>
                  <li>根据<b>价值一览</b>中的价格和商店售价得到的性价比值。</li>
                  <li>活动商店采用相同算法。</li>
                  <li>信用商店计价单位为100信用点。</li>
                  <li>若源岩系材料的主要来源是1-7以外的关卡，则源岩系材料价值<a class="popover_color">+6%</a>。</li>
                </ul>

                <b>材料价值</b>
                <hr />
                <ul style="padding-left: 2em">
                  <li>绿票理智换算关系：<b>1理智=1.25绿票</b>。</li>
                  <li>数据选择范围为<a href="https://penguin-stats.cn/">企鹅物流</a>中的<b>常驻关卡</b>以保证价值的稳定性。</li>
                  <li>定价时考虑加工站副产物，副产物掉率假设为20%。</li>
                  <li>考虑到实际情况，芯片的价值略作调整，分为强势芯片、均势芯片和弱势芯片。</li>
                  <li>假设重装/医疗芯片和近卫/特种芯片需求比为2:1，狙击/术师和先锋/辅助需求比为1:1。</li>
                  <li>模组数据块以红票商店售价进行定价。</li>
                  <li>龙门币依据CE-6定价，经验书和无人机依据基建生产效率进行折算，折算系数为0.625</li>
                  <li>技巧概要依据CA-5定价，且考虑加工站副产物。</li>
                  <li>采购凭证依据AP-5定价。</li>
                  <li>碳以九色鹿为基准进行定价。</li>
                  <li>理论上寻访凭证=600合成玉=3.33石=450理智，但不碎石刷图的情况下该等式无意义，仅列出以供参考。</li>
                  <li>招募凭证的价值由<a href="http://localhost:3000/survey/maarecruitdata/">公招tag统计</a>得出，仅供参考。</li>
                  <li>物资箱价值取<a href="https://penguin-stats.cn/">企鹅物流</a>中的以往数据进行估算。</li>
                  <li>若源岩系材料的主要来源是1-7以外的关卡，则源岩系材料价值<a class="popover_color">+6%</a>。</li>
                </ul>
              </el-collapse-item>
              <el-collapse-item name="4" style="">
                <template #title>
                  <span style="font-size: large; display: flex; align-items: center"><el-icon>
                      <Checked />
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
              <el-collapse-item name="5" style="">
                <template #title>
                  <span style="font-size: large; display: flex; align-items: center">
                    <el-icon>
                      <Warning />
                    </el-icon><b style="margin-left: 4px">版权声明与许可协议</b>
                  </span>
                </template>
                网站所涉及的公司名称、商标、产品等均为其各自所有者的资产，仅供识别。网站内使用的游戏图片、动画、音频、文本原文，仅用于更好地表现游戏资料，其版权属于 Arknights/上海鹰角网络科技有限公司。<br>
                除非另有声明，网站其他内容采用<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh">知识共享 署名-非商业性使用 4.0 国际
                  许可协议</a>进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和作品链接，且链接需直接指向所引用的页面；且未经许可不得将本站内容或由其衍生作品用于商业目的。<br>
                本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来<a href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">开发群</a>一叙。
              </el-collapse-item>
            </el-collapse>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import stageApi from '/src/api/stage'
import { onMounted, ref } from "vue";
import item_series from '/src/static/json/item_series.json'


// 根据物品系列进行分组的推荐关卡
let stage_result_group = ref()
// let stage_result_group = ref(stage_api_data.data.recommendedStage.sort((a,b)=>a.itemSeriesId-b.itemSeriesId))


//材料卡片数据
let item_card_data = ref([])

//当前时间的时间戳
let nowTimeStamp = new Date().getTime();


stageApi.getStageResultGroupByItemSeries(0.625, 300).then(response => {
  stage_result_group.value = response.data.recommendedStage.sort((a, b) => a.itemSeriesId - b.itemSeriesId)

  getItemCardData()
  getItemTableData(8)
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
}


function jumpToTable() {
  window.scrollTo({
    top: 100,
    behavior: 'smooth'
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



// for(let id in item_series){
//   item_series[id] =  {
//     t4:id.substring(0,4)+'4',
//     t3:id.substring(0,4)+'3',
//     t2:id.substring(0,4)+'2',
//     t1:id.substring(0,4)+'1',
//   }
// }
</script>


