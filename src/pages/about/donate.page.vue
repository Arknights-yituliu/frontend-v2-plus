<template>
  <div class="donate_page">
    <div>
      <div class="donate_content">
        本项目为无偿开源项目，如果想要支持一图流可以对我们进行捐助，目前服务器的运营支出大部分源自热心玩家捐助， 感谢每一位捐助者的支持。
      </div>
    </div>
<!--    <div class="donate_image_wrap">-->
<!--      <div class="donate_card">-->
<!--        <img class="donate_image" src="/image/website/zfb.png" alt="" />-->
<!--        <div class="donate_image_desc">支付宝</div>-->
<!--      </div>-->
<!--      <div class="donate_card">-->
<!--        <img class="donate_image" src="/image/website/wx.png" alt="1" />-->
<!--        <div class="donate_image_desc">微信</div>-->
<!--      </div>-->
<!--    </div>-->


    <div>
      <div class="donate_bill">
        <a class="href" href="https://docs.qq.com/sheet/DRVJ6UlBDb3NWYmxF?tab=hlop1l">
          <div class="">
            查看收支一览 <el-icon :size="24"><Link class="donate_bill_icon" /></el-icon>
          </div>
        </a>
      </div>
    </div>

    <div>
      <div class="donate_content">
        <ul>
          <li>资助者的资金将全部用于一图流网站的运营开支，所有收支细节都将会公示</li>
          <li>收支情况将在当月底或次月初进行统一记录，</li>
          <li>如果对收支情况产生疑问或者您的资助未被公示，可在开发群938710832联系@山桜</li>
        </ul>
      </div>
    </div>

    <div>
      <div class="donate_content">除了资助也可以通过其他方式支持一图流，例如：关注我们的信息发布号、参与一图流开发</div>
    </div>

    <div class="card-module">
      <dev-card v-for="(data,index) in developmentRelated" :key="index" :data="data">

      </dev-card>
      <dev-card v-for="(data,index) in developmentChat" :key="index" :data="data">

      </dev-card>
      <dev-card v-for="(data,index) in informationRelease" :key="index" :data="data">

      </dev-card>

    </div>


  </div>
</template>

<style scoped>
.donate_page {
  padding: 10px;
}

.donate_content {
  width: 96%;
  margin: auto;
  /* text-align: center; */
  margin-top: 50px;
  margin-bottom: 50px;
  font-size: 20px;
  font-weight: 800;
}

.donate_image_wrap {
  display: flex;
  flex-wrap: wrap;
}
.donate_card {
  width: 300px;
  margin: auto;
  margin-top: 20px;
  box-shadow: 1px 1px 2px 1px rgb(200, 200, 200);
}
.donate_image {
  /* border: 1px red solid; */
  width: 200px;
  height: 200px;
  margin: 50px;
  margin-top: 30px;
  margin-bottom: 30px;
}

.donate_image_desc {
  /* border: 1px red solid; */
  width: 300px;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  height: 40px;
}

.donate_bill {
  width: 200px;
  height: 40px;
  line-height: 40px;
  background: rgb(240, 240, 240);
  margin: auto;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  border-radius: 4px;
  margin-top: 30px;
  margin-bottom: 30px;
  box-shadow: 1px 1px 2px 1px rgb(200, 200, 200);
}

.donate_bill_icon {
  position: relative;
  top: 4px;
}

.card-module {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

</style>
<script setup>
import developmentRelated from "/src/static/json/about/developmentRelated.json";
import informationRelease from "/src/static/json/about/informationRelease.json";
import developmentChat from "/src/static/json/about/developmentChat.json";

import DevCard from "/src/components/DevCard.vue";
</script>