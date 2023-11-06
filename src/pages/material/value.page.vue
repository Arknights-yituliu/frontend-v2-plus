<template>
  <div id="indexDiv" style="margin: auto">

      <div id="value">
        <!-- 标题区域 -->
        <div class="op_title">
          <div class="op_title_text">
            <div class="op_title_ctext">价值一览</div>
            <div :class="opETextTheme">Material Value</div>
          </div>
          <div class="value_unit_btn_wrap">
            <c-button :color="'blue'" :isSelected="value_unit==='itemValueAp'" @click="value_unit='itemValueAp'">等效理智</c-button>
            <c-button :color="'blue'" :isSelected="value_unit==='itemValue'" @click="value_unit='itemValue'">等效绿票</c-button>
            <div class="item_value_down">
              <a style="color: rgb(65, 105, 240)" href="https://backend.yituliu.site/item/export/excel"> 导出Excel</a>
            </div>
            <div class="item_value_down">
              <a style="color: rgb(65, 105, 240)" href="https://backend.yituliu.site/item/export/json"> 导出Json</a>
            </div>
          </div>
        </div>


        <div class="item_value_card_wrap color">
          <div v-for="(item_group,index) in item_value_list" :key="index" class="item_value_card_list">
            <div class="item_value_card"
                 v-for="(item,index) in item_group" :key="index"
                 :style="getItemRarityColor(item.rarity)">
              <div class="item_image_wrap">
                <div :class="getSpriteImg(item.itemId)"></div>
              </div>
              <div class="item_value">
                {{item[value_unit].toFixed(4)}}
              </div>
            </div>
          </div>
        </div>


      </div>

  </div>
</template>

<style scoped>
#indexDiv {
  color: var(--index-div-fg);
  background-color: var(--index-div-bg);
}
</style>

<script setup>
import { usePageContext } from "/src/renderer/usePageContext";
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";

let opETextTheme =  ref("op_title_etext_light")

let value_unit = ref('itemValueAp')

let item_value_list = ref([[], [], [], [], [], [], [], []])

const pageContext = usePageContext();

for (const item of pageContext.pageProps.value) {
  if (item.cardNum > 8) continue
  item_value_list.value[item.cardNum - 1].push(item)
}

function formatNumber(value,item_id){
   if(item_id ==='4001') return value.toFixed(4)
}

function getSpriteImg(id) {
  return "bg-" + id + " item_image";
}

function getItemRarityColor(rarity) {
  if (rarity === 1) return 'border-color: var(--grey)'
  if (rarity === 2) return 'border-color: var(--green)'
  if (rarity === 3) return 'border-color: var(--blue)'
  if (rarity === 4) return 'border-color: var(--purple)'
  if (rarity === 5) return 'border-color: var(--orange)'
}

onMounted(() => {
  const url_path = window.location.pathname.split("/")[1];
  if (url_path === "value") {
    ElMessage({
      dangerouslyUseHTMLString: true,
      message: '此页面已迁移至<a href="/material/value">https://yituliu.site/material/value</a>',
      type: "warning",
    });
  }
});
</script>



<script>
export const documentProps = {
  title: "一图流 - 物品价值一览",
  description: "明日方舟物品价值一览,价值表",
};
</script>

<style>

.value_unit_btn_wrap{
  display: flex;
  padding: 12px 0 0 12px ;
}

.item_value_down{
  line-height: 36px;
  padding: 0 12px;
}

.item_value_card_wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: 4px;
}

.item_value_card_list{
  margin: 4px;
}

.item_value_card {
  width: 124px;
  display: flex;
  border-left: 4px solid;
  line-height: 54px;
  margin: 2px;
}

.item_value{
  padding: 0 4px;
}

.color {
  --purple: #7F3C8D;
  --red: #E74C3C;
  --blue: #4A90E2;
  --green: #28cc9e;
  --orange: #ff7f3f;
  --grey: #e6e6e6;
}

.item_image_wrap {
  position: relative;
  width: 50px;
  height: 50px;
}

.item_image {
  position: absolute;
  transform: scale(0.278);
  top: -66px;
  left: -66px;

}

</style>
