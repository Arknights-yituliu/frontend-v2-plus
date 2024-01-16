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
        row.onclick = function() {
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
    list = battleNames[choice];
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
        list = specialExtraName[text];
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
    resetBossBtn();
}

function resetBossBtn() {
    for (let i = 0; i < 12; i++) {
        button = document.getElementById("bossBtn" + i);
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
    table = document.getElementById("scoreList");
    for (let i = 0; i < table.rows.length; i++) {
        r = table.rows[i];
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