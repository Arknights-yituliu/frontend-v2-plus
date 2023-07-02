import characterBasicInfo from "@/static/json/survey/character_table_simple.json";
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
      name: baseInfo.name,
      own: false,
      level: 1,
      modX: modX,
      modY: modY,
      elite: 0,
      potential: 1,
      rarity: baseInfo.rarity,
      skill1: 0,
      skill2: 0,
      skill3: 0,
      skill: baseInfo.skill,
      date: baseInfo.date,
      itemObtainApproach:baseInfo.itemObtainApproach,
      profession: baseInfo.profession,
      mod: baseInfo.mod !== undefined,
      show: true,
    };
    characterList.push(character);
  }

  characterList.sort((a, b) => {
    return b.rarity - a.rarity;
  });

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

let scoreList = [];
function scoreListInit() {
  for (let charId in characterBasicInfo) {
    var baseInfo = characterBasicInfo[charId];
    console.log(baseInfo)
    let score = {
      charId: charId,
      name: baseInfo.name,
      itemDesc:baseInfo.itemDesc,
      itemUsage:baseInfo.itemUsage,
      rarity: baseInfo.rarity,
      daily: 1,
      rogue: 1,
      securityService: 1,
      hard: 1,
      universal: 1,
      countermeasures: 1,
      date: baseInfo.date,
      profession: baseInfo.profession,
      mod: baseInfo.mod !== undefined,
      show: true,
    };

    scoreList.push(score);
  }

  scoreList.sort((a, b) => {
    return b.rarity - a.rarity;
  });
  return scoreList;
}

let rankingList = [];

function rankingListinit() {
  for (let charId in characterBasicInfo) {
    var baseInfo = characterBasicInfo[charId];
    let score = {
      charId: charId,
      name: baseInfo.name,
      rarity: baseInfo.rarity,
      own: 0,
      elite: {},
      skill1: {},
      skill2: {},
      skill3: {},
      modX: {},
      modY: {},
      mod: baseInfo.mod !== undefined,
      skill: baseInfo.skill,
      show: true,
    };
    rankingList.push(score);
  }

  rankingList.sort((a, b) => {
    return b.rarity - a.rarity;
  });
  return rankingList;
}

export { characterListInit, professionDict, rarityDict, yearDict, scoreListInit,rankingListinit };
