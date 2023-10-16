<template>
  <!-- <div style="display: none;"> -->
  <div>
    <!-- 地图效率Start -->
    <div id="newChapter">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">新章数据一览</div>
          <div class="op_title_etext_light">New Chapter</div>
        </div>
        <div class="op_title_tag" style="height: 28px">
          <div class="tab_text">
            <!-- *更新时间{{stageActHistory}} -->
            <!--            *更新时间 {{ newChapter[0][0].updateTime }}-->
          </div>
        </div>
      </div>
      <!-- <div class="op_warning">
        新章节开放期间样本量阈值临时下调，刷图时请注意甄别<br>
        小样活动约可提供25%额外效率
      </div> -->
      <!-- 头图 -->
      <!-- <div> -->
      <div class="ep12_wrapper">
        <a href="/material/ep13">
          <img class="ep12_pic" src="/image/temp/ep13-1.webp" alt="ep12"/>
        </a>
      </div>
      <!-- </div> -->
      <div class="ep12_content">
        <div class="ep12_half" id="ep12_left" v-for="r in [0, 1]" :key="r">
          <table class="popup_table">
            <tbody>
            <tr class="popup_table_title">
              <td class="popup_table_c1" style="width: 75px">关卡</td>
              <td class="popup_table_c2" style="width: 75px">主产物</td>
              <td class="popup_table_c4" style="width: 75px">样本数</td>
              <td class="popup_table_c5" style="width: 75px">置信度</td>
              <td class="popup_table_c6" style="width: 60px">SPM</td>
              <td class="popup_table_c7" style="width: 90px">关卡效率</td>
              <!-- <td class="popup_table_c7" style="width:64px;">小样提升<br>(理论值)</td> -->
            </tr>
            <tr v-for="(stage, index) in newChapter[r]" :key="index" class="stage_table_r">
              <td>
                {{ stage.stageCode }}
              </td>
              <td>
                <div class="store_sprite_perm_wrap">
                  <div :class="`bg-${stage.itemId} store_sprite_perm`"></div>
                </div>
              </td>
              <td>
                {{ stage.sampleSize }}
              </td>
              <td>{{ sampleConfidenceFormat(stage.sampleConfidence, 1) }}</td>
              <td>
                {{ stage.spm }}
              </td>
              <td>{{ efficiencyFormat(stage.stageEfficiency *100, 1) }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="ep12_content-mobile">
        <div class="ep12_half">
          <table class="popup_table">
            <tbody>
            <tr class="popup_table_title">
              <td class="popup_table_c1" style="width: 75px">关卡</td>
              <td class="popup_table_c2" style="width: 75px">主产物</td>
              <td class="popup_table_c4" style="width: 75px">样本数</td>
              <td class="popup_table_c5" style="width: 75px">置信度</td>
              <td class="popup_table_c6" style="width: 60px">SPM</td>
              <td class="popup_table_c7" style="width: 90px">关卡效率</td>
              <!-- <td class="popup_table_c7" style="width:64px;">小样提升<br>(理论值)</td> -->
            </tr>
            <tr v-for="(stage, index) in raw_data" :key="index" class="stage_table_r">
              <td>
                {{ stage.stageCode }}
              </td>
              <td>
                <div class="store_sprite_perm_wrap">
                  <div :class="`bg-${stage.itemId} store_sprite_perm` "></div>
                </div>
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
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- 地图效率End -->
  </div>
</template>

<script setup>
import stageApi from '/src/api/stage'
import {onMounted, ref} from "vue";


let newChapter = ref([]);
let raw_data = ref([])

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

onMounted(() => {
  stageApi.getNewChapter().then(response => {
    response = response.data
    raw_data.value = response
    const l = response.length;
    const m = Math.ceil(l / 2);
    newChapter.value = [response.slice(0, m), response.slice(m, l)];
  })
})


// const updateTime = computed(() => {
//   return newChapter.value[1].updateTime;
// });
</script>

<style scoped>
.el-divider--horizontal {
  margin: 6px 0;
}

.ep12_half {
  margin: 8px;
  border-radius: 6px;
  box-shadow: 2px 2px 2px 0 rgba(0, 0, 0, 0.2);
  background: rgba(128, 128, 128, 0.1);
  display: flex;
  justify-content: space-around;
}

.popup_table {
  text-align: center;
}

td div {
  display: inline-block;
}

.ep12_wrapper {
  margin: 8px 4px 0 4px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.ep12_pic {
  transition: transform 0.3s;
  width: 400px;
  display: block;
  border-radius: 12px;
  margin: 12px;
}

.ep12_pic:hover {
  transform: scale(1.1);
}

.stage_table_r > td {
  font-size: 18px;
}

.popup_table_title {
  font-size: 18px;
  line-height: 24px;
  height: 36px;
}

.img-wrapper {
  width: 30px;
  height: 30px;
  overflow: hidden;
  margin-top: 3px;
}

.img {
  transform: scale(50%) translate(-50%, -50%);
}

.ep12_content,
.ep12_content-mobile {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.ep12_content > div:last-child {

}

@media screen and (max-width: 771px) {
  .ep12_content {
    display: none;
  }
}

@media (min-width: 770px) {
  .ep12_content-mobile {
    display: none;
  }
}
</style>
