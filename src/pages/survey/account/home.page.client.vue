<template>
  <div class="survey_user_page">
    <div class="user_info_wrap">





      <!--    <div class="user_info_card">-->
      <!--      <div class="user_info_title">身份验证</div>-->
      <!--      <div class="user_input_bar">-->
      <!--        <div class="user_input_label">请输入森空岛CRED</div>-->
      <!--        <input class="user_input" v-model="inputData.cred"/>-->
      <!--        <button class="btn btn_blue" @click="authentication()">验证身份</button>-->
      <!--      </div>-->
      <!--    </div>-->

      <div class="user_info_card">
        <div class="user_info_title">用户信息</div>
        <div class="user_info_bar">
          <div class="user_input_label">头像</div>
          <div class="user_avatar_image_wrap">
            <div :class="getSprite(user_data.avatar)"></div>
          </div>
        </div>
        <div class="user_info_bar">
          <div class="user_input_label">用户名</div>
          <div class="user_info">{{ user_data.userName }}</div>
        </div>
        <div class="user_info_bar">
          <div class="user_input_label">绑定邮箱</div>
          <div class="user_info">{{ user_data.email }}</div>
        </div>
        <div class="user_info_bar">
          <div class="user_input_label">明日方舟昵称</div>
          <div class="user_info"> {{ user_data.nickName }}</div>
        </div>
        <div class="user_info_bar">
          <div class="user_input_label">明日方舟UID</div>
          <div class="user_info">{{ user_data.uid }}</div>
        </div>
      </div>

      <c-popup :visible="avatar_visible" v-model:visible="avatar_visible">

        <div class="user_now_avatar_wrap">
          <div class="user_avatar_text">当前头像</div>
          <div class="user_avatar_image_wrap">
            <div :class="getSprite(selected_avatar)"></div>
          </div>
          <button class="btn btn_green user_avatar_btn" @click="updateAvatar()"> 保存修改</button>
        </div>

        <div class="user_avatar_popup_wrap">
          <div class="user_avatar_image_wrap" v-for="(avatar,index) in avatar" :key="index">
            <div :class="getSprite(avatar.charId)" @click="chooseAvatar(avatar.charId)"></div>
          </div>
        </div>

      </c-popup>

      <div class="user_info_card">
        <div class="user_info_title">修改基本信息</div>
        <div style=""></div>
        <div class="user_input_bar">
          <div class="user_input_label">头像</div>
          更新用户头像
          <button class="btn btn_blue btn_position" @click="avatarPopupVisible()">更换头像</button>
        </div>
        <div class="user_input_bar">
          <div class="user_input_label">用户名</div>
          <div class="user_input_tip">设置密码后可更换不带后缀数字的用户名</div>
          <input class="user_input" v-model="inputData.userName"/>
          <a v-show="inputData.userName.length>0">{{ inputData.userName.length }}/20</a>
          <button class="btn btn_blue btn_position" @click="updateUserName()">更新昵称</button>
        </div>
      </div>

      <div class="user_info_card">
        <div class="user_info_title">修改密码</div>
        <div class="user_input_tip" v-show="!hasPermission(user_data.status,HAS_PASSWORD)">您还没有设置密码</div>
        <div class="user_input_bar" v-show="hasPermission(user_data.status,HAS_PASSWORD)">
          <div class="user_input_label">旧密码</div>
          <input class="user_input" type="password" v-model="inputData.oldPassWord"/>
          <a v-show="inputData.oldPassWord.length>0">{{ inputData.oldPassWord.length }}/20</a>
        </div>
        <div class="user_input_bar">
          <div class="user_input_label">密码</div>
          <input class="user_input" type="password" v-model="inputData.newPassWord"/>
          <a v-show="inputData.newPassWord.length>0">{{ inputData.newPassWord.length }}/20</a>
        </div>
        <div class="user_input_bar">
          <div class="user_input_label">确认密码</div>
          <input class="user_input" type="password" v-model="inputData.confirmPassWord"/>
          <a v-show="inputData.confirmPassWord.length>0">{{ inputData.confirmPassWord.length }}/20</a>
          <button class="btn btn_blue btn_position" @click="updatePassWord()">更新密码</button>
          <div class="warning_color">{{ checkPassWord() }}</div>
        </div>
      </div>

      <div class="user_info_card">
        <div class="user_info_title">修改邮箱</div>
        <div class="user_input_bar">
          <div class="user_input_tip" v-show="!hasPermission(user_data.status,HAS_EMAIL)">
            绑定邮箱后也可通过邮箱作为账号登录
          </div>
          <div class="user_input_tip" v-show="hasPermission(user_data.status,HAS_EMAIL)">
            需修改邮箱请输入新邮箱点击发送，将向您的旧邮箱发送验证码
          </div>
          <div class="user_input_label">输入新邮箱</div>
          <input class="user_input" v-model="inputData.email"/>
          <button class="btn btn_blue btn_position" @click="sendEmailCode()">发送验证码</button>
        </div>

        <div class="user_input_bar">
          <div class="user_input_label">输入邮件验证码</div>
          <input class="user_input" v-model="inputData.emailCode"/>
          <button class="btn btn_blue btn_position" @click="updateEmail()">修改邮箱</button>
        </div>
      </div>
      <div class="user_info_card">
        <button class="btn btn_red btn_red_selected" style="margin: auto" @click="logout()">退出登录</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import {cMessage} from "/src/element/message";
import surveyApi from "/src/api/surveyUser"
import operator_table_simple from '/src/static/json/survey/character_table_simple.json'

let avatar = []
for (const char_id in operator_table_simple) {
  const operator = {
    charId: char_id,
    time: operator_table_simple[char_id].date
  }
  avatar.push(operator)
}

console.log(avatar)

avatar.sort((a, b) => a.time - b.time)

let user_data = ref({
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
    token: user_data.value.token,
    newPassWord: inputData.value.newPassWord,
    oldPassWord: inputData.value.oldPassWord,
    property: "passWord"
  }

  surveyApi.updateUserData(data).then(response => {
    cMessage('修改密码成功')
    user_data.value.status = response.data.status
    localStorage.setItem("globalUserData", JSON.stringify(user_data.value));
  })
}

function sendEmailCode() {
  const data = {
    token: user_data.value.token,
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
    token: user_data.value.token,
    email: inputData.value.email,
    emailCode: inputData.value.emailCode,
    property: "email"
  }
  surveyApi.updateUserData(data).then(response => {
    cMessage('邮箱绑定成功')
    user_data.value.status = response.data.status
    localStorage.setItem("globalUserData", JSON.stringify(user_data.value));
  })
}


function updateUserName() {
  const data = {
    token: user_data.value.token,
    userName: inputData.value.userName,
    property: "userName"
  }
  surveyApi.updateUserData(data).then(response => {
    cMessage('用户名更改成功')
    document.getElementById("user_name").innerText = response.data.userName
    user_data.value.userName = response.data.userName
    localStorage.setItem("globalUserData", JSON.stringify(user_data.value));
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
    user_data.value.userName = parse.userName;
    user_data.value.code = parse.code;
    user_data.value.status = parse.status;
    user_data.value.token = parse.token;
    user_data.value.avatar = parse.avatar
    user_data.value.email = parse['email'] == undefined ? "未绑定1" : parse['email'];
  }
}

let avatar_visible = ref(false)

function avatarPopupVisible() {
  avatar_visible.value = !avatar_visible.value
  selected_avatar.value = user_data.value.avatar
}

let selected_avatar = ref(user_data.value.avatar)

function chooseAvatar(avatar) {
  selected_avatar.value = avatar
}

function updateAvatar() {
  const data = {
    token: user_data.value.token,
    avatar: selected_avatar.value,
    property: "avatar"
  }

  surveyApi.updateUserData(data).then(response => {
    cMessage('头像更新成功')
    user_data.value.avatar = response.data.avatar
    localStorage.setItem("globalUserData", JSON.stringify(user_data.value));
  })

}

function getSprite(id, type) {
  type = type == void 0 ? '' : type;
  return "bg-" + id + " user_avatar_image";
}

onMounted(() => {
  getCacheUserData()
})


</script>

<style scoped>

</style>
