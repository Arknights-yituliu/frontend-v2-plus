<template>
  <div>
    <div id="pack">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">礼包性价比</div>
          <div :class="opETextTheme">Packs Value</div>
        </div>
      </div>
      <div class="stage_hint">
        <div class="stage_hint_t5">性价比基准为648￥源石，移动端可左右滑动表格</div>
      </div>
      <div class="stage_hint">
        <div class="stage_hint_t0">
          由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”。
        </div>
      </div>

      <client-only>
        <div class="pack-table-wrapper">
          <el-table
              :data="packPPRResponse"
              class="pack-table"
              stripe
              table-layout="auto"
              :default-sort="{ prop: 'promotionRatioForComprehensive', order: 'descending' }"
              border
          >
            <el-table-column
                sortable
                prop="name"
                label="名称"
                :sort-by="
                (row, index) => {
                  return row.displayName;
                }
              "
                min-width="154"
                fixed
            />
            <el-table-column
                sortable
                label="类型"
                :formatter="
                (row, col) => {
                  return {
                    once: '一次性',
                    monthly: '每月',
                    weekly: '每周',
                    year: '每年',
                    permanent: '常驻',
                    limited: '限时',
                  }[row.type];
                }
              "
                :filters="[
                { value: 'once', text: '一次性' },
                { value: 'monthly', text: '每月' },
                { value: 'weekly', text: '每周' },
                { value: 'year', text: '每年' },
                { value: 'permanent', text: '常驻' },
                { value: 'limited', text: '限时' },
              ]"
                :filter-method="
                (value, row, column) => {
                  return row.type == value;
                }
              "
                :filtered-value="['once', 'monthly', 'weekly', 'year', 'permanent', 'limited']"
                :sort-by="
                (row, index) => {
                  return row.type;
                }
              "
                min-width="92"
            />
            <el-table-column
                sortable
                label="售价"
                :formatter="
                (row, col) => {
                  return row.price + '元';
                }
              "
                :sort-by="
                (row, index) => {
                  return row.price;
                }
              "
                min-width="80"
            />
            <el-table-column
                sortable
                label="抽数"
                :formatter="
                (row, col) => {
                  return row.drawCount.toFixed(2);
                }
              "
                :sort-by="
                (row, index) => {
                  return row.drawCount;
                }
              "
                min-width="80"
            />
            <el-table-column
                sortable
                label="源石"
                :formatter="
                (row, col) => {
                  return row.originium;
                }
              "
                :sort-by="
                (row, index) => {
                  return row.originium;
                }
              "
                min-width="80"
            />
            <el-table-column
                sortable
                label="抽卡性价比"
                :formatter="
                (row, col) => {
                  return row.promotionRatioForMoney.toFixed(2);
                }
              "
                :sort-by="
                (row, index) => {
                  return row.promotionRatioForMoney;
                }
              "
                min-width="120"
            />
            <el-table-column
                sortable
                label="综合性价比"
                prop="promotionRatioForComprehensive"
                :formatter="
                (row, col) => {
                  return row.promotionRatioForComprehensive.toFixed(2);
                }
              "
                :sort-by="
                (row, index) => {
                  return row.promotionRatioForComprehensive;
                }
              "
                min-width="120"
            />
          </el-table>
        </div>
      </client-only>

      <div class="op_title_tag">
        <div id="pack_sort_by_type" class="op_tag_1" @click="sortPackByType()">礼包类型排序</div>
        <div id="pack_sort_by_drawPpr" class="op_tag_0" @click="sortPackByPPRPerDraw()">抽卡性价比</div>
        <div id="pack_sort_by_oriPpr" class="op_tag_0" @click="sortPackByPPRPerOri()">总价值性价比</div>
        <div class="op_tag_0" style="padding: 1px"></div>
        <div style="margin-top: 8px; display: inline-block">
          <div id="pack_show_once" class="op_tag_0" @click="switchPacks('once')">隐藏一次性礼包</div>
          <div id="pack_show_ori" class="op_tag_0" @click="switchPacks('ori')">源石只显示648</div>
          <!-- <div class="tab_text">
            *点击图片查看礼包内容
          </div> -->
        </div>
      </div>
      <div class="stage_hint">
        <div class="stage_hint_t5">点击图片可查看礼包内容，注意区分"仅抽卡"/"折合成源石"</div>
        <div class="stage_hint_t5">“折合成源石”即将材料的理智价值按135：1换算成源石</div>
      </div>
      <!-- 标题区域end -->


      <div id="pack_content" style="display: flex">
        <!-- 仅计抽卡 -->
        <div id="pack_left" style="margin-top: -8px">
          <div
              v-for="(pack2, index) in packsPPRData"
              :key="index"
              class="pack_unit_list"
              :style="getDisplayStateDrawOnly(pack2.state, pack2.type, pack2.price, packFilter, pack2.promotionRatioForMoney)"
          >
            <div class="pack_unit">
              <!-- 图片部分 -->
              <div class="pack_img" :style="getPackPic(pack2.name, pack2.type)"
                   @click="switchPackContent(pack2.id, 'draw')">
                <div class="pack_img_text1">{{ pack2.displayName }} ￥{{ pack2.packPrice }}</div>

                <!-- 角标部分 -->
                <div class="pack_corner corner_new" v-show="pack2.type == 'limited'">New!</div>
                <div class="pack_corner corner_monthly" v-show="pack2.type == 'monthly'">每月</div>
                <div class="pack_corner corner_monthly" v-show="pack2.type == 'weekly'">每周</div>
                <div class="pack_corner corner_once" v-show="pack2.type == 'once'">一次</div>
                <div class="pack_corner corner_once" v-show="pack2.type == 'year'">双倍</div>
              </div>
              <!-- 表格部分 -->
              <div class="pack_info">
                <div class="pack_info_text">共{{ getFixed(pack2.drawCount, 1) }}抽
                  <br/>￥{{ getFixed(pack2.eachDrawPrice, 1) }}/抽
                </div>
                <div class="pack_chart">
                  <div class="pack_chart_unit" v-show="pack2.packPPRDraw >= 1.57">
                    <div class="pack_chart_unit_text">本礼包</div>
                    <div class="pack_chart_unit_ppr bg_red" :style="getWidth(pack2.promotionRatioForMoney * 100, 0.75)">
                      {{ getFixed(pack2.promotionRatioForMoney * 100, 0) }}%
                    </div>
                  </div>
                  <div class="pack_chart_unit">
                    <div class="pack_chart_unit_text">大月卡</div>
                    <div class="pack_chart_unit_ppr" :style="getWidth(157, 0.75)">157%</div>
                  </div>
                  <div class="pack_chart_unit"
                       v-show="pack2.promotionRatioForMoney < 1.57 && pack2.promotionRatioForMoney >= 1">
                    <div class="pack_chart_unit_text">本礼包</div>
                    <div class="pack_chart_unit_ppr bg_red" :style="getWidth(pack2.promotionRatioForMoney * 100, 0.75)">
                      {{ getFixed(pack2.promotionRatioForMoney * 100, 0) }}%
                    </div>
                  </div>
                  <div class="pack_chart_unit">
                    <div class="pack_chart_unit_text">648源石</div>
                    <div class="pack_chart_unit_ppr" :style="getWidth(100, 0.75)">100%</div>
                  </div>
                  <div class="pack_chart_unit" v-show="pack2.promotionRatioForMoney < 1">
                    <div class="pack_chart_unit_text">本礼包</div>
                    <div class="pack_chart_unit_ppr bg_red" :style="getWidth(pack2.promotionRatioForMoney * 100, 0.75)">
                      {{ getFixed(pack2.promotionRatioForMoney * 100, 0) }}%
                    </div>
                  </div>
                </div>
                <!-- 说明 -->
                <div class="pack_type">仅计抽卡</div>
              </div>

              <!-- 详情部分 -->
              <div class="pack_contents" :id="getContentId(pack2.id, 'draw')" style="display: none">
                <div class="pack_content_unit0" style="width: 112px">
                  <div style="width: 56px">源石</div>
                  <div style="width: 56px">x{{ pack2.originium }}</div>
                </div>
                <div class="pack_content_unit0" style="width: 120px">
                  <div style="width: 60px">合成玉</div>
                  <div style="width: 60px">x{{ pack2.orundum }}</div>
                </div>
                <div class="pack_content_unit0">
                  <div style="width: 56px">单抽</div>
                  <div style="width: 60px">x{{ pack2.ticketGacha }}</div>
                </div>
                <div class="pack_content_unit0">
                  <div style="width: 56px">十连</div>
                  <div style="width: 60px">x{{ pack2.ticketGacha10 }}</div>
                </div>
                <div v-for="(packItem, index) in pack2.packContent" :key="index" class="pack_content_unit">
                  <div style="width: 135px">{{ packItem.itemName }}</div>
                  <div style="width: 90px">x{{ packItem.quantity }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 材料折合源石 -->
        <div id="pack_right" style="margin-top: -8px">
          <div
              v-for="(pack3, index) in packsPPRData"
              :key="index"
              class="pack_unit_list"
              :style="getDisplayState(pack3.state, pack3.type, pack3.price, packFilter)"
          >
            <!-- <div v-for="(pack3, index) in packsPPRData" :key="index" class="pack_unit_list"> -->
            <div v-show="pack3.state == 1" class="pack_unit">
              <!-- 图片部分 -->
              <div class="pack_img" :style="getPackPic(pack3.name, pack3.type)"
                   @click="switchPackContent(pack3.id, 'all')">
                <div class="pack_img_text1">{{ pack3.displayName }} ￥{{ pack3.price }}</div>
                <!-- 角标部分 -->
                <div class="pack_corner corner_new" v-show="pack3.type == 'limited'">New!</div>
                <div class="pack_corner corner_monthly" v-show="pack3.type == 'monthly'">每月</div>
                <div class="pack_corner corner_monthly" v-show="pack3.type == 'weekly'">每周</div>
                <div class="pack_corner corner_once" v-show="pack3.type == 'once'">一次</div>
                <div class="pack_corner corner_once" v-show="pack3.type == 'year'">双倍</div>
              </div>

              <!-- 表格部分 -->
              <div class="pack_info">
                <div class="pack_info_text" style="color: #ff8f6e">
                  {{ getFixed(pack3.equivalentOriginium, 1) }}源石 <br/>￥{{ getFixed(pack3.eachOriginiumPrice, 1) }}/石
                </div>

                <div class="pack_chart">
                  <div class="pack_chart_unit" v-show="pack3.promotionRatioForComprehensive >= 1.57">
                    <div class="pack_chart_unit_text">本礼包</div>
                    <div class="pack_chart_unit_ppr bg_red"
                         :style="getWidth(pack3.promotionRatioForComprehensive * 100, 0.75)">
                      {{ getFixed(pack3.promotionRatioForComprehensive * 100, 0) }}%
                    </div>
                  </div>
                  <div class="pack_chart_unit">
                    <div class="pack_chart_unit_text">大月卡</div>
                    <div class="pack_chart_unit_ppr" :style="getWidth(157, 0.75)">157%</div>
                  </div>
                  <div class="pack_chart_unit"
                       v-show="pack3.promotionRatioForComprehensive < 1.57 && pack3.promotionRatioForComprehensive >= 1">
                    <div class="pack_chart_unit_text">本礼包</div>
                    <div class="pack_chart_unit_ppr bg_red"
                         :style="getWidth(pack3.promotionRatioForComprehensive * 100, 0.75)">
                      {{ getFixed(pack3.promotionRatioForComprehensive * 100, 0) }}%
                    </div>
                  </div>
                  <div class="pack_chart_unit">
                    <div class="pack_chart_unit_text">648源石</div>
                    <div class="pack_chart_unit_ppr" :style="getWidth(100, 0.75)">100%</div>
                  </div>
                  <div class="pack_chart_unit" v-show="pack3.promotionRatioForComprehensive < 1">
                    <div class="pack_chart_unit_text">本礼包</div>
                    <div class="pack_chart_unit_ppr bg_red"
                         :style="getWidth(pack3.promotionRatioForComprehensive * 100, 0.75)">
                      {{ getFixed(pack3.promotionRatioForComprehensive * 100, 0) }}%
                    </div>
                  </div>
                </div>
                <div class="pack_info_alert" v-show="!pack3.packTag == ''">含难以估价内容，点击图片查看</div>
                <!-- 说明 -->
                <div class="pack_type">材料折合源石</div>
              </div>

              <!-- 详情部分 -->
              <div class="pack_contents" :id="getContentId(pack3.id, 'all')" style="display: none">
                <div class="pack_contents_note">{{ pack3.packTag }}</div>
                <div class="pack_content_unit0" style="width: 112px">
                  <div style="width: 56px">源石</div>
                  <div style="width: 56px">x{{ pack3.originium }}</div>
                </div>
                <div class="pack_content_unit0" style="width: 120px">
                  <div style="width: 60px">合成玉</div>
                  <div style="width: 60px">x{{ pack3.orundum }}</div>
                </div>
                <div class="pack_content_unit0">
                  <div style="width: 56px">单抽</div>
                  <div style="width: 60px">x{{ pack3.ticketGacha }}</div>
                </div>
                <div class="pack_content_unit0">
                  <div style="width: 56px">十连</div>
                  <div style="width: 60px">x{{ pack3.ticketGacha10 }}</div>
                </div>
                <div v-for="(packItem, index) in pack3.packContent" :key="index" class="pack_content_unit">
                  <div style="width: 135px">{{ packItem.itemName }}</div>
                  <div style="width: 90px">x{{ packItem.quantity }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="op_title">
      <div class="op_title_text">
        <div class="op_title_ctext">算法说明</div>
        <div :class="opETextTheme">Algorithm</div>
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
                  </el-icon><b style="margin-left: 4px">问题反馈</b>
                </span>
              </template>
              <a href="https://docs.qq.com/form/page/DVVNyd2J5RmV2UndQ">点击此处</a>通过问卷反馈问题/提供建议，<a
                href="https://jq.qq.com/?_wv=1027&k=q1z3p9Yj">点击此处</a>加入粉丝群。
            </el-collapse-item>
            <el-collapse-item name="2" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center"><el-icon>
                    <Opportunity/>
                  </el-icon><b style="margin-left: 4px">计算方式</b></span>
              </template>

              <ul style="padding-left: 2em">
                <li>仅计抽卡：仅计算礼包内的抽卡资源</li>
                <li>材料折合源石：将所有材料折算成源石再计算性价比</li>
                <li>性价比的基准为可无限购买的648源石，材料价值取自[物品价值表]</li>
                <li>每月芯片自选包和每月材料自选包都用价值最高的材料进行计价</li>
                <li>精二券暂以平均价值计价，详情可查阅[精二性价比]</li>
                <li>模组块暂以120红票计价，模组条无法计价，请自行权衡</li>
                <li>家具零件视为0价值</li>
              </ul>


            </el-collapse-item>
            <el-collapse-item name="4" style="">
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
            <el-collapse-item name="5" style="">
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
    <!-- <foot></foot> -->
  </div>
</template>

<script>
import storeApi from "@/api/store";
import {usePageContext} from "@/renderer/usePageContext";

import {ClientOnly} from "@/components/ClientOnly";
import {ElMessage} from "element-plus";

export default {
  setup() {
    const pageContext = usePageContext();
    return {pageContext};
  },
  data() {
    return {
      opETextTheme: "op_title_etext_light",
      // packPPRResponse: this.pageContext.pageProps.data, //原始数据
      packPPRResponse:[],
      packsPPRData: [], //页面直接调用的数据
      packsPPRDataSort: [], //排序缓存数据
      packFilter: 11,
      showFlag: false,
    };
  },
  components: {
    // foot,
    ClientOnly,
  },
  created() {
    this.initData();
  },
  mounted() {


    const url_path = window.location.pathname.split("/")[1];
    if (url_path == "pack") {
      ElMessage({
        dangerouslyUseHTMLString: true,
        message: '此页面已迁移至<a href="/material/pack">https://ark.yituliu.cn/material/pack</a>',
        type: "warning",
      });
    }

    this.$notify({
      title: "2024.01.31更新",
      dangerouslyUseHTMLString: true,
      message: "<strong>本页面维护中<br></strong>",
      // message: "<strong>1.更新了彩六联动二期攒抽<br>2.请在森空岛投票支持一下'罗德岛基建BETA'!'谢谢大家!</strong>",
      duration: 6000,
    });
  },
  methods: {


    getBackColor(index) {
      if (index % 2 !== 0) return "pack_simple_tr_back";
    },

    switchPacks(packs) {
      if (packs == "once") {
        if (this.packFilter < 5) {
          this.packFilter = this.packFilter + 10;
          document.getElementById("pack_show_once").className = "op_tag_0";
        } else {
          this.packFilter = this.packFilter - 10;
          document.getElementById("pack_show_once").className = "op_tag_1";
        }
      } else {
        if (this.packFilter == 10 || this.packFilter == 0) {
          this.packFilter = this.packFilter + 1;
          document.getElementById("pack_show_ori").className = "op_tag_0";
        } else {
          this.packFilter = this.packFilter - 1;
          document.getElementById("pack_show_ori").className = "op_tag_1";
        }
      }
    },

    getDisplayStateDrawOnly(packState, packType, packPrice, packFilter, packPPRDraw) {
      if (packState == 0 || packPPRDraw < 0.1) {
        return "display: none;"; //状态不对一票否决
      } else {
        if (packFilter == 11) {
          return ""; //都显示
        } else if (packFilter == 10) {
          //隐藏源石
          if (packType == "year" || packType == "permanent") {
            if (packPrice == 648 && packType == "permanent") {
              return "";
            }
            return "display: none;";
          }
        } else if (packFilter == 1) {
          //隐藏一次性
          if (packType == "once") {
            return "display: none;";
          }
        } else if (packFilter == 0) {
          //都隐藏
          if (packType == "year" || packType == "permanent" || packType == "once") {
            if (packPrice == 648 && packType == "permanent") {
              return "";
            }
            return "display: none;";
          }
        }
      }
    },

    getDisplayState(packState, packType, packPrice, packFilter) {
      if (packState == 0) {
        return "display: none;"; //状态不对一票否决
      } else {
        if (packFilter == 11) {
          return ""; //都显示
        } else if (packFilter == 10) {
          //隐藏源石
          if (packType == "year" || packType == "permanent") {
            if (packPrice == 648 && packType == "permanent") {
              return "";
            }
            return "display: none;";
          }
        } else if (packFilter == 1) {
          //隐藏一次性
          if (packType == "once") {
            return "display: none;";
          }
        } else if (packFilter == 0) {
          //都隐藏
          if (packType == "year" || packType == "permanent" || packType == "once") {
            if (packPrice == 648 && packType == "permanent") {
              return "";
            }
            return "display: none;";
          }
        }
      }
    },

    getStorePackData() {
      storeApi.findPackStore().then((response) => {
        this.packPPRResponse = response.data;
        //  console.log(this.packPPRData.length);
        this.initData();
      });
    },

    initData() {
      this.packsPPRData = [];
      this.packsPPRDataSort = [];

      for (let i = 0; i < this.packPPRResponse.length; i += 1) {
        if (0 === this.packPPRResponse[i].packState) {
          //下架礼包跳过
          // console.log('弹出：',this.packPPRResponse[i].packName);
          continue;
        }
        //  console.log('正常：',this.packPPRResponse[i].packName);
        if (this.packPPRResponse[i].packRmbPerDraw === null) {
          //性价比空的设置为0
          this.packPPRResponse[i].packRmbPerDraw = 0;
        }

        if ("limited" === this.packPPRResponse[i].packType) {
          this.packsPPRData.unshift(this.packPPRResponse[i]);
        } else {
          this.packsPPRData.push(this.packPPRResponse[i]);
        }

        this.packsPPRDataSort.push(this.packPPRResponse[i]);
      }

      // this.sortPackByPPRPerDraw();
    },

    sortPackByType() {
      this.initData();
      document.getElementById("pack_left").style.display = "block";
      document.getElementById("pack_right").style.display = "block";

      document.getElementById("pack_sort_by_type").className = "op_tag_1";
      document.getElementById("pack_sort_by_drawPpr").className = "op_tag_0";
      document.getElementById("pack_sort_by_oriPpr").className = "op_tag_0";
    },

    sortPackByPPRPerDraw() {
      this.initData();
      document.getElementById("pack_left").style.display = "block";
      document.getElementById("pack_right").style.display = "none";

      document.getElementById("pack_sort_by_type").className = "op_tag_0";
      document.getElementById("pack_sort_by_drawPpr").className = "op_tag_1";
      document.getElementById("pack_sort_by_oriPpr").className = "op_tag_0";
      for (let i = 0; i < this.packsPPRDataSort.length - 1; i += 1) {
        for (let j = 0; j < this.packsPPRDataSort.length - 1 - i; j += 1) {
          console.log(this.packsPPRDataSort[j].packName, this.packsPPRDataSort[j].packRmbPerDraw, this.packsPPRDataSort[j].packRmbPerDraw != "null");
          // console.log(this.packsPPRDataSort[j+1].packName,this.packsPPRDataSort[j+1].packRmbPerDraw)
          if (this.packsPPRDataSort[j].packRmbPerDraw > this.packsPPRDataSort[j + 1].packRmbPerDraw) {
            const temp = this.packsPPRDataSort[j];
            this.packsPPRDataSort[j] = this.packsPPRDataSort[j + 1];
            this.packsPPRDataSort[j + 1] = temp;
          }
        }
      }

      this.packsPPRData = [];
      for (let i = 0; i < this.packsPPRDataSort.length; i += 1) {
        if (this.packsPPRDataSort[i].packRmbPerDraw === 0) continue;
        this.packsPPRData.push(this.packsPPRDataSort[i]);
      }

      for (let i = 0; i < this.packsPPRDataSort.length; i += 1) {
        if (this.packsPPRDataSort[i].packRmbPerDraw !== 0) break;
        this.packsPPRData.push(this.packsPPRDataSort[i]);
      }
    },

    sortPackByPPRPerOri() {
      this.initData();
      document.getElementById("pack_left").style.display = "none";
      document.getElementById("pack_right").style.display = "block";

      document.getElementById("pack_sort_by_type").className = "op_tag_0";
      document.getElementById("pack_sort_by_drawPpr").className = "op_tag_0";
      document.getElementById("pack_sort_by_oriPpr").className = "op_tag_1";
      for (let i = 0; i < this.packsPPRDataSort.length - 1; i += 1) {
        for (let j = 0; j < this.packsPPRDataSort.length - 1 - i; j += 1) {
          if (this.packsPPRDataSort[j].packRmbPerOriginium > this.packsPPRDataSort[j + 1].packRmbPerOriginium) {
            const temp = this.packsPPRDataSort[j];
            this.packsPPRDataSort[j] = this.packsPPRDataSort[j + 1];
            this.packsPPRDataSort[j + 1] = temp;
          }
        }
      }

      this.packsPPRData = [];
      for (let i = 0; i < this.packsPPRDataSort.length; i += 1) {
        this.packsPPRData.push(this.packsPPRDataSort[i]);
      }
    },

    sortPackById() {
      for (let i = 0; i < this.packsPPRDataSort.length - 1; i += 1) {
        for (let j = 0; j < this.packsPPRDataSort.length - 1 - i; j += 1) {
          if (this.packsPPRDataSort[j].packID > this.packsPPRDataSort[j + 1].packID) {
            const temp = this.packsPPRDataSort[j];
            this.packsPPRDataSort[j] = this.packsPPRDataSort[j + 1];
            this.packsPPRDataSort[j + 1] = temp;
          }
        }
      }

      this.packsPPRData = [];
      for (let i = 0; i < this.packsPPRDataSort.length; i += 1) {
        this.packsPPRData.push(this.packsPPRDataSort[i]);
      }
    },

    getWidth(num, scale) {
      return "width:" + num * scale + "px";
    },
    getFixed(num, acc) {
      acc = typeof acc !== "undefined" ? acc : 2;
      return parseFloat(num).toFixed(acc);
    },
    getPackImgUrl(img) {
      return "/image/packs/" + img + ".png";
    },

    getPackPic(img, type) {
      // if(true ===this.showFlag) return '';
      // console.log(true ===this.showFlag);
      return "background:url(https://ark.yituliu.cn/static/image/store/" + img + ".jpg) 0% 0% / cover no-repeat,#444444;";
    },
    getContentId(id, type) {
      return type + "_" + id;
    },

    switchPackContent(id, type) {
      if (document.getElementById(type + "_" + id).style.display == "none") document.getElementById(type + "_" + id).style.display = "flex";
      else document.getElementById(type + "_" + id).style.display = "none";
    },
  },
};
export const documentProps = {
  title: "一图流 - 礼包性价比",
  description: "明日方舟一图流，礼包性价比，礼包内容，氪金规划",
};
</script>

<style>
#pack {
  /* background-color: #eeeeee; */
  /* max-width: 1080px; */
  margin: auto;
}

#pack_content {
  /* background-color: rgb(43,72,101); */
  padding: 0px 0px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

.pack_unit_list {
}

.pack_unit {
  margin: 20px 0px;
  width: 522px;
  display: flex;
  flex-wrap: wrap;
}

.pack_img {
  width: 160px;
  height: 120px;
  border-radius: 8px;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.pack_img_text1 {
  position: relative;
  top: 93px;
  width: 160px;
  height: 24px;
  background-color: rgba(0, 0, 0, 0.6902);
  font-size: 14px;
  font-weight: 600;
  color: white;
  text-align: center;
  padding-top: 3px;
  border-radius: 0px 0px 8px 8px;
}

.pack_corner {
  transform: rotate(-35deg);
  width: 96px;
  top: -18px;
  left: -28px;
  position: relative;
  color: white;
  text-align: center;
  font-size: 14px;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.pack_info {
  z-index: 10;
  height: 108px;
  width: 360px;
  background-color: #000000cc;
  /* margin: 6px 0px 6px 156px; */
  margin-top: 6px;
  border-radius: 4px;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  position: relative;
}

.pack_info_text {
  width: 100px;
  padding: 18px 0px 18px 4px;
  font-size: 20px;
  text-align: center;
  font-weight: 600;
  color: #6ed7ff;
  display: inline-block;
  line-height: 36px;
  vertical-align: top;
}

.pack_info_alert {
  position: absolute;
  color: white;
  /* margin-top: -14px;
  margin-left: 14px; */
  background: chocolate;
  border-radius: 21px;
  padding: 2px 6px;
  width: 240px;
  top: 96px;
  /* display: none; */
}

.t1 {
  color: #c59447;
}

.pack_chart {
  display: inline-block;
  margin-top: 18px;
  width: 240px;
  /* padding: 10px 0px; */
  border-left: 1px solid #d0d0d0;
  white-space: nowrap;
  overflow: hidden;
}

.pack_chart_unit_text {
  display: inline-block;
  padding: 0px 2px;
  width: 66px;
  /* background-color: burlywood; */
  border-radius: 6px;
  /* margin: 0px 0px 0px 0px; */
  vertical-align: middle;
  text-align: center;
  font-size: 16px;
  color: wheat;
  height: 24px;
}

.pack_chart_unit_ppr {
  display: inline-block;
  background-color: rgb(56, 112, 161);
  color: white;
  font-size: 12px;
  border-radius: 16px;
  padding: 0px 8px;
}

.pack_type {
  display: inline-block;
  color: rgb(128, 128, 128);
  position: absolute;
  /* text-align: right; */
  float: right;
  right: 8px;
  top: 82px;
  font-size: 14px;
}

.pack_contents {
  display: flex;
  width: 474px;
  flex-direction: row;
  flex-wrap: wrap;
  background: rgba(34, 34, 34, 0.13333);
  padding: 16px 0px 4px 16px;
  margin: -12px 0px 0px 12px;
  font-size: 18px;
  border-radius: 4px;
  box-shadow: 1px 1px 4px rgb(0 0 0 / 30%);
  vertical-align: bottom;
}

.pack_contents_note {
  display: block;
  width: 100%;
  line-height: 32px;
}

.pack_content_unit0 {
  width: 116px;
  height: 32px;
  display: flex;
  font-weight: 600;
}

.pack_content_unit {
  width: 232px;
  height: 28px;
  display: flex;
}

.corner_new {
  background: brown;
}

.corner_monthly {
  background: indigo;
}

.corner_once {
  background: #bf7c00;
}

.bg_red {
  background-color: rgb(250, 83, 83);
}

.pack_simple {
  width: 100%;
}

.pack_simple table {
  width: 100%;
  font-size: 24px;
  text-align: center;
  border-collapse: collapse;
}

.pack_simple_tr_back {
  background: rgb(213, 219, 224);
}

.pack_simple_tr_title {
  font-weight: 700;
}

.pack-table-wrapper {
  padding: 18px 14px 0;
}

.pack-table {
  box-shadow: var(--el-box-shadow-light);
  width: 100%;
}
</style>
