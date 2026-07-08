<script setup>
import {onMounted, ref} from "vue";
import {createMessage} from "/src/utils/message";
import userInfoAPI from "/src/api/userInfo"
import "/src/assets/css/account/home.scss";
import {userInfo} from '/src/utils/user/userInfo.js'
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import {operatorTable} from '/src/utils/gameData.js'
import {useRouter} from "vue-router";
import {copyTextToClipboard} from "/src/utils/copyText.js";
const router = useRouter()
const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;

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

  displayOrUpdateInfo.value = userInfo.value.status>0?'online':''
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

let displayOrUpdateInfo = ref("online")

//选中的头像id
let selectedAvatar = ref('')

// OpenAPI Token 相关
const permissionList = ref([])
const selectedPermissions = ref([])
const tokenList = ref([])
const isGeneratingToken = ref(false)
const isDeletingToken = ref(false)

/**
 * 根据权限 code 获取描述文本
 */
function getScopeDesc(code) {
  const perm = permissionList.value.find(p => p.code === code)
  return perm ? perm.desc : `权限${code}`
}

/**
 * 解析 scope JSON 字符串，返回描述文本
 */
function parseScopeDesc(scopeStr) {
  try {
    const codes = JSON.parse(scopeStr)
    return codes.map(c => getScopeDesc(c)).join('、')
  } catch {
    return scopeStr
  }
}

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

/**
 * 进入 OpenAPI Token 管理面板，同时加载已有 Token
 */
function openOpenApiPanel() {
  displayOrUpdateInfo.value = 'openapi'
  fetchTokens()
}

/**
 * 获取权限列表
 */
async function fetchPermissions() {
  try {
    const response = await userInfoAPI.getOpenApiPermissions()
    permissionList.value = response.data || []
  } catch (error) {
    createMessage({type: 'error', text: '获取权限列表失败'})
  }
}

/**
 * 获取所有第三方 Token 列表
 */
async function fetchTokens() {
  try {
    const response = await userInfoAPI.getOpenApiTokens()
    tokenList.value = response.data || []
  } catch (error) {
    // 静默失败，不影响其他功能
  }
}

/**
 * 生成第三方 API Token
 */
async function generateToken() {
  if (selectedPermissions.value.length === 0) {
    createMessage({type: 'warn', text: '请至少选择一项权限'})
    return
  }
  isGeneratingToken.value = true
  try {
    await userInfoAPI.generateOpenApiToken(selectedPermissions.value)
    selectedPermissions.value = []
    createMessage({type: 'success', text: 'Token 生成成功'})
    // 生成后刷新 token 列表
    await fetchTokens()
  } catch (error) {
    createMessage({type: 'error', text: '生成失败，请稍后再试'})
  } finally {
    isGeneratingToken.value = false
  }
}

/**
 * 复制 Token 到剪贴板
 */
function copyToken(token) {
  if (!token) return
  copyTextToClipboard(token, () => {
    createMessage({type: 'success', text: '已复制到剪贴板'})
  })
}

/**
 * 删除第三方 API Token
 */
async function deleteToken(token) {
  isDeletingToken.value = true
  try {
    await userInfoAPI.deleteOpenApiToken(token)
    tokenList.value = tokenList.value.filter(t => t.token !== token)
    createMessage({type: 'success', text: 'Token 已删除'})
  } catch (error) {
    createMessage({type: 'error', text: '删除失败，请稍后再试'})
  } finally {
    isDeletingToken.value = false
  }
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
  if (userInfo.value.status > 0) {
    fetchPermissions()
  }
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
        <v-list-item>
          <v-list-item-title>
            API Token
          </v-list-item-title>
          <div class="flex align-center user-card-bar justify-between">
            <span class="text-caption opacity-70">第三方接口凭证</span>
            <v-btn color="primary" variant="text" text="管理" @click="openOpenApiPanel"></v-btn>
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

    <div v-show="displayOrUpdateInfo==='checkEmail'">

      <span>为了您的账号安全，本操作需要验证您的邮箱，验证码将会以邮件方式发送到您的邮箱{{userInfo.email}}</span>

      <v-otp-input v-model="formData.verificationCode" length="4" >

      </v-otp-input>

      <div class="flex justify-end">
        <v-btn text="获取验证码"  density="compact" variant="text" color="primary" @click="sendUpdateEmailVerificationCode()"></v-btn>
      </div>


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
      <div class="flex justify-center m-20-0">
        <v-btn text="更新邮箱" color="primary" @click="bindEmail()"></v-btn>
      </div>

    </div>

    <v-card v-show="displayOrUpdateInfo==='openapi'">
      <v-card-text>
        <div class="text-caption opacity-70 mb-4">选择权限后点击生成，Token 将在30天后过期</div>

        <div class="flex flex-wrap gap-2 mb-6">
          <v-chip-group v-model="selectedPermissions" multiple>
            <v-chip
              v-for="perm in permissionList"
              :key="perm.code"
              :value="perm.code"
              variant="outlined"
              color="primary"
            >{{ perm.desc }}</v-chip>
          </v-chip-group>
        </div>

        <v-btn
          color="primary"
          variant="elevated"
          text="生成 Token"
          :disabled="selectedPermissions.length === 0 || isGeneratingToken"
          :loading="isGeneratingToken"
          @click="generateToken"
          class="w-full mb-6"
        ></v-btn>

        <!-- 已有 Token 列表 -->
        <div v-if="tokenList.length > 0">
          <div class="text-subtitle-2 mb-3">已生成的 Token</div>
          <div class="text-xs text-red-500 mb-3">页面刷新后 Token 将消失，请尽快复制保存</div>
          <div
            v-for="item in tokenList"
            :key="item.token"
            class="border rounded-lg p-3 mb-3 bg-grey-50"
          >
            <div class="flex justify-between items-center mb-1">
              <span class="text-caption opacity-60">权限：{{ parseScopeDesc(item.scope) }}</span>
              <div class="flex gap-1">
                <v-btn size="x-small" color="primary" variant="text" @click="copyToken(item.token)">复制</v-btn>
                <v-btn size="x-small" color="red" variant="text" :loading="isDeletingToken" @click="deleteToken(item.token)">删除</v-btn>
              </div>
            </div>
            <code class="break-all text-xs opacity-70">{{ item.token }}</code>
          </div>
        </div>
        <div v-else class="text-caption opacity-50 text-center py-4">
          暂无 Token，请选择权限后生成
        </div>
      </v-card-text>
    </v-card>

 </v-card-text>
  </v-card>
</template>
