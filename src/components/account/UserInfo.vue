<script setup>
import {onMounted, ref} from "vue";
import {createMessage} from "/src/utils/message";
import {updateOauthAvatar, updateOauthNickname} from "/src/api/user-center/userInfo.js";
import "/src/assets/css/account/home.scss";
import {userInfo} from '/src/api/user-center/userSession.js'
import { getOperatorAvatarUrl, getOperatorAvatarStyle } from "/src/utils/arknightsResource.js";
import LogoutConfirmDialog from "/src/components/account/LogoutConfirmDialog.vue";
import {operatorTableV2} from '/src/utils/gameData.js'
const nicknameRules = [
  value => String(value ?? '').trim().length > 0 || '昵称不能为空',
  value => String(value ?? '').trim().length <= 64 || '昵称最长 64 个字符',
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

  formData.value.userName = userInfo.value.nickname

  selectedAvatar.value = userInfo.value.avatar

  displayOrUpdateInfo.value = userInfo.value.status>0?'online':''
}


let formData = ref({
  userName: '',
  newPassWord: "",
  confirmPassWord: '',
  oldPassWord: "",
})

let displayOrUpdateInfo = ref("online")

//选中的头像id
let selectedAvatar = ref('')
const logoutDialog = ref(false)

//选择头像
function chooseAvatar(avatar) {
  selectedAvatar.value = avatar
}

/**
 * 更新头像（走 UC OAuth 资料接口，空串表示清除头像）
 */
function updateAvatar() {
  // UC 要求 avatar 显式传值且不接受 null，这里统一归一化为空串（空串表示清除头像）
  const avatar = String(selectedAvatar.value ?? '')
  updateOauthAvatar(avatar).then(() => {
    createMessage({type:'success',text:'头像更新成功'})
    // 新接口响应 data 为空，头像新值直接取本地选择
    userInfo.value.avatar = avatar
  })
}


/**
 * 更新昵称（走 UC OAuth 资料接口，不会修改登录用户名）
 */
function updateNickname() {
  const nickname = String(formData.value.userName ?? '').trim()
  if (!nickname) {
    createMessage({type:'warn',text:'昵称不能为空'})
    return
  }
  if (nickname.length > 64) {
    createMessage({type:'warn',text:'昵称最长 64 个字符'})
    return
  }
  updateOauthNickname(nickname).then(() => {
    createMessage({type:'success',text:'昵称修改成功',duration:4000})
    // 新接口响应 data 为空，昵称新值直接取表单输入
    formData.value.userName = nickname
    userInfo.value.nickname = nickname
  })
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
            <img class="operator-avatar-img operator-avatar-img--rounded"
                 :style="getOperatorAvatarStyle({ size: 50, mobileSize: 40 })"
                 :src="getOperatorAvatarUrl(userInfo.avatar)" alt="">
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
                   @click="displayOrUpdateInfo = 'userName'"></v-btn>
          </div>
        </v-list-item>
      </v-list>

      <div class="flex justify-center">

      </div>

      <div class="flex justify-center">
        <v-btn
            color="error"
            variant="text"
            prepend-icon="mdi-logout"
            text="退出登录"
            @click="logoutDialog = true"
            class="m-8"
        ></v-btn>
      </div>
    </div>

    <div class="flex justify-between p-4" v-show="displayOrUpdateInfo !== 'online'&&displayOrUpdateInfo">
      <v-btn variant="text" color="primary" text="返回" @click="displayOrUpdateInfo = 'online'"></v-btn>
    </div>

    <v-card v-show="displayOrUpdateInfo==='avatar'">
      <v-card-text>


      <div class="flex align-center justify-center">
        <img class="operator-avatar-img operator-avatar-img--rounded"
             :style="getOperatorAvatarStyle({ size: 80, mobileSize: 80 })"
             :src="getOperatorAvatarUrl(selectedAvatar)" alt="">
      </div>
      <div class="user-avatar-checkbox flex flex-wrap justify-center p-16-0 overflow-auto">
        <img v-for="(avatar,index) in avatarList" :key="index"
             class="operator-avatar-img operator-avatar-img--rounded m-4"
             :style="getOperatorAvatarStyle({ size: 60, mobileSize: 60 })"
             :src="getOperatorAvatarUrl(avatar.charId)"
             @click="chooseAvatar(avatar.charId)" alt="">
      </div>
      <div class="flex justify-center">
        <v-btn variant="text" color="primary" text="确认修改" @click="updateAvatar"></v-btn>
      </div>
      </v-card-text>
    </v-card>

    <v-card v-show="displayOrUpdateInfo==='userName'">
      <v-card-text>
      <div class="m-0-4 opacity-70">输入您的新昵称，修改后立即生效；昵称与登录用户名无关</div>
      <v-text-field
          :rules="nicknameRules"
          density="compact"
          v-model="formData.userName"
          hint="昵称最长 64 个字符，支持中英文及其他字符"
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
    <LogoutConfirmDialog v-model="logoutDialog"></LogoutConfirmDialog>
  </v-card>
</template>
