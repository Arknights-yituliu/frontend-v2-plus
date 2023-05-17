import surveyApi from "@/api/survey";
import { cMessage } from "@/components/message.js";
import character_table from "@/static/json/survey/character_table.json";
import jsCookie from "js-cookie";


let globalUserData = { userName: "山桜", status: -1, uid: 10000 }; //用户信息(用户名，用户id，用户状态)
let characterList = [];

//注册
async function registerEvent(loginData) {
  console.log("传进来的请求：", loginData);
  await surveyApi.register(loginData).then((response) => {
    globalUserData = response.data;
    jsCookie.set("globalUserData", JSON.stringify(globalUserData));
    // console.log("api返回数据：", globalUserData);
  });
  return globalUserData;
}

//登录
async function loginEvent(loginData) {
  await surveyApi.login(loginData).then((response) => {
    globalUserData = response.data;
    jsCookie.set("globalUserData", JSON.stringify(globalUserData));
  });
  return globalUserData;
}

function userDataCacheEvent() {
  // let cacheData = window.localStorage.getItem("globalUserData");
  let cacheData = jsCookie.get("globalUserData");
  globalUserData = cacheData == "undefined" || cacheData == undefined ? globalUserData : JSON.parse(cacheData);
  return globalUserData;
}

function userDataCacheClearEvent() {
  jsCookie.remove("globalUserData");
  return (globalUserData = { userName: "", status: -1 });
}

//初始化数据
function characterListInit() {
  for (let charId in character_table) {
    var baseInfo = character_table[charId];
    if (baseInfo.rarity < 6) continue;
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
      own: true,
      level: 1,
      modX: modX,
      modY: modY,
      phase: 2,
      potential: 1,
      rarity: baseInfo.rarity,
      skill1: 0,
      skill2: 0,
      skill3: 0,
    };
    characterList.push(character);
  }

  // console.log(characterList);
  return characterList;
}

export { registerEvent, loginEvent, userDataCacheEvent, userDataCacheClearEvent, characterListInit, globalUserData };

async function getSurveyCharData(userName) {
  await surveyApi.getSurveyCharData(userName).then((response) => {
    let list = response.data;
    for (var i = 0; i < characterList.length; i++) {
      // characterList[i].own =false;
      for (var j = 0; j < list.length; j++) {
        if (list[j].charId == characterList[i].charId) {
          characterList[i] = list[j];
        }
      }
    }
    cMessage("导入了 " + list.length + " 条数据");
  });
}
