<script setup>
import {onMounted, ref} from "vue";
import {createMessage} from "/src/utils/message";
import userInfoAPI from "/src/api/userInfo"
import "/src/assets/css/account/home.scss";
import {userInfo} from '/src/utils/user/userInfo.js'
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import LogoutConfirmDialog from "/src/components/account/LogoutConfirmDialog.vue";
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
 * 更新头像
 */
function updateAvatar() {
  userInfoAPI.updateAvatar(selectedAvatar.value).then(() => {
    createMessage({type:'success',text:'头像更新成功'})
    // 新接口响应 data 为空，头像新值直接取本地选择
    userInfo.value.avatar = selectedAvatar.value
  })
}


/**
 * 更新用户名（昵称）
 */
function updateUserName() {
  userInfoAPI.updateNickname(formData.value.userName).then(() => {
    createMessage({type:'success',text:'用户名更改成功',duration:4000})
    // 新接口响应 data 为空，昵称新值直接取表单输入
    userInfo.value.nickname = formData.value.userName
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
            <OperatorAvatar :char-id="userInfo.avatar" rounded :size="50"></OperatorAvatar>
            <v-btn color="primary" variant="text" text="修改头像" @click="displayOrUpdateInfo = 'avatar'"></v-btn>
          </div>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>
            用户名（账号）
          </v-list-item-title>
          <div class="flex align-center user-card-bar justify-between">
            <span >{{ userInfo.nickname }}</span>
            <v-btn color="primary" variant="text" text="修改用户名（账号）"
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

    <v-card v-show="displayOrUpdateInfo==='userName'">
      <v-card-text>
      <div class="m-0-4 opacity-70">输入您的新用户名（账号）,修改后，您仅可通过新用户名作为账号登录</div>
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
        <v-btn variant="text" color="primary" text="确认修改" @click="updateUserName" style="width: 100px"></v-btn>
      </div>
      </v-card-text>
    </v-card>

 </v-card-text>
    <LogoutConfirmDialog v-model="logoutDialog"></LogoutConfirmDialog>
  </v-card>
</template>
