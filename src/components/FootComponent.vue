<template>
  <div id="extra">
    <div id="foot_main">
      <div class="foot_unit" style="width: 872px; white-space: normal">
        <el-card class="box-card">
          <!-- <div slot="header" class="clearfix">
					<span style="font-size: large;"><i class="el-icon-info"></i>&nbsp;<b>帮助与反馈</b></span>
				</div> -->
          <el-collapse accordion>
            <el-collapse-item name="1" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center"
                  ><el-icon><Comment /></el-icon><b style="margin-left: 4px">网站反馈</b></span
                >
              </template>
              <a href="https://www.wjx.cn/vm/O68SHiq.aspx">点击此处</a>通过问卷反馈问题/提供建议。
            </el-collapse-item>
            <el-collapse-item name="2" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center"
                  ><el-icon><TrendCharts /></el-icon><b style="margin-left: 4px">动态平衡算法简述</b></span
                >
              </template>
              <b>算法核心思路为“掉率越高，则价值越低”且“物品价值仅受获取成本影响”</b>
              <hr />
              <ul style="padding-left: 2em">
                <li>第1步：取所有<b>常驻关卡</b>的掉率，以材料价格计算关卡效率</li>
                <li>第2步：以关卡效率修正材料价格</li>
                <li>
                  第3步：重复操作(1)(2)，直至材料价格和关卡效率收敛于误差小于万分之一，实现动态平衡，此时得出<b>关卡效率</b>和<b
                    >材料价值</b
                  >
                </li>
                <li>第4步：根据商店售价和物品价值，计算常驻商店和活动商店性价比</li>
              </ul>

              <b>FAQ</b>
              <hr />
              <ul style="padding-left: 2em">
                <li>Q：你怎么知道数列是收敛的？</li>
                <li><b>A：如果不收敛网站就崩了，你也看不到这句话了。</b></li>
                <li>Q：为什么不用线性规划进行计算？</li>
                <li>
                  <b>A：人无法两次踏进同一条河流，线性规划的目标时刻都在变动，随活动UP起伏的价值你喜欢吗？</b>
                </li>
                <li>Q：你这结果有问题啊，XX关的x材料期望明显更低，为什么XX关不是效率最高？</li>
                <li>
                  <b>A：大部分关卡都掉落多种材料，单一材料的期望只能说明短期最优，长期最优是要计算副产物的。</b>
                </li>
              </ul>
            </el-collapse-item>
            <el-collapse-item name="3" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center"
                  ><el-icon><Opportunity /></el-icon><b style="margin-left: 4px">图例与计算细节</b></span
                >
              </template>
              <b>刷图规划</b>
              <hr />
              <span style="font-weight: bold; color: #e85d06">橙色：</span>关卡效率最高（长期最优）且
              主产物期望最低（短期最优）<br />
              <span style="font-weight: bold; color: #a335ee">紫色：</span>关卡效率最高（长期最优）<br />
              <span style="font-weight: bold; color: #00a2a2">绿色：</span>主产物期望最低（短期最优）<br />
              <span style="font-weight: bold; color: #168afa">蓝色：</span>一般路过关卡<br />
              <ul style="padding-left: 2em">
                <li>根据价值一览中的价格和企鹅物流的关卡掉落数据计算。</li>
                <li>只有多于300样本的关卡才会被收录。</li>
                <li>仅收录由自动刷图软件上报的掉落数据。</li>
                <li>活动关卡只在活动期间出现，且都标记为<span style="color: red">红色</span>。</li>
                <li>插曲和别传常驻后，视为新关卡并重新计算效率，该效率与活动时无关。</li>
              </ul>

              <b>商店性价比</b>
              <hr />
              单位：绿票/各货币
              <ul style="padding-left: 2em">
                <li>各商店之间货币不同，故<b>不可跨店对比数值</b>。</li>
                <li>根据<b>价值一览</b>中的价格和商店售价得到的性价比值。</li>
                <li>活动商店采用相同算法。</li>
                <li>信用商店计价单位为100信用点。</li>
                <li>若土的主要来源是1-7以外的关卡，则土系材料价值<a class="popover_color">+6%</a>。</li>
              </ul>

              <b>材料价值</b>
              <hr />
              <ul style="padding-left: 2em">
                <li>绿票理智换算关系：<b>1理智=1.25绿票</b>。</li>
                <li>
                  数据选择范围为<a href="https://penguin-stats.cn/">企鹅物流</a>中的<b>常驻关卡</b>以保证价值的稳定性。
                </li>
                <li>定价时考虑加工站副产物，副产物掉率假设为20%。</li>
                <li>假设重装/医疗芯片和近卫/特种芯片需求比为2:1，狙击/术师和先锋/辅助需求比为1:1</li>
                <li>模组数据块以红票商店售价进行定价。</li>
                <li>龙门币、经验书、无人机等结合其边际成本进行定价。</li>
                <li>技巧概要依据CA-5定价，且考虑加工站副产物。</li>
                <li>采购凭证依据AP-5定价。</li>
                <li>理论上寻访凭证=600合成玉=3.33石=450理智，但不碎石刷图的情况下该等式无意义，仅列出以供参考。</li>
                <li>招募凭证的价值难以精确计算，仅供参考。</li>
                <li>物资箱价值取<a href="https://penguin-stats.cn/">企鹅物流</a>中的以往数据进行估算。</li>
                <li>若源岩系材料的主要来源是1-7以外的关卡，则源岩系材料价值<a class="popover_color">+6%</a>。</li>
              </ul>
            </el-collapse-item>
            <el-collapse-item name="4" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center"
                  ><el-icon><Checked /></el-icon><b style="margin-left: 4px">算法公示卡</b></span
                >
              </template>
              <table id="al_card">
                <tbody>
                  <tr>
                    <td>算法代号</td>
                    <td>一图流_标准 v6.0</td>
                    <td>更新时间</td>
                    <td>
                      {{ updateTime }}
                    </td>
                  </tr>
                  <tr>
                    <td>数据源</td>
                    <td>企鹅物流</td>
                    <td>基准</td>
                    <td>常驻关卡</td>
                  </tr>
                  <tr>
                    <td>计算引擎</td>
                    <td>yituliuBackEnd</td>
                    <td>样本阈值</td>
                    <td>300</td>
                  </tr>
                  <tr>
                    <td>需求目标</td>
                    <td>无限需求</td>
                    <td>EXP系数</td>
                    <td>0.625</td>
                  </tr>
                </tbody>
              </table>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </div>

      <div class="foot_unit" style="width: 436px">
        <p class="foot_unit_title" style="margin-bottom: 11px">-开发-</p>
        <a href="https://github.com/Zirun-wang/yituliuFrontEnd"
          ><div class="foot_unit_button uni_shadow_2" id="foot_frontEnd">
            <img class="foot_unit_pic" src="/img/website/github.png" />
            前端
          </div>
        </a>
        <a href="https://github.com/yamasakura/yituliuBackEnd"
          ><div class="foot_unit_button uni_shadow_2" id="foot_backEnd">
            <img class="foot_unit_pic" src="/img/website/github.png" />
            后端
          </div>
        </a>
        <a href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F"
          ><div class="foot_unit_button uni_shadow_2" style="width: 186px; display: inline-block">
            <img class="foot_unit_pic" src="/img/website/qq.png" />
            开发群938710832
          </div>
        </a>
        <div style="line-height: 28px; padding-left: 6px">
          本项目为无偿开源项目，致力于方便明日方舟玩家<br />
          如有开发/数据分析/设计/美工经验，欢迎来开发群一叙
        </div>
        <a href="https://shimo.im/sheets/dPkpKP1zQmc1PvqO/7mSBe"
          ><div class="foot_unit_button uni_shadow_2" style="width: 202px; display: inline-block">
            <img class="foot_unit_pic" src="/img/website/图标_源石.png" />
            查看财政状况/捐助
          </div>
        </a>
      </div>

      <div class="foot_unit" id="qianduan">
        <p class="foot_unit_title">-前端/UI-</p>
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
        <a href="https://space.bilibili.com/12786648">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="/img/website/wmm.png" />
            無冕Crownless
          </div>
        </a>
        <a href="https://github.com/Yanstory">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/5153875?v=4" />
            Yanstime
          </div>
        </a>
      </div>
      <div class="foot_unit" id="houduan">
        <p class="foot_unit_title">-后端-</p>
        <a href="https://github.com/hguandl">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/10684225?v=4" />
            hguandl
          </div>
        </a>
        <a href="https://space.bilibili.com/39109412">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/84258011?v=4" />
            山桜
          </div>
        </a>
        <a href="https://github.com/youcai922">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/64458943?v=4" />
            youcai922
          </div>
        </a>
      </div>

      <div class="foot_unit">
        <p class="foot_unit_title">-游戏官网-</p>
        <a href="https://ak.hypergryph.com/"
          ><div class="foot_unit_button uni_shadow_2" style="vertical-align: middle; color: gray">
            <img class="foot_unit_pic" src="https://ak.hypergryph.com/favicon.ico" />明日方舟
          </div></a
        >

        <p class="foot_unit_title">-数据源-</p>
        <a href="https://penguin-stats.cn/"
          ><div class="foot_unit_button uni_shadow_2" style="vertical-align: middle; color: gray">
            <img class="foot_unit_pic" src="/img/website/penguin_stats_logo.png" />企鹅物流
          </div></a
        >
      </div>

      <div class="foot_unit" id="suanfa">
        <p class="foot_unit_title">-效率算法-</p>
        <a href="https://www.bilibili.com/video/BV1pZ4y1g7QN">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="/img/website/Erit_Lux.webp" />
            Erit_Lux
          </div>
        </a>
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
        <a href="https://www.bilibili.com/video/BV1yL4y1P7K1">
          <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="/img/website/shaobing.png" />
            一个资深的烧饼
          </div>
        </a>
      </div>
      <div class="foot_unit">
        <p class="foot_unit_title">-B站发布-</p>
        <a href="https://space.bilibili.com/688411531"
          ><div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="/img/website/bilibili.png" />
            罗德岛基建BETA
          </div></a
        >
        <p class="foot_unit_title">-粉丝群-</p>
        <a href="https://jq.qq.com/?_wv=1027&k=q1z3p9Yj"
          ><div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="/img/website/qq.png" />
            阿戈尔数据文献馆
          </div></a
        >
      </div>
      <div class="foot_unit">
        <p class="foot_unit_title">-友情链接-</p>
        <a href="https://viktorlab.cn/akdata"
          ><div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="/img/website/akdps.jpg" />
            DPS计算器
          </div></a
        >

        <a href="https://arkgacha.kwer.top/"
          ><div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://arkgacha.kwer.top/static/icon.ico" />
            寻访记录分析
          </div></a
        >

        <a href="https://maa.plus/"
          ><div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/97677443?s=200" />
            MAA小助手
          </div></a
        >

        <a href="https://apps.apple.com/cn/app/id1632810611"
          ><div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
            <img class="foot_unit_pic" src="/img/website/rhodes_asst.png" />
            罗德岛助理(iOS)
          </div></a
        >
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
    this.getUpdateTime();
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
  margin-top: 8px;
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
  padding: 12px 12px 0px 12px;
}

.foot_unit {
  display: inline;
  top: 4px;
  width: 210px;
  float: left;
  margin: 8px;
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
</style>

<style>
.el-card__body {
  padding: 0px 12px;
}
.el-collapse-item__content {
  padding-bottom: 8px;
}
</style>
