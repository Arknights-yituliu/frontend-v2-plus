<script setup>


const challengeScore = [10, 30, 80, 30, 25, 66, 200];
const bossScore = [230, 360, 220, 170, 180, 10, 160, 30, 30, 20, 20, 10];
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
  "17个污染躯壳": 10,
  "1个突击动力甲": 10,
  "2个突击动力甲": 20,
  "4个小提琴家": 10,
  "东/南风向": 10,
  "击杀1个": 15,
  "击杀2个": 30,
  "击杀3个": 45,
  "击杀4个": 60,
  "击杀5个": 75,
  "击杀6个": 90
}
const twoEnding = 200;
const threeEnding = 100;
const bothThreeFourEnding = 100;
var bossSelected = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var highlightedRow = null;

function add() {
  const type = document.getElementById('choice-bat-0').selectedIndex - 1;
  const nameChoice = document.getElementById('choice-bat-2');
  if (nameChoice.selectedIndex == -1) return;
  const name = nameChoice[nameChoice.selectedIndex].text;
  let total = 0;
  if (type == 0) {
    if (name in battleScore) total += battleScore[name];
    if (document.getElementById('choice-bat-4').selectedIndex == 0) total += 20;
    let times = 1.0;
    if (document.getElementById('choice-bat-3').selectedIndex == 0) times += 0.2;
    if (document.getElementById('choice-bat-5').selectedIndex == 0) times -= 0.7;
    total *= times;
  } else if (type == 1) {
    total = battleSpecialScore[name][document.getElementById('choice-bat-3').selectedIndex];
  }
  const specialChoice = document.getElementById('choice-bat-6');
  if (specialChoice.selectedIndex != -1) {
    const specialTitle = specialChoice[specialChoice.selectedIndex].text;
    if (specialTitle in specialExtraScore) total += specialExtraScore[specialTitle];
  }

  if (total > 0 && name != "") {
    console.log("新增战斗：" + name + "，得分为" + total);
    var table = document.getElementById("scoreList");
    var row = table.insertRow(-1);
    row.onclick = function () {
      if (highlightedRow) {
        highlightedRow.classList.remove("highlighted");
      }
      highlightedRow = this;
      this.classList.add("highlighted");
    };
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    cell1.innerHTML = name;
    cell2.innerHTML = "" + total;
    calc();
  }
}

function removeBattle() {
  if (highlightedRow) {
    var table = document.getElementById("scoreList");
    table.deleteRow(highlightedRow.rowIndex);
    highlightedRow = null;
    calc();
  }
}

function choiceChange1() {
  const choice = document.getElementById('choice-bat-0').value;
  const choiceBlock = document.getElementById('choice-bat-1');
  const choiceBlock2 = document.getElementById('choice-bat-2');
  const choiceBlock4 = document.getElementById('choice-bat-4');
  const choiceBlock5 = document.getElementById('choice-bat-5');
  const specialChoice = document.getElementById('choice-bat-6');
  specialChoice.innerHTML = "";
  specialChoice.selectedIndex = -1;
  specialChoice.disabled = true;
  choiceBlock.innerHTML = "";
  choiceBlock2.innerHTML = "";
  if (choice == "0") {
    choiceBlock.disabled = false;
    for (let i = 0; i < 6; i++)
      choiceBlock.add(new Option(battleLevels[i], "${i}"));
    choiceBlock2.disabled = true;
    choiceBlock4.disabled = false;
    choiceBlock5.disabled = false;
  } else {
    choiceBlock.disabled = true;
    choiceBlock2.disabled = false;
    for (let i = 0; i < battleSpecialName.length; i++)
      choiceBlock2.add(new Option(battleSpecialName[i], "${i}"));
    choiceBlock2.selectedIndex = -1;
    choiceBlock4.disabled = true;
    choiceBlock4.selectedIndex = 1;
    choiceBlock5.disabled = true;
    choiceBlock5.selectedIndex = 1;
  }
  choiceBlock.selectedIndex = -1;
  choiceBlock2.selectedIndex = -1;
}

function choiceChange2() {
  const choice = document.getElementById('choice-bat-1').selectedIndex;
  const choiceBlock = document.getElementById('choice-bat-2');
  const specialChoice = document.getElementById('choice-bat-6');
  specialChoice.innerHTML = "";
  specialChoice.selectedIndex = -1;
  specialChoice.disabled = true;
  choiceBlock.innerHTML = "";
  choiceBlock.disabled = false;
  const list = battleNames[choice];
  for (let i = 0; i < list.length; i++)
    choiceBlock.add(new Option(list[i], "${i}"));
  choiceBlock.selectedIndex = -1;
}

function choiceChange3() {
  const choice = document.getElementById('choice-bat-2');
  const text = choice.options[choice.selectedIndex].text;
  const specialChoice = document.getElementById('choice-bat-6');
  specialChoice.innerHTML = "";
  if (text in specialExtraName) {
    specialChoice.disabled = false;
    const list = specialExtraName[text];
    for (let i = 0; i < list.length; i++)
      specialChoice.add(new Option(list[i], "${i}"));
  } else {
    specialChoice.disabled = true;
  }
}

function bossBtnClicked(event) {
  const clickedButton = event.target;
  const id = parseInt(clickedButton.id.substr(7));
  bossSelected[id] = 1 - bossSelected[id];
  if (bossSelected[2] + bossSelected[3] + bossSelected[6] > 1) {
    bossSelected[2] = 0;
    bossSelected[3] = 0;
    bossSelected[6] = 0;
    bossSelected[id] = 1;
  }
  if (id == 0 && bossSelected[0] != 0) bossSelected[4] = 0;
  if (id == 4 && bossSelected[4] != 0) bossSelected[0] = 0;
  if (id == 1 && bossSelected[1] != 0) bossSelected[5] = 0;
  if (id == 5 && bossSelected[5] != 0) bossSelected[1] = 0;
  if (bossSelected[0] + bossSelected[4] > 0 && bossSelected[8] == 0) {
    if (id == 8) {
      bossSelected[0] = 0;
      bossSelected[4] = 0;
    } else {
      bossSelected[8] = 1;
    }
  }
  if (bossSelected[1] + bossSelected[5] > 0 && bossSelected[7] == 0) {
    if (id == 7) {
      bossSelected[1] = 0;
      bossSelected[5] = 0;
    } else {
      bossSelected[7] = 1;
    }
  }
  calc();
  resetBossBtn();
}

function resetBossBtn() {
  for (let i = 0; i < 12; i++) {
    const button = document.getElementById("bossBtn" + i);
    if (bossSelected[i] == 1)
      button.style.opacity = 1;
    else
      button.style.opacity = 0.5;
  }
}

function calc() {
  var total = 0;
  const final = document.getElementById("finalInputField").value;
  if (final != "") total += parseInt(final);
  for (let i = 1; i <= 5; i++) {
    const cnt = document.getElementById("inputField" + i).value;
    if (cnt != "") total += parseInt(cnt) * challengeScore[i - 1];
  }
  for (let i = 1; i <= 2; i++) {
    const choice = document.getElementById("choice" + i).selectedIndex;
    if (choice == 0) total += challengeScore[4 + i];
  }
  for (let i = 0; i < 12; i++)
    total += bossScore[i] * bossSelected[i];
  var bossCnt = 0;
  for (let i = 0; i < 7; i++)
    if (bossSelected[i] > 0)
      bossCnt++;
  if (bossCnt == 3) total += threeEnding;
  if (bossCnt >= 2) total += twoEnding;
  if (bossSelected[0] + bossSelected[4] > 0 && bossSelected[1] + bossSelected[5] > 0) total += bothThreeFourEnding;
  const table = document.getElementById("scoreList");
  for (let i = 0; i < table.rows.length; i++) {
    const r = table.rows[i];
    console.log(r.cells);
    total += parseInt(r.cells[1].innerHTML) || 0;
  }
  console.log(total);
  var outp = document.getElementById("result");
  var checkbox = document.getElementById("customUnitBox");
  var unitName = document.getElementById("unitName");
  var unitScore = document.getElementById("unitScore");
  var resultUnit = document.getElementById("resultUnit");
  if (checkbox.checked && unitName.value != "" && unitScore.value != "" && unitScore.value != "0") {
    resultUnit.textContent = unitName.value;
    outp.textContent = (total * 1.0 / parseInt(unitScore.value)).toFixed(2);
    var rect = outp.getBoundingClientRect();
    console.log("width = " + outp.offsetWidth);
    resultUnit.style.left = (rect.left + rect.width - 450) + "px";
  } else {
    resultUnit.textContent = "";
    outp.textContent = total;
  }
}

function checkboxChanged() {
  var checkbox = document.getElementById("customUnitBox");
  var unitName = document.getElementById("unitName");
  var unitScore = document.getElementById("unitScore");
  if (checkbox.checked) {
    unitName.disabled = false;
    unitScore.disabled = false;
  } else {
    unitName.disabled = true;
    unitScore.disabled = true;
  }
  calc();
}

var timer;

function mouseEnter() {
  var hint = document.getElementById("hint");
  hint.hidden = false;
}

function mouseLeave() {
  var hint = document.getElementById("hint");
  hint.hidden = true;
  clearTimeout(timer);
}

function mouseDown() {
  timer = setTimeout(() => {
    document.getElementById("finalInputField").value = "";
    for (let i = 1; i <= 5; i++)
      document.getElementById("inputField" + i).value = "";
    for (let i = 1; i <= 2; i++)
      document.getElementById("choice" + i).selectedIndex = 1;
    for (let i = 0; i < 12; i++)
      bossSelected[i] = 0;
    let table = document.getElementById("scoreList");
    for (let i = table.rows.length - 1; i >= 0; i--)
      table.deleteRow(i);
    resetBossBtn();
    calc();
  }, 1000);
};

function mouseUp() {
  clearTimeout(timer);
};


</script>
<template>
  <div class="rougeCal-page">
    <div class="background">
      <div class="transparent-panel" id="panel">
        <img style="position:absolute; left:1172px; top: 205px" src="/public/rouge/images/delete.png" alt="delete"
             @click="removeBattle()">
        <img style="position:absolute; left:45px; top: 60px" src="/public/rouge/images/logo.png" alt="logo">

        <div class="rounded-rectangle" style="left: 40px; top: 240px; width: 350px; height: 255px;"></div>
        <div class="title-text" style="left: 40px; top: 192px;">挑战分数</div>
        <div class="normal-text" style="left: 67px; top: 261px;">隐藏敌人（鸭、熊、狗）</div>
        <div class="normal-text" style="left: 67px; top: 293px;">四层失与得紧急作战</div>
        <div class="normal-text" style="left: 67px; top: 325px;">五层失与得紧急作战</div>
        <div class="normal-text" style="left: 67px; top: 357px;">黑色足迹紧急作战</div>
        <div class="normal-text" style="left: 67px; top: 389px;">未抓取软ban干员数量</div>
        <div class="normal-text" style="left: 67px; top: 421px;">全程未取过钱</div>
        <div class="normal-text" style="left: 67px; top: 453px;">全程未进入树篱之途</div>
        <input type="number" style="left: 313px; top: 259px;" class="custom-input" id="inputField1" placeholder="0"
               @input="calc()">
        <input type="number" style="left: 313px; top: 291px;" class="custom-input" id="inputField2" placeholder="0"
               @input="calc()">
        <input type="number" style="left: 313px; top: 323px;" class="custom-input" id="inputField3" placeholder="0"
               @input="calc()">
        <input type="number" style="left: 313px; top: 355px;" class="custom-input" id="inputField4" placeholder="0"
               @input="calc()">
        <input type="number" style="left: 313px; top: 387px;" class="custom-input" id="inputField5" placeholder="0"
               @input="calc()">
        <select style="left: 313px; top: 419px;" class="custom-dropdown" id="choice1" @change="calc()">
          <option value="0">是</option>
          <option value="1" selected>否</option>
        </select>
        <select style="left: 313px; top: 451px;" class="custom-dropdown" id="choice2" @change="calc()">
          <option value="0">是</option>
          <option value="1" selected>否</option>
        </select>

        <div class="rounded-rectangle" style="left: 40px; top: 570px; width: 350px; height: 225px;"></div>
        <div class="title-text" style="left: 40px; top: 522px;">结局分数</div>
        <button class="boss-button" style="left: 69px; top: 584px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/b-7-b.png" id="bossBtn0" style="opacity: 0.5">
        </button>
        <button class="boss-button" style="left: 141px; top: 584px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/b-6-b.png" id="bossBtn1" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 213px; top: 584px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/b-5-b.png" id="bossBtn2" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 285px; top: 584px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/b-4-b.png" id="bossBtn3" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 69px; top: 651px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/b-7.png" id="bossBtn4" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 141px; top: 651px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/b-6.png" id="bossBtn5" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 213px; top: 651px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/b-5.png" id="bossBtn6" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 285px; top: 651px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/r-1.png" id="bossBtn7" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 69px; top: 718px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/r-2.png" id="bossBtn8" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 141px; top: 718px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/r-3.png" id="bossBtn9" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 213px; top: 718px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/r-4.png" id="bossBtn10" style="opacity: 0.5;">
        </button>
        <button class="boss-button" style="left: 285px; top: 718px;" @click="bossBtnClicked">
          <img src="/public/rouge/images/r-5.png" id="bossBtn11" style="opacity: 0.5;">
        </button>

        <div class="rounded-rectangle" style="left: 450px; top: 240px; width: 350px; height: 295px;"></div>
        <div class="title-text" style="left: 450px; top: 192px;">关卡分数</div>
        <div class="normal-text" style="left: 477px; top: 261px;">关卡类型</div>
        <div class="normal-text" style="left: 477px; top: 293px;">关卡层数</div>
        <div class="normal-text" style="left: 477px; top: 325px;">关卡名称</div>
        <div class="normal-text" style="left: 477px; top: 357px;">是否无漏</div>
        <div class="normal-text" style="left: 477px; top: 389px;">是否持有路网</div>
        <div class="normal-text" style="left: 477px; top: 421px;">是否有捕猎惩罚</div>
        <div class="normal-text" style="left: 477px; top: 453px;">特殊加分</div>
        <select style="left: 643px; top: 259px;" class="custom-dropdown-2" id="choice-bat-0" @change="choiceChange1()">
          <option value="banned" disabled selected hidden></option>
          <option value="0">紧急作战</option>
          <option value="1">特殊作战</option>
        </select>
        <select style="left: 643px; top: 291px;" class="custom-dropdown-2" id="choice-bat-1" disabled
                @change="choiceChange2()"></select>
        <select style="left: 643px; top: 323px;" class="custom-dropdown-2" id="choice-bat-2" disabled
                @change="choiceChange3()"></select>
        <select style="left: 643px; top: 355px;" class="custom-dropdown-2" id="choice-bat-3">
          <option value="0">是</option>
          <option value="1" selected>否</option>
        </select>
        <select style="left: 643px; top: 387px;" class="custom-dropdown-2" id="choice-bat-4" disabled>
          <option value="0">是</option>
          <option value="1" selected>否</option>
        </select>
        <select style="left: 643px; top: 419px;" class="custom-dropdown-2" id="choice-bat-5" disabled>
          <option value="0">是</option>
          <option value="1" selected>否</option>
        </select>
        <select style="left: 643px; top: 451px;" class="custom-dropdown-2" id="choice-bat-6" disabled></select>
        <button style="left: 475px; top: 483px;" class="add-button" @click="add()">添加</button>

        <div class="title-text" style="left: 450px; top: 554px;">结算分数</div>
        <input type="number" class="final-input" id="finalInputField" placeholder="0" @input="calc()">

        <div class="rounded-rectangle" style="left: 450px; top: 640px; width: 350px; height: 155px;"
             @mouseenter="mouseEnter()" @mouseleave="mouseLeave()" @mousedown="mouseDown()" @mouseup="mouseUp()">
          <p class="result-text" id="result">0</p>
          <p class="result-unit" id="resultUnit"></p>
          <div class="normal-text" style="left: 160px; top: 35px;"><b>总分！</b></div>
          <p class="normal-text" style="left: 10px; top: 115px;" id="hint" hidden>长按重置</p>
        </div>

        <div class="rounded-rectangle" style="left: 860px; top: 240px; width: 350px; height: 555px;"></div>
        <div class="title-text" style="left: 860px; top: 192px;">关卡分数一览</div>
        <table id="scoreList" class="custom-table"></table>

        <input type="checkbox" style="position: absolute; left: 1035px; top: 80px;" id="customUnitBox"
               @change="checkboxChanged()">
        <div class="normal-text" style="left: 1065px; top: 80px;">使用自定义分数单位</div>
        <div class="normal-text" style="left: 983px; top: 120px;">{{}}</div>
        <input class="unit-input" style="left: 1002px; top: 111px;" id="unitName" placeholder="输入文字" disabled
               @change="calc()">
        <input type="number" class="unit-input" style="left: 1104px; top: 111px;" id="unitScore" placeholder="0"
               disabled
               @change="calc()">

        <div class="title-text" style="left: 40px; top: 850px;">友情链接</div>
        <a href="https://tomimi.cyou/zh/sami">
          <img style="position: absolute; left: 40px; top: 900px;" src="/public/rouge/images/tomimi.png" alt="tomimi">
          <div class="central-text" style="left: 105px; top: 1035px;">TOMIMI</div>
        </a>
        <a href="https://viktorlab.cn/akdata/dps/">
          <img style="position: absolute; left: 220px; top: 900px;" src="/public/rouge/images/dpscalc.png"
               alt="dpscalc">
          <div class="central-text" style="left: 285px; top: 1035px;">DPS计算器</div>
        </a>
        <a href="https://mapcn.ark-nights.com/areas/rogue_3">
          <img style="position: absolute; left: 400px; top: 900px;" src="/public/rouge/images/prtsmap.png" alt="tomimi">
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

<style scoped>
@font-face {
  font-family: 'Novecento Wide Medium';
  src: url('/public/rouge/font/Novecento WideMedium.otf');
}

@font-face {
  font-family: '标小智无界黑';
  src: url('/public/rouge/font/标小智无界黑.TTF');
}

@font-face {
  font-family: 'HarmonyOS Sans SC';
  src: url('/public/rouge/font/HARMONYOS_SANS_SC_REGULAR.TTF');
}

.rougeCal-page{
  position: relative;
}

.background {
  background-image: url('/public/rouge/images/pure-background.jpg');
  background-size: cover;
  height: 100vh;
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
  background-color: transparent;
  border: transparent;
  left: 870px;
  top: 250px;
  width: 330px;
  position: absolute;
  border-collapse: collapse;
  table-layout: fixed;
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