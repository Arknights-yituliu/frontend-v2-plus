<template>
  <div class="survey_index_page">
    <c-popup :visible="loginVisible" v-model:visible="loginVisible" :width="'400px'">
      <div class="login_card" v-show="globalUserData.status < 0">
        <input class="login_input" placeholder="您的用户ID" v-model="inputData.userName" />
        <div style="display: flex">
          <div class="btn_login" @click="register()">注册</div>
          <div class="btn_login" @click="login()">登录</div>
        </div>
        <div>
          <p>新用户输入用户名即可分配ID，此用户 ID 仅于本网站使用， 用于在不同设备间同步您的数据，请妥善保管您的ID</p>
          <p>老用户请输入 <b>用户名#ID</b> 登录</p>
        </div>
      </div>

      <div class="login_card" v-show="globalUserData.status > 0">
        <div class="logout_text">确定登出当前用户？</div>
        <div class="logout_btn_wrap">
          <div class="btn_login" @click="logout()">确定</div>
          <div class="btn_login" @click="loginVisible = !loginVisible">取消</div>
        </div>
      </div>
    </c-popup>

    <div class="survey_index_header">
      <div class="survey_index_login_wrap">
        <div class="survey_index_login_text" @click="loginVisible = !loginVisible" v-show="globalUserData.status > 0">{{ globalUserData.userName }}</div>
        <div class="survey_index_login_text" @click="loginVisible = !loginVisible" v-show="globalUserData.status < 0">点击登录</div>
      </div>
    </div>

    <div class="survey_index_content">
      <div class="index_card_wrap" id="question">
        <div class="index_card_title">常见问题</div>
        <div class="card_content">
          <p class="guild_question">Q:这个网站是做什么用的</p>
          <p><b>A： </b>本网站是一个干员各类数据统计站，可以为一些新人提供一些干员养成参考， 也可分析一些其他的有趣数据(待定)。</p>

          <p class="guild_question">Q:那我该怎么上传数据</p>
          <p>
            <b>A： </b>如果您是新用户，请点击上方登录栏的注册按钮注册属于您的用户ID，之后请复制妥善保存您的ID，之后就可以愉快的上传数据了。<br />
            这个ID将作为您的账号用于后续登录、上传、找回调查数据，<br />
            <b>注：登录不设密码验证，请妥善保管ID！</b>
          </p>

          <p class="guild_question">Q:我可以用什么方式上传数据呢</p>
          <p>
            <b>A： </b>目前已开放的上传方式： <br />
            1.在我们的网页直接填写调查问卷进行上传，有一些快捷选项可以方便批量填写<br />
            2.通过下载模板Excel格式，填写后上传（开发中<br />
          </p>

          <p class="guild_question">Q:目前有什么统计内容</p>
          <p>
            <b>A： </b>目前只完成了干员练度统计(干员精二率,持有率,专精率,模组开启率)相关的表单。
            <a style="text-decoration: line-through">(其他统计内容在开发了，正在压榨开发人员)</a>
          </p>
        </div>
      </div>
      <div class="index_card_wrap" id="develop">
        <div class="index_card_title">要想参与开发</div>
        <div class="card_content">
          <p>如果有以下技术之一，想要为一图流提供一些帮助和建议，可以尝试来参与开发或者在开发群提出改进意见</p>
          <ul>
            <li>前端开发：VUE 3</li>
            <li>后端开发：SpringBoot Mysql</li>
            <li>UI/UX设计</li>
            <li>统计分析</li>
          </ul>
          <p>开发群：938710832</p>
          <div class="label_wrap">
            <div class="label">
              <div class="label_icon_wrap"><img class="label_icon" src="/image/website/GitHub.webp" alt="" /></div>
              <a class="href" href="https://GitHub.com/Arknights-yituliu/frontend-v2-plus"> <div>前端仓库</div></a>
            </div>

            <div class="label">
              <div class="label_icon_wrap"><img class="label_icon" src="/image/website/GitHub.webp" alt="" /></div>
              <a class="href" href="https://GitHub.com/Arknights-yituliu/BackEndV3"><div>后端仓库</div></a>
            </div>
          </div>
        </div>
      </div>

      <div class="index_card_wrap" id="feedback">
        <div class="index_card_title">反馈方式</div>
        <div class="card_content">
          <div class="label_wrap">
            <div class="label">
              <div class="label_icon_wrap"><img class="label_icon" src="/image/website/qq.webp" alt="" /></div>
              <a class="href" href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">
                <div>
                  <div class="label_name">一图流开发群</div>
                  <div class="label_desc">开发人员交流和BUG反馈</div>
                </div>
              </a>
            </div>

            <div class="label">
              <div class="label_icon_wrap"><img class="label_icon" src="/image/website/ico64.webp" alt="" /></div>
              <a class="href" href="https://GitHub.com/Arknights-yituliu/frontend-v2-plus/issues">
                <div>
                  <div class="label_name">一图流组织仓库</div>
                  <div class="label_desc">GitHub issues</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="index_card_wrap" id="expenses">
        <div class="index_card_title">收支一览</div>
        <div class="card_content">
          <p>目前服务器的支出部分主要来源是热心玩家捐助，你们的捐助给了我们很大的开发动力，感谢每一位捐助者的支持</p>
          <div class="label_wrap">
            <div class="label">
              <div><img class="label_icon" src="/image/icon/图标_源石.png" alt="" /></div>
              <a class="href" href="https://shimo.im/sheets/dPkpKP1zQmc1PvqO/7mSBe"> <div>如何支持我们</div></a>
            </div>

            <div class="label">
              <div><img class="label_icon" src="/image/icon/图标_源石.png" alt="" /></div>
              <a class="href" href="https://shimo.im/sheets/dPkpKP1zQmc1PvqO/zm8QY"><div>查看收支情况</div></a>
            </div>
          </div>
        </div>
      </div>
      <div class="index_card_wrap" id="license">
        <div class="index_card_title">许可协议</div>
        <div class="card_content">
          <p>
            本页采用知识共享 署名-非商业性使用 4.0 国际
            许可协议进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和作品链接；且未经许可，不得将本站内容或由其衍生作品用于商业目的。
            本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来开发群一叙。
          </p>
        </div>
      </div>
    </div>
    <!-- <div class="survey_index_aside">
      <div class="survey_index_menu" @click="navId=1"><a :class="selected(1)" href="#question"> 常见问题</a></div>
      <div class="survey_index_menu" @click="navId=2"><a :class="selected(2)" href="#develop">参与开发</a></div>
      <div class="survey_index_menu" @click="navId=3"><a :class="selected(3)" href="#feedback">反馈方式</a></div>
      <div class="survey_index_menu" @click="navId=4"><a :class="selected(4)" href="#expenses">收支一览</a></div>
      <div class="survey_index_menu" @click="navId=5"><a :class="selected(5)" href="#license">许可协议</a></div>
    </div> -->
  </div>
</template>

<script setup>
import "@/assets/css/survey_index.css";
import "@/assets/css/survey_common.css";
import { onMounted, ref } from "vue";
import navBar from "@/pages/survey/navBar.vue";
let guildKey = ["siteDescription", "register", "devProgress"];

import { registerEvent, loginEvent, userDataCacheClearEvent, userDataCacheEvent, globalUserData } from "./userService";

let inputData = ref({ userName: "" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "山桜", status: -100 }); //用户信息(用户名，用户id，用户状态)

let loginVisible = ref(false);

//注册
async function register() {
  let response = await registerEvent(inputData.value);
  // console.log("异步：", response);
  userData.value = response;
  setTimeout(() => {
    loginVisible.value = !loginVisible;
  }, 400);
}

//登录
async function login() {
  let response = await loginEvent(inputData.value);
  userData.value = response;
  setTimeout(() => {
    loginVisible.value = !loginVisible;
  }, 400);
}

//登出
function logout() {
  userData.value = userDataCacheClearEvent();
  setTimeout(() => {
    loginVisible.value = !loginVisible;
  }, 400);
}

let navId = ref(1);

function selected(id) {
  if (id == navId.value) return "href menu_selected";
  return "href";
}

onMounted(() => {
  userData.value = userDataCacheEvent();
});
</script>
