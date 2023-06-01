import surveyApi from "@/api/survey";
import jsCookie from "js-cookie";

let globalUserData = { userName: "未登录", status: -1, uid: 10000 }; //用户信息(用户名，用户id，用户状态)


//注册
async function registerEvent(loginData) {
  console.log("传进来的请求：", loginData);
  await surveyApi.register(loginData).then((response) => {
    globalUserData = response.data;
    jsCookie.set("globalUserData", JSON.stringify(globalUserData), { expires: 30 });
    // console.log("api返回数据：", globalUserData);
  });
  return globalUserData;
}

//登录
async function loginEvent(loginData) {
  await surveyApi.login(loginData).then((response) => {
    globalUserData = response.data;
    jsCookie.set("globalUserData", JSON.stringify(globalUserData), { expires: 30 });
  });
  return globalUserData;
}

//缓存用户信息
function userDataCacheEvent() {
  // let cacheData = window.localStorage.getItem("globalUserData");
  let cacheData = jsCookie.get("globalUserData");
  globalUserData = cacheData == "undefined" || cacheData == undefined ? globalUserData : JSON.parse(cacheData);
  return globalUserData;
}

//清除缓存
function userDataCacheClearEvent() {
  jsCookie.remove("globalUserData");
  return (globalUserData = { userName: "", status: -1 });
}



export { registerEvent, loginEvent, userDataCacheEvent, userDataCacheClearEvent,  globalUserData };
