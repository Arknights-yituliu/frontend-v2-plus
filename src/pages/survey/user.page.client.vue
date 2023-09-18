<template>
  <div class="survey_user_page">
    <div class="user_info_wrap">

      <div class="user_head_wrap">
      <div class="user_image_wrap">
        <div class="user_image bg-char_010_chen"></div>
      </div>
      <div class="user_name">{{ userData.userName }}</div>
      </div>

<!--    <div class="user_operator_statistics_wrap">-->
<!--      <div class="user_operator_statistics">-->
<!--        总计招募干员：<a class="user_operator_statistics_num"> {{ operatorStatisticsObj.count }}</a>-->
<!--      </div>-->
<!--      <div class="user_operator_statistics">-->
<!--        精二干员总数：<a class="user_operator_statistics_num">{{ operatorStatisticsObj.elite2 }}</a>-->
<!--      </div>-->
<!--      <div class="user_operator_statistics">-->
<!--        专一技能总数：<a class="user_operator_statistics_num">{{ operatorStatisticsObj.rank1 }}</a>-->
<!--      </div>-->
<!--      <div class="user_operator_statistics">-->
<!--        专二技能总数：<a class="user_operator_statistics_num">{{ operatorStatisticsObj.rank2 }}</a>-->
<!--      </div>-->
<!--      <div class="user_operator_statistics">-->
<!--        专三技能总数：<a class="user_operator_statistics_num">{{ operatorStatisticsObj.rank3 }}</a>-->
<!--      </div>-->
<!--    </div>-->




    <div class="user_info_card">

      <div class="user_info_title">身份验证</div>
      <div class="user_input_bar">
        <div class="survey_input_label">请输入森空岛CRED</div>
        <input class="survey_input" v-model="inputData.cred"/>
        <button class="survey_button_blue" @click="authentication()">验证身份</button>
      </div>
    </div>

    <div class="user_info_card">
      <div class="user_info_title">用户信息</div>
      <div class="user_input_bar">
        <div class="survey_input_label">一图流账号用户名</div>
        <input class="survey_input" v-model="userData.userName"/>
        <button class="survey_button_blue" @click="updateUser()">更新昵称</button>
      </div>
      <div class="user_input_bar">
        <div class="survey_input_label">明日方舟昵称</div>
        <div class="user_info"> {{ userData.nickName }}</div>
      </div>
      <div class="user_input_bar">
        <div class="survey_input_label">明日方舟UID</div>
        <div class="user_info">{{ userData.uid }}</div>
      </div>
      <div class="user_input_bar">
        <div class="survey_input_label">绑定邮箱</div>
        <div class="user_info">{{ userData.email }}</div>
      </div>
      <div class="user_input_bar">
        <div class="survey_input_label">明日方舟UID</div>
        <div class="user_info">{{ userData.uid }}</div>
      </div>
    </div>

    <div class="user_info_card">
      <div class="user_info_title">修改信息</div>
      <div></div>
      <div>您还没有设置密码</div>
      <div class="user_input_bar">
        <div class="survey_input_label">密码</div>
        <input class="survey_input" v-model="inputData.passWord"/>
      </div>
      <div class="user_input_bar">
        <div class="survey_input_label">确认密码</div>
        <input class="survey_input" v-model="inputData.confirmPassWord"/>
        <button class="survey_button_blue" @click="updatePassWord()">更新密码</button>
      </div>

      <div>绑定邮箱后也可通过邮箱登录</div>
      <div class="user_input_bar">
        <div class="survey_input_label">绑定邮箱</div>
        <input class="survey_input" v-model="inputData.email"/>
        <button class="survey_button_blue" @click="sendEmailCode()">发送验证码</button>
      </div>

      <div class="user_input_bar">
        <div class="survey_input_label">输入验证码</div>
        <input class="survey_input" v-model="inputData.emailCode"/>
        <button class="survey_button_blue" @click="updateEmail()">修改邮箱</button>
      </div>

    </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import surveyApi from "@/api/survey";
import {characterListInit, collapse, filterByCharacterProperty, professionDict, yearDict} from "./common"; //基础信息（干员基础信息列表，干员职业字典，干员星级）
import request from "@/api/requestBase";
import {cMessage} from "../../element/message";

let operator_list = ref(characterListInit())
let userData = ref({
  userName: "未登录",
  verificationCode: 0,
  status: -100,
  nickName: '山桜#9180',
  uid: 114514,
  email: '1969314158@qq.com',
  passWord: "",
  token: undefined,
  cred: ""
});
let inputData = ref({cred:'' ,passWord: '114514', confirmPassWord: '514', email: '1969314158@qq.com', emailCode: 395129})


function authentication(){
  const data = {
    token :userData.value.token,
    cred:inputData.value.cred
  }

  request({
    url: `/survey/user/authentication`,
    method: "post",
    data: data
  }).then(response => {
    response = response.data
    if(response.code!==200){
      cMessage(response.msg,'error')
    }else {
      console.log(response.data)
    }
  })
}


function updatePassWord(){
  const data = {
    token:userData.value.token,
    passWord:inputData.value.passWord
  }

  request({
    url: `/survey/user/updatePassWord`,
    method: "post",
    data: data
  }).then(response => {
    response = response.data
    if(response.code!==200){
      cMessage(response.msg,'error')
    }else {
      cMessage('修改密码成功')
    }
  })
}

function sendEmailCode(){
  const data = {
    token:userData.value.token,
    email:inputData.value.email
  }
  request({
    url: `/survey/user/sendEmailCode`,
    method: "post",
    data: data
  }).then(response => {
    response = response.data
    if(response.code!==200){
      cMessage(response.msg,'error')
    }else {
      cMessage('验证码已发送')
    }
  })
}

function updateEmail(){
  const data = {
    token:userData.value.token,
    email:inputData.value.email,
    emailCode: inputData.value.emailCode
  }
  request({
    url: `/survey/user/updateEmail`,
    method: "post",
    data: data
  }).then(response => {
    response = response.data
    if(response.code!==200){
      cMessage(response.msg,'error')
    }else {
      cMessage('邮箱绑定成功')
    }
  })
}

function getCacheUserData() {
  let cacheUserData = localStorage.getItem("globalUserData");
  if (!(cacheUserData == "undefined" || cacheUserData == void 0 || cacheUserData == null)) {
    const parse = JSON.parse(cacheUserData);
    userData.value.userName = parse.userName;
    userData.value.code = parse.code;
    userData.value.status = parse.status;
    userData.value.token = parse.token;
  }
}

onMounted(() => {
  getCacheUserData()
})



</script>

<style scoped>
.survey_user_page {
  padding: 20px;
  width: 99%;
  margin: auto;
  background-color: #dcdcdc;
}

.user_info_wrap {
  /*display: flex;*/
}

.user_head_wrap{
  display: flex;
}

.user_image_wrap {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 1px solid rgb(147, 147, 147);
  position: relative;
  overflow: hidden;
  /*box-shadow: grey 1px 0px 0px 0px;*/
}

.user_image {
  transform: scale(0.4);
  /* border: 1px solid rgb(0, 34, 255); */
  border-radius: 50%;
  position: absolute;
  top: -56px;
  left: -56px;
}

.user_name {
  font-size: 18px;
  font-weight: 600;
  line-height: 70px;
  color: black;
}

.user_info_card {
  width: 450px;
  padding: 24px;
  margin: 20px 0;
  border-radius: 4px;
  background-color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
}

.user_info_title {
  font-size: 20px;
  font-weight: 600;
  /*padding: 12px;*/
}

.user_input_bar {
  width: 450px;
  margin: 8px auto;
}

.survey_input_label {
  color: #006fe0;
  font-weight: 600;
}

.survey_input {
  outline: none;
  border: none;
  border-bottom: 2px solid #e1e1e1;
  margin: 8px 8px 8px 0px;
  line-height: 28px;
  width: 300px;
  font-weight: 600;
}

.user_info {
  line-height: 32px;
  width: 300px;
  margin: 8px 0 8px 0px;
  font-weight: 600;
}





.user_operator_statistics_wrap {
  display: flex;
}

.user_operator_statistics {
  padding: 8px;
  line-height: 28px;
}

.user_operator_statistics_num {
  color: #ff6a00;
  font-size: 18px;
}




.user_btn {
  height: 28px;
  line-height: 28px;
  text-align: center;
  width: 120px;
  box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
  cursor: pointer;
  font-weight: 600;
}

.user_btn:hover {
  background: #d5d5d5;
}
</style>
