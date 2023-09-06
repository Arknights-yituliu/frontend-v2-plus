import surveyApi from "@/api/survey";
import jsCookie from "js-cookie";
import { ref } from "vue";
import { cMessage } from "@/element/message";
import request from "@/api/requestBase";

let globalUserData = ref({ userName: "未登录", status: -100, token:void 0, code:0 }); //用户信息(用户名，用户id，用户状态)

//注册
async function registerEvent(loginData) {
  console.log("传进来的请求：", loginData);

  await request({
    url: `survey/register`,
    method: "post",
    data: loginData,
  }).then(response=>{
    if(response.data.code===200){
      globalUserData.value = response.data.data;
      // jsCookie.set("globalUserData", JSON.stringify(globalUserData.value), { expires: 30 });
      localStorage.setItem("globalUserData",JSON.stringify(globalUserData.value));
      cMessage("注册成功");
    }else {
      cMessage(response.data.msg)
    }
  })

  // await surveyApi.register(loginData).then((response) => {
  //
  //   // console.log("api返回数据：", globalUserData);
  //
  // });
  return globalUserData.value;
}

//登录
async function loginEvent(loginData) {
  let responseData = {}
  console.log(loginData)
  await request({
    url: `survey/login`,
    method: "post",
    data: loginData,
  }).then(response=> {
    console.log(response)
    responseData =  response.data
  })

return responseData

}

//缓存用户信息
function userDataCacheEvent() {
  // let cacheData = window.localStorage.getItem("globalUserData");
  let cacheData = jsCookie.get("globalUserData");
  if(cacheData == "undefined" || cacheData == void 0){
    cacheData =localStorage.getItem("globalUserData");
  }else {
    localStorage.setItem("globalUserData",cacheData);
  }

  console.log(cacheData)

  globalUserData.value = cacheData == "undefined" || cacheData == void 0 || cacheData == null ? globalUserData.value : JSON.parse(cacheData);

  return globalUserData.value;
}

//清除缓存
function userDataCacheClearEvent() {
  jsCookie.remove("globalUserData");
  localStorage.removeItem("globalUserData")
  return (globalUserData.value = { userName: "未登录", status: -100 });
}

export { registerEvent, loginEvent, userDataCacheEvent, userDataCacheClearEvent, globalUserData };
