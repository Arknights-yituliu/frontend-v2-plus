<template>
  <div class="survey_user_page">
    <div class="user_info_wrap">

      <div class="user_head_wrap">
        <div class="user_image_wrap">
          <div class="user_image bg-char_010_chen"></div>
        </div>
        <div class="user_name">{{ userData.userName }}</div>
      </div>

      <!--    <div class="user_info_card">-->
      <!--      <div class="user_info_title">身份验证</div>-->
      <!--      <div class="user_input_bar">-->
      <!--        <div class="user_input_label">请输入森空岛CRED</div>-->
      <!--        <input class="user_input" v-model="inputData.cred"/>-->
      <!--        <button class="survey_btn btn_blue" @click="authentication()">验证身份</button>-->
      <!--      </div>-->
      <!--    </div>-->

      <div class="user_info_card">
        <div class="user_info_title">用户信息</div>
        <div class="user_input_bar">
          <div class="user_input_label">一图流账号用户名</div>
          <div class="user_input_tip">设置密码后可更换不带后缀数字的用户名</div>
          <input class="user_input" v-model="inputData.userName"/>
          <button class="survey_btn btn_blue btn_position" @click="updateUserName()">更新昵称</button>
        </div>
        <!--        <div class="user_input_bar">-->
        <!--          <div class="user_input_label">明日方舟昵称</div>-->
        <!--          <div class="user_info"> {{ userData.nickName }}</div>-->
        <!--        </div>-->
        <!--        <div class="user_input_bar">-->
        <!--          <div class="user_input_label">明日方舟UID</div>-->
        <!--          <div class="user_info">{{ userData.uid }}</div>-->
        <!--        </div>-->
        <div class="user_input_bar">
          <div class="user_input_label">绑定邮箱</div>
          <div class="user_info">{{ userData.email }}</div>
        </div>
      </div>

      <div class="user_info_card">
        <div class="user_info_title">修改密码</div>
        <div class="user_input_tip" v-show="!hasPermission(userData.status,HAS_PASSWORD)">您还没有设置密码</div>
        <div class="user_input_bar" v-show="hasPermission(userData.status,HAS_PASSWORD)">
          <div class="user_input_label">旧密码</div>
          <input class="user_input" type="password" v-model="inputData.oldPassWord"/>
        </div>
        <div class="user_input_bar">
          <div class="user_input_label">密码</div>
          <input class="user_input" type="password" v-model="inputData.newPassWord"/>
        </div>
        <div class="user_input_bar">
          <div class="user_input_label">确认密码</div>
          <input class="user_input" type="password" v-model="inputData.confirmPassWord"/>
          <button class="survey_btn btn_blue btn_position" @click="updatePassWord()">更新密码</button>
          <div>{{ checkPassWord() }}</div>
        </div>
      </div>

      <div class="user_info_card">
        <div class="user_info_title">修改邮箱</div>
        <div class="user_input_bar">
          <div class="user_input_tip" v-show="!hasPermission(userData.status,HAS_EMAIL)">
            绑定邮箱后也可通过邮箱作为账号登录
          </div>
          <div class="user_input_tip" v-show="hasPermission(userData.status,HAS_EMAIL)">
            需修改邮箱请输入新邮箱点击发送，将向您的旧邮箱发送验证码
          </div>
          <div class="user_input_label">输入新邮箱</div>
          <input class="user_input" v-model="inputData.email"/>
          <button class="survey_btn btn_blue btn_position" @click="sendEmailCode()">发送验证码</button>
        </div>

        <div class="user_input_bar">
          <div class="user_input_label">输入邮件验证码</div>
          <input class="user_input" v-model="inputData.emailCode"/>
          <button class="survey_btn btn_blue btn_position" @click="updateEmail()">修改邮箱</button>
        </div>
      </div>
      <div class="user_info_card">
        <button class="survey_btn btn_red btn_red_selected" style="margin: auto" @click="logout()">退出登录</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import {cMessage} from "../../element/message";
import surveyApi from "/src/api/survey"


let userData = ref({
  userName: "未登录",
  emailCode: 0,
  status: -100,
  nickName: '山桜#9180',
  uid: '',
  email: '未绑定',
  token: undefined,
  cred: ""
});


let inputData = ref({
  userName: '',
  cred: '',
  newPassWord: "",
  confirmPassWord: '',
  oldPassWord: "",
  email: '',
  emailCode: ''
})


function checkPassWord() {
  if (inputData.value.newPassWord.length > 5 && inputData.value.confirmPassWord.length > 5) {
    if (inputData.value.newPassWord === inputData.value.confirmPassWord) {
      return ''
    }
    return '确认密码不一致'
  }
}

function updatePassWord() {
  const data = {
    token: userData.value.token,
    newPassWord: inputData.value.newPassWord,
    oldPassWord: inputData.value.oldPassWord,
    property: "passWord"
  }

  surveyApi.updateUserData(data).then(response => {
    cMessage('修改密码成功')
    userData.value.status = response.data.status
    localStorage.setItem("globalUserData", JSON.stringify(userData.value));
  })
}

function sendEmailCode() {
  const data = {
    token: userData.value.token,
    email: inputData.value.email,
    mailUsage: 'changeEmail'
  }

  // eslint-disable-next-line no-unused-vars
  surveyApi.sendEmailCode(data).then(response => {

    cMessage('验证码已发送')
  })

}

function updateEmail() {
  const data = {
    token: userData.value.token,
    email: inputData.value.email,
    emailCode: inputData.value.emailCode,
    property: "email"
  }
  surveyApi.updateUserData(data).then(response => {
    cMessage('邮箱绑定成功')
    userData.value.status = response.data.status
    localStorage.setItem("globalUserData", JSON.stringify(userData.value));
  })
}


function updateUserName() {
  const data = {
    token: userData.value.token,
    userName: inputData.value.userName,
    property: "userName"
  }
  surveyApi.updateUserData(data).then(response => {
    cMessage('用户名更改成功')
    document.getElementById("user_name").innerText = response.data.userName
    userData.value.userName = response.data.userName
    localStorage.setItem("globalUserData", JSON.stringify(userData.value));
  })
}

//登出
function logout() {
  localStorage.removeItem('globalUserData')
  setTimeout(() => {
    location.reload()
  }, 1000);
}

const HAS_PASSWORD = 1 << 1;
const HAS_EMAIL = 1 << 2;

function hasPermission(status, permission) {
  console.log((status & permission) === permission)
  return (status & permission) === permission;
}

function getCacheUserData() {
  let cacheUserData = localStorage.getItem("globalUserData");
  if (!(cacheUserData == "undefined" || cacheUserData == void 0 || cacheUserData == null)) {
    const parse = JSON.parse(cacheUserData);
    console.table(parse)
    userData.value.userName = parse.userName;
    userData.value.code = parse.code;
    userData.value.status = parse.status;
    userData.value.token = parse.token;
    userData.value.email = parse['email'] == undefined ? "未绑定1" : parse['email'];
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
  width: 450px;
  margin: auto;
}

.user_head_wrap {
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

.user_input_br {
  width: 99%;
  height: 8px;
}

.user_input_label {
  color: #006fe0;
  font-weight: 600;
}

.user_input_tip {
  font-style: italic;
  color: grey;
  padding: 4px 0 4px 0;
  line-height: 24px;
}

.user_input {
  /*display: block;*/
  outline: none;
  border: none;
  border-bottom: 2px solid #e1e1e1;
  margin: 4px 4px 4px 0px;
  line-height: 28px;
  width: 280px;
  font-weight: 600;
}

.user_info {
  line-height: 32px;
  width: 300px;
  margin: 8px 0 8px 0px;
  font-weight: 600;
}


.btn_position {
  margin-left: 20px;
}


</style>
