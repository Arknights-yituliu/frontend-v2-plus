<script setup>
import {onMounted, ref} from "vue";
import {copyTextToClipboard} from "/src/utils/CopyText.js";
import SklandAPI from '/src/pages/survey/service/skland.js'
import {getUserInfo} from "/src/pages/survey/service/userInfo.js";
import {cMessage} from "/src/utils/Message.js";
import sklandApi from "../service/skland.js";
import characterTable from "/src/static/json/survey/character_table_simple.json";
import operatorDataAPI from '/src/api/operatorData.js'
import {useRouter} from "vue-router";
import {getUserToken} from "/src/utils/GetUserToken.js";

const HYPERGRYPH_LINK = 'https://ak.hypergryph.com/user/home'
const HYPERGRYPH_TOKEN_API = 'https://web-api.hypergryph.com/account/info/hg'
const BILIBILI_TOKEN_API = 'https://web-api.hypergryph.com/account/info/ak-b'
const SKLAND_LINK = 'https://www.skland.com/'
const CONSOLE_CODE = 'localStorage.getItem(\'SK_OAUTH_CRED_KEY\')+\',\'+localStorage.getItem(\'SK_TOKEN_CACHE_KEY\')'

function openLinkOnNewPage(url) {
  window.open(url)
}

let selectedOption = ref('skland')

const userInfo = ref({})

function optionLineClass(type) {
  if (type === selectedOption.value) {
    return 'option-line-active'
  } else {
    return 'option-line'
  }
}

function copyText(text) {
  copyTextToClipboard(text)
}

let defaultAkUid = ref('')
let inputText = ref('')
let playBindingInfo = ref({})
let playBindingList = ref([])
let sklandCred = ref('')
let sklandToken = ref('')

function getPlayerBindingByHgToken() {

  const obj = canBeParsedAsObject(inputText.value);
  const token = obj.data.content

  operatorDataAPI.getPlayBindingListByHgToken({token: token}).then(response => {
    const {cred, token, playerBindingList} = response.data
    playBindingList.value = playerBindingList
    sklandCred.value = cred
    sklandToken.value = token
  })
}


function canBeParsedAsObject(str) {

  str.replace(/[\u00A0\u200B\u200C\u200D\uFEFF\s]/g, '');

  try {
    return JSON.parse(str); // 如果没有抛出错误，说明字符串可以被解析为JS对象
  } catch (e) {
    console.error(str)
    cMessage("内容没有复制完整或格式不正确", 'error')
    return false; // 捕获到错误，说明字符串不能被解析为JS对象
  }
}

async function getPlayerBindingBySkland() {
  const {cred, token} = getCredAndSecret(inputText.value)
  sklandCred.value = cred
  sklandToken.value = token
  console.log(cred)
  console.log(token)
  const playBinding = await SklandAPI.getPlayBindingV2(defaultAkUid.value, '', cred, token)

  playBindingInfo.value = playBinding
  playBindingList.value = playBinding.bindingList
}


async function getPlayerInfoByPlayerBinding(akPlayerBinding) {
  const {uid, nickName, channelName, channelMasterId} = akPlayerBinding

  userInfo.value = await getUserInfo()

  checkUserStatus(true)


  let data = await sklandApi.getWarehouseInfo(uid, sklandCred.value, sklandToken.value);
  data.channelName = channelName
  data.channelMasterId = channelMasterId
  data.nickName = nickName;
  data.token = getUserToken()

  await uploadSKLandData(data)

}

const router = useRouter();

/**
 * 上传获取到的森空岛干员数据
 * @param data 干员数据
 * @returns {Promise<void>}
 */
function uploadSKLandData(data) {
  operatorDataAPI.uploadSkLandOperatorDataV3(data)
      .then(response => {
        cMessage("森空岛数据导入成功，即将转跳到干员调查页面");
        setTimeout(() => {
          router.push({name: 'OperatorSurvey'})
        }, 3000)
      })
}

/**
 * 获取cred和secret
 * @param text 用户输入的字符串
 * @return {{cred: *, secret: *}}  cred和secret
 */
function getCredAndSecret(text) {

  if (!text.includes(',')) {
    cMessage('输入格式不正确,应是一个中间包含逗号的一串字母', 'error')
  }
  text = text.replace(/\s+/g, '')
      .replace(/["']/g, '')

  const textArr = text.split(',')
  const cred = textArr[0]
  const token = textArr[1]
  return {cred, token}

}

function defaultBindUidBtnClass(uid) {
  if (defaultAkUid.value === uid) {
    return 'btn-blue'
  }
}

function optionBtnColor(type) {
  if (type === selectedOption.value) {
    return 'color:#1f88ff'
  } else {
    return ''
  }
}


/**
 * 检查用户状态
 * @param notice 是否弹出提示
 * @returns {boolean} 状态
 */
function checkUserStatus(notice) {

  if (!userInfo.value.token) {
    if (notice) {
      cMessage('请先注册或登录一图流账号', 'error')
    }
    return true;
  }

  return false;
}

onMounted(() => {

})

</script>

<template>
  <div class="import-page">

<!--    <div class="checkbox">-->
<!--      <c-checkbox-option :value="selectedOption" label="hg"-->
<!--                         @click="selectedOption='hg'">-->
<!--        从官网导入-->
<!--      </c-checkbox-option>-->
<!--      <c-checkbox-option :value="selectedOption" label="skland"-->
<!--                         @click="selectedOption='skland'">-->
<!--        从森空岛导入-->
<!--      </c-checkbox-option>-->
<!--    </div>-->

    <div class="import-step" v-show="'hg'===selectedOption">
      <div class="import-step-item">
        <div class="import-step-item-title">第一步</div>
        <p>登录明日方舟官网</p>
        <button class="btn btn-blue" @click="openLinkOnNewPage(HYPERGRYPH_LINK)">官网链接</button>
      </div>

      <div class="import-step-item">
        <div class="import-step-item-title">第二步</div>
        <img src="/image/skland/hgAPI.jpg" alt="" class="import-step-image">
        <p>点击对应的服务器链接，将会返回如上图所示的一段数据，将其全部复制</p>

        <button class="btn btn-blue login-btn-line" @click="openLinkOnNewPage(HYPERGRYPH_TOKEN_API)">官服
        </button>

        <button class="btn btn-red login-btn-line" @click="openLinkOnNewPage(BILIBILI_TOKEN_API)">B服
        </button>
      </div>

      <div class="import-step-item">
        <div class="import-step-item-title">第三步</div>
        <p>输入复制的内容</p>
        <input class="input" style="display: block;width: 300px;margin: 0 auto 20px" v-model="inputText">
        <button class="btn btn-blue" @click="getPlayerBindingByHgToken()">导入数据</button>
      </div>

      <div class="import-step-item">
        <div class="import-step-item-title">第四步</div>
        <p>等待上一步获取绑定的uid，选择想导入的uid进行导入</p>
        <button class="btn btn-blue" :class="defaultBindUidBtnClass(binding.uid)"
                v-for="(binding,index) in playBindingList" :key="index"
                @click="getPlayerInfoByPlayerBinding(binding)">
          <span> 昵称：{{ binding.nickName }} 区服：{{ binding.channelName }} uid：{{ binding.uid }}</span>
        </button>
      </div>

      <div class="import-step-item">
        <div class="import-step-item-title">第五步</div>
        <p>为了您的账号安全，导入后会强制退出官网登录，可以再次进入官网检查登录状态</p>
        <button class="btn btn-blue" @click="openLinkOnNewPage(HYPERGRYPH_LINK)">官网链接</button>
      </div>
    </div>

    <div class="import-step" v-show="'skland'===selectedOption">
      <div class="import-step-item">
        <div class="import-step-item-title">第一步</div>
        <p>登录森空岛官网</p>
        <button class="btn btn-blue" @click="openLinkOnNewPage(SKLAND_LINK)">官网链接</button>
      </div>

      <div class="import-step-item">
        <div class="import-step-item-title">第二步</div>
        <img src="/image/skland/step1.jpg" alt="" class="import-step-image">
        <p>登录后按键盘F12调出开发者工具，在下方选择控制台(console)，输入以下命令：</p>
        <p style="color:#6ebeff">localStorage.getItem('SK_OAUTH_CRED_KEY')+','+ localStorage
          .getItem('SK_TOKEN_CACHE_KEY')</p>
        <button class="btn btn-orange" style="margin: 0 12px"
                @click="copyText(CONSOLE_CODE)">点击复制
        </button>

      </div>

      <div class="import-step-item">
        <div class="import-step-item-title">第三步</div>
        <img src="/image/skland/step2.jpg" alt="" class="import-step-image">
        <p>此时你可以获得一段神秘的字符，复制这段字符<b>（*不要带引号）</b>，输入到下面的输入框中</p>
        <input class="input" style="display: block;width: 300px;margin: 0 auto 20px" v-model="inputText">
        <button class="btn btn-blue" @click="getPlayerBindingBySkland">获取森空岛信息</button>
      </div>

      <div class="import-step-item">
        <div class="import-step-item-title">第四步</div>
        <p>等待上一步获取绑定的uid，选择想导入的uid进行导入</p>
        <button class="btn btn-blue" :class="defaultBindUidBtnClass(binding.uid)"
                v-for="(binding,index) in playBindingList" :key="index"
                @click="getPlayerInfoByPlayerBinding(binding)">
          <span> 昵称：{{ binding.nickName }} 区服：{{ binding.channelName }} uid：{{ binding.uid }}</span>
        </button>
      </div>


    </div>
  </div>
</template>

<style>

.import-page {
  padding: 1px;
  min-height: 95vh;


  .checkbox {
    width: 300px;
    margin: 8px auto;
  }

  .import-step {
    display: flex;
    flex-wrap: wrap;
  }

  .import-step-item {
    text-align: center;
    padding: 12px 16px;
    box-sizing: border-box;
    width: 400px;
    margin: 8px auto;
    box-shadow: 1px 1px 2px var(--c-box-shadow-color), -1px -1px 2px var(--c-box-shadow-color);
  }

  .import-step-item-title {
    font-size: 20px;
    font-weight: bold;
  }

  .import-step-image {
    width: 95%;
    margin: 0 auto;
  }


  @media screen and (max-width: 600px) {
    .import-step-item {
      width: 350px;
      font-size: 14px;
    }
  }


}


</style>