<script setup>
import {onMounted, ref} from "vue";
import {createMessage} from "/src/utils/message";
import userInfoAPI from "/src/api/userInfo"
import "/src/assets/css/account/home.scss";
import {userInfo, clearOAuthToken} from '/src/api/userInfo.js'
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import {operatorTableV2} from '/src/utils/gameData.js'
const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;

const accountRules = [
  value => !!value || '不能为空',
  value => chineseEnglishNumberRegex.test(value) || '账号仅可由汉字、数字、英文组成'
]

let avatarList = []

for (const char_id in operatorTableV2) {
  const operator = {
    charId: char_id,
    time: operatorTableV2[char_id].date,
    rarity: operatorTableV2[char_id].rarity,
  }
  avatarList.push(operator)
}


avatarList.sort((a, b) => b.rarity - a.rarity)


async function getUserInfoByToken() {

  formData.value.nickname = userInfo.value.nickname

  selectedAvatar.value = userInfo.value.avatar

  displayOrUpdateInfo.value = userInfo.value.status>0?'online':''
}


let displayOrUpdateInfo = ref("online")

//选中的头像id
let selectedAvatar = ref('')

//选择头像
function chooseAvatar(avatar) {
  selectedAvatar.value = avatar
}

/**
 * 更新头像（走 OAuth 会话鉴权的新接口）
 */
function updateAvatar() {
  userInfoAPI.updateAvatar(selectedAvatar.value).then(() => {
    createMessage({type: 'success', text: '头像更新成功'})
    userInfo.value.avatar = selectedAvatar.value
  })
}


let formData = ref({
  nickname: '',
})

/**
 * 更新昵称（走 OAuth 会话鉴权的新接口）
 */
function updateNickname() {
  userInfoAPI.updateNickname(formData.value.nickname).then(() => {
    createMessage({type: 'success', text: '昵称更改成功', duration: 4000})
    userInfo.value.nickname = formData.value.nickname
  })
}

/** 跳转账号资料页（绑定/换绑邮箱、修改密码等账号操作均在该页面完成） */
function toUserProfile() {
  window.location.href = 'https://orange.yituliu.cn/user/profile'
}

/**
 * 退出登录：清除本地 OAuth 会话
 */
async function logout() {
  clearOAuthToken()
  setTimeout(() => {
    location.reload()
  }, 1000);
}

let max = 0
const intervalId =  setInterval(()=>{
  if(max>9){
    clearInterval(intervalId)
  }
  if(userInfo.value.status>0){
    clearInterval(intervalId)
  }
  displayOrUpdateInfo.value = userInfo.value.status>0?'online':''
  max++
},500)

onMounted(() => {
  getUserInfoByToken()
  displayOrUpdateInfo.value = userInfo.value.status>0?'online':''
})
</script>

<template>

  <v-card class="user-card" title="用户信息" >
    <v-card-text>
<!--    {{`状态：${displayOrUpdateInfo}`}}-->

    <v-alert v-show="userInfo.status<1"
        title="未登录"
        type="error"
        class="m-12"
    ></v-alert>

    <div v-show="displayOrUpdateInfo === 'online'">
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
            昵称
          </v-list-item-title>
          <div class="flex align-center user-card-bar justify-between">
            <span >{{ userInfo.nickname }}</span>
            <v-btn color="primary" variant="text" text="修改昵称"
                   @click="displayOrUpdateInfo = 'nickname'"></v-btn>
          </div>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>
            绑定邮箱
          </v-list-item-title>
          <div class="flex align-center user-card-bar justify-between">
            <span >{{ userInfo.email }}</span>
          </div>
        </v-list-item>
      </v-list>

      <div class="flex justify-center">

      </div>

      <div class="flex justify-center">
        <v-btn color="primary" variant="outlined" :text="userInfo.hasEmail ? '换绑邮箱' : '绑定邮箱'" @click="toUserProfile" class="m-8"></v-btn>
        <v-btn color="primary" variant="outlined" text="修改密码" @click="toUserProfile()" class="m-8"></v-btn>
        <v-btn color="red" variant="outlined" text="退出登录" @click="logout" class="m-8"></v-btn>
      </div>
    </div>

    <div class="flex justify-between p-4" v-show="displayOrUpdateInfo !== 'online'&&displayOrUpdateInfo">
      <v-btn variant="text" color="primary" text="返回" @click="displayOrUpdateInfo = 'online'"></v-btn>
    </div>

    <v-card v-show="displayOrUpdateInfo==='avatar'">
      <v-card-text>


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
      </v-card-text>
    </v-card>

    <v-card v-show="displayOrUpdateInfo==='nickname'">
      <v-card-text>
      <div class="m-0-4 opacity-70">输入您的新昵称</div>
      <v-text-field
          :rules="accountRules"
          density="compact"
          v-model="formData.nickname"
          hint="昵称仅可由汉字、数字、英文组成"
          color="primary"
          variant="outlined"
          class="m-4"
      ></v-text-field>
      <div class="flex justify-center">
        <v-btn variant="text" color="primary" text="确认修改" @click="updateNickname" style="width: 100px"></v-btn>
      </div>
      </v-card-text>
    </v-card>

 </v-card-text>
  </v-card>
</template>
