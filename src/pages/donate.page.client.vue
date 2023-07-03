<template>
  <div class="donate_page">
    <div>
      <div class="donate_content">
        本项目为无偿开源项目，但因国内服务提供商带宽和流量费用较高，访问量日益增加，支出已经超出预期，如果想要支持一图流可以对我们进行资助，目前服务器的运营支出大部分源自热心玩家资助，感谢每一位资助者的支持
      </div>
    </div>
    <div class="donate_image_wrap">
      <div class="donate_card">
        <img class="donate_image" src="https://image.yituliu.site/pay/alipay.png" alt="" />
        <div class="donate_image_desc">支付宝</div>
      </div>
      <div class="donate_card">
        <img class="donate_image" src="https://image.yituliu.site/pay/wechat.png" alt="" />
        <div class="donate_image_desc">微信</div>
      </div>
    </div>

    <div>
      <div class="donate_content">除了资助也可以通过其他方式支持一图流，例如：关注我们的信息发布号、参与一图流开发</div>
    </div>
    <div class="donate_content">
      <div class="label_wrap">
        <div class="label_card">
          <a class="href" href="https://space.bilibili.com/688411531">
            <div class="label_content">
              <div class="label_icon_wrap">
                <img class="label_icon" src="/image/website/beta_logo_yw.webp" alt="" />
              </div>
              <div>
                <div class="label_name">罗德岛基建BETA</div>
                <div class="label_desc">B站官方信息发布号</div>
              </div>
            </div>
          </a>
        </div>

        <div class="label_card">
          <a class="href" href="https://github.com/Arknights-yituliu/frontend-v2-plus">
            <div class="label_content">
              <div class="label_icon_wrap">
                <img class="label_icon" src="/image/website/GitHub.webp" alt="" />
              </div>
              <div>
                <div class="label_name">前端仓库</div>
                <div class="label_desc">数据可视化</div>
              </div>
            </div>
          </a>
        </div>

        <div class="label_card">
          <a class="href" href="https://github.com/Arknights-yituliu/BackEndV3">
            <div class="label_content">
              <div class="label_icon_wrap">
                <img class="label_icon" src="/image/website/GitHub.webp" alt="" />
              </div>
              <div>
                <div class="label_name">后端仓库</div>
                <div class="label_desc">数据统计，计算，分析</div>
              </div>
            </div>
          </a>
        </div>
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
      <div class="donate_bill">
        <a class="href" href="https://shimo.im/sheets/dPkpKP1zQmc1PvqO/7mSBe">
          <div class="">
            查看收支一览 <el-icon :size="24"><Link class="donate_bill_icon" /></el-icon>
          </div>
        </a>
      </div>
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
}
.donate_card {
  width: 300px;
  margin: auto;
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
</style>
