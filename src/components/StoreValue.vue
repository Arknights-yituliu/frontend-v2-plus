<template>
  <div>
    <!-- 采购中心 -->
    <div id="store">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">采购中心</div>
          <div :class="opETextTheme">Store Ranking</div>
        </div>
        <div class="op_title_tag">
          <!-- <img alt="绿票" :class=tagColor[0] style="margin: 0px 4px;box-shadow: 4px 4px 2px 0 rgb(0 0 0 / 16%);" id="store_tag_0" :src="getImgUrl('资质凭证',4)" @click="switch_store('0')">
          <img alt="黄票" :class=tagColor[1] style="margin: 0px 4px;box-shadow: 4px 4px 2px 0 rgb(0 0 0 / 16%);" id="store_tag_1" :src="getImgUrl('高级凭证',4)" @click="switch_store('1')">
          <img alt="橙票" :class=tagColor[2] style="margin: 0px 4px;box-shadow: 4px 4px 2px 0 rgb(0 0 0 / 16%);" id="store_tag_2" :src="getImgUrl('寻访参数模型',4)" @click="switch_store('2')">
          <img alt="紫票" :class=tagColor[3] style="margin: 0px 4px;box-shadow: 4px 4px 2px 0 rgb(0 0 0 / 16%);" id="store_tag_3" :src="getImgUrl('情报凭证',4)" @click="switch_store('3')">
          <img alt="信用" :class=tagColor[4] style="margin: 0px 4px;box-shadow: 4px 4px 2px 0 rgb(0 0 0 / 16%);" id="store_tag_4" :src="getImgUrl('信用',4)" @click="switch_store('4')"> -->
          <div style="display: flex; align-items: flex-end">
            <div
              :class="tagColor[0]"
              style="
                height: 45px;
                width: 45px;
                margin: 0px 4px;
                box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                background: #f0f0f0;
              "
              id="store_tag_0"
              @click="switch_store('0')"
            >
              <div style="margin: 3px" :class="getSpriteImg(4005, 0)"></div>
            </div>
            <div
              :class="tagColor[1]"
              style="
                height: 45px;
                width: 45px;
                margin: 0px 4px;
                box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                background: #f0f0f0;
              "
              id="store_tag_1"
              @click="switch_store('1')"
            >
              <div style="margin: 3px" :class="getSpriteImg(4004, 0)"></div>
            </div>
            <div
              :class="tagColor[2]"
              style="
                height: 45px;
                width: 45px;
                margin: 0px 4px;
                box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                background: #f0f0f0;
              "
              id="store_tag_2"
              @click="switch_store('2')"
            >
              <div style="margin: 0px 2px" :class="getSpriteImg('EPGS_COIN', 0)"></div>
            </div>
            <div
              :class="tagColor[3]"
              style="
                height: 45px;
                width: 45px;
                margin: 0px 4px;
                box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                background: #f0f0f0;
              "
              id="store_tag_3"
              @click="switch_store('3')"
            >
              <div style="margin: 0px 5px" :class="getSpriteImg('REP_COIN', 0)"></div>
            </div>
            <div
              :class="tagColor[4]"
              style="
                height: 45px;
                width: 45px;
                margin: 0px 4px;
                box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                background: #f0f0f0;
              "
              id="store_tag_4"
              @click="switch_store('4')"
            >
              <div style="margin: 3px" :class="getSpriteImg('SOCIAL_PT', 0)"></div>
            </div>
            <div class="tab_text">*点击图标切换</div>
          </div>
        </div>
      </div>
      <!-- 标题区域end -->
      <!-- 内容区域 -->
      <!-- 绿票商店 -->
      <div class="store_content" id="store_0" :style="storeVisiable[0]">
        <div class="store_unit">
          <div :class="getSpriteImg(4005, 0)"></div>
        </div>
        <div v-for="(m_data, index) in storeList['green']" class="store_unit" :key="index">
          <!-- <img class="store_unit_pic" alt="" title=""	:src="getImgUrl(m_data.itemName)" >	 -->
          <div :class="getSpriteImg(m_data.itemId, 1)"></div>
          <p class="store_unit_text" :class="getColor(m_data.costPer, 0.8, 0.024)">
            {{ getEfficiency(m_data.costPer, 2) }}
          </p>
        </div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
      </div>
      <!-- 黄票商店 -->
      <div class="store_content" id="store_1" :style="storeVisiable[1]">
        <div class="store_unit">
          <div :class="getSpriteImg(4004, 0)"></div>
        </div>
        <div v-for="(m_data, index) in storeList['yellow']" class="store_unit" :key="index">
          <div :class="getSpriteImg(m_data.itemId, 1)"></div>
          <p class="store_unit_text" :class="getColor(m_data.costPer, 9.0, 1.5)">
            {{ getEfficiency(m_data.costPer, 2) }}
          </p>
        </div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
      </div>
      <!-- 橙票商店 -->
      <div class="store_content" id="store_2" :style="storeVisiable[2]">
        <div class="store_unit">
          <!-- <img class="store_unit_pic store_unit_icon" alt="" title=""	:src="getImgUrl('寻访参数模型' ,4)">	 -->
          <div :class="getSpriteImg('EPGS_COIN', 0)"></div>
        </div>
        <div v-for="(m_data, index) in storeList['orange']" class="store_unit" :key="index">
          <div :class="getSpriteImg(m_data.itemId, 1)"></div>
          <p class="store_unit_text" :class="getColor(m_data.costPer, 1.22, 0.05)">
            {{ getEfficiency(m_data.costPer, 2) }}
          </p>
        </div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
      </div>
      <!-- 紫票商店 -->
      <div class="store_content" id="store_3" :style="storeVisiable[3]">
        <div class="store_unit">
          <div :class="getSpriteImg('REP_COIN', 0)"></div>
        </div>
        <div v-for="(m_data, index) in storeList['purple']" class="store_unit" :key="index">
          <div :class="getSpriteImg(m_data.itemId, 1)"></div>
          <p class="store_unit_text" :class="getColor(m_data.costPer, 1.6, 0.32)">
            {{ getEfficiency(m_data.costPer, 2) }}
          </p>
        </div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
      </div>
      <!-- 信用商店 -->
      <div class="store_content" id="store_4" :style="storeVisiable[4]">
        <div class="store_unit">
          <div :class="getSpriteImg('SOCIAL_PT', 0)"></div>
        </div>
        <div v-for="(m_data, index) in storeList['grey']" class="store_unit" :key="index">
          <div :class="getSpriteImg(m_data.itemId, 1)"></div>
          <p class="store_unit_text" :class="getColor(m_data.costPer, 6.5, 1.6)">
            {{ getEfficiency(m_data.costPer, 2) }}
          </p>
        </div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
        <div class="store_unit" style="height: 0; margin-top: 0px; margin-bottom: 0px"></div>
      </div>
    </div>

    <!-- 活动商店 -->
    <div id="actStore" v-if="true">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">活动商店</div>
          <div :class="opETextTheme">Event Store</div>
        </div>
      </div>
      <!-- 标题区域end -->
      <!-- 内容区域 -->
      <div v-for="(singleAct, index) in actStoreList" :key="index" v-show="singleAct.actStartDate > 0.1">
        <!-- banner -->
        <div class="act_banner_background" :style="getBackground(singleAct.actImgUrl)">
          <div class="act_banner_img">
            <img class="act_img" :src="singleAct.actImgUrl" :alt="singleAct.actName" />
          </div>
        </div>

        <!-- tag -->
        <div class="stage_hint">
          <div v-for="(singleTag, index) in singleAct.actTagAera" :key="index" :class="getTagClass(singleTag.tagRank)">
            {{ singleTag.tagText }}
          </div>
        </div>

        <!-- Area 1 -->
        <div class="act_content">
          <div
            class="act_card uni_shadow_2 act_area1_border"
            v-for="(singleItem, index) in singleAct.actStore"
            :key="index"
            :class="getDivVisible(singleItem.itemArea - 0.5, singleItem.itemArea + 0.5)"
          >
            <!-- <div class="act_card uni_shadow_2 act_area1_border" :class="getDivVisible(singleItem.itemArea - 0.5, singleItem.itemArea + 0.5)"> -->
            <div class="act_card_img">
              <!-- <img class="level_img" :src="getImgUrl(singleItem.itemName, 1)" :alt="(singleItem.itemName)"> -->
              <div :class="getSpriteImg(singleItem.itemId, 2)"></div>
            </div>
            <div class="act_card_table">
              <table class="act_table">
                <tbody>
                  <tr class="act_table_r1">
                    <td>{{ singleItem.itemName }}</td>
                  </tr>
                  <tr class="act_table_r2" :class="getColor(singleItem.itemPPR, singleAct.actPPRBase, singleAct.actPPRStair)">
                    <!--故事集 合约 1.25 0.25  ss 3 1-->
                    <td>{{ getEfficiency(singleItem.itemPPR) }}</td>
                  </tr>
                  <tr class="act_table_r3">
                    <td>{{ singleItem.itemPrice }}代币</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- </div> -->
          </div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
        </div>
        <!-- Area 2 -->
        <div class="act_content">
          <div
            class="act_card uni_shadow_2 act_area3_border"
            v-for="(singleItem, index) in singleAct.actStore"
            :key="index"
            :class="getDivVisible(singleItem.itemArea - 1.5, singleItem.itemArea - 0.5)"
          >
            <!-- <div class="act_card uni_shadow_2 act_area3_border" :class="getDivVisible(singleItem.itemArea - 1.5, singleItem.itemArea - 0.5)"> -->
            <div class="act_card_img">
              <div :class="getSpriteImg(singleItem.itemId, 2)"></div>
            </div>
            <div class="act_card_table">
              <table class="act_table">
                <tbody>
                  <tr class="act_table_r1">
                    <td>{{ singleItem.itemName }}</td>
                  </tr>
                  <tr class="act_table_r2" :class="getColor(singleItem.itemPPR, singleAct.actPPRBase, singleAct.actPPRStair)">
                    <!--故事集 合约 1.25 0.25  ss 3 1-->
                    <td>{{ getEfficiency(singleItem.itemPPR) }}</td>
                  </tr>
                  <tr class="act_table_r3">
                    <td>{{ singleItem.itemPrice }}代币</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- </div> -->
          </div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
        </div>
        <!-- Area 3 -->
        <div class="act_content">
          <div
            class="act_card uni_shadow_2 act_area4_border"
            v-for="(singleItem, index) in singleAct.actStore"
            :key="index"
            :class="getDivVisible(singleItem.itemArea - 2.5, singleItem.itemArea - 1.5)"
          >
            <!-- <div class="act_card uni_shadow_2 act_area4_border" :class="getDivVisible(singleItem.itemArea - 2.5, singleItem.itemArea - 1.5)"> -->
            <div class="act_card_img">
              <div :class="getSpriteImg(singleItem.itemId, 2)"></div>
            </div>
            <div class="act_card_table">
              <table class="act_table">
                <tbody>
                  <tr class="act_table_r1">
                    <td>{{ singleItem.itemName }}</td>
                  </tr>
                  <tr class="act_table_r2" :class="getColor(singleItem.itemPPR, singleAct.actPPRBase, singleAct.actPPRStair)">
                    <!--故事集 合约 1.25 0.25  ss 3 1-->
                    <td>{{ getEfficiency(singleItem.itemPPR) }}</td>
                  </tr>
                  <tr class="act_table_r3">
                    <td>{{ singleItem.itemPrice }}代币</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- </div> -->
          </div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
          <div class="act_card uni_shadow_2 act_area1_border" style="height: 0px; margin-bottom: 0px"></div>
        </div>
        <!-- 内容区域end -->
      </div>
    </div>
    <!-- 活动商店end -->
  </div>
</template>

<script>
import storeApi from "@/api/store";
import cookie from "js-cookie";
// import storeJson from "static/json-video/store.json";
import { usePageContext } from "@/renderer/usePageContext";

export default {
  setup() {
    const pageContext = usePageContext();
    return { pageContext };
  },
  data() {
    return {
      // storeList: storeJson.data, //常驻商店性价比集合
      storeList: this.pageContext.pageProps.perm, //常驻商店性价比集合
      actStoreList: this.pageContext.pageProps.act, //活动商店的json
      storeVisiable: ["display:flex;", "display:flex;", "display:flex;", "display:flex;", "display:flex;"],
      tagColor: ["n", "n", "n", "n", "n"],
      opETextTheme: "op_title_etext_light",
    };
  },
  mounted() {
    // this.findPermStorePer();
    this.getCookies();
    // this.findActStorePer();
  },
  methods: {
    getSpriteImg(id, index) {
      if (index == 0) return "bg-" + id + "_icon sprite_store_icon";
      if (index == 1) return "bg-" + id + " sprite_store_perm";
      if (index == 2) return "bg-" + id + " sprite_store_act";
      if (index == 3) return "bg-" + id + " sprite_secondary_dialog";
      return "bg-" + id;
    },
    getCookies() {
      if (cookie.get("store_0") == 0) {
        this.tagColor[0] = "uni_gray";
        this.storeVisiable[0] = "display:none;";
      }
      if (cookie.get("store_1") == 0) {
        this.tagColor[1] = "uni_gray";
        this.storeVisiable[1] = "display:none;";
      }
      if (cookie.get("store_2") == 0) {
        this.tagColor[2] = "uni_gray";
        this.storeVisiable[2] = "display:none;";
      }
      if (cookie.get("store_3") == 0) {
        this.tagColor[3] = "uni_gray";
        this.storeVisiable[3] = "display:none;";
      }
      if (cookie.get("store_4") == 0) {
        this.tagColor[4] = "uni_gray";
        this.storeVisiable[4] = "display:none;";
      }

      let theme = cookie.get("theme");
      if (typeof theme == "undefined" || theme == undefined) {
        theme = "op_title_etext_light";
      }
      // console.log('store',theme);
      this.opETextTheme = "op_title_etext_" + theme;
    },

    getImgUrl(img, source) {
      source = typeof source !== "undefined" ? source : 1;
      if (source > 4.1) return "/img/materials/道具_" + img + ".png";
      else if (source > 3.1) return "/img/icon/图标_" + img + ".png";
      else if (source > 2.1) return "https://image.yituliu.site/ activity_picture /" + img + ".png";
      else if (source > 1.1) return "https://image.yituliu.site/item/" + img + ".png";
      else if (source > 0.1) return "/img/materials/" + img + ".png";
      else return "https://cdn.jsdelivr.net/gh/zirun-wang/OnePicCDN/img/" + img + ".png";
    },
    getEfficiency(num, acc) {
      acc = typeof acc !== "undefined" ? acc : 2;
      return parseFloat(num).toFixed(acc);
    },
    getEfficiencyPlus(num) {
      num = num + 0.1;
      return parseFloat(num).toFixed(2);
    },
    getBackground(url) {
      return "background: linear-gradient(rgba(144, 164, 174, 0.7), rgba(144, 164, 174, 0.7)), url(" + url + ") no-repeat 50% 50% /cover;";
    },
    getColor(color, dividing, tier) {
      tier = typeof tier !== "undefined" ? tier : 1;
      dividing = typeof dividing !== "undefined" ? dividing : 4;
      if (color < 0) return "color_t6";
      else if (color < dividing - 3 * tier) return "color_t1";
      else if (color < dividing - 2 * tier) return "color_t2";
      else if (color < dividing - 1 * tier) return "color_t3";
      else if (color < dividing) return "color_t4";
      else return "color_t5";
    },
    getTagClass(tier) {
      return "stage_hint_t" + tier.toString();
    },
    getBorderColor(area) {
      area = typeof area !== "undefined" ? area : 1;
      if (area < 0.1) return "act_area0_border";
      else if (area < 1.1) return "act_area1_border";
      else if (area < 2.1) return "act_area2_border";
      else if (area < 3.1) return "act_area3_border";
      else if (area < 4.1) return "act_area4_border";
      else return "act_area5_border";
    },
    getDivVisible(index) {
      if (index < 0 || index > 1) return "uni_invisible";
    },

    switch_store(index) {
      if (document.getElementById("store_tag_" + index.toString()).className == "n") {
        document.getElementById("store_" + index.toString()).style.display = "none";
        document.getElementById("store_tag_" + index.toString()).className = "uni_gray";
        cookie.set("store_" + index, 0, { expires: 30 });
      } else {
        document.getElementById("store_" + index.toString()).style.display = "flex";
        document.getElementById("store_tag_" + index.toString()).className = "n";
        cookie.set("store_" + index, 1, { expires: 30 });
      }
    },

    findPermStorePer() {
      storeApi.findPermStore().then((response) => {
        this.storeList = [];
        this.storeList = response.data;
      });
    },
    findActStorePer() {
      storeApi.findActStore().then((response) => {
        this.actStoreList = [];
        this.actStoreList = response.data;
      });
    },
  },
};
</script>
