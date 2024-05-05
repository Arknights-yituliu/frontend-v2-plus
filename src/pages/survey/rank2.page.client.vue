<script setup>
import "/src/assets/css/survey/rank2.css";
import {filterByCharacterProperty, professionDict} from "./js/common";
import {onMounted, ref} from "vue";
import character_table_simple from "/src/static/json/survey/character_table_simple.json";


import surveyApi from "/src/api/survey";

let rarityDict = [1, 2, 3, 4, 5, 6];

let operatorsStatisticsResult = ref([]);


let userCountText = ref(0);
let updateTimeText = ref("2023-05-01");

let displayOperatorList = ref([])

function getCharStatisticsResult() {
  surveyApi.getCharStatisticsResult().then((response) => {
    console.log(response.data)
    const {result, userCount, updateTime} = response.data
    for (const item of result) {
      const charId = item.charId
      let char_info = character_table_simple[charId]
      item.name = char_info.name
      item.rarity = char_info.rarity
      item.profession = char_info.profession
      item.itemObtainApproach = char_info.itemObtainApproach
      item.skill = char_info.skill
      item.equip = char_info.equip
    }
    operatorsStatisticsResult.value = result
    addFilterCondition('rarity', 6)
    userCountText.value = userCount
    updateTimeText.value = updateTime
  });
}


const rank3Color = '#f5a14d'
const rank2Color = '#d4a8dc'
const rank1Color = '#80b5e7'
const rank0Color = '#bebebe'


function getProportionalBar(proportion) {
  const {rank0, rank1, rank2, rank3} = proportion
  const barList = []

  barList.push({
    style: `width: ${rank3 * 50}px;background:${rank3Color}`,
    proportion: (rank3 * 100).toFixed(1),
    color: `color:${rank3Color}`
  })
  barList.push({
    style: `width: ${rank2 * 50}px;background:${rank2Color}`,
    proportion: (rank2 * 100).toFixed(1),
    color: `color:${rank2Color}`
  })
  barList.push({
    style: `width: ${rank1 * 50}px;background:${rank1Color}`,
    proportion: (rank1 * 100).toFixed(1),
    color: `color:${rank1Color}`
  })
  // barList.push({style:`width: ${rank0 * 80}px;background:${rank0Color}`,proportion:(rank0*100).toFixed(1),color:`color:${rank0Color}`})

  return barList
}

function getSprite(id, type) {
  if ("elite" === type) return "bg-" + id + " rank_sprite_elite";
  return "bg-" + id + " rank_avatar";
}

function getPercentage(value, digit) {
  if (value < 0) return "";
  return (value * 100).toFixed(digit) + "%";
}

function getSurveyResult(obj, rank) {
  if (typeof obj === "undefined") return '';
  if (typeof obj[rank] === "undefined") return '';
  return obj[rank];
}

function getSkillSpriteIcon(skill, index) {
  if (skill.length < index + 1) return "";
  const iconId = skill[index].iconId;
  return "bg-skill_icon_" + iconId + " rank_sprite_skill";
}

function getAvatarSprite(id) {
  return "bg-" + id + " rank-avatar";
}

function hasModType(equip, type) {
  if (typeof equip === 'undefined' || equip === null) return false
  for (const item of equip) {
    if (item.typeName2 === type) {
      return true
    }
  }
  return false
}

function getModTypeIcon(equip, type) {
  if (typeof equip === 'undefined' || equip === null) return `/image/survey/mod-icon/empty.png`
  for (const item of equip) {
    if (item.typeName2 === type) {
      return `/image/survey/mod-icon/${item.typeIcon}.png`
    }
  }
  return `/image/survey/mod-icon/empty.png`
}

function getSkillName(skill, index) {
  if (skill.length < index + 1) return "";
  return skill[index].name;
  // console.log(iconId);
}

//判断按钮是否选择赋予样式
function selectedBtn(attribute, rule) {
  if (filterCondition.value[attribute].indexOf(rule) > -1) {
    return "btn btn-blue";
  }
  return "btn";
}

let collapseFilterVisible = ref(false)

function collapseFilter() {
  collapseFilterVisible.value = !collapseFilterVisible.value
}


let filterCondition = ref({
  rarity: [],
  profession: [],
  year: [],
  own: [],
  equip: [],
  itemObtainApproach: [],
  TODO: []
});

/**
 * 增加筛选条件
 * 同属性的条件可以多条，比如星级选择4，5，6星，筛选后显示4，5，6星干员
 * 不同属性的条件要均符合才能显示，比如星级选择4，5，6星，实装时间选择2019年，筛选后显示2019年的4，5，6星干员
 * @param property 要筛选的属性
 * @param condition 属性的条件
 */
function addFilterCondition(property, condition) {
  console.log(filterCondition.value);
  let filterRulesCopy = [];
  if (filterCondition.value[property].indexOf(condition) > -1) {
    for (let i in filterCondition.value[property]) {
      if (condition !== filterCondition.value[property][i]) {
        filterRulesCopy.push(filterCondition.value[property][i]);
      }
    }
    filterCondition.value[property] = filterRulesCopy;
    filterCharacterList();
    return;
  }

  filterCondition.value[property].push(condition);
  filterCharacterList();
}

//筛选
function filterCharacterList() {
  displayOperatorList.value = []
  for (let i in operatorsStatisticsResult.value) {
    const character = operatorsStatisticsResult.value[i];
    if (filterByCharacterProperty(filterCondition.value, character)) {
      displayOperatorList.value.push(character)
    }
  }
}


let lastProperty = ref('')
let descOrAsc = ref(1)


//按条件排序
function sortRank(property) {
  if (lastProperty.value === property) {
    descOrAsc.value++;
  } else {
    descOrAsc.value = 1;
  }
  displayOperatorList.value.sort((a, b) => {
    if (descOrAsc.value % 2 !== 0) {
      return b[property] - a[property];
    }

    if (descOrAsc.value % 2 === 0) {
      return a[property] - b[property];
    }

  });

  lastProperty.value = property;
}

function sortIconClass(property, descOrAsc) {
  // console.log(property,descOrAsc)
  if (lastProperty.value === property) {
    if (descOrAsc.value % 2 !== 0 && 'desc' === descOrAsc) {
      // console.log('降序')
      return 'border-top: 8px solid #2692fd'
    }

    if (descOrAsc.value % 2 === 0 && 'asc' === descOrAsc) {
      // console.log('升序')
      return 'border-bottom: 8px solid #2692fd'
    }
  }
  return ''
}


function commonSort(property, condition) {
  if (lastProperty.value === property) {
    descOrAsc.value++;
  } else {
    descOrAsc.value = 1;
  }

  const len = displayOperatorList.value.length


  for (let i = 0; i < len - 1; i++) {
    for (let j = 0; j < len - 1 - i; j++) {
      if (descOrAsc.value % 2 !== 0) {
        // console.log(operators_statistics_list.value[j][property][condition],operators_statistics_list.value[j + 1][property][condition])
        if (displayOperatorList.value[j][property][condition] < displayOperatorList.value[j + 1][property][condition]) {
          const temp = displayOperatorList.value[j]
          displayOperatorList.value[j] = displayOperatorList.value[j + 1]
          displayOperatorList.value[j + 1] = temp;
        }
      }

      if (descOrAsc.value % 2 === 0) {
        // console.log(operators_statistics_list.value[j][property][condition],operators_statistics_list.value[j + 1][property][condition])
        if (displayOperatorList.value[j][property][condition] > displayOperatorList.value[j + 1][property][condition]) {
          const temp = displayOperatorList.value[j]
          displayOperatorList.value[j] = displayOperatorList.value[j + 1]
          displayOperatorList.value[j + 1] = temp;
        }
      }
    }
  }

  lastProperty.value = property;
}


function getTrBackground(index) {
  if (index % 2 === 0) {
    return 'tr-background'
  }

  return ''
}

onMounted(() => {

  getCharStatisticsResult()

})
</script>

<template>
  <div class="survey_rank_page">
    <!-- 常驻条 -->
    <div class="control-header">
      <!-- <button class="mdui-btn survey_button">说明</button> -->
      <button class="btn btn-blue"
              @click="collapseFilter()">筛选
      </button>
      <div id="updateTime">
        调查人数{{ userCountText }}<br/>
        更新时间{{ updateTimeText }}
      </div>
    </div>

    <!-- 筛选模块 -->
    <c-collapse-item :name="'filter'" :visible="collapseFilterVisible">

      <div class="control-box">
        <div class="control-line">
          <div class="control-line-label">职业</div>
          <div class="control-checkbox">
            <div
                :class="selectedBtn('profession', profession.value)"
                v-for="(profession,index) in professionDict"
                :key="index"
                @click="addFilterCondition('profession', profession.value)"
            >
              {{ profession.label }}
            </div>
          </div>
        </div>

        <div class="control-line">
          <div class="control-line-label">稀有度</div>
          <div class="control-checkbox">
            <div :class="selectedBtn('rarity', rarity)"
                 v-for="(rarity,index) in rarityDict" :key="index"
                 @click="addFilterCondition('rarity', rarity)">{{ rarity }}★
            </div>
          </div>
        </div>

        <div class="control-line">
          <div class="control-line-label">其他</div>
          <div class="control-checkbox">
            <!-- <div :class="selectedBtn('own', true)" @click="addFilterCondition('own', true)">已拥有</div> -->
            <!-- <div :class="selectedBtn('own', false)" @click="addFilterCondition('own', false)">未拥有</div> -->
            <div :class="selectedBtn('equip', true)" @click="addFilterCondition('equip', true)">模组已实装</div>
            <div :class="selectedBtn('equip', false)" @click="addFilterCondition('equip', false)">模组未实装</div>
            <div :class="selectedBtn('itemObtainApproach', '赠送干员')"
                 @click="addFilterCondition('itemObtainApproach', '赠送干员')">
              赠送干员
            </div>
            <div :class="selectedBtn('itemObtainApproach', '限定干员')"
                 @click="addFilterCondition('itemObtainApproach', '限定干员')">限定干员
            </div>
          </div>
        </div>

        <!-- <div class="collapse_bar">
          <div class="collapse_title">排序</div>
          <div class="switch_btn_wrap">
            <div class="btn_switch" @click="sortCharacterList('profession')">按职业</div>
            <div class="btn_switch" @click="sortCharacterList('rarity')">按稀有度</div>
            <div class="btn_switch" @click="sortCharacterList('date')">按实装顺序</div>
          </div>
        </div> -->
      </div>

    </c-collapse-item>

    <!--    <div id="rank_table mdui-table-fluid">-->
    <!--      <table class="mdui-table">-->

    <div class="rank-table-legend">
      <div class="rank-legend rank-legend-3"></div>
      <span class="legend-description">等级3</span>
      <div class="rank-legend rank-legend-2"></div>
      <span class="legend-description">等级2</span>
      <div class="rank-legend rank-legend-1"></div>
      <span class="legend-description">等级1</span>
<!--      <div class="rank-legend rank-legend-0"></div>-->
<!--      <span class="legend-description">未专精/开启</span>-->
    </div>

    <div id="rank_table">
      <table class="rank_table">
        <tr>
          <td>
            <div class="rank_table_title">代号</div>
          </td>
          <td @click="sortRank('own')">
            <div class="rank_table_title">
              <div>持有率</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('own','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('own','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('elite','rank2')">
            <div class="rank_table_title">
              <div>精二率</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('elite','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('elite','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('skill1','rank3')">
            <div class="rank_table_title">
              <div>一技能</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('skill1','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('skill1','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('skill2','rank3')">
            <div class="rank_table_title">
              <div>二技能</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('skill2','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('skill2','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('skill3','rank3')">
            <div class="rank_table_title">
              <div>三技能</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('skill3','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('skill3','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('modX','rank3')">
            <div class="rank_table_title">
              <div>X模组</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('modX','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('modX','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('modY','rank3')">
            <div class="rank_table_title">
              <div>Y模组</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('modY','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('modY','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('modD','rank3')">
            <div class="rank_table_title">
              <div>D模组</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('modD','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('modD','desc')"></div>
              </div>
            </div>
          </td>
        </tr>


        <tr v-for="(result, index) in displayOperatorList" :key="index" :class="getTrBackground(index)"
            class="rank_table_tr">
          <td class="rank-table-1">
            <div class="rank_table_avatar-v2">
              <div class="rank-avatar-wrap">
                <div :class="getAvatarSprite(result.charId)"></div>
              </div>
              <div class="rank-operator-name">{{ result.name }}</div>
            </div>
          </td>
          <td class="rank_table_2">{{ getPercentage(result.own, 1) }}</td>
          <td class="rank_table_2">{{ getPercentage(getSurveyResult(result.elite, 'rank2'), 1) }}</td>
          <td class="rank_table_3">
            <div class="rank-table-skill">
              <div class="rank_image_skill_wrap">
                <div :class="getSkillSpriteIcon(result.skill, 0)"></div>
              </div>
              <div class="proportion-bar-wrap">
                <div v-for="(bar,index) in getProportionalBar(result.skill1)" :key="index" class="proportion-bar">
                  <span :style="bar.color">{{ bar.proportion }}%</span>
                  <div :style="bar.style"></div>

                </div>
              </div>
            </div>

          </td>
          <td class="rank_table_3">
            <div class="rank-table-skill">
              <div class="rank_image_skill_wrap">
                <div :class="getSkillSpriteIcon(result.skill, 1)"></div>
              </div>
              <div class="proportion-bar-wrap">
                <div v-for="(bar,index) in getProportionalBar(result.skill2)" :key="index" class="proportion-bar">
                  <span :style="bar.color">{{ bar.proportion }}%</span>
                  <div :style="bar.style"></div>

                </div>
              </div>
            </div>

          </td>
          <td class="rank_table_3">
            <div class="rank-table-skill">
              <div class="rank_image_skill_wrap">
                <div :class="getSkillSpriteIcon(result.skill, 2)"></div>
              </div>
              <div class="proportion-bar-wrap">
                <div v-for="(bar,index) in getProportionalBar(result.skill3)" :key="index" class="proportion-bar">
                  <span :style="bar.color">{{ bar.proportion }}%</span>
                  <div :style="bar.style"></div>

                </div>
              </div>
            </div>
          </td>
          <td class="rank_table_3">
            <div class="rank-table-skill" v-show="hasModType(result.equip,'X')">
              <img :src="getModTypeIcon(result.equip,'X')" alt="" class="rank-mod-type-icon">
              <div class="proportion-bar-wrap">
                <div v-for="(bar,index) in getProportionalBar(result.modX)" :key="index" class="proportion-bar">
                  <span :style="bar.color">{{ bar.proportion }}%</span>
                  <div :style="bar.style"></div>

                </div>
              </div>
            </div>
          </td>
          <td class="rank_table_3">
            <div class="rank-table-skill" v-show="hasModType(result.equip,'Y')">
              <img :src="getModTypeIcon(result.equip,'Y')" alt="" class="rank-mod-type-icon">
              <div class="proportion-bar-wrap">
                <div v-for="(bar,index) in getProportionalBar(result.modY)" :key="index" class="proportion-bar">
                  <span :style="bar.color">{{ bar.proportion }}%</span>
                  <div :style="bar.style"></div>

                </div>
              </div>
            </div>
          </td>
          <td class="rank_table_3">
            <div class="rank-table-skill" v-show="hasModType(result.equip,'D')">
              <img :src="getModTypeIcon(result.equip,'D')" alt="" class="rank-mod-type-icon">
              <div class="proportion-bar-wrap">
                <div v-for="(bar,index) in getProportionalBar(result.modD)" :key="index" class="proportion-bar">
                  <span :style="bar.color">{{ bar.proportion }}%</span>
                  <div :style="bar.style"></div>

                </div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>


<style scoped>
.btn {
  margin: 4px;
}


</style>
