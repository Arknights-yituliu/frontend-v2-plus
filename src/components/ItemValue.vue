<template>
  <div>
    <div id="value">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">价值一览</div>
          <div :class="opETextTheme">Material Value</div>
        </div>
        <div class="op_title_tag">
          <div id="value_switch_to_saint" :class="tag_class_sanity" @click="switchUnit(1)">等效理智</div>
          <div id="value_switch_to_green" :class="tag_class_green" @click="switchUnit(2)">等效绿票</div>
          <div class="tab_text">
            <a style="color: rgb(65, 105, 240)" href="https://backend.yituliu.site/item/export/excel"> 导出Excel</a>
          </div>
          <div class="tab_text">
            <a style="color: rgb(65, 105, 240)" href="https://backend.yituliu.site/item/export/json"> 导出Json</a>
          </div>
        </div>
      </div>

      <div class="value_content" style="display: flex; flex-wrap: wrap">
        <div class="value_half" id="value_left">
          <div v-for="(card, index) in 4" :key="index" class="value_subList">
            <div v-for="(item, index) in itemList" :key="index" class="value_item">
              <!-- {{item}}{{card}} -->
              <div :class="getItemValueCard(card, item.cardNum, item.rarity)">
                <table>
                  <tbody>
                    <tr>
                      <td style="padding: 0px 0px 0px 6px; width: 30px">
                        <!-- <img class="item_img_size" :src="static_imgUrl(item.itemName)" :alt="getItemName(item.itemName)"/> -->
                        <div class="item_sprite_value_wrap"><div :class="getSpriteImg(item.itemId, 'value')"></div></div>
                      </td>
                      <td v-show="valueType == 'sanity'" class="value_subList_value_font">
                        {{ getItemsanityValue(item.itemId, item.itemValue) }}
                      </td>
                      <td v-show="valueType == 'green'" class="value_subList_value_font">
                        {{ getItemGreenValue(item.itemId, item.itemValue) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="value_half" id="value_right">
          <div v-for="(card, index) in cardNum" :key="index" class="value_subList" v-show="index > 3 && index < 8">
            <div v-for="(item, index) in itemList" :key="index" class="value_item">
              <div :class="getItemValueCard(card, item.cardNum, item.rarity)">
                <table>
                  <tbody>
                    <tr>
                      <td style="padding: 0px 0px 0px 6px; width: 30px">
                        <!-- <img class="item_img_size" :src="static_imgUrl(item.itemName)" :alt="getItemName(item.itemName)"/> -->
                        <div class="item_sprite_value_wrap"><div :class="getSpriteImg(item.itemId, 'value')"></div></div>
                      </td>
                      <td v-show="valueType == 'sanity'" class="value_subList_value_font">
                        {{ getItemsanityValue(item.itemId, item.itemValue) }}
                      </td>
                      <td v-show="valueType == 'green'" class="value_subList_value_font">
                        {{ getItemGreenValue(item.itemId, item.itemValue) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import storeApi from "@/api/store";
// import itemJson from "static/json-video/item_series.json";

import { usePageContext } from "@/renderer/usePageContext";

export default {
  setup() {
    const pageContext = usePageContext();
    return { pageContext };
  },
  data() {
    return {
      // itemList: itemJson.data, //全部材料价值集合
      itemList: this.pageContext.pageProps.value, //全部材料价值集合
      cardNum: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      itemCardsanity: "",
      itemValueCard_css: "",
      tag_class_green: "yituliu_title_moudule_button",
      tag_class_sanity: "yituliu_title_moudule_button",
      opETextTheme: "op_title_etext_light",
      valueVerison: 0.625,
      valueType: "sanity",
    };
  },
  mounted() {
    // this.switchUnit(1);
    // this.findAllItemValue();
    this.changeItemTagColor(1);
  },
  methods: {
    getCookies() {
      let theme = cookie.get("theme");
      if (typeof theme == "undefined" || theme === undefined) {
        theme = "op_title_etext_light";
      }
      // console.log('item',theme);
      this.opETextTheme = "op_title_etext_" + theme;
    },


    //切换价值单位
    switchUnit(index) {
      if (index === 1) {
        this.valueType = "sanity";
        this.changeItemTagColor(1);
      } else {
        this.valueType = "green";
        this.changeItemTagColor(2);
      }
    },

    //隐藏价值表
    cardHidden(index) {
      if (this.itemValueCard_css === "itemHeight") {
        this.itemValueCard_css = "";
      } else {
        this.itemValueCard_css = "itemHeight";
      }
    },

    getSpriteImg(id, type) {
      return "bg-" + id + " item_sprite_value";
    },

    getItemGreenValue(id, num) {
      if (id === "4001") {
        return parseFloat(num).toFixed(4);
      }
      return parseFloat(num).toFixed(3);
    },
    getItemsanityValue(id, num) {
      if (id === "4001") {
        return parseFloat(num * 0.8).toFixed(4);
      }
      return parseFloat(num * 0.8).toFixed(3);
    },

    //切换价值单位tag样式
    changeItemTagColor(index) {
      if (index === 2) {
        this.tag_class_green = "op_tag_1";
        this.tag_class_sanity = "op_tag_0";
      } else if (index === 1) {
        this.tag_class_green = "op_tag_0";
        this.tag_class_sanity = "op_tag_1";
      }
    },

    getItemValueCard(index, cardNum, type) {
      if (index === parseInt(cardNum)) {
        return "item_color_type_" + type;
      } else {
        return "hidden";
      }
    },

    static_imgUrl(img) {
      img = typeof img !== "undefined" ? img : 1;

      return "/image/materials/" + img + ".png";
    },
    getItemName(item) {
      return item;
    },
  },
};
</script>
