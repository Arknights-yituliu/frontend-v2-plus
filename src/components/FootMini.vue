<template>
  <div id="extra" style="max-width: 1080px; margin: auto">
    <div style="padding: 8px 16px 0px 16px; max-width: 1080px; margin: auto">
      关卡效率和材料价值由明日方舟一图流计算，掉率数据由企鹅物流统计，采用<a
        href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh"
        >知识共享 署名-非商业性使用 4.0 国际 许可协议</a
      >进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和作品链接；且未经许可，不得将本站内容或由其衍生作品用于商业目的。<br />
      本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来开发群一叙。
    </div>
    <div id="foot_main">
      <div class="foot_unit">
        <p class="foot_unit_title" style="margin-bottom: 11px">-开发信息-</p>
        <a href="https://github.com/Zirun-wang/yituliuFrontEnd">
          <div class="foot_unit_button uni_shadow_2" id="foot_frontEnd">
            <img class="foot_unit_pic" src="/img/website/github.png" />
            前端
          </div>
        </a>
        <a href="https://github.com/yamasakura/yituliuBackEnd">
          <div class="foot_unit_button uni_shadow_2" id="foot_backEnd">
            <img class="foot_unit_pic" src="/img/website/github.png" />
            后端
          </div>
        </a>
        <a href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">
          <div class="foot_unit_button uni_shadow_2" style="width: 202px">
            <img class="foot_unit_pic" src="/img/website/qq.png" />
            开发群938710832
          </div>
        </a>
        <a href="https://shimo.im/sheets/dPkpKP1zQmc1PvqO/7mSBe">
          <div class="foot_unit_button uni_shadow_2" style="width: 202px">
            <img class="foot_unit_pic" src="/img/website/图标_源石.png" />
            本站财政状况
          </div>
        </a>
      </div>

      <div class="foot_unit">
        <p class="foot_unit_title">-本页开发-</p>
        <a href="https://space.bilibili.com/39109412">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/84258011?v=4" />
            山桜
          </div>
        </a>
        <a href="https://space.bilibili.com/10057492">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/84625349?v=4" />
            Zirunwang
          </div>
        </a>
        <a href="https://github.com/Yanstory">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/5153875?v=4" />
            Yanstory
          </div>
        </a>
        <a href="https://github.com/DSLM">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/12635058?v=4" />
            DSLM
          </div>
        </a>
        <a href="https://github.com/ZhaoZuohong">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/34163622?v=4" />
            ZhaoZuohong
          </div>
        </a>
      </div>

      <div class="foot_unit">
        <p class="foot_unit_title">-数据源-</p>
        <a href="https://yituliu.site/">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle; color: gray">
            <img class="foot_unit_pic" src="/img/website/ico64.png" />一图流主站
          </div>
        </a>
      </div>

      <div class="foot_unit">
        <p class="foot_unit_title">-B站发布-</p>
        <a href="https://space.bilibili.com/688411531">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="/img/website/bilibili.png" />
            罗德岛基建BETA
          </div>
        </a>
        <p class="foot_unit_title">-粉丝群-</p>
        <a href="https://jq.qq.com/?_wv=1027&k=q1z3p9Yj">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="/img/website/qq.png" />
            阿戈尔数据文献馆
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import cookie from "js-cookie";

export default {
  layout: "poster",
  data() {
    return {
      updateTime: "2000-01-01 00:00:00",
    };
  },
  created() {},
  mounted() {
    //    this.getUpdateTime();
  },
  methods: {
    sleep(d) {
      return new Promise((resolve) => setTimeout(resolve, d));
    },
    async getUpdateTime() {
      for (let i = 0; i < 20; i++) {
        await this.sleep(500);
        this.updateTime = cookie.get("updateTime");
      }
    },
  },
};
</script>

<style scoped>
#extra {
  background-color: #dededede;
  margin-top: -2px;
  /* padding: 12px 0px; */
  color: gray;
}

.extra_popver_p {
  margin: 4px 8px;
}

#al_card {
  margin: 0px;
  background: aliceblue;
  border-radius: 4px;
  font-size: 16px;
  border: 1px solid #80808080;
}

#al_card td:nth-child(2n) {
  width: 165px;
}

#al_card td:nth-child(2n + 1) {
  font-weight: 600;
  padding: 0px 8px;
  width: 75px;
}

#foot_main {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 0px 12px 0px 12px;
  max-width: 1200px;
  margin: auto;
}

.foot_unit {
  display: inline;
  top: 4px;
  width: 210px;
  float: left;
  margin: 4px 8px;
  white-space: nowrap;
  /* background-color: #bbbbbbdd; */
  border-radius: 8px;
}

#foot_main_dev {
  width: 100%;
  background-color: rgba(187, 187, 187, 0.86667);
  padding: 0px 16px 16px 16px;
  /* padding-bottom: 16px; */
}

#foot_main_dev > div {
  display: inline-block;
}

.foot_unit_title {
  font-size: 15px;
  font-weight: 600;
  color: #444444;
  margin: 14px 0px;
}

.foot_unit_content {
  color: gray;
  font-size: 16px;
  padding-left: 5px;
}

.foot_unit_pic {
  height: 30px;
  width: 30px;
  margin: 2px 3px 3px 3px;
  display: inline-block;
  vertical-align: middle;
  border-radius: 6px;
}

#foot_frontEnd {
  display: inline-block;
  margin-right: -2px;
  width: 100px;
  border-bottom-right-radius: 0px;
  border-top-right-radius: 0px;
  box-shadow: 0px 2px 2px 0px rgb(0 0 0 / 20%);
  border-right-width: 0px;
}

#foot_backEnd {
  display: inline-block;
  margin-left: -2px;
  width: 100px;
  border-bottom-left-radius: 0px;
  border-top-left-radius: 0px;
  border-left: 1px solid #808080;
}

.footlist {
  display: inline;
  top: 5px;
  height: 80px;
  width: 180px;
  margin: auto;
  float: left;
  margin-top: 10px;
  margin-left: 10px;
  margin-bottom: 10px;
}

#foot_warning {
  border-top: 1px solid #dddddd;
  overflow-x: hidden;
  padding-left: 12px;
}

#foot_warning_text {
  font-size: 12px;
  /* display: inline; */
  /* top: 5px; */
  /* float: left; */
  padding: 10px;
  text-align: center;
}

.foot_unit_button {
  border: 1px solid #808080;
  background-color: rgba(255, 253, 253, 0.6);
  height: 38px;
  width: 178px;
  border-radius: 8px;
  margin: 4px;
  color: gray;
  line-height: 36px;
}

.foot_unit a {
  text-decoration: none;
}

.box-card {
  margin-top: 1em;
  font-size: unset;
}

.el-card__body {
  padding: 0px 12px !important;
}

.el-collapse-item__content {
  padding-bottom: 8px !important;
}
</style>
