<script setup>
import {onMounted, ref, computed} from "vue";
import skillJSON from "/src/static/json/survey/operator_item_cost_table.json";
import characterJSON from "/src/static/json/survey/character_table_simple.json"
import professionDictJSON from "/src/static/json/survey/profession_dict.json";
import materialAPI from "/src/api/material.js";  // 职业字典
import surveyAPI from "/src/api/operator-data.js";  // 干员练度调查结果

const characterRarityEliteCostMap = new Map([
  [3, {elite1: 10000}],
  [4, {elite1: 15000, elite2: 60000}],
  [5, {elite1: 20000, elite2: 120000}],
  [6, {elite1: 30000, elite2: 180000}],
]);

let characterList = ref([]) // 干员列表
let itemList = []
let charStatistics = []

const opETextTheme = ref("op_title_etext_light"); // 主题颜色
const rarityCheckList = ref([]); // 当前已选择的干员星级列表
const searchKey = ref(""); // 搜索关键词

const professionCheckList = ref([]); // 已选择的职业列表, 初始化全选

let current = 0;
const size = 50;
const tableData = ref([]);

const filterTableData = computed(() => {
  // 筛选后表格数据
  let data = characterList.value.filter((data) => {
    if (!data.name.includes(searchKey.value)) return false; // 干员名称搜索
    if (rarityCheckList.value.length && !rarityCheckList.value.includes(data.rarity)) return false; // 干员星级搜索
    if (!professionCheckList.value?.length) return true; // 干员子职业搜索: 没选就默认返回所有职业的干员
    return professionCheckList.value.includes(data.subProfessionId);
  });
  return data;
});


function initData() {
  const itemMap = new Map(itemList.map(item => [item.itemId, item]));

  // 初始化干员数据
  for (const key of Object.keys(skillJSON)) {
    const characterData = {
      ...characterJSON[key],
      ...skillJSON[key],
      eliteFormat: [],
      cost: 0,
    };

    // 计算精英化成本
    for (let i = 1; i < characterData.elite.length; i++) {
      const eliteMoneyKey = `elite${i}`;
      const eliteMoney = characterRarityEliteCostMap.get(characterData.rarity)?.[eliteMoneyKey] || 0;
      const money = {num: eliteMoney, ...itemMap.get('4001')};
      characterData.eliteFormat[i - 1] = [money];
      for (const [itemId, num] of Object.entries(characterData.elite[i])) {
        const item = itemMap.get(itemId);
        characterData.cost += item.itemValueAp * num;
        characterData.eliteFormat[i - 1].push({...item, num});
      }
    }

    // 添加额外的属性
    const character = charStatistics.find(t => t.charId === key);
    Object.assign(characterData, {
      eliteRate: character?.elite,
      firstSkill: character?.skill1,
      secondSkill: character?.skill2,
      thirdSkill: character?.skill3,
    });

    // 计算技能专精成本
    function calculateSkillCost(skill, skillFormat) {
      console.log(skillFormat)
      if (!skillFormat) {
        skillFormat = {
          cost: 0,
          count: 0,
          rank0: 0,
          rank1: 0,
          rank2: 0,
          rank3: 0,
        }
        skillFormat.cost = 0
      }
      skillFormat.cost = 0;
      skill.forEach(level => {
        for (const [itemId, num] of Object.entries(level)) {
          const item = itemMap.get(itemId);
          skillFormat.cost += item.itemValueAp * num;
        }
        skillFormat.cost = parseFloat(skillFormat.cost.toFixed(2));
      });
    }

    if (characterData.skills.length > 1) {
      calculateSkillCost(characterData.skills[0], characterData.firstSkill);
      calculateSkillCost(characterData.skills[1], characterData.secondSkill);

      if (characterData.skills[2]) {
        calculateSkillCost(characterData.skills[2], characterData.thirdSkill);
      }
    }

    // 设置职业名称和分支名称
    const profession = professionDictJSON.find(t => t.value === characterData.profession);
    characterData.professionName = profession.label;
    const professionChildInfo = profession.children.find(t => t.value === characterData.subProfessionId);
    if (professionChildInfo) {
      characterData.subProfessionName = professionChildInfo.label;
    }

    characterData.cost = parseFloat(characterData.cost.toFixed(2));
    characterList.value.push(characterData);
  }

  // 按材料开销排序
  characterList.value.sort((a, b) => {
    return b.cost - a.cost || b.rarity - a.rarity;
  });
  for (let i = 0; i < characterList.value.length; i++) characterList.value[i].index = i + 1;
}

// 表格材料开销格式化
function costFormatter(row, col) {
  const value = row[col.property] || getNestedProperty(row, col.property) || 0
  return value || 0
}

// 表格百分比格式化
function percentFormatter(row, col) {
  const value = row[col.property] || getNestedProperty(row, col.property) || 0
  return (value * 100).toFixed(1) + '%'
}

// 排序
function sortChange({prop, order}) {
  characterList.value.sort((a, b) => {
    const sortDirection = order === 'ascending' ? 1 : -1;
    if (prop === 'cost') {
      return sortDirection * (b.index - a.index);
    } else {
      return sortDirection * (getNestedProperty(a, prop) - getNestedProperty(b, prop));
    }
  });

  tableData.value = filterTableData.value.slice(0, current * size)
}

// 材料图标
function getSpriteImg(id, type) {
  return type === "icon" ? `bg-${id}_icon sprite_store_icon` : `bg-${id} store_sprite_${type}`;
}

function rowClassName({row}) {
  if (row.rarity < 3) return "hide-expand";
  return "";
}

// 返回嵌套属性值
function getNestedProperty(obj, path) {
  return path.split('.').reduce((o, i) => o[i], obj);
}

// 重置表格数据
function reset() {
  current = 0;
  load();
}

// 懒加载表格数据
function load() {
  const total = filterTableData.value.length;
  if (current === 0) return (tableData.value = filterTableData.value.slice(current * size, ++current * size));
  if (current * size >= total) return;
  tableData.value = tableData.value.concat(filterTableData.value.slice(current * size, ++current * size));
}

onMounted(async () => {
  const itemResponse = await materialAPI.getItemValueTable(0.625)
  itemList = itemResponse.data
  const charStatisticsResponse = await surveyAPI.getCharStatisticsResult()
  charStatistics = charStatisticsResponse?.data?.result || []
  initData()
  load();
});

// 自定义指令
const vLoadmore = {
  mounted: (el, binding) => {
    const selectWrap = el.querySelector(".el-scrollbar__wrap");
    selectWrap.addEventListener("scroll", (e) => {
      const {scrollHeight, scrollTop, clientHeight} = selectWrap;
      if (scrollHeight - scrollTop - 160 <= clientHeight) {
        binding.value();
      }
    });
  },
};
</script>

<template>
  <div class="elite-page">
    <!-- 标题区域 -->
    <div class="op_title">
      <div class="op_title_text">
        <div class="op_title_ctext">五星六星精二性价比</div>
        <div :class="opETextTheme">Elite Efficiency</div>
      </div>
    </div>
    <!-- 标题区域end -->
    <!-- 内容区域 -->
    <div class="option">
      <el-checkbox-group v-model="rarityCheckList" size="large" @change="reset">
        <el-checkbox-button v-for="item in 6" :key="item" :value="item">★{{ item }}</el-checkbox-button>
      </el-checkbox-group>
      <div class="right">
        <el-input class="el-input-operator-name" v-model="searchKey" placeholder="干员名称" @input="reset"></el-input>
        <el-cascader
            class="el-cascader-profession"
            v-model="professionCheckList"
            :options="professionDictJSON"
            @change="reset"
            placeholder="选择干员子职业"
            clearable
        />
      </div>
    </div>
    <div class="table-container">
      <el-auto-resizer>
        <template #default="{ height }">
          <el-table
              :data="tableData"
              :height="height"
              stripe
              highlight-current-row
              :row-class-name="rowClassName"
              v-loadmore="load"
              @sort-change="sortChange"
          >
            <el-table-column type="expand">
              <template v-slot="{ row }">
                <div class="detail">
                  <div class="row" v-for="num in row.eliteFormat.length" :key="num">
                    <p>精{{ num }}所需材料</p>
                    <div
                        v-for="(item, index) in row.eliteFormat[num - 1]"
                        :key="index"
                        class="elite-material"
                    >
                      <div :class="getSpriteImg(item.itemId, 'perm')"></div>
                      <span class="num">{{ item.num }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="index" label="排名" width="60">
            </el-table-column>
            <el-table-column prop="name" label="干员代号"/>
            <el-table-column prop="eliteRate.rank2" label="精二率" sortable :formatter="percentFormatter"/>
            <el-table-column prop="cost" label="材料开销" sortable/>
            <el-table-column prop="firstSkill.rank3" label="一技能专三率" sortable :formatter="percentFormatter"/>
            <el-table-column prop="firstSkill.cost" label="材料开销" sortable :formatter="costFormatter"/>
            <el-table-column prop="secondSkill.rank3" label="二技能专三率" sortable :formatter="percentFormatter"/>
            <el-table-column prop="secondSkill.cost" label="材料开销" sortable :formatter="costFormatter"/>
            <el-table-column prop="thirdSkill.rank3" label="三技能专三率" sortable :formatter="percentFormatter"/>
            <el-table-column prop="thirdSkill.cost" label="材料开销" sortable :formatter="costFormatter"/>
            <el-table-column prop="professionName" label="职业"/>
            <el-table-column prop="subProfessionName" label="分支"/>
            <el-table-column prop="itemObtainApproach" label="获取方式"/>
            <!-- <el-table-column prop="name" label="钱书开销" /> -->
            <!-- <el-table-column prop="name" label="总消耗" /> -->
            <!-- <el-table-column prop="name" label="折合源石" /> -->
            <!-- <el-table-column prop="name" label="礼包源石" /> -->
            <!-- <el-table-column prop="name" label="总源石" /> -->
            <!-- <el-table-column prop="name" label="性价比(相对648)" /> -->
          </el-table>
        </template>
      </el-auto-resizer>
    </div>
    <!-- 内容区域End -->
  </div>
</template>

<style lang="scss">


.elite-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 68px);

  p {
    margin: 0;
  }

  .op_title {
    margin-bottom: 10px;
  }

  .option {
    display: flex;
    align-items: center;
    margin-left: 10px;
    flex-wrap: wrap;

    .el-checkbox-group {
      margin-bottom: 10px;
      margin-right: 10px;

      .el-checkbox-button {
        &.is-focus .el-checkbox-button__inner {
          border-color: var(--el-checkbox-button-checked-border-color);
        }

        &:first-child .el-checkbox-button__inner {
          border-left: var(--el-border);
        }

        .el-checkbox-button__inner {
          border-left-style: solid;
          border-left-color: transparent;
          border-left-width: 1px;
        }
      }
    }

    .right {
      margin-bottom: 10px;

      .el-input {
        width: 200px;
        margin-right: 10px;
      }
    }
  }

  .table-container {
    flex: 1;
    box-sizing: border-box;

    .el-table {
      box-shadow: var(--el-box-shadow-light);

      .detail {
        padding-left: 60px;

        .row {
          display: flex;
          align-items: center;

          .num {
            position: absolute;
            right: -7px;
            bottom: 0;
            font-size: 18px;
            font-weight: bold;
            color: #000;
            text-shadow: -1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff, -2px -2px 4px #ffffff, 2px -2px 4px #ffffff,
            -2px 2px 4px #ffffff, 2px 2px 4px #ffffff;
          }
        }
      }

      .hide-expand .el-table__expand-column .el-table__expand-icon {
        display: none;
      }
    }

    .column-header-container {
      display: flex;

      .column-title {
        margin-right: 4px;
      }
    }
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .el-cascader-menu__wrap.el-scrollbar__wrap {
    height: 285px;
  }

  .elite-material {
    width: 60px;
    height: 60px;
    position: relative;

    .div {
      transform: scale(calc(60 / 183));
      left: calc((60px - 183px) / 2);
      top: calc((60px - 183px) / 2);
      position: absolute;
    }
  }


  //.notice-board-page + .elite-page {
  //  height: calc(100vh - 68px - 23px);
  //}
}


@media screen and (max-width: 600px) {
  //.notice-board-page + .elite-page {
  //  height: calc(100vh - 80px - 40px) !important;
  //}
  .elite-page {
    height: calc(100vh - 80px) !important;

    .el-checkbox-button__inner {
      padding: 12px 16px;
    }

    .option {
      .right {
        .el-input {
          width: 160px;
          margin-right: 4px;
        }
      }
    }
  }

}

</style>