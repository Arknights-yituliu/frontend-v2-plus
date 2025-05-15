<script setup>
import {onMounted, ref} from "vue";
import {createMessage} from "/src/utils/message";
import userInfoAPI from "/src/api/userInfo"
import "/src/assets/css/account/home.scss";
import {userInfo} from '/src/utils/user/userInfo.js'
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import {operatorTable} from '/src/utils/gameData.js'
import {useRouter} from "vue-router";
const router = useRouter()
const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;
const englishNumberRegex = /^[A-Za-z0-9]+$/;

const accountRules = [
  value => !!value || '不能为空',
  value => chineseEnglishNumberRegex.test(value) || '账号仅可由汉字、数字、英文组成'
]

let avatarList = []

for (const char_id in operatorTable) {
  const operator = {
    charId: char_id,
    time: operatorTable[char_id].date,
    rarity: operatorTable[char_id].rarity,
  }
  avatarList.push(operator)
}


avatarList.sort((a, b) => b.rarity - a.rarity)


async function getUserInfoByToken() {

  formData.value.userName = userInfo.value.userName

  selectedAvatar.value = userInfo.value.avatar
}


let formData = ref({
  userName: '',
  newPassWord: "",
  confirmPassWord: '',
  oldPassWord: "",
  email: '',
  mailUsage:'',
  verificationCode: '',
  cred: '',
})

let displayOrUpdateInfo = ref(userInfo.value.status>0?'display':'')

//选中的头像id
let selectedAvatar = ref('')

//选择头像
function chooseAvatar(avatar) {
  selectedAvatar.value = avatar
}

/**
 * 更新头像
 */
function updateAvatar() {
  const data = {
    token: userInfo.value.token,
    avatar: selectedAvatar.value,
    property: "avatar"
  }

  userInfoAPI.updateUserDataV2(data).then(response => {
    createMessage({type:'success',text:'头像更新成功'})
    userInfo.value.avatar = response.data.avatar

  })
}


function sendUpdateEmailVerificationCode() {
  userInfoAPI.sendUpdateEmailVerificationCode(formData.value).then(response => {
    createMessage({type:'success',text:'验证码已发送',duration:4000})
  })
}

function sendVerificationCode() {
  formData.value.mailUsage = "register"
  userInfoAPI.sendVerificationCodeV2(formData.value).then(response => {
    createMessage({type:'success',text:'验证码已发送',duration:4000})
  })
}

function checkVerificationCode(){
  userInfoAPI.checkVerificationCode(formData.value).then(response => {
    formData.value.cred = response.data
    formData.value.verificationCode = ''
    displayOrUpdateInfo.value = 'bindEmail'
  })
}


function bindEmail() {
  userInfoAPI.bindEmail(formData.value).then(response => {
    createMessage({type:'success',text:'邮箱绑定成功',duration:4000})
    setTimeout(() => {
      location.reload();
    }, 2000)

  })
}

/**
 * 更新用户名
 */
function updateUserName() {
  const data = {
    token: userInfo.value.token,
    userName: formData.value.userName,
    property: "userName"
  }
  userInfoAPI.updateUserDataV2(data).then(response => {
    createMessage({type:'success',text:'用户名更改成功',duration:4000})
    userInfo.value.userName = response.data.userName

  })
}



function updateOrBindEmail(){
  if(userInfo.value.hasEmail){
    displayOrUpdateInfo.value = 'checkEmail'
  }else {
    displayOrUpdateInfo.value = 'bindEmail'
  }
}

/**
 * 退出登录
 */
function logout() {
  localStorage.removeItem('USER_TOKEN')
  setTimeout(() => {
    location.reload()
  }, 1000);
}

function toRetrieve() {
  router.push({name: "RETRIEVE"})
}

onMounted(() => {
  getUserInfoByToken()
  displayOrUpdateInfo.value = userInfo.value.status>0?'display':''
  // getOperatorData()
})
</script>

<template>

  <v-card class="user-card" title="用户信息" >

    {{userInfo}}
    <br>
    {{`状态${displayOrUpdateInfo}`}}

    <v-alert v-show="userInfo.status<1"
        title="未登录"
        type="error"
        class="m-12"
    ></v-alert>

    <div v-show="displayOrUpdateInfo === 'display'">
      <v-list>
        <v-list-item>
          <v-list-item-title>
            头像
          </v-list-item-title>
          <div class="flex align-center user-card-bar justify-between">
            <OperatorAvatar :char-id="userInfo.avatar" rounded :size="50"></OperatorAvatar>
            <v-btn color="primary" variant="text" text="修改头像" @click="displayOrUpdateInfo = 'avatar'"></v-btn>
          </div>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>
            用户名（账号）
          </v-list-item-title>
          <div class="flex align-center user-card-bar justify-between">
            <span >{{ userInfo.userName }}</span>
            <v-btn color="primary" variant="text" text="修改用户名（账号）"
                   @click="displayOrUpdateInfo = 'userName'"></v-btn>
          </div>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>
            绑定邮箱
          </v-list-item-title>
          <div class="flex align-center user-card-bar justify-between">
            <span >{{ userInfo.email }}</span>
            <v-btn color="primary" variant="text" :text="userInfo.hasEmail?'修改邮箱':'绑定邮箱'" @click="updateOrBindEmail"></v-btn>
          </div>
        </v-list-item>
      </v-list>

      <div class="flex justify-center">

      </div>

      <div class="flex justify-center">
        <v-btn color="primary" variant="outlined" text="修改密码" @click="toRetrieve()" class="m-8"></v-btn>
        <v-btn color="red" variant="outlined" text="退出登录" @click="logout" class="m-8"></v-btn>
      </div>
    </div>

    <div class="flex justify-between p-4" v-show="displayOrUpdateInfo !== 'display'&&displayOrUpdateInfo">
      <v-btn variant="text" color="primary" text="返回" @click="displayOrUpdateInfo = 'display'"></v-btn>
    </div>

    <div v-show="displayOrUpdateInfo==='avatar'">

      <div class="flex align-center justify-center">
        <OperatorAvatar :char-id="selectedAvatar" rounded :size="80" :mobile-size="80"></OperatorAvatar>
      </div>
      <div class="user-avatar-checkbox flex flex-wrap justify-center p-16-0 overflow-auto">
        <OperatorAvatar v-for="(avatar,index) in avatarList" :key="index" :char-id="avatar.charId"
                        :size="60" :mobile-size="60"
                        @click="chooseAvatar(avatar.charId)" class="m-4" rounded>
        </OperatorAvatar>
      </div>
      <div class="flex justify-center">
        <v-btn variant="text" color="primary" text="确认修改" @click="updateAvatar"></v-btn>
      </div>
    </div>

    <div v-show="displayOrUpdateInfo==='userName'">

      <div class="m-0-4 opacity-70">输入您的新用户名（账号）</div>
      <v-text-field
          :rules="accountRules"
          density="compact"
          v-model="formData.userName"
          hint="用户名仅可由汉字、数字、英文组成"
          color="primary"
          variant="outlined"
          class="m-4"
      ></v-text-field>
      <div class="flex justify-center">
        <v-btn variant="text" color="primary" text="确认修改" @click="updateUserName"></v-btn>
      </div>
    </div>

    <div v-show="displayOrUpdateInfo==='checkEmail'">

      <span>为了您的账号安全，本操作需要验证您的邮箱，验证码将会以邮件方式发送到您的邮箱{{userInfo.email}}</span>

      <v-otp-input v-model="formData.verificationCode" length="4" >

      </v-otp-input>

      <v-btn text="获取验证码"  density="compact" variant="text" color="primary" @click="sendUpdateEmailVerificationCode()"></v-btn>

      <div class="flex justify-center m-20-0">
        <v-btn text="下一步操作" color="primary" @click="checkVerificationCode()"></v-btn>
      </div>

    </div>

    <div v-show="displayOrUpdateInfo==='bindEmail'">
      <div class="m-0-4 opacity-70">输入您的新邮箱</div>
      <v-text-field
          v-model="formData.email"
          color="primary"
          density="compact"
          variant="outlined"
          class="m-4"
      >
        <template v-slot:append>
          <v-btn color="primary" variant="text" text="发送验证码"
                 @click="sendVerificationCode()"></v-btn>
        </template>
      </v-text-field>
      <v-otp-input class="m-4" v-model="formData.verificationCode" length="4"></v-otp-input>
      <v-btn text="更新邮箱" @click="bindEmail()"></v-btn>
    </div>

  </v-card>
</template>