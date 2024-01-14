<template>
  <div class="rougeCal-page">
  <div class="background" >
    <p style="opacity: 0.5; position:fixed; right: 10px; bottom: 10px">版本号：v{{ version }}</p>
    <div class="transparent-panel" id="panel">
      <img style="position:absolute; left:1172px; top: 205px" src="/RougeCalc/images/delete.png" alt="delete" @click="removeBattle()">
      <img style="position:absolute; left:45px; top: 60px" src="/RougeCalc/images/logo.png" alt="logo">

      <div class="title-text" style="left: 40px; top: 192px;">挑战分数</div>
      <div class="rounded-rectangle" style="left: 40px; top: 240px; width: 350px; height: 255px;">
        <div
            v-for="(text, index) in challengeName"
            :key="index"
            class="normal-text"
            :style="{ left: '27px', top : 32 * index + 19 + 'px' }"
        >{{ text }}</div>
        <input
            v-for="(num, index) in challengeCount"
            :key="index"
            v-model.number="challengeCount[index]"
            class="custom-input"
            type="number"
            placeholder="0"
            :style="{ left: '273px', top: 32 * index + 19 + 'px' }"
        />
        <div v-for="(selectValue, index) in challengeSelect" :key="index">
          <select
              v-model.number="challengeSelect[index]"
              class="custom-dropdown"
              :style="{ left: '273px', top: 32 * index + 179 + 'px' }"
          >
            <option value="0">是</option>
            <option value="1">否</option>
          </select>
        </div>
      </div>

      <div class="title-text" style="left: 40px; top: 522px;">结局分数</div>
      <div class="rounded-rectangle" style="left: 40px; top: 570px; width: 350px; height: 225px;">
        <button
            v-for="(imgSrc, index) in bossSrc"
            :key="index"
            class="boss-button"
            :style="{ left: (index % 4) * 78 + 19 + 'px', top: Math.floor(index / 4) * 68 + 14 + 'px' }"
            @click="bossBtnClicked(index)">
          <img :src="imgSrc" :style="{ opacity: imgOpacity[index] }">
        </button>
      </div>

      <div class="title-text" style="left: 450px; top: 192px;">关卡分数</div>
      <div class="rounded-rectangle" style="left: 450px; top: 240px; width: 350px; height: 295px;">
        <div
            v-for="(text, index) in battleText"
            :key="index"
            class="normal-text"
            :style="{ left: '27px', top : 32 * index + 19 + 'px' }"
        >{{ text }}</div>
        <select
            v-for="(dropdown, index) in battleDropdowns"
            :key="index"
            class="custom-dropdown-2"
            :style="{ left: '193px', top: 32 * index + 19 + 'px' }"
            :disabled="dropdown.disabled"
            v-model="dropdown.selectedValue"
            @change="battleChoiceChange(index)"
        >
          <option
              v-for="(option, idx) in dropdown.options"
              :key="idx"
              :value="option.value"
              :disabled="option.disabled || false"
              :hidden="option.disabled || false"
          >
            {{ option.text }}
          </option>
        </select>
        <button style="left: 25px; top: 249px;" class="add-button" @click="addBattle()">添加</button>
      </div>

      <div class="title-text" style="left: 450px; top: 554px;">结算分数</div>
      <input type="number" class="final-input" placeholder="0" v-model="settlementScore">

      <div class="rounded-rectangle" style="left: 450px; top: 640px; width: 350px; height: 155px;" @mouseenter="mouseEnter()" @mouseleave="mouseLeave()" @mousedown="mouseDown()" @mouseup="mouseUp()">
        <p class="result-text" ref="sumText">{{ sum }}</p>
        <p class="result-unit" :style="{ left: unitLeft + 'px' }">{{ unit }}</p>
        <div class="normal-text" style="left: 160px; top: 35px;"><b>总分！</b></div>
        <p class="normal-text" style="left: 10px; top: 115px;" id="hint" hidden>长按重置</p>
      </div>

      <div class="title-text" style="left: 860px; top: 192px;">关卡分数一览</div>
      <div class="rounded-rectangle" style="left: 860px; top: 240px; width: 350px; height: 555px;">
        <table class="custom-table">
          <tr
              v-for="(row, rowIndex) in scoreList"
              :key="rowIndex"
              :class="{ highlighted: rowIndex === highlightedRow }"
              @click="battleRowClicked(rowIndex)">
            <td v-for="(cell, cellIndex) in row" :key="cellIndex">
              {{ cell }}
            </td>
          </tr>
        </table>
      </div>

      <input type="checkbox" style="position: absolute; left: 1035px; top: 80px;" v-model="useCustomUnit">
      <div class="normal-text" style="left: 1065px; top: 80px;">使用自定义分数单位</div>
      <div class="normal-text" style="left: 983px; top: 120px;">1</div>
      <div class="normal-text" style="left: 1085px; top: 120px;">=</div>
      <div class="normal-text" style="left: 1187px; top: 120px;">分</div>
      <input class="unit-input" style="left: 1002px; top: 111px;" placeholder="输入文字" v-model="unitName" :disabled="!useCustomUnit"/>
      <input type="number" class="unit-input" style="left: 1104px; top: 111px;" placeholder="0" v-model.number="unitScore" :disabled="!useCustomUnit"/>

      <div class="title-text" style="left: 40px; top: 850px;">友情链接</div>
      <a href="https://tomimi.cyou/zh/sami">
        <img style="position: absolute; left: 40px; top: 900px;" src="/RougeCalc/images/tomimi.png" alt="tomimi">
        <div class="central-text" style="left: 105px; top: 1035px;">TOMIMI</div>
      </a>
      <a href="https://viktorlab.cn/akdata/dps/">
        <img style="position: absolute; left: 220px; top: 900px;" src="/RougeCalc/images/dpscalc.png" alt="dpscalc">
        <div class="central-text" style="left: 285px; top: 1035px;">DPS计算器</div>
      </a>
      <a href="https://mapcn.ark-nights.com/areas/rogue_3">
        <img style="position: absolute; left: 400px; top: 900px;" src="/RougeCalc/images/prtsmap.png" alt="tomimi">
        <div class="central-text" style="left: 465px; top: 1035px;">PRTS.Maps</div>
      </a>
      <div class="title-text" style="left: 700px; top: 850px;">相关链接</div>
      <a href="https://live.bilibili.com/22476160">
        <div class="link-text" style="left: 700px; top: 905px;">比赛直播间</div>
      </a>
      <div class="title-text" style="left: 700px; top: 1020px;">制作人员</div>
      <div class="normal-text" style="left: 700px; top: 1075px;">程序：</div>
      <a href="https://space.bilibili.com/22275485">
        <div class="link-text" style="left: 750px; top: 1075px;">_noname</div>
      </a>
      <div class="normal-text" style="left: 700px; top: 1105px;">美术：</div>
      <a href="https://space.bilibili.com/1684845011">
        <div class="link-text" style="left: 750px; top: 1105px;">里雪りあ</div>
      </a>
      <a href="https://space.bilibili.com/12786648">
        <div class="link-text" style="left: 750px; top: 1135px;">無冕Crownless</div>
      </a>
    </div>
  </div>
  </div>
</template>

<script>

import { ref, computed } from 'vue';

export default {
  name: 'App',
  data() {
    return {
      challengeName: [
        "隐藏敌人（鸭、熊、狗）",
        "四层失与得紧急作战",
        "五层失与得紧急作战",
        "黑色足迹紧急作战",
        "未抓取软ban干员数量",
        "全程未取过钱",
        "全程未进入树篱之途"
      ],
      bossSrc: [
        "/RougeCalc/images/b-7-b.png",
        "/RougeCalc/images/b-6-b.png",
        "/RougeCalc/images/b-5-b.png",
        "/RougeCalc/images/b-4-b.png",
        "/RougeCalc/images/b-7.png",
        "/RougeCalc/images/b-6.png",
        "/RougeCalc/images/b-5.png",
        "/RougeCalc/images/r-1.png",
        "/RougeCalc/images/r-2.png",
        "/RougeCalc/images/r-3.png",
        "/RougeCalc/images/r-4.png",
        "/RougeCalc/images/r-5.png"
      ],
      battleText: [
        "关卡类型",
        "关卡层数",
        "关卡名称",
        "是否无漏",
        "是否持有路网",
        "是否有捕猎惩罚",
        "特殊加分"
      ],
      version: "1.1"
    };
  },
  setup() {
    const challengeScore = [10, 30, 80, 30, 25, 66, 200];
    const challengeCount = ref(["", "", "", "", ""]);
    const challengeSelect = ref([1, 1]);
    const bossScore = [230, 360, 220, 170, 180, 10, 160, 30, 30, 20, 20, 10];
    const twoEnding = 200;
    const threeEnding = 100;
    const bothThreeFourEnding = 100;
    const imgOpacity = ref(Array(12).fill(0.5));
    const bossSelected = ref(Array(12).fill(0));
    const battleDropdowns = ref([
      {
        options: [{ value: "2", text: "", disabled: true }, { value: "0", text: "紧急作战" }, { value: "1", text: "特殊作战" }],
        disabled: false,
        selectedValue: 2
      },
      {
        options: [],
        disabled: true
      },
      {
        options: [],
        disabled: true
      },
      {
        options: [{ value: "0", text: "是" }, { value: "1", text: "否" }],
        disabled: false,
        selectedValue: 1
      },
      {
        options: [{ value: "0", text: "是" }, { value: "1", text: "否" }],
        disabled: true,
        selectedValue: 1
      },
      {
        options: [{ value: "0", text: "是" }, { value: "1", text: "否" }],
        disabled: true,
        selectedValue: 1
      },
      {
        options: [],
        disabled: true
      },
    ]);
    const battleLevels = ["一层", "二层", "三层", "四层", "五层", "六层"];
    const battleNames = [
      ["死囚之夜", "度假村冤魂", "苔手", "待宰的兽群", "事不过四"],
      ["没有尽头的路", "低空机动", "违和", "幽影与鬼魅", "虫虫别回头", "还之彼身"],
      ["冰海疑影", "狡兽九窟", "弄假成真", "饥渴祭坛", "咫尺天涯", "思维折断", "恃强凌弱"],
      ["坍缩体的午后", "公司纠葛", "以守代攻", "大迁徙", "禁区", "应用测试", "杂音干扰", "冰凝之所"],
      ["人造物狂欢节", "乐理之灾", "亡者行军", "本能污染", "求敌得敌", "混乱的表象", "何处无山海", "生人勿近"],
      ["霜与沙", "生灵的终点"]
    ];
    const battleScore = {
      "冰海疑影": 30,
      "狡兽九窟": 30,
      "坍缩体的午后": 40,
      "公司纠葛": 40,
      "人造物狂欢节": 90,
      "乐理之灾": 60,
      "亡者行军": 60,
      "本能污染": 60,
      "求敌得敌": 50,
      "混乱的表象": 50,
      "何处无山海": 50,
      "生人勿近": 40,
      "霜与沙": 50,
      "生灵的终点": 90
    };
    const battleSpecialName = ["呼吸", "大地醒转", "夺树者", "黄沙幻境", "天途半道", "惩罚", "豪华车队", "英雄无名", "正义使者", "亘古仇敌"];
    const battleSpecialScore = {
      "呼吸": [48, 40],
      "大地醒转": [48, 40],
      "夺树者": [48, 40],
      "黄沙幻境": [10, 0],
      "天途半道": [20, 0],
      "惩罚": [20, 0],
      "豪华车队": [30, 0],
      "英雄无名": [20, 0],
      "正义使者": [100, 50],
      "亘古仇敌": [20, 20]
    };
    const specialExtraName = {
      "冰海疑影": ["1个污染躯壳", "17个污染躯壳"],
      "人造物狂欢节": ["0个突击动力甲", "1个突击动力甲", "2个突击动力甲"],
      "乐理之灾": ["3个小提琴家", "4个小提琴家"],
      "黄沙幻境": ["西/北风向", "东/南风向"],
      "英雄无名": ["击杀0个", "击杀1个", "击杀2个", "击杀3个", "击杀4个", "击杀5个", "击杀6个"]
    };
    const specialExtraScore = {
      "17个污染躯壳" : 10,
      "1个突击动力甲" : 10,
      "2个突击动力甲" : 20,
      "4个小提琴家" : 10,
      "东/南风向" : 10,
      "击杀1个" : 15,
      "击杀2个" : 30,
      "击杀3个" : 45,
      "击杀4个" : 60,
      "击杀5个" : 75,
      "击杀6个" : 90
    };
    const settlementScore = ref("");
    const useCustomUnit = ref(false);
    const unitLeft = ref(0);
    const unitName = ref("");
    const unitScore = ref("");
    const scoreList = ref([]);

    const unit = computed(() => {
      if (useCustomUnit.value && unitName.value != "" && unitScore.value != "" && unitScore.value != "0") {
        return unitName.value;
      } else {
        return "";
      }
    });

    const sum = computed(() => {
      var total = challengeCount.value.reduce((total, num, index) => total + (parseInt(num) || 0) * challengeScore[index], 0);
      total += challengeSelect.value.reduce((total, selectValue, index) => {
        if (selectValue == 0) total += challengeScore[index + 5];
        return total;
      }, 0);

      for (let i = 0; i < 12; i++)
        total += bossScore[i] * bossSelected.value[i];
      var bossCnt = 0;
      for (let i = 0; i < 7; i++)
        if (bossSelected.value[i] > 0)
          bossCnt++;
      if (bossCnt == 3) total += threeEnding;
      if (bossCnt >= 2) total += twoEnding;
      if (bossSelected.value[0] + bossSelected.value[4] > 0 && bossSelected.value[1] + bossSelected.value[5] > 0) total += bothThreeFourEnding;

      total += parseInt(settlementScore.value) || 0;

      total += scoreList.value.reduce((total, row) => total + (parseInt(row[1]) || 0), 0);

      if (unit.value != "") {
        return (total * 1.0 / parseInt(unitScore.value)).toFixed(2);
      } else {
        return total;
      }
    });

    var timer;

    const resetBossBtn = () => {
      for (let i = 0; i < 12; i++) imgOpacity.value[i] = bossSelected.value[i] == 1? 1 : 0.5;
    };

    const mouseEnter = () => {
      var hint = document.getElementById("hint");
      hint.hidden = false;
    };

    const mouseLeave = () => {
      var hint = document.getElementById("hint");
      hint.hidden = true;
      clearTimeout(timer);
    };

    const mouseDown = () => {
      timer = setTimeout(() => {
        challengeCount.value = challengeCount.value.map(() => "");
        challengeSelect.value = challengeSelect.value.map(() => 1);
        bossSelected.value = bossSelected.value.map(() => 0);
        resetBossBtn();
      }, 1000);
    }

    const mouseUp = () => {
      clearTimeout(timer);
    };

    const bossBtnClicked = (id) => {
      bossSelected.value[id] = 1 - bossSelected.value[id];
      if (bossSelected.value[2] + bossSelected.value[3] + bossSelected.value[6] > 1) {
        bossSelected.value[2] = 0;
        bossSelected.value[3] = 0;
        bossSelected.value[6] = 0;
        bossSelected.value[id] = 1;
      }
      if (id == 0 && bossSelected.value[0] != 0) bossSelected.value[4] = 0;
      if (id == 4 && bossSelected.value[4] != 0) bossSelected.value[0] = 0;
      if (id == 1 && bossSelected.value[1] != 0) bossSelected.value[5] = 0;
      if (id == 5 && bossSelected.value[5] != 0) bossSelected.value[1] = 0;
      if (bossSelected.value[0] + bossSelected.value[4] > 0 && bossSelected.value[8] == 0) {
        if (id == 8) {
          bossSelected.value[0] = 0;
          bossSelected.value[4] = 0;
        } else {
          bossSelected.value[8] = 1;
        }
      }
      if (bossSelected.value[1] + bossSelected.value[5] > 0 && bossSelected.value[7] == 0) {
        if (id == 7) {
          bossSelected.value[1] = 0;
          bossSelected.value[5] = 0;
        } else {
          bossSelected.value[7] = 1;
        }
      }
      resetBossBtn();
    };

    const getSelectedText = (dropdown) => {
      const selectedOption = dropdown.options.find(option => option.value === dropdown.selectedValue);
      return selectedOption ? selectedOption.text : '';
    };

    const battleChoiceChange = (id) => {
      if (id == 0) {
        battleDropdowns.value[6].options = [];
        battleDropdowns.value[6].disabled = true;
        if (battleDropdowns.value[0].selectedValue == "0") {
          battleDropdowns.value[1].disabled = false;
          battleDropdowns.value[2].disabled = true;
          battleDropdowns.value[4].disabled = false;
          battleDropdowns.value[5].disabled = false;
          battleDropdowns.value[1].selectedValue = -1;
          battleDropdowns.value[2].options = [];
          for (let i = 0; i < 6; i++)
            battleDropdowns.value[1].options.push({ value: "" + i, text: battleLevels[i] });
        } else {
          battleDropdowns.value[1].disabled = true;
          battleDropdowns.value[2].disabled = false;
          battleDropdowns.value[4].disabled = true;
          battleDropdowns.value[5].disabled = true;
          battleDropdowns.value[4].selectedValue = 1;
          battleDropdowns.value[5].selectedValue = 1;
          battleDropdowns.value[2].selectedValue = -1;
          battleDropdowns.value[1].options = [];
          battleDropdowns.value[2].options = [];
          for (let i = 0; i < battleSpecialName.length; i++)
            battleDropdowns.value[2].options.push({ value: "" + i, text: battleSpecialName[i] });
        }
      } else if (id == 1) {
        battleDropdowns.value[6].options = [];
        battleDropdowns.value[6].disabled = true;
        battleDropdowns.value[2].disabled = false;
        var lev = parseInt(battleDropdowns.value[1].selectedValue) || 0;
        battleDropdowns.value[2].options = [];
        for (let i = 0; i < battleNames[lev].length; i++)
          battleDropdowns.value[2].options.push({ value: "" + i, text: battleNames[lev][i] });
      } else if (id == 2) {
        battleDropdowns.value[6].options = [];
        battleDropdowns.value[6].selectedValue = 0;
        var name = getSelectedText(battleDropdowns.value[2]);
        if (name in specialExtraName) {
          var list = specialExtraName[name];
          battleDropdowns.value[6].disabled = false;
          for (let i = 0; i < list.length; i++)
            battleDropdowns.value[6].options.push({ value: "" + i, text: list[i] });
        } else {
          battleDropdowns.value[6].disabled = true;
        }
      }
    };

    const addBattle = () => {
      var type = battleDropdowns.value[0].selectedValue;
      var name = getSelectedText(battleDropdowns.value[2]);
      var total = 0;
      var times = 1.0;
      if (type == "0") {
        if (name in battleScore) total += battleScore[name];
        if (battleDropdowns.value[4].selectedValue == "0") total += 20;
        if (battleDropdowns.value[3].selectedValue == "0") times += 0.2;
        if (battleDropdowns.value[5].selectedValue == "0") times -= 0.7;
      } else if (type == "1") {
        total = battleSpecialScore[name][parseInt(battleDropdowns.value[3].selectedValue) || 0];
      } else {
        return;
      }
      var sp = getSelectedText(battleDropdowns.value[6]);
      if (sp in specialExtraScore) total += specialExtraScore[sp];
      total *= times;
      if (total > 0) {
        scoreList.value.push([name, total]);
        console.log("新增战斗：" + name + "，得分为" + total);
      }
    };

    const highlightedRow = ref(-1);

    const battleRowClicked = (id) => {
      highlightedRow.value = id;
    };

    const removeBattle = () => {
      console.log("remove, scoreList.value.size="+scoreList.value.length);
      if (highlightedRow.value >= 0 && highlightedRow.value < scoreList.value.length) {
        scoreList.value.splice(highlightedRow.value, 1);
        highlightedRow.value = -1;
      }
    };

    return { challengeCount, challengeSelect, imgOpacity, bossSelected, battleDropdowns, settlementScore, useCustomUnit, scoreList,
      sum, unit, unitLeft, unitName, unitScore, highlightedRow,
      mouseEnter, mouseLeave, mouseDown, mouseUp, bossBtnClicked, battleChoiceChange, addBattle, battleRowClicked, removeBattle };
  },
  methods: {
    calculateUnitPosition() {
      const sumElement = this.$refs.sumText;
      if (sumElement) {
        const sumRect = sumElement.getBoundingClientRect();
        this.unitLeft = sumRect.right - 515;
      }
    }
  },
  mounted() {
    this.calculateUnitPosition();
  },
  watch: {
    sum() {
      this.$nextTick(() => {
        this.calculateUnitPosition();
      });
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: var(--c-text-color);

}

@font-face {
  font-family: 'Novecento Wide Medium';
  src: url('/RougeCalc/font/Novecento WideMedium.otf');
}

@font-face {
  font-family: '标小智无界黑';
  src: url('/RougeCalc/font/标小智无界黑.TTF');
}

@font-face {
  font-family: 'HarmonyOS Sans SC';
  src: url('/RougeCalc/font/HARMONYOS_SANS_SC_REGULAR.TTF');
}

.rougeCal-page{
  position: relative;
  height: 1200px;
}

.background {
  background-image: url('/RougeCalc/images/pure-background.jpg');
  background-size: cover;
  justify-content: center;
  align-items: center;
}

.transparent-panel {
  position: absolute;
  top: 0px;
  left: 50%;
  transform: translateX(-50%);
  background: transparent;
  width: 1275px;
  height: 100%;
}

.rounded-rectangle {
  border: 2px solid #B7D5F7;
  border-radius: 15px;
  position: absolute;
}

.title-text {
  font-family: '标小智无界黑', sans-serif;
  font-size: 34px;
  color: #276CBC;
  position: absolute;
}

.normal-text {
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 16px;
  color: #000;
  position: absolute;
}

.central-text {
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 16px;
  color: #276CBC;
  text-decoration: underline;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.link-text {
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 16px;
  color: #276CBC;
  text-decoration: underline;
  position: absolute;
}

.bold-text {
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 18px;
  color: #000;
  position: absolute;
}

.result-text {
  font-family: 'Novecento Wide Medium', sans-serif;
  font-size: 47px;
  color: #B7D5F7;
  text-align: center;
  position: absolute;
  left: 50%;
  top: 10px;
  transform: translateX(-50%);
}

.result-unit {
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 20px;
  color: #B7D5F7;
  position: absolute;
  top: 60px;
}

.custom-input::-webkit-inner-spin-button,
.custom-input::-webkit-outer-spin-button {
  -webkit-appearance: none !important;
}

.custom-input[type='number'] {
  -moz-appearance: textfield;
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 16px;
  background-color: #EFEFEF;
  border: transparent;
  position: absolute;
  width: 50px;
  height: 26px;
  text-align: center;
  appearance: none;
}

.final-input::-webkit-inner-spin-button,
.final-input::-webkit-outer-spin-button {
  -webkit-appearance: none !important;
}

.final-input[type='number'] {
  -moz-appearance: textfield;
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 18px;
  background-color: transparent;
  border: 2px solid #B7D5F7;
  position: absolute;
  left: 630px;
  top: 563px;
  width: 166px;
  height: 38px;
  border-radius: 15px;
  text-align: center;
  appearance: none;
}

.unit-input::-webkit-inner-spin-button,
.unit-input::-webkit-outer-spin-button {
  -webkit-appearance: none !important;
}

.unit-input {
  -moz-appearance: textfield;
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 16px;
  background-color: transparent;
  border: 2px solid #B7D5F7;
  position: absolute;
  width: 70px;
  height: 30px;
  border-radius: 10px;
  text-align: center;
  appearance: none;
}

.custom-dropdown {
  background-color: #EFEFEF;
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 16px;
  border: 1px solid #ccc;
  width: 54px;
  height: 26px;
  text-align: center;
  position: absolute;
}

.custom-dropdown-2 {
  background-color: #EFEFEF;
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 16px;
  border: 1px solid #ccc;
  width: 134px;
  height: 26px;
  text-align: center;
  position: absolute;
}

.add-button {
  background-color: #EFEFEF;
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 18px;
  border: 1px solid #ccc;
  width: 303px;
  height: 35px;
  text-align: center;
  position: absolute;
}

.boss-button {
  background-color: transparent;
  border: transparent;
  width: 64px;
  height: 64px;
  position: absolute;
}

.custom-table {
  font-family: 'HarmonyOS Sans SC', sans-serif;
  font-size: 16px;
  background-color: transparent;
  border: transparent;
  left: 10px;
  top: 10px;
  width: 330px;
  position: absolute;
  border-collapse: collapse;
  table-layout: fixed;
}

.custom-table td:nth-child(1) {
  text-align: left;
}

.custom-table td:nth-child(2) {
  text-align: right;
}

.custom-table tr {
  height: 30px;
}

.highlighted {
  background-color: #DDDDDD;
  border-bottom: 2px solid #276CBC;
}
</style>
