<script setup>
import {onMounted, ref, watch} from "vue";
import {cMessage} from "/src/utils/message";
import surveyApi from "/src/api/userInfo"
import operator_table_simple from '/src/static/json/survey/character_table_simple.json'
import "/src/assets/css/survey/home.scss";
import "/src/assets/css/survey/home.phone.scss";
import {getUserInfo} from '/src/utils/user/userInfo.js'
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import operatorDataAPI from "@/api/operatorData.js";
import CHARACTER_TABLE from "@/static/json/survey/character_table_simple.json";

const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;
const englishNumberRegex = /^[A-Za-z0-9]+$/;

const accountRules = [
  value => !!value || '不能为空',
  value => chineseEnglishNumberRegex.test(value) || '账号仅可由汉字、数字、英文组成'
]

let avatarList = []
for (const char_id in operator_table_simple) {
  const operator = {
    charId: char_id,
    time: operator_table_simple[char_id].date,
    rarity: operator_table_simple[char_id].rarity,
  }
  avatarList.push(operator)
}


avatarList.sort((a, b) => b.rarity - a.rarity)


let userInfo = ref({});

async function getUserInfoByToken() {
  userInfo.value = await getUserInfo()
  inputContent.value.userName = userInfo.value.userName
  selectedAvatar.value = userInfo.value.avatar
}


let inputContent = ref({
  userName: '',
  cred: '',
  newPassWord: "",
  confirmPassWord: '',
  oldPassWord: "",
  email: '',
  emailCode: ''
})

let displayOrUpdateInfo = ref('display')

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

  surveyApi.updateUserDataV2(data).then(response => {
    cMessage('头像更新成功')
    userInfo.value.avatar = response.data.avatar

  })
}


function sendEmailCode() {
  const data = {
    token: userInfo.value.token,
    email: inputContent.value.email,
    mailUsage: 'updateEmail'
  }
  // eslint-disable-next-line no-unused-vars
  surveyApi.sendVerificationCodeV2(data).then(response => {
    cMessage('验证码已发送')
  })
}

/**
 * 更新用户名
 */
function updateUserName() {
  const data = {
    token: userInfo.value.token,
    userName: inputContent.value.userName,
    property: "userName"
  }
  surveyApi.updateUserDataV2(data).then(response => {
    cMessage('用户名更改成功')
    userInfo.value.userName = response.data.userName

  })
}

function updateEmail() {
  const data = {
    token: userInfo.value.token,
    email: inputContent.value.email,
    emailCode: inputContent.value.emailCode,
    property: "email"
  }
  surveyApi.updateUserDataV2(data).then(response => {
    cMessage('邮箱绑定成功')
    getUserInfoByToken()
  })
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

/**
 * 退出登录
 */
function logout() {
  localStorage.removeItem('USER_TOKEN')
  setTimeout(() => {
    location.reload()
  }, 1000);
}

onMounted(() => {
  getUserInfoByToken()
  // getOperatorData()
})


</script>
<template>

  <div class="account-home-page flex flex-wrap justify-center">
    <v-card class="user-card m-12" title="用户信息" max-height="600">
      <v-card-text v-show="displayOrUpdateInfo === 'display'">
        <v-list>
          <v-list-item>
            <div class="opacity-70 user-card-label">头像</div>
            <div class="m-4 flex items-center user-card-bar justify-between">
              <OperatorAvatar :char-id="userInfo.avatar" rounded size="50"></OperatorAvatar>
              <v-btn color="primary" variant="text" text="修改头像" @click="displayOrUpdateInfo = 'avatar'"></v-btn>
            </div>
          </v-list-item>
          <v-list-item>
            <div class="opacity-70 user-card-label">用户名（账号）</div>
            <div class="m-4 flex items-center user-card-bar justify-between">
              <span class="font-bold">{{ userInfo.userName }}</span>
              <v-btn color="primary" variant="text" text="修改用户名（账号）" @click="displayOrUpdateInfo = 'userName'"></v-btn>
            </div>
          </v-list-item>
          <v-list-item>
            <div class="opacity-70 user-card-label">绑定邮箱</div>
            <div class="m-4 flex items-center user-card-bar justify-between">
              <span class="font-bold">{{ userInfo.email }}</span>
              <v-btn color="primary" variant="text" text="修改邮箱" disabled></v-btn>
            </div>
          </v-list-item>
        </v-list>

        <div class="flex justify-center">
          <v-btn color="red" variant="outlined" text="退出登录" @click="logout" class="m-8"></v-btn>
        </div>
      </v-card-text>

      <v-card-text v-show="displayOrUpdateInfo==='avatar'">
        <div class="p-4">
          <v-btn variant="text" color="primary" text="返回" @click="displayOrUpdateInfo = 'display'"></v-btn>
        </div>
        <div class="flex align-center justify-center">
          <OperatorAvatar :char-id="selectedAvatar" rounded :size="80" :mobile-size="60"></OperatorAvatar>
        </div>
        <div class="user-avatar-checkbox flex flex-wrap justify-center p-16-0 overflow-auto">
          <OperatorAvatar v-for="(avatar,index) in avatarList" :key="index" :char-id="avatar.charId"
                          :size="60" :mobile-size="40"
                          @click="chooseAvatar(avatar.charId)" class="m-8" rounded>
          </OperatorAvatar>
        </div>
        <div class="flex justify-center">
          <v-btn variant="text" color="primary" text="确认修改" @click="updateAvatar"></v-btn>
        </div>
      </v-card-text>

      <v-card-text v-show="displayOrUpdateInfo==='userName'">
        <div class="flex justify-between p-4">
          <v-btn variant="text" color="primary" text="返回" @click="displayOrUpdateInfo = 'display'"></v-btn>
        </div>
        <div class="m-0-4 opacity-70" >输入您的新用户名（账号）</div>
        <v-text-field
            :rules="accountRules"
            density="compact"
            v-model="inputContent.userName"
            hint="用户名仅可由汉字、数字、英文组成"
            color="primary"
            variant="outlined"
            class="m-4"
        ></v-text-field>
        <div class="flex justify-center">
          <v-btn variant="text" color="primary" text="确认修改" @click="updateUserName"></v-btn>
        </div>
      </v-card-text>

      <v-card-text v-show="displayOrUpdateInfo==='email'">
        <div class="flex justify-between p-4">
          <v-btn variant="text" color="primary" text="返回" @click="displayOrUpdateInfo = 'display'"></v-btn>
        </div>
        <div class="m-0-4 opacity-70" >11111</div>
        <div class="flex justify-center">
          <v-btn variant="text" color="primary" text="确认修改" @click="updateUserName"></v-btn>
        </div>
      </v-card-text>
    </v-card>



<!--    <v-card>-->
<!--      <v-card-text>-->

<!--      </v-card-text>-->
<!--    </v-card>-->

  </div>

</template>


<style scoped>

</style>
