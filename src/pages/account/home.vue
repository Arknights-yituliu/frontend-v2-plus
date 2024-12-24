<script setup>
import {onMounted, ref, watch} from "vue";
import {cMessage} from "/src/utils/message";
import surveyApi from "/src/api/userInfo"
import operator_table_simple from '/src/static/json/survey/character_table_simple.json'
import "/src/assets/css/survey/home.scss";
import "/src/assets/css/survey/home.phone.scss";
import {getUserInfo} from '/src/utils/survey/userInfo.js'
import MyButton from '/src/components/Button.vue'
import OperatorAvatar from "@/components/OperatorAvatar.vue";
import operatorDataAPI from "@/api/operatorData.js";
import CHARACTER_TABLE from "@/static/json/survey/character_table_simple.json";
import OperatorProgression from "@/components/survey/OperatorProgressionStatistical.vue";

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
  localStorage.removeItem('USER_TOKEN')
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

let operatorList = ref([])


function getOperatorData() {
  //检查是否登录
  const data = {token: localStorage.getItem('USER_TOKEN')}
  //根据一图流的token查询用户填写的干员数据
  operatorDataAPI.getOperatorData(data).then((response) => {
    let list = response.data; //后端返回的数据
    //转为前端的数据格式
    operatorList.value = []
    let tmpList = []
    for (const item of list) {
      const charId = item.charId;
      if (CHARACTER_TABLE[charId]) {
        let formatData = JSON.parse(JSON.stringify(CHARACTER_TABLE[charId]))
        formatData.elite = item.elite;
        formatData.level = item.level;
        formatData.potential = item.potential;
        formatData.mainSkill = item.mainSkill;
        formatData.skill1 = item.skill1;
        formatData.skill2 = item.skill2;
        formatData.skill3 = item.skill3;
        formatData.modX = item.modX;
        formatData.modY = item.modY;
        formatData.modD = item.modD;
        formatData.own = item.own;
        formatData.modA = item.modA;
        tmpList.push(formatData)
      }
    }
    operatorList.value = tmpList
  });


}

onMounted(() => {
  getUserInfoByToken()
  getOperatorData()
})


</script>
<template>

  <div class="account-home-page flex flex-wrap justify-center">
    <v-card class="user-card m-12" title="用户信息">
      <v-list>
        <v-list-item>
          <div class="opacity-70 user-card-label">头像</div>
          <div class="m-4 flex items-center user-card-bar justify-between">
            <OperatorAvatar :char-id="userInfo.avatar" rounded size="40"></OperatorAvatar>
            <v-btn color="primary" variant="text" text="修改头像"></v-btn>
          </div>
        </v-list-item>
        <v-list-item>
          <div class="opacity-70 user-card-label">用户名</div>
          <div class="m-4 flex items-center user-card-bar justify-between">
            <span class="font-bold">{{ userInfo.userName }}</span>
            <v-btn color="primary" variant="text" text="修改用户名"></v-btn>
          </div>
        </v-list-item>
        <v-list-item>
          <div class="opacity-70 user-card-label">绑定邮箱</div>
          <div class="m-4 flex items-center user-card-bar justify-between">
            <span class="font-bold">{{ userInfo.email }}</span>
            <v-btn color="primary" variant="text" text="修改邮箱"></v-btn>
          </div>
        </v-list-item>
      </v-list>

      <div class="flex justify-center">
<!--        <v-btn color="primary" variant="outlined" text="修改用户信息" class="m-8"></v-btn>-->
        <v-btn color="red" variant="outlined" text="退出登录" @click="logout" class="m-8"></v-btn>
      </div>

    </v-card>

    <v-card class="user-card m-12" title="干员练度简表">
      <OperatorProgression v-model="operatorList"></OperatorProgression>
    </v-card>

    <v-card>


    </v-card>
  </div>

  <div class="account-home-page" style="display: none">
    <div class="user-info-card-container">

      <div class="user-info-card">
        <h2 class="user-info-card-title">用户信息</h2>
        <h4>头像</h4>
        <div class="user-info-card-line">
          <span>点击头像修改</span>
          <div class="user-avatar-sprite" @click="avatarPopupVisible()">
            <div :class="getSprite(userInfo.avatar)"></div>
          </div>
        </div>

        <h4>用户名</h4>
        <div class="user-info-card-line">

          <input class="user-info-card-input" v-model="inputData.userName"/>
          <a v-show="inputData.userName.length>0">{{ inputData.userName.length }}/20</a>
          <MyButton data-color="blue" @click="updateUserName()">更新用户名</MyButton>
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
            <MyButton data-color="blue" @click="updateAvatar()"> 保存修改</MyButton>
          </div>
          <div class="user_avatar_popup_wrap">
            <div class="user-avatar-sprite" style="margin: 8px" v-for="(avatar,index) in avatar" :key="index"
                 @click="chooseAvatar(avatar.charId)">
              <div :class="getSprite(avatar.charId)"></div>
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
          <MyButton data-color="blue" @click="updatePassWord()">更新密码</MyButton>
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
          <MyButton data-color="blue" @click="sendEmailCode()">发送验证码</MyButton>
        </div>

        <h4>输入邮件验证码</h4>
        <div class="user-info-card-input-line">
          <input class="user-info-card-input" v-model="inputData.emailCode"/>
          <MyButton data-color="blue" @click="updateEmail()">修改邮箱</MyButton>
        </div>
      </div>
      <div class="user-info-card">
        <MyButton data-color="blue" style="margin: auto" @click="logout()">退出登录</MyButton>
      </div>
    </div>
  </div>
</template>


<style scoped>

</style>
