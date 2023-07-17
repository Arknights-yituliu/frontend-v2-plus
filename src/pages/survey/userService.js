import surveyApi from "@/api/survey";
import jsCookie from "js-cookie";
import { ref } from "vue";
import { cMessage } from "@/element/message";

let globalUserData = ref({ userName: "未登录", status: -100 }); //用户信息(用户名，用户id，用户状态)

//注册
async function registerEvent(loginData) {
  console.log("传进来的请求：", loginData);
  await surveyApi.register(loginData).then((response) => {
    globalUserData.value = response.data;
    jsCookie.set("globalUserData", JSON.stringify(globalUserData.value), { expires: 30 });
    // console.log("api返回数据：", globalUserData);
    cMessage("注册成功");
  });
  return globalUserData.value;
}

//登录
async function loginEvent(loginData) {
  await surveyApi.login(loginData).then((response) => {
    globalUserData.value = response.data;
    jsCookie.set("globalUserData", JSON.stringify(globalUserData.value), { expires: 30 });
  });
  return globalUserData.value;
}

//缓存用户信息
function userDataCacheEvent() {
  // let cacheData = window.localStorage.getItem("globalUserData");
  let cacheData = jsCookie.get("globalUserData");
  globalUserData.value = cacheData == "undefined" || cacheData == undefined ? globalUserData.value : JSON.parse(cacheData);

  return globalUserData.value;
}

//清除缓存
function userDataCacheClearEvent() {
  jsCookie.remove("globalUserData");
  return (globalUserData.value = { userName: "未登录", status: -100 });
}

export { registerEvent, loginEvent, userDataCacheEvent, userDataCacheClearEvent, globalUserData };
