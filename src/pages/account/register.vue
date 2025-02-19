<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/account/login.v2.scss'
import '/src/assets/css/account/login.v2.phone.scss'
import userAPI from '/src/api/userInfo.js'
import {cMessage} from "/src/utils/message.js";
import {useRouter} from "vue-router";


const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;
const englishNumberRegex = /^[A-Za-z0-9]+$/;

const accountRules = [
  value => !!value || '不能为空',
  value => chineseEnglishNumberRegex.test(value) || '账号仅可由汉字、数字、英文组成'
]

const passwordRules = [
  value => !!value || '不能为空',
  value => englishNumberRegex.test(value) || '密码仅可由数字、英文组成'
]

const confirmPasswordRules = [
  value => !!value || '不能为空',
  value => englishNumberRegex.test(value) || '密码仅可由数字、英文组成',
  value => value===inputContent.value.password || '两次密码输入不一致'
]

function getParam(method) {
  let param = {
    accountType: inputContent.value.accountType
  }
  if ('password' === inputContent.value.accountType) {

    param.userName = inputContent.value.userName
    param.password = inputContent.value.password

    if (inputContent.value.email || '' !== inputContent.value.email) {
      param.email = inputContent.value.email
      param.verificationCode = inputContent.value.verificationCode
    }
  }

  if ('email' === inputContent.value.accountType) {
    param.email = inputContent.value.email
    param.verificationCode = inputContent.value.verificationCode
  }

  return param
}

let inputContent = ref({
  userName: '',
  password: '',
  confirmPassword: '',
  email: '',
  verificationCode: '',
  hgToken: '',
  accountType: '',
})


function checkPassword() {
  if (inputContent.value.confirmPassword.length > 2) {
    if (inputContent.value.password !== inputContent.value.confirmPassword) {
      return '两次密码不一致'
    }
  }
}



const router = useRouter()

function toRegister() {
  const param = getParam()
  userAPI.registerV3(param).then(response => {
    localStorage.setItem("USER_TOKEN", response.data.token.toString());
    cMessage('登录成功，即将转跳到森空岛导入页面')
    setTimeout(() => {
      router.push({name:'IMPORT_BY_SKLAND'})
    }, 3000)
  })
}

function sendVerificationCode() {
  const data = {
    mailUsage: 'register',
    email: inputContent.value.email
  }
  userAPI.sendVerificationCodeV2(data).then(response => {

    cMessage('验证码发送成功')
  })
}


onMounted(() => {
  inputContent.value.accountType = 'password'
})

</script>

<template>
  <div class="login-page">
    <v-card class="login-card m-a">
      <v-tabs
          v-model="inputContent.accountType"
          bg-color="primary"
      >
        <v-tab value="password">账号注册</v-tab>
        <v-tab value="email">邮箱注册</v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-model="inputContent.accountType">
          <v-tabs-window-item value="password">
            <div class="m-0-4">账号（用户名）</div>
            <v-text-field
                :rules="accountRules"
                density="compact"
                v-model="inputContent.userName"
                hint="账号仅可由汉字、数字、英文组成"
                color="primary"
                variant="outlined"
                class="m-4"
            ></v-text-field>
            <div class="m-0-4">登录密码</div>
            <v-text-field
                density="compact"
                :rules="passwordRules"
                color="primary"
                hint="密码仅可由数字、英文组成"
                v-model="inputContent.password"
                variant="outlined"
                type="password"
                hide-details="auto"
                class="m-4"
            ></v-text-field>
            <div class="m-0-4">确认密码</div>
            <v-text-field
                density="compact"
                :rules="confirmPasswordRules"
                color="primary"
                hint="密码仅可由数字、英文组成"
                v-model="inputContent.confirmPassword"
                variant="outlined"
                type="password"
                hide-details="auto"
                class="m-4"
            ></v-text-field>
            <div class="m-0-4">绑定邮箱（非必须，但找回账号只能通过邮箱）</div>
            <v-text-field
                density="compact"
                color="primary"
                hint="唯一的找回密码方式"
                v-model="inputContent.email"
                variant="outlined"
                hide-details="auto"
                class="m-4"
            >
              <template v-slot:append>
                <v-btn text="发送验证码" variant="text" size="small" density="compact"  @click="sendVerificationCode"></v-btn>
              </template>
            </v-text-field>
            <div>邮箱验证码（如未填邮箱请忽视）</div>
            <v-otp-input class="m-4" v-model="inputContent.verificationCode" length="4"></v-otp-input>
          </v-tabs-window-item>

          <v-tabs-window-item value="email">
            <div>邮箱</div>

              <v-text-field
                  v-model="inputContent.email"
                  color="primary"
                  density="compact"
                  variant="outlined"
                  class="m-4"
              >
                <template v-slot:append>
                  <v-btn color="primary"  variant="text" size="small" density="compact" text="发送验证码"
                         @click="sendVerificationCode"></v-btn>
                </template>
              </v-text-field>


            <div>验证码</div>
            <v-otp-input class="m-4" v-model="inputContent.verificationCode" length="4"></v-otp-input>
          </v-tabs-window-item>
        </v-tabs-window>

        <div class="flex justify-center">
          <v-btn @click="toRegister" text="注册" color="primary"></v-btn>
        </div>

        <v-card title="账号须知" color="primary" variant="tonal" class="m-12-4">
          <v-card-text>
            <p>
              使用密码登录时，如果账号绑定了邮箱，也可将邮箱作为账号进行登录。
            </p>
            <p>
              *此账号为一图流账号，与鹰角网络通行证(明日方舟游戏账号)无关，仅为保存您的干员练度数据使用
            </p>
            <p>
              *为了您的账号安全，注册时的密码不要与您其他重要账号的密码相同
            </p>
            <p>
              *请妥善保管好您的官网token和森空岛token
            </p>
          </v-card-text>
        </v-card>


      </v-card-text>
    </v-card>



  </div>
</template>

