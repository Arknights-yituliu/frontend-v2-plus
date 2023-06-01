import characterBasicInfo from "@/static/json/survey/characterBasicInfo.json";
import { ref } from "vue";
let characterList = [];
//干员基础数据
function characterListInit() {
  for (let charId in characterBasicInfo) {
    var baseInfo = characterBasicInfo[charId];
    // if (baseInfo.rarity < 5) continue;
    let modX = -1;
    let modY = -1;

    if (baseInfo.mod !== undefined) {
      if (baseInfo.mod.modX) {
        modX = 0;
      }
      if (baseInfo.mod.modY) {
        modY = 0;
      }
    }
    let character = {
      charId: charId,
      own: false,
      level: 1,
      modX: modX,
      modY: modY,
      phase: 0,
      potential: 1,
      rarity: baseInfo.rarity,
      skill1: 0,
      skill2: 0,
      skill3: 0,
      skill: baseInfo.skill,
      date: baseInfo.date,
      profession: baseInfo.profession,
      show: true,
    };
    characterList.push(character);
  }

  // console.log(characterList);
  return characterList;
}

function getProfession(str) {
  if ("SNIPER" == str) return "狙击";
  if ("WARRIOR" == str) return "近卫";
  if ("SPECIAL" == str) return "特种";
  if ("MEDIC" == str) return "医疗";
  if ("SUPPORT" == str) return "辅助";
  if ("PIONEER" == str) return "先锋";
  if ("TANK" == str) return "重装";
  if ("CASTER" == str) return "术师";
}

let professionDict = [
  { label: "狙击", value: "SNIPER" },
  { label: "近卫", value: "WARRIOR" },
  { label: "特种", value: "SPECIAL" },
  { label: "医疗", value: "MEDIC" },
  { label: "辅助", value: "SUPPORT" },
  { label: "先锋", value: "PIONEER" },
  { label: "重装", value: "TANK" },
  { label: "术师", value: "CASTER" },
];

let yearDict = [
  { label: "开服", start: Date.parse(new Date("2019/04/28 00:00:00")), end: Date.parse(new Date("2019/05/02 00:00:00")) },
  { label: "2019", start: Date.parse(new Date("2019/01/01 00:00:00")), end: Date.parse(new Date("2020/01/01 00:00:00")) },
  { label: "2020", start: Date.parse(new Date("2020/01/01 00:00:00")), end: Date.parse(new Date("2021/01/01 00:00:00")) },
  { label: "2021", start: Date.parse(new Date("2021/01/01 00:00:00")), end: Date.parse(new Date("2022/01/01 00:00:00")) },
  { label: "2022", start: Date.parse(new Date("2022/01/01 00:00:00")), end: Date.parse(new Date("2023/01/01 00:00:00")) },
  { label: "2023", start: Date.parse(new Date("2023/01/01 00:00:00")), end: Date.parse(new Date("2024/01/01 00:00:00")) },
];

let rarityDict = [1, 2, 3, 4, 5, 6];

export { characterListInit, professionDict, rarityDict, yearDict };
