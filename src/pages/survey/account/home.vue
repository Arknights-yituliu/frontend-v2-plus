<script setup>
import {onMounted, ref, watch} from "vue";
import {cMessage} from "/src/utils/message";
import surveyApi from "/src/api/userInfo"
import operator_table_simple from '/src/static/json/survey/character_table_simple.json'
import "/src/assets/css/survey/home.scss";
import "/src/assets/css/survey/home.phone.scss";
import {getUserInfo} from '/src/pages/survey/service/userInfo.js'
import MyButton from '/src/components/Button.vue'

let avatar = []
for (const char_id in operator_table_simple) {
  const operator = {
    charId: char_id,
    time: operator_table_simple[char_id].date
  }
  avatar.push(operator)
}


avatar.sort((a, b) => a.time - b.time)

let userInfo = ref({});


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
    token: userInfo.value.token,
    newPassWord: inputData.value.newPassWord,
    oldPassWord: inputData.value.oldPassWord,
    property: "passWord"
  }

  surveyApi.updateUserDataV2(data).then(response => {
    cMessage('修改密码成功')
    getUserInfoByToken()
  })
}

function sendEmailCode() {
  const data = {
    token: userInfo.value.token,
    email: inputData.value.email,
    mailUsage: 'updateEmail'
  }


  // eslint-disable-next-line no-unused-vars
  surveyApi.sendVerificationCodeV2(data).then(response => {
    cMessage('验证码已发送')
  })

}

function updateEmail() {
  const data = {
    token: userInfo.value.token,
    email: inputData.value.email,
    emailCode: inputData.value.emailCode,
    property: "email"
  }
  surveyApi.updateUserDataV2(data).then(response => {
    cMessage('邮箱绑定成功')
    getUserInfoByToken()
  })
}


function updateUserName() {
  const data = {
    token: userInfo.value.token,
    userName: inputData.value.userName,
    property: "userName"
  }
  surveyApi.updateUserDataV2(data).then(response => {
    cMessage('用户名更改成功')
    userInfo.value.userName = response.data.userName

  })
}

//登出
function logout() {
  localStorage.removeItem('globalUserData')
  setTimeout(() => {
    location.reload()
  }, 1000);
}



async function getUserInfoByToken() {
  userInfo.value = await getUserInfo()
  inputData.value.userName = userInfo.value.userName
}

let avatar_visible = ref(false)

function avatarPopupVisible() {
  avatar_visible.value = !avatar_visible.value
  selectedAvatar.value = userInfo.value.avatar
}

let selectedAvatar = ref(userInfo.value.avatar)

function chooseAvatar(avatar) {
  selectedAvatar.value = avatar
}

function updateAvatar() {
  const data = {
    token: userInfo.value.token,
    avatar: selectedAvatar.value,
    property: "avatar"
  }

  surveyApi.updateUserDataV2(data).then(response => {
    cMessage('头像更新成功')
    userInfo.value.avatar = response.data.avatar

  })

}

function getSprite(id) {
  return "bg-" + id;
}

onMounted(() => {
  getUserInfoByToken()


})




</script>
<template>
  <div class="account-home-page">
    <div class="user-info-card-container">

      <div class="user-info-card">
        <h2 class="user-info-card-title">用户信息</h2>
        <h4>头像</h4>
        <div class="user-info-card-line">
           <span>点击头像修改</span>
          <div class="user-avatar-sprite" @click="avatarPopupVisible()">
            <div :class="getSprite(userInfo.avatar)" ></div>
          </div>
        </div>

        <h4>用户名</h4>
        <div class="user-info-card-line">

          <input class="user-info-card-input" v-model="inputData.userName"/>
          <a v-show="inputData.userName.length>0">{{ inputData.userName.length }}/20</a>
          <my-button data-color="blue"  @click="updateUserName()">更新用户名</my-button>
        </div>
        <div class="user-info-card-line">
          <span>绑定邮箱</span>
          <span>{{ userInfo.email }}</span>
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
              <div :class="getSprite(selectedAvatar)"></div>
            </div>
            <my-button data-color="blue" @click="updateAvatar()"> 保存修改</my-button>
          </div>
          <div class="user_avatar_popup_wrap" >
            <div class="user-avatar-sprite" style="margin: 8px" v-for="(avatar,index) in avatar" :key="index" @click="chooseAvatar(avatar.charId)">
              <div :class="getSprite(avatar.charId)" ></div>
            </div>
          </div>
        </div>
      </c-popup>



      <div class="user-info-card">
        <h2 class="user-info-card-title">修改密码</h2>
        <div class="user-info-card-tip" v-show="!userInfo.hasPassword">
          您还没有设置密码，密码长度最低为6个数字或字母
        </div>

        <h4 v-show="userInfo.hasPassword">旧密码</h4>
        <div class="user-info-card-input-line"
             v-show="userInfo.hasPassword">
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
          <my-button data-color="blue" @click="updatePassWord()">更新密码</my-button>
        </div>
        <div class="user-info-card-tip" style="color: #f83333">{{ checkPassWord() }}</div>
      </div>

      <div class="user-info-card">
        <h2 class="user-info-card-title">修改邮箱</h2>
        <div class="user-info-card-tip" v-show="!userInfo.hasEmail">
          绑定邮箱后也可通过邮箱作为账号登录
        </div>
        <div class="user-info-card-tip" v-show="userInfo.hasEmail">
          修改邮箱请输入新邮箱点击发送，将向您的新邮箱发送验证码
        </div>

        <h4>输入新邮箱</h4>
        <div class="user-info-card-input-line">
          <input class="user-info-card-input" v-model="inputData.email"/>
          <my-button data-color="blue"  @click="sendEmailCode()">发送验证码</my-button>
        </div>

        <h4>输入邮件验证码</h4>
        <div class="user-info-card-input-line">
          <input class="user-info-card-input" v-model="inputData.emailCode"/>
          <my-button data-color="blue"  @click="updateEmail()">修改邮箱</my-button>
        </div>
      </div>
      <div class="user-info-card">
        <my-button data-color="blue" style="margin: auto" @click="logout()">退出登录</my-button>
      </div>
    </div>
  </div>
</template>



<style scoped>

</style>
