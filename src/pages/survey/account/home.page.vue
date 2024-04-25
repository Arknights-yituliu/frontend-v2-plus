<template>
  <div class="account-home-page">
    <div class="user-info-card-container">

      <!--    <div class="user_info_card">-->
      <!--      <div class="user_info_title">身份验证</div>-->
      <!--      <div class="user_input_bar">-->
      <!--        <div class="user_input_label">请输入森空岛CRED</div>-->
      <!--        <input class="user_input" v-model="inputData.cred"/>-->
      <!--        <button class="btn btn-blue" @click="authentication()">验证身份</button>-->
      <!--      </div>-->
      <!--    </div>-->

      <div class="user-info-card">
        <h2 class="user-info-card-title">用户信息</h2>
        <div class="user-info-card-line">
          <span>头像</span>
          <div class="user-avatar-sprite">
            <div :class="getSprite(userData.avatar)"></div>
          </div>
        </div>
        <div class="user-info-card-line">
          <span>用户名</span>
          <span>{{ userData.userName }}</span>
        </div>
        <div class="user-info-card-line">
          <span>绑定邮箱</span>
          <span>{{ userData.email }}</span>
        </div>
        <!--        <div class="user_info_bar">-->
        <!--          <div class="user_input_label">明日方舟昵称</div>-->
        <!--          <div class="user_info"> {{ user_data.nickName }}</div>-->
        <!--        </div>-->
        <!--        <div class="user_info_bar">-->
        <!--          <div class="user_input_label">明日方舟UID</div>-->
        <!--          <div class="user_info">{{ user_data.uid }}</div>-->
        <!--        </div>-->
      </div>

      <c-popup :visible="avatar_visible" v-model:visible="avatar_visible">

        <div class="update-avatar-popup">
          <div class="user-now-avatar-wrap">
            <span>当前头像</span>
            <div class="user-avatar-sprite">
              <div :class="getSprite(selected_avatar)"></div>
            </div>
            <button class="btn btn-green" @click="updateAvatar()"> 保存修改</button>
          </div>
          <div class="user_avatar_popup_wrap">
            <div class="user-avatar-sprite" style="margin: 8px" v-for="(avatar,index) in avatar" :key="index">
              <div :class="getSprite(avatar.charId)" @click="chooseAvatar(avatar.charId)"></div>
            </div>
          </div>
        </div>
      </c-popup>

      <div class="user-info-card">
        <h2 class="user-info-card-title">修改用户信息</h2>
        <h4>头像</h4>
        <div class="user-info-card-input-line">
          <div class="user-avatar-sprite">
            <div :class="getSprite(selected_avatar)"></div>
          </div>
          <button class="btn btn-blue btn_position" @click="avatarPopupVisible()">更换头像</button>
        </div>
        <h4>用户名</h4>
        <div class="user-info-card-input-line">
          <input class="user-info-card-input" v-model="inputData.userName"/>
          <a v-show="inputData.userName.length>0">{{ inputData.userName.length }}/20</a>
          <button class="btn btn-blue btn_position" @click="updateUserName()">更新昵称</button>
        </div>
        <span class="user-info-card-tip">设置密码后可更换不带后缀数字的用户名</span>
      </div>

      <div class="user-info-card">
        <h2 class="user-info-card-title">修改密码</h2>
        <div class="user-info-card-tip" v-show="!hasPermission(userData.status,HAS_PASSWORD)">
          您还没有设置密码，密码长度最低为6个数字或字母
        </div>

        <h4 v-show="hasPermission(userData.status,HAS_PASSWORD)">旧密码</h4>
        <div class="user-info-card-input-line"
             v-show="hasPermission(userData.status,HAS_PASSWORD)">
          <input class="user-info-card-input" type="password" v-model="inputData.oldPassWord"/>
          <a v-show="inputData.oldPassWord.length>0">{{ inputData.oldPassWord.length }}/20</a>
        </div>

        <h4>密码</h4>
        <div class="user-info-card-input-line">
          <input class="user-info-card-input" type="password" v-model="inputData.newPassWord"/>
          <!--          <span v-show="inputData.newPassWord.length>0">{{ inputData.newPassWord.length }}/20</span>-->
        </div>

        <h4>确认密码</h4>
        <div class="user-info-card-input-line">
          <input class="user-info-card-input" type="password" v-model="inputData.confirmPassWord"/>
          <!--          <span v-show="inputData.confirmPassWord.length>0">{{ inputData.confirmPassWord.length }}/20</span>-->
          <button class="btn btn-blue btn_position" @click="updatePassWord()">更新密码</button>
        </div>
        <div class="user-info-card-tip" style="color: #f83333">{{ checkPassWord() }}</div>
      </div>

      <div class="user-info-card">
        <h2 class="user-info-card-title">修改邮箱</h2>
        <div class="user-info-card-tip" v-show="!hasPermission(userData.status,HAS_EMAIL)">
          绑定邮箱后也可通过邮箱作为账号登录
        </div>
        <div class="user-info-card-tip" v-show="hasPermission(userData.status,HAS_EMAIL)">
          需修改邮箱请输入新邮箱点击发送，将向您的新邮箱发送验证码
        </div>

        <h4>输入新邮箱</h4>
        <div class="user-info-card-input-line">
          <input class="user-info-card-input" v-model="inputData.email"/>
          <button class="btn btn-blue btn_position" @click="sendEmailCode()">发送验证码</button>
        </div>

        <h4>输入邮件验证码</h4>
        <div class="user-info-card-input-line">
          <input class="user-info-card-input" v-model="inputData.emailCode"/>
          <button class="btn btn-blue btn_position" @click="updateEmail()">修改邮箱</button>
        </div>
      </div>
      <div class="user-info-card">
        <button class="btn btn-red " style="margin: auto" @click="logout()">退出登录</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import {cMessage} from "/src/custom/message";
import surveyApi from "/src/api/userInfo"
import operator_table_simple from '/src/static/json/survey/character_table_simple.json'
import "/src/assets/css/survey/home.scss";
import "/src/assets/css/survey/home.phone.scss";


let avatar = []
for (const char_id in operator_table_simple) {
  const operator = {
    charId: char_id,
    time: operator_table_simple[char_id].date
  }
  avatar.push(operator)
}


avatar.sort((a, b) => a.time - b.time)

let userData = ref({
  userName: "未登录",
  emailCode: 0,
  status: -100,
  nickName: '未导入',
  uid: '未导入',
  email: '未绑定',
  token: undefined,
  cred: "",
  avatar: 'char_010_chen'
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
    return '两次密码不一致'
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
    mailUsage: 'UpdateEmail'
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
    userData.value.email = response.data.email
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

  return (status & permission) === permission;
}

function getCacheUserData() {
  let cacheUserData = localStorage.getItem("globalUserData");
  if (cacheUserData == void 0 || cacheUserData == 'undefined') {
    cMessage('未登录一图流账号', 'error')
    return;
  }

  const parse = JSON.parse(cacheUserData);

  userData.value.userName = parse.userName;
  userData.value.code = parse.code;
  userData.value.status = parse.status;
  userData.value.token = parse.token;
  userData.value.avatar = parse.avatar;
  userData.value.email = parse.email === undefined ? "未绑定" : parse.email;

}

let avatar_visible = ref(false)

function avatarPopupVisible() {
  avatar_visible.value = !avatar_visible.value
  selected_avatar.value = userData.value.avatar
}

let selected_avatar = ref(userData.value.avatar)

function chooseAvatar(avatar) {
  selected_avatar.value = avatar
}

function updateAvatar() {
  const data = {
    token: userData.value.token,
    avatar: selected_avatar.value,
    property: "avatar"
  }

  surveyApi.updateUserData(data).then(response => {
    cMessage('头像更新成功')
    userData.value.avatar = response.data.avatar
    localStorage.setItem("globalUserData", JSON.stringify(userData.value));
  })

}

function getSprite(id) {
  return "bg-" + id;
}

onMounted(() => {
  getCacheUserData()
})


</script>

<style scoped>

</style>
