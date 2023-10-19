<template>
  <div id="riic">
    <div id="riic_controlPanel">
      <el-card class="box-card riic_card">
        <template #header>
          <div class="card-header">
            <span>基本参数</span>
          </div>
        </template>
        <div class="riic_building_parameter">
          *说明：如基建生成器未第一时间更新新干员，可手动修改json文件供maa使用
        </div>
        <div class="riic_building_parameter">
            <div class="parameter_text">基建模式</div>
            <el-radio-group v-model="buildingType">
              <el-radio-button label="243"></el-radio-button>
              <el-radio-button label="153"></el-radio-button>
              <el-radio-button label="333"></el-radio-button>
              <el-radio-button label="252"></el-radio-button>
            </el-radio-group>
        </div>
        <div class="riic_building_parameter">
          <div class="parameter_text">换班次数</div>
          <el-radio-group v-model="planTimes">
            <el-radio-button label="2班"></el-radio-button>
            <el-radio-button label="3班"></el-radio-button>
            <!-- <el-radio-button label="4班" ></el-radio-button> -->
          </el-radio-group>
        </div>
<!--        <div class="riic_building_parameter">-->
<!--          <div class="parameter_text">换班模式</div>-->
<!--          <el-radio-group v-model="planTimes">-->
<!--            <el-radio-button label="自动按时换班"></el-radio-button>-->
<!--            <el-radio-button label="手动换班"></el-radio-button>-->
<!--          </el-radio-group>-->
<!--        </div>-->
        <!-- 自动换班则显示时间表 -->
        <div class="riic_building_parameter">
          <div class="parameter_text" style="width: 108px">名称/起止时间</div>
          <el-input class="parameter_inputbox" placeholder="主力组A" style="width: 90px" v-model="name[0]"></el-input>
          <el-input class="parameter_inputbox" placeholder="20:00" style="width: 80px" v-model="period_plan0[0]"></el-input>
          <el-input class="parameter_inputbox" placeholder="23:59" style="width: 80px" v-model="period_plan0[1]"></el-input>
        </div>
        <div class="riic_building_parameter">
          <div class="parameter_text" style="width: 108px">名称/起止时间</div>
          <el-input class="parameter_inputbox" placeholder="主力组B" style="width: 90px" v-model="name[1]"></el-input>
          <el-input class="parameter_inputbox" placeholder="03:00" style="width: 80px" v-model="period_plan1[0]"></el-input>
          <el-input class="parameter_inputbox" placeholder="10:00" style="width: 80px" v-model="period_plan1[1]"></el-input>
        </div>
        <div class="riic_building_parameter" v-show="'3班' === planTimes">
          <div class="parameter_text" style="width: 108px">名称/起止时间</div>
          <el-input class="parameter_inputbox" placeholder="主力组C" style="width: 90px" v-model="name[2]"></el-input>
          <el-input class="parameter_inputbox" placeholder="10:00" style="width: 80px" v-model="period_plan2[0]"></el-input>
          <el-input class="parameter_inputbox" placeholder="20:00" style="width: 80px" v-model="period_plan2[1]"></el-input>
        </div>
        <div class="riic_building_parameter">
          *跨天需写成 22:00 —— 06:00 (MAA执行周期为24小时)
        </div>
        <!-- 手动换班则显示提示 -->
        <div class="riic_building_parameter">
          *手动选择换班无需填写时间表
        </div>
      </el-card>
      <el-card class="box-card riic_card">
        <template #header>
          <div class="card-header">
            <span>排班表信息</span>
          </div>
        </template>
        <div class="riic_building_parameter">
          <div class="parameter_text" style="width: 108px">作业名称</div>
          <el-input class="parameter_inputbox" placeholder="243极限排班" style="width: 180px" v-model="title"></el-input>
        </div>
        <div class="riic_building_parameter">
          <div class="parameter_text" style="width: 108px">描述(可选)</div>
          <el-input class="parameter_inputbox" placeholder="适合全干员，压榨每一个工具人！" style="width: 180px" v-model="descriptionH1"></el-input>
        </div>
        <div class="riic_building_parameter">
          <div class="parameter_text" style="width: 108px">作者(可选)</div>
          <el-input class="parameter_inputbox" placeholder="yituliu" style="width: 180px" v-model="author"></el-input>
        </div>
        <div class="riic_building_parameter" style="margin: 12px 0px">
          <el-button size="large" type="primary" round style="width: 126px" @click="maaBuildingJsonCreated()"> 生成排班方案 </el-button>
          <a>
            <el-button size="large" disabled id="disableBtn" round style="width: 126px; margin-left: 12px;"> 导出到本地 </el-button>
          </a>
          <a :href="exportUrl">
            <el-button size="large" type="primary" id="exportBtn" round style="width: 126px; margin-left: 12px; display: none"> 导出到本地 </el-button>
          </a>
        </div>

        <div class="riic_building_parameter">
          <el-button size="large" type="primary" round style="width: 126px" @click="retrieveSchedule()"> 通过id导入 </el-button>
          <el-input class="parameter_inputbox" placeholder="id" style="margin-left: 12px; width: 150px" v-model="importId"></el-input>
        </div>
        <div class="riic_building_parameter">
          本次导出的id为：{{scheduleId}} <br />
          *导出的文件名即为id，排班文件末尾也有id

        </div>
        <div class="riic_building_parameter" style="display: flex">
          <a href="https://docs.qq.com/form/page/DVVNyd2J5RmV2UndQ" style="display: block;margin-bottom: 4px;margin-right: 4px">
            <el-button size="large" type="warning" round style="width: 186px;display:inline;"> 排班表生成问题反馈 </el-button>
          </a>
          <a href="https://ota.maa.plus/MaaAssistantArknights/api/qqgroup/index.html">
            <el-button size="large" type="warning" round style="width: 186px;display:inline;"> 排班表执行问题反馈 </el-button>
          </a>
        </div>
      </el-card>
    </div>
    <el-divider></el-divider>
    <div id="riic_workerSets">
      <div class="riic_workerSet">
        <div class="riic_building building_uni">
          <div class="riic_building_title">班次基本信息</div>
          <div class="riic_building_parameter">
            <div class="parameter_text">班次名称</div>
            <el-input class="parameter_inputbox" placeholder="例如：主力组A" v-model="name[0]"></el-input>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">描述</div>
            <el-input class="parameter_inputbox" placeholder="可选" v-model="descriptionH2[0]"></el-input>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">无人机</div>
            <el-switch active-color="#13ce66" inactive-color="#c0c4cc" v-model="switch_drones_enable[0]"></el-switch>
            <el-radio-group v-model="radio_drones[0]" style="margin:0px 8px;">
              <el-radio-button label="贸易站"></el-radio-button>
              <el-radio-button label="制造站"></el-radio-button>
            </el-radio-group>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text" style="font-size: 15px">目标房间编号</div>
            <el-radio-group v-model="radio_drones_index[0]">
              <el-radio-button label="1"></el-radio-button>
              <el-radio-button label="2"></el-radio-button>
              <el-radio-button label="3"></el-radio-button>
              <el-radio-button label="4"></el-radio-button>
              <el-radio-button label="5"></el-radio-button>
            </el-radio-group>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text" style="font-size: 15px">使用顺序</div>
            <el-radio-group v-model="input_drones_order[0]">
              <el-radio-button label="换班前"></el-radio-button>
              <el-radio-button label="换班后"></el-radio-button>
            </el-radio-group>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">菲亚梅塔</div>
            <el-switch active-color="#13ce66" inactive-color="#c0c4cc" v-model="switch_Fiammetta_enable[0]"></el-switch>
            <el-input style="width: 128px;margin:0px 8px;" class="parameter_inputbox" placeholder="例如：巫恋" v-model="Fiammetta[0]"></el-input>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text" style="font-size: 15px">使用顺序</div>
            <el-radio-group v-model="input_Fiammetta_order[0]">
              <el-radio-button label="换班前"></el-radio-button>
              <el-radio-button label="换班后"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_cortrolCenter">
          <div class="riic_building_title">
            控制中枢
            <el-checkbox style="margin: 2px 2px; background-color: #ffffff80; vertical-align: top" label="跳过" v-model="control_skip[0]"></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="control_plan0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan0[3]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan0[4]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>
        <div class="riic_building building_trade">
          <div class="riic_building_title">
            贸易站1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_trading_plan0_0[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_trading_plan0_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_trading_plan0_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="trading_plan0_0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan0_0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan0_0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_trading_plan0[0]">
              <el-radio-button label="龙门币"></el-radio-button>
              <el-radio-button label="合成玉"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_trade" v-show="'243' === buildingType || '333' === buildingType || '252' === buildingType">
          <div class="riic_building_title">
            贸易站2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_trading_plan0_1[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_trading_plan0_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_trading_plan0_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="trading_plan0_1[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan0_1[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan0_1[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_trading_plan0[1]">
              <el-radio-button label="龙门币"></el-radio-button>
              <el-radio-button label="合成玉"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_trade" v-show="'333' === buildingType">
          <div class="riic_building_title">
            贸易站3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_trading_plan0_2[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_trading_plan0_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_trading_plan0_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="trading_plan0_2[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan0_2[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan0_2[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_trading_plan0[2]">
              <el-radio-button label="龙门币"></el-radio-button>
              <el-radio-button label="合成玉"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_factory">
          <div class="riic_building_title">
            制造站1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan0_0[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan0_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan0_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan0_0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan0[0]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_factory">
          <div class="riic_building_title">
            制造站2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan0_1[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan0_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan0_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan0_1[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_1[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_1[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan0[1]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_factory">
          <div class="riic_building_title">
            制造站3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan0_2[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan0_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan0_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan0_2[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_2[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_2[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan0[2]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_factory" v-show="'243' === buildingType || '153' === buildingType || '252' === buildingType">
          <div class="riic_building_title">
            制造站4
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan0_3[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan0_3[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan0_3[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan0_3[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_3[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_3[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan0[3]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_factory" v-show="'153' === buildingType || '252' === buildingType">
          <div class="riic_building_title">
            制造站5
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan0_4[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan0_4[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan0_4[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan0_4[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_4[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan0_4[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan0[4]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_powerPlant">
          <div class="riic_building_title">
            发电站1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_power_plan0_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_power_plan0_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="power_plan0_0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_POWER" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>
        <div class="riic_building building_powerPlant">
          <div class="riic_building_title">
            发电站2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_power_plan0_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_power_plan0_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="power_plan0_0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_POWER" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>

        <div class="riic_building building_powerPlant" v-show="!('252' === buildingType)">
          <div class="riic_building_title">
            发电站3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_power_plan0_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_power_plan0_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="power_plan0_0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_POWER" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>
        <div class="riic_building building_meetingRoom">
          <div class="riic_building_title">
            会客室
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_meeting_plan0_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_meeting_plan0_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="meeting_plan0_0[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="meeting_plan0_0[1]"></el-input>
          </div>
        </div>
        <div class="riic_building building_hr">
          <div class="riic_building_title">
            办公室
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_hire_plan0_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_hire_plan0_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="hire_plan0_0[0]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan0_0[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan0_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan0_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_0[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_0[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_0[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_0[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_0[4]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan0_1[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan0_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan0_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_1[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_1[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_1[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_1[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_1[4]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan0_2[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan0_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan0_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_2[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_2[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_2[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_2[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_2[4]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍4
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan0_3[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan0_3[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan0_3[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_3[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_3[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_3[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_3[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan0_3[4]"></el-input>
          </div>
        </div>
      </div>
      <div class="riic_workerSet">
        <div class="riic_building building_uni">
          <div class="riic_building_title">班次基本信息</div>
          <div class="riic_building_parameter">
            <div class="parameter_text">班次名称</div>
            <el-input class="parameter_inputbox" placeholder="例如：主力组A" v-model="name[1]"></el-input>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">描述</div>
            <el-input class="parameter_inputbox" placeholder="可选" v-model="descriptionH2[1]"></el-input>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">无人机</div>
            <el-switch active-color="#13ce66" inactive-color="#c0c4cc" v-model="switch_drones_enable[1]"></el-switch>
            <el-radio-group v-model="radio_drones[1]" style="margin:0px 8px;">
              <el-radio-button label="贸易站"></el-radio-button>
              <el-radio-button label="制造站"></el-radio-button>
            </el-radio-group>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text" style="font-size: 15px">目标房间编号</div>
            <el-radio-group v-model="radio_drones_index[1]">
              <el-radio-button label="1"></el-radio-button>
              <el-radio-button label="2"></el-radio-button>
              <el-radio-button label="3"></el-radio-button>
              <el-radio-button label="4"></el-radio-button>
              <el-radio-button label="5"></el-radio-button>
            </el-radio-group>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text" style="font-size: 15px">使用顺序</div>
            <el-radio-group v-model="input_drones_order[1]">
              <el-radio-button label="换班前"></el-radio-button>
              <el-radio-button label="换班后"></el-radio-button>
            </el-radio-group>
            <!-- <el-switch active-text="换班后"  inactive-text="换班前" active-color="#13ce66" inactive-color="#1373ce" v-model="input_drones_order[1]"></el-switch> -->
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">菲亚梅塔</div>
            <el-switch active-color="#13ce66" inactive-color="#c0c4cc" v-model="switch_Fiammetta_enable[1]"></el-switch>
            <el-input style="width: 128px" class="parameter_inputbox" placeholder="例如：巫恋" v-model="Fiammetta[1]"></el-input>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text" style="font-size: 15px">使用顺序</div>
            <el-radio-group v-model="input_Fiammetta_order[1]">
              <el-radio-button label="换班前"></el-radio-button>
              <el-radio-button label="换班后"></el-radio-button>
            </el-radio-group>
            <!-- <el-switch active-text="换班后"  inactive-text="换班前" active-color="#13ce66" inactive-color="#1373ce" v-model="input_Fiammetta_order[1]"></el-switch> -->
          </div>
        </div>
        <div class="riic_building building_cortrolCenter">
          <div class="riic_building_title">
            控制中枢
            <el-checkbox style="margin: 2px 2px; background-color: #ffffff80; vertical-align: top" label="跳过" v-model="control_skip[1]"></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="control_plan1[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan1[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan1[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan1[3]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan1[4]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>

        <div class="riic_building building_trade">
          <div class="riic_building_title">
            贸易站1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_trading_plan1_0[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_trading_plan1_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_trading_plan1_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="trading_plan1_0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan1_0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan1_0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_trading_plan1[0]">
              <el-radio-button label="龙门币"></el-radio-button>
              <el-radio-button label="合成玉"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_trade" v-show="'243' === buildingType || '333' === buildingType || '252' === buildingType">
          <div class="riic_building_title">
            贸易站2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_trading_plan1_1[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_trading_plan1_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_trading_plan1_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="trading_plan1_1[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan1_1[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan1_1[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_trading_plan1[1]">
              <el-radio-button label="龙门币"></el-radio-button>
              <el-radio-button label="合成玉"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_trade" v-show="'333' === buildingType">
          <div class="riic_building_title">
            贸易站3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_trading_plan1_2[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_trading_plan1_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_trading_plan1_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="trading_plan1_2[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan1_2[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan1_2[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_trading_plan1[2]">
              <el-radio-button label="龙门币"></el-radio-button>
              <el-radio-button label="合成玉"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_factory">
          <div class="riic_building_title">
            制造站1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan1_0[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan1_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan1_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan1_0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan1[0]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_factory">
          <div class="riic_building_title">
            制造站2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan1_1[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan1_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan1_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan1_1[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_1[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_1[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan1[1]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_factory">
          <div class="riic_building_title">
            制造站3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan1_2[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan1_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan1_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan1_2[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_2[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_2[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan1[2]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_factory" v-show="'243' === buildingType || '153' === buildingType || '252' === buildingType">
          <div class="riic_building_title">
            制造站4
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan1_3[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan1_3[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan1_3[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan1_3[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_3[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_3[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan1[3]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_factory" v-show="'153' === buildingType || '252' === buildingType">
          <div class="riic_building_title">
            制造站5
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan1_4[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan1_4[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan1_4[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan1_4[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_4[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan1_4[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan1[4]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_powerPlant">
          <div class="riic_building_title">
            发电站1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_power_plan1_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_power_plan1_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="power_plan1_0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_POWER" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>
        <div class="riic_building building_powerPlant">
          <div class="riic_building_title">
            发电站2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_power_plan1_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_power_plan1_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="power_plan1_0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_POWER" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>

        <div class="riic_building building_powerPlant" v-show="!('252' === buildingType)">
          <div class="riic_building_title">
            发电站3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_power_plan1_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_power_plan1_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="power_plan1_0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_POWER" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>
        <div class="riic_building building_meetingRoom">
          <div class="riic_building_title">
            会客室
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_meeting_plan1_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_meeting_plan1_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="meeting_plan1_0[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="meeting_plan1_0[1]"></el-input>
          </div>
        </div>
        <div class="riic_building building_hr">
          <div class="riic_building_title">
            办公室
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_hire_plan1_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_hire_plan1_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="hire_plan1_0[0]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan1_0[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan1_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan1_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_0[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_0[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_0[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_0[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_0[4]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan1_1[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan1_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan1_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_1[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_1[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_1[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_1[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_1[4]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan1_2[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan1_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan1_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_2[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_2[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_2[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_2[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_2[4]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍4
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan1_3[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan1_3[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan1_3[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_3[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_3[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_3[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_3[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan1_3[4]"></el-input>
          </div>
        </div>
      </div>
      <div class="riic_workerSet" v-show="'3班' === planTimes">
        <div class="riic_building building_uni">
          <div class="riic_building_title">班次基本信息</div>
          <div class="riic_building_parameter">
            <div class="parameter_text">班次名称</div>
            <el-input class="parameter_inputbox" placeholder="例如：主力组A" v-model="name[2]"></el-input>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">描述</div>
            <el-input class="parameter_inputbox" placeholder="可选" v-model="descriptionH2[2]"></el-input>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">无人机</div>
            <el-switch active-color="#13ce66" inactive-color="#c0c4cc" v-model="switch_drones_enable[2]"></el-switch>
            <el-radio-group v-model="radio_drones[2]">
              <el-radio-button label="贸易站"></el-radio-button>
              <el-radio-button label="制造站"></el-radio-button>
            </el-radio-group>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text" style="font-size: 15px">目标房间编号</div>
            <el-radio-group v-model="radio_drones_index[2]">
              <el-radio-button label="1"></el-radio-button>
              <el-radio-button label="2"></el-radio-button>
              <el-radio-button label="3"></el-radio-button>
              <el-radio-button label="4"></el-radio-button>
              <el-radio-button label="5"></el-radio-button>
            </el-radio-group>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text" style="font-size: 15px">使用顺序</div>
            <el-radio-group v-model="input_drones_order[2]">
              <el-radio-button label="换班前"></el-radio-button>
              <el-radio-button label="换班后"></el-radio-button>
            </el-radio-group>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">菲亚梅塔</div>
            <el-switch active-color="#13ce66" inactive-color="#c0c4cc" v-model="switch_Fiammetta_enable[2]"></el-switch>
            <el-input style="width: 128px" class="parameter_inputbox" placeholder="例如：巫恋" v-model="Fiammetta[2]"></el-input>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text" style="font-size: 15px">使用顺序</div>
            <el-radio-group v-model="input_Fiammetta_order[2]">
              <el-radio-button label="换班前"></el-radio-button>
              <el-radio-button label="换班后"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_cortrolCenter">
          <div class="riic_building_title">
            控制中枢
            <el-checkbox style="margin: 2px 2px; background-color: #ffffff80; vertical-align: top" label="跳过" v-model="control_skip[2]"></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="control_plan2[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan2[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan2[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan2[3]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="control_plan2[4]" filterable placeholder="请选择">
              <el-option v-for="item in char_CONTROL" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>

        <div class="riic_building building_trade">
          <div class="riic_building_title">
            贸易站1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_trading_plan2_0[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_trading_plan2_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_trading_plan2_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="trading_plan2_0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan2_0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan2_0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_trading_plan2[0]">
              <el-radio-button label="龙门币"></el-radio-button>
              <el-radio-button label="合成玉"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_trade" v-show="'243' === buildingType || '333' === buildingType || '252' === buildingType">
          <div class="riic_building_title">
            贸易站2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_trading_plan2_1[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_trading_plan2_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_trading_plan2_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="trading_plan2_1[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan2_1[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan2_1[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_trading_plan2[1]">
              <el-radio-button label="龙门币"></el-radio-button>
              <el-radio-button label="合成玉"></el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="riic_building building_trade" v-show="'333' === buildingType">
          <div class="riic_building_title">
            贸易站3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_trading_plan2_2[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_trading_plan2_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_trading_plan2_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="trading_plan2_2[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan2_2[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="trading_plan2_2[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_TRADING" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_trading_plan2[2]">
              <el-radio-button label="龙门币"></el-radio-button>
              <el-radio-button label="合成玉"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_factory">
          <div class="riic_building_title">
            制造站1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan2_0[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan2_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan2_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan2_0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan2[0]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_factory">
          <div class="riic_building_title">
            制造站2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan2_1[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan2_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan2_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan2_1[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_1[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_1[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan2[1]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_factory">
          <div class="riic_building_title">
            制造站3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan2_2[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan2_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan2_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan2_2[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_2[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_2[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan2[2]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_factory" v-show="'243' === buildingType || '153' === buildingType || '252' === buildingType">
          <div class="riic_building_title">
            制造站4
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan2_3[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan2_3[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan2_3[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan2_3[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_3[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_3[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan2[3]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_factory" v-show="'153' === buildingType || '252' === buildingType">
          <div class="riic_building_title">
            制造站5
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_manufacture_plan2_4[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_manufacture_plan2_4[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_manufacture_plan2_4[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="manufacture_plan2_4[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_4[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
            <el-select v-model="manufacture_plan2_4[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_MANUFACTURE" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
          <div class="riic_building_parameter">
            <div class="parameter_text">产物</div>
            <el-radio-group v-model="radio_manufacture_plan2[4]">
              <el-radio-button label="作战记录"></el-radio-button>
              <el-radio-button label="赤金"></el-radio-button>
              <el-radio-button label="源石碎片"></el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="riic_building building_powerPlant">
          <div class="riic_building_title">
            发电站1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_power_plan2_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_power_plan2_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="power_plan2_0[0]" filterable placeholder="请选择">
              <el-option v-for="item in char_POWER" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>
        <div class="riic_building building_powerPlant">
          <div class="riic_building_title">
            发电站2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_power_plan2_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_power_plan2_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="power_plan2_0[1]" filterable placeholder="请选择">
              <el-option v-for="item in char_POWER" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>

        <div class="riic_building building_powerPlant" v-show="!('252' === buildingType)">
          <div class="riic_building_title">
            发电站3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_power_plan2_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_power_plan2_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-select v-model="power_plan2_0[2]" filterable placeholder="请选择">
              <el-option v-for="item in char_POWER" :key="item" :label="item" :value="item"></el-option>
            </el-select>
          </div>
        </div>
        <div class="riic_building building_meetingRoom">
          <div class="riic_building_title">
            会客室
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_meeting_plan2_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_meeting_plan2_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="meeting_plan2_0[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="meeting_plan2_0[1]"></el-input>
          </div>
        </div>
        <div class="riic_building building_hr">
          <div class="riic_building_title">
            办公室
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_hire_plan2_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_hire_plan2_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="hire_plan2_0[0]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍1
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan2_0[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan2_0[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan2_0[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_0[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_0[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_0[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_0[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_0[4]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍2
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan2_1[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan2_1[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan2_1[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_1[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_1[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_1[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_1[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_1[4]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍3
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan2_2[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan2_2[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan2_2[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_2[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_2[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_2[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_2[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_2[4]"></el-input>
          </div>
        </div>
        <div class="riic_building building_dormitory">
          <div class="riic_building_title">
            宿舍4
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="顺序入驻"
              v-model="switch_dormitory_plan2_3[0]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="补满空位"
              v-model="switch_dormitory_plan2_3[1]"
            ></el-checkbox>
            <el-checkbox
              style="margin: 2px; background-color: #ffffff80; vertical-align: top"
              label="跳过"
              v-model="switch_dormitory_plan2_3[2]"
            ></el-checkbox>
          </div>
          <div class="riic_building_operatorArray">
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_3[0]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_3[1]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_3[2]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_3[3]"></el-input>
            <el-input class="operator_inputbox" placeholder="1" v-model="dormitory_plan2_3[4]"></el-input>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import buildingApi from "@/api/building";
import toolApi from "@/api/tool";
import TRADINGJson from "@/static/json/build/TRADING.json";
import MANUFACTUREJson from "@/static/json/build/MANUFACTURE.json";
import CONTROLJson from "@/static/json/build/CONTROL.json";
import POWERJson from "@/static/json/build/POWER.json";
import "@/assets/css/riicCal.css";
import { ElMessage } from "element-plus";

export default {
  data() {
    return {
      exportUrl: "https://backend.yituliu.site/maa/schedule/export?schedule_id=1664632307607024",
      maaUrl: "maa://infra.yituliu/1664632307607024",
      scheduleId: 12345,
      importId: "",
      historicalData: [],
      dialogTableVisible: false,
      createTime: [],
      buildingType: "243",
      planTimes: "3班",
      char_TRADING: TRADINGJson,
      char_MANUFACTURE: MANUFACTUREJson,
      char_CONTROL: CONTROLJson,
      char_POWER: POWERJson,
      scheduleJson: { plans: [] },
      title: "243极限",
      descriptionH1: "这是个顶配243排班协议演示",
      author: "yituliu",
      name: ["A+B组", "B+C 组", "A+C组"],
      descriptionH2: ["描述1", "描述2", "描述3"],
      radio_drones: ["贸易站", "制造站", "贸易站"],
      switch_drones_enable: [true, false, true],
      radio_drones_index: [1, 2, 3],
      input_drones_order: ["换班前", "换班前", "换班前"],
      Fiammetta: ["巫恋", "巫恋", "巫恋"],
      switch_Fiammetta_enable: [false, false, false],
      input_Fiammetta_order: ["换班前", "换班前", "换班前"],
      control_skip: [false, false, false],

      // A换班参数
      period_plan0: ["20:00", "07:59"],
      control_plan0: ["阿米娅", "凯尔希", "琴柳", "令", "夕"],
      trading_plan0_0: ["巫恋", "龙舌兰", "柏喙"],
      trading_plan0_1: ["但书", "空弦", "黑键"],
      trading_plan0_2: ["能天使", "德克萨斯", "拉普兰德"],
      radio_trading_plan0: ["龙门币", "龙门币", "龙门币"],
      switch_trading_plan0_0: [false, false, false],
      switch_trading_plan0_1: [false, false, false],
      switch_trading_plan0_2: [false, false, false],
      manufacture_plan0_0: ["红云", "稀音", "帕拉斯"],
      manufacture_plan0_1: ["食铁兽", "断罪者", "至简"],
      manufacture_plan0_2: ["清流", "温蒂", "森蚺"],
      manufacture_plan0_3: ["砾", "槐琥", "迷迭香"],
      manufacture_plan0_4: [],
      radio_manufacture_plan0: ["作战记录", "作战记录", "赤金", "赤金", "作战记录"],
      switch_manufacture_plan0_0: [false, false, false],
      switch_manufacture_plan0_1: [false, false, false],
      switch_manufacture_plan0_2: [false, false, false],
      switch_manufacture_plan0_3: [false, false, false],
      switch_manufacture_plan0_4: [false, false, false],
      power_plan0_0: ["承曦格雷伊", "澄闪", "炎狱炎熔"],
      switch_power_plan0_0: [false, false, false],
      switch_power_plan0_1: [false, false, false],
      switch_power_plan0_2: [false, false, false],
      hire_plan0_0: ["絮雨"],
      switch_hire_plan0_0: [false, false, false],
      meeting_plan0_0: ["陈", "守林人"],
      switch_meeting_plan0_0: [false, false, false],
      dormitory_plan0_0: [],
      dormitory_plan0_1: [],
      dormitory_plan0_2: [],
      dormitory_plan0_3: [],
      switch_dormitory_plan0_0: [false, false, false],
      switch_dormitory_plan0_1: [false, false, false],
      switch_dormitory_plan0_2: [false, false, false],
      switch_dormitory_plan0_3: [false, false, false],
      // B换班参数
      period_plan1: ["08:00", "13:59"],
      control_plan1: ["诗怀雅", "凯尔希", "灵知", "焰尾", "玛恩纳"],
      trading_plan1_0: ["巫恋", "龙舌兰", "柏喙"],
      trading_plan1_1: ["孑", "银灰", "崖心"],
      trading_plan1_2: ["能天使", "德克萨斯", "拉普兰德"],
      radio_trading_plan1: ["龙门币", "龙门币", "龙门币"],
      switch_trading_plan1_0: [false, false, false],
      switch_trading_plan1_1: [false, false, false],
      switch_trading_plan1_2: [false, false, false],
      manufacture_plan1_0: ["红云", "稀音", "帕拉斯"],
      manufacture_plan1_1: ["远牙", "野鬃", "灰毫"],
      manufacture_plan1_2: ["清流", "温蒂", "森蚺"],
      manufacture_plan1_3: ["泡泡", "火神", "刻俄柏"],
      manufacture_plan1_4: [],
      radio_manufacture_plan1: ["作战记录", "作战记录", "赤金", "赤金", "作战记录"],
      switch_manufacture_plan1_0: [false, false, false],
      switch_manufacture_plan1_1: [false, false, false],
      switch_manufacture_plan1_2: [false, false, false],
      switch_manufacture_plan1_3: [false, false, false],
      switch_manufacture_plan1_4: [false, false, false],
      power_plan1_0: ["承曦格雷伊", "雷蛇", "炎狱炎熔"],
      switch_power_plan1_0: [false, false, false],
      switch_power_plan1_1: [false, false, false],
      switch_power_plan1_2: [false, false, false],
      hire_plan1_0: ["艾雅法拉"],
      switch_hire_plan1_0: [false, false, false],
      meeting_plan1_0: ["陈", "守林人"],
      switch_meeting_plan1_0: [false, false, false],
      dormitory_plan1_0: [],
      dormitory_plan1_1: [],
      dormitory_plan1_2: [],
      dormitory_plan1_3: [],
      switch_dormitory_plan1_0: [false, false, false],
      switch_dormitory_plan1_1: [false, false, false],
      switch_dormitory_plan1_2: [false, false, false],
      switch_dormitory_plan1_3: [false, false, false],
      // C换班参数
      period_plan2: ["14:00", "19:59"],
      control_plan2: ["阿米娅", "焰尾", "琴柳", "令", "夕"],
      trading_plan2_0: ["孑", "银灰", "崖心"],
      trading_plan2_1: ["但书", "空弦", "黑键"],
      trading_plan2_2: [],
      radio_trading_plan2: ["龙门币", "龙门币", "龙门币"],
      switch_trading_plan2_0: [false, false, false],
      switch_trading_plan2_1: [false, false, false],
      switch_trading_plan2_2: [false, false, false],
      manufacture_plan2_0: ["远牙", "野鬃", "灰毫"],
      manufacture_plan2_1: ["食铁兽", "断罪者", "至简"],
      manufacture_plan2_2: ["泡泡", "火神", "刻俄柏"],
      manufacture_plan2_3: ["砾", "槐琥", "迷迭香"],
      manufacture_plan2_4: [],
      radio_manufacture_plan2: ["作战记录", "作战记录", "赤金", "赤金", "作战记录"],
      switch_manufacture_plan2_0: [false, false, false],
      switch_manufacture_plan2_1: [false, false, false],
      switch_manufacture_plan2_2: [false, false, false],
      switch_manufacture_plan2_3: [false, false, false],
      switch_manufacture_plan2_4: [false, false, false],
      power_plan2_0: ["正义骑士号", "澄闪", "雷蛇"],
      switch_power_plan2_0: [false, false, false],
      switch_power_plan2_1: [false, false, false],
      switch_power_plan2_2: [false, false, false],
      hire_plan2_0: ["絮雨"],
      switch_hire_plan2_0: [false, false, false],
      meeting_plan2_0: ["陈", "守林人"],
      switch_meeting_plan2_0: [false, false, false],
      dormitory_plan2_0: [],
      dormitory_plan2_1: [],
      dormitory_plan2_2: [],
      dormitory_plan2_3: [],
      switch_dormitory_plan2_0: [false, false, false],
      switch_dormitory_plan2_1: [false, false, false],
      switch_dormitory_plan2_2: [false, false, false],
      switch_dormitory_plan2_3: [false, false, false],
      exportFlag: false,
    };
  },
  mounted() {
    this.setJson();
    this.getDate();
    this.openNotification();

    const url_path = window.location.pathname.split("/")[1];
    this.old_path = url_path == "riicCal";
    console.log(this.old_path);
    if (url_path == "riicCal") {
      ElMessage({
        dangerouslyUseHTMLString: true,
        message: '此页面已迁移至<a href="/tools/maa">https://yituliu.site/tools/maa</a>',
        type: "warning",
      });
    }
  },
  methods: {
    openNotification() {
      this.$notify({
        title: "2023-10-18更新",
        dangerouslyUseHTMLString: true,
        message: "<strong> 干员追加：<br>【恶兆湍流】：赫德雷" +
          "<br><br>UI问题：<br>如果遇到不能展开三列排班请收起侧边导航栏或缩小网页比例"                                                                            +
            "<br><br>BUG相关：<br>如果遇到导入为空的情况可加Q群539600566</strong>",
        duration: 12000,
      });
    },
    MaaURLCopy() {
      let oInput = document.createElement("input"); //创建一个input标签
      oInput.value = this.maaUrl; //将要复制的值赋值给input
      document.body.appendChild(oInput); //在页面中插入
      oInput.select(); // 模拟鼠标选中
      document.execCommand("Copy"); // 执行浏览器复制命令（相当于ctrl+c）
      oInput.style.display = "none"; //只是用一下input标签的特性，实际并不需要显示，所以这里要隐藏掉
      this.$message.success("复制成功");
    },
    setExportUrl() {
      this.exportUrl = "https://backend.yituliu.site/maa/schedule/export?schedule_id=" + this.scheduleId;
      // this.exportUrl = "http://127.0.0.1:10013/maa/schedule/export?schedule_id=" + this.scheduleId;
      this.maaUrl = "maa://infra.yituliu/" + this.scheduleId;
    },

    downFile(){
      this.setJson();
      buildingApi.maaBuildingJsonCreated(this.scheduleJson, this.scheduleId).then((response) => {
        this.$message({
          message: response.data.message + "作业id为：" + response.data.scheduleId,
          type: "success",
          showClose: true,
          duration: 4000,
        });
        this.scheduleId = response.data.scheduleId;
        let link = document.createElement('a')
        link.download = `${response.data.scheduleId}.json`
        link.href = 'data:text/plain,' + JSON.stringify( this.scheduleJson )
        link.click()
      });
    },
    maaBuildingJsonCreated() {
      this.setJson();
      buildingApi.maaBuildingJsonCreated(this.scheduleJson, this.scheduleId).then((response) => {
        this.$message({
          message: response.data.message + "作业id为：" + response.data.scheduleId,
          type: "success",
          showClose: true,
          duration: 4000,
        });
        this.scheduleId = response.data.scheduleId;
        this.setExportUrl();
        setTimeout(function () {
          document.getElementById("exportBtn").style.display = "";
          document.getElementById("disableBtn").style.display = "none";
        }, 500);
      });
      this.setExportUrl();
    },
    retrieveSchedule() {
      buildingApi.retrieveSchedule(this.importId).then((response) => {
        this.historicalData = response.data.schedule;
        this.importJson();
      });
    },
    getUid() {
      let timestamp = new Date().getTime();
      let randNum = Math.floor(Math.random() * 999) + 1000000000000000;
      this.scheduleId = timestamp * 1000 + randNum - 1000000000000000;
      console.log("id：", this.scheduleId);
    },
    getDate() {
      let date = new Date();
      let y = date.getFullYear(); //年
      let m = (date.getMonth() + 1).toString().padStart(2, "0"); //月
      let d = date.getDate().toString().padStart(2, "0"); //日
      let h = date.getHours().toString().padStart(2, "0"); //时
      let mm = date.getMinutes().toString().padStart(2, "0"); //分
      let s = date.getSeconds().toString().padStart(2, "0"); //秒
      this.createTime = `${y}/${m}/${d} ${h}:${mm}:${s}`;
    },
    setJson() {
      this.scheduleJson = { plans: [] };
      let plans_0 = {
        Fiammetta: { target: "", enable: false, order: "pre" },
        drones: { room: "", index: 1, enable: false, order: "pre" },
        rooms: {
          control: [],
          trading: [],
          manufacture: [],
          power: [],
          hire: [],
          meeting: [],
          dormitory: [],
        },
      };
      let plans_1 = {
        Fiammetta: { target: "", enable: false, order: "pre" },
        drones: { room: "", index: 1, enable: false, order: "pre" },
        rooms: {
          control: [],
          trading: [],
          manufacture: [],
          power: [],
          hire: [],
          meeting: [],
          dormitory: [],
        },
      };
      let plans_2 = {
        Fiammetta: { target: "", enable: false, order: "pre" },
        drones: { room: "", index: 1, enable: false, order: "pre" },
        rooms: {
          control: [],
          trading: [],
          manufacture: [],
          power: [],
          hire: [],
          meeting: [],
          dormitory: [],
        },
      };
      this.scheduleJson.title = this.title;
      this.scheduleJson.description = this.descriptionH1;
      this.scheduleJson.author = this.author;
      this.scheduleJson.buildingType = this.buildingType;
      this.scheduleJson.id = this.scheduleId;
      this.scheduleJson.planTimes = this.planTimes;
      plans_0.name = this.name[0];
      plans_0.description = this.descriptionH2[0];
      plans_0.period = this.setPeriod(this.period_plan0);

      if (this.switch_Fiammetta_enable[0]) {
        plans_0.Fiammetta.target = this.Fiammetta[0];
        plans_0.Fiammetta.enable = this.switch_Fiammetta_enable[0];
        plans_0.Fiammetta.order = this.getOrder(this.input_Fiammetta_order[0]);
      } else {
        plans_0.Fiammetta = this.getNull();
      }

      plans_0.drones.room = this.getProductValue(this.radio_drones[0]);
      plans_0.drones.index = parseInt(this.radio_drones_index[0]);
      plans_0.drones.enable = this.switch_drones_enable[0];
      plans_0.drones.order = this.getOrder(this.input_drones_order[0]);

      let control_planMap0_0 = {
        operators: this.getList(this.control_plan0),
      };
      if (this.control_skip[0]) {
        control_planMap0_0 = { skip: true };
      }
      plans_0.rooms.control[0] = control_planMap0_0;

      let trading_planMap0_0 = {
        operators: this.getList(this.trading_plan0_0),
        sort: this.switch_trading_plan0_0[0],
        autofill: this.switch_trading_plan0_0[1],
        product: this.getProductValue(this.radio_trading_plan0[0]),
      };
      if (this.switch_trading_plan0_0[2]) {
        trading_planMap0_0 = { skip: true };
      }

      let trading_planMap0_1 = {
        operators: this.getList(this.trading_plan0_1),
        sort: this.switch_trading_plan0_1[0],
        autofill: this.switch_trading_plan0_1[1],
        product: this.getProductValue(this.radio_trading_plan0[1]),
      };
      if (this.switch_trading_plan0_1[2]) {
        trading_planMap0_1 = { skip: true };
      }

      let trading_planMap0_2 = {
        operators: this.getList(this.trading_plan0_2),
        sort: this.switch_trading_plan0_2[0],
        autofill: this.switch_trading_plan0_2[1],
        product: this.getProductValue(this.radio_trading_plan0[2]),
      };
      if (this.switch_trading_plan0_2[2]) {
        trading_planMap0_2 = { skip: true };
      }

      plans_0.rooms.trading[0] = trading_planMap0_0;
      if ("243" === this.buildingType || "333" === this.buildingType || "252" === this.buildingType) {
        plans_0.rooms.trading[1] = trading_planMap0_1;
      }

      if ("333" === this.buildingType) {
        plans_0.rooms.trading[2] = trading_planMap0_2;
      }

      let manufacture_planMap0_0 = {
        operators: this.getList(this.manufacture_plan0_0),
        sort: this.switch_manufacture_plan0_0[0],
        autofill: this.switch_manufacture_plan0_0[1],
        product: this.getProductValue(this.radio_manufacture_plan0[0]),
      };
      if (this.switch_manufacture_plan0_0[2]) {
        manufacture_planMap0_0 = { skip: true };
      }

      let manufacture_planMap0_1 = {
        operators: this.getList(this.manufacture_plan0_1),
        sort: this.switch_manufacture_plan0_1[0],
        autofill: this.switch_manufacture_plan0_1[1],
        product: this.getProductValue(this.radio_manufacture_plan0[1]),
      };
      if (this.switch_manufacture_plan0_1[2]) {
        manufacture_planMap0_1 = { skip: true };
      }

      let manufacture_planMap0_2 = {
        operators: this.getList(this.manufacture_plan0_2),
        sort: this.switch_manufacture_plan0_2[0],
        autofill: this.switch_manufacture_plan0_2[1],
        product: this.getProductValue(this.radio_manufacture_plan0[2]),
      };
      if (this.switch_manufacture_plan0_2[2]) {
        manufacture_planMap0_2 = { skip: true };
      }

      let manufacture_planMap0_3 = {
        operators: this.getList(this.manufacture_plan0_3),
        sort: this.switch_manufacture_plan0_3[0],
        autofill: this.switch_manufacture_plan0_3[1],
        product: this.getProductValue(this.radio_manufacture_plan0[3]),
      };
      if (this.switch_manufacture_plan0_3[2]) {
        manufacture_planMap0_3 = { skip: true };
      }

      let manufacture_planMap0_4 = {
        operators: this.getList(this.manufacture_plan0_4),
        sort: this.switch_manufacture_plan0_4[0],
        autofill: this.switch_manufacture_plan0_4[1],
        product: this.getProductValue(this.radio_manufacture_plan0[4]),
      };
      if (this.switch_manufacture_plan0_4[2]) {
        manufacture_planMap0_4 = { skip: true };
      }

      plans_0.rooms.manufacture[0] = manufacture_planMap0_0;
      plans_0.rooms.manufacture[1] = manufacture_planMap0_1;
      plans_0.rooms.manufacture[2] = manufacture_planMap0_2;
      if ("153" === this.buildingType || "243" === this.buildingType || "252" === this.buildingType) {
        plans_0.rooms.manufacture[3] = manufacture_planMap0_3;
      }
      if ("153" === this.buildingType || "252" === this.buildingType) {
        plans_0.rooms.manufacture[4] = manufacture_planMap0_4;
      }

      let power_planMap0_0 = {
        operators: this.getList([this.power_plan0_0[0]]),
        // sort: this.switch_power_plan0_0[0],
        autofill: this.switch_power_plan0_0[1],
      };
      if (this.switch_power_plan0_0[2]) {
        power_planMap0_0 = { skip: true };
      }

      let power_planMap0_1 = {
        operators: this.getList([this.power_plan0_0[1]]),
        // sort: this.switch_power_plan0_1[0],
        autofill: this.switch_power_plan0_1[1],
      };
      if (this.switch_power_plan0_1[2]) {
        power_planMap0_1 = { skip: true };
      }

      let power_planMap0_2 = {
        operators: this.getList([this.power_plan0_0[2]]),
        // sort: this.switch_power_plan0_2[0],
        autofill: this.switch_power_plan0_2[1],
      };
      if (this.switch_power_plan0_2[2]) {
        power_planMap0_2 = { skip: true };
      }

      plans_0.rooms.power[0] = power_planMap0_0;
      plans_0.rooms.power[1] = power_planMap0_1;
      if (!("252" === this.buildingType)) {
        plans_0.rooms.power[2] = power_planMap0_2;
      }

      let hire_planMap0_0 = {
        operators: this.getList(this.hire_plan0_0),
        // sort: this.switch_hire_plan0_0[0],
        autofill: this.switch_hire_plan0_0[1],
      };
      if (this.switch_hire_plan0_0[2]) {
        hire_planMap0_0 = { skip: true };
      }

      plans_0.rooms.hire[0] = hire_planMap0_0;

      let meeting_planMap0_0 = {
        operators: this.getList(this.meeting_plan0_0),
        // sort: this.switch_meeting_plan0_0[0],
        autofill: this.switch_meeting_plan0_0[1],
      };
      if (this.switch_meeting_plan0_0[2]) {
        meeting_planMap0_0 = { skip: true };
      }

      plans_0.rooms.meeting[0] = meeting_planMap0_0;

      let dormitory_planMap0_0 = {
        operators: this.getList(this.dormitory_plan0_0),
        sort: this.switch_dormitory_plan0_0[0],
        autofill: this.switch_dormitory_plan0_0[1],
      };

      let dormitory_planMap0_1 = {
        operators: this.getList(this.dormitory_plan0_1),
        sort: this.switch_dormitory_plan0_1[0],
        autofill: this.switch_dormitory_plan0_1[1],
      };

      let dormitory_planMap0_2 = {
        operators: this.getList(this.dormitory_plan0_2),
        sort: this.switch_dormitory_plan0_2[0],
        autofill: this.switch_dormitory_plan0_2[1],
      };

      let dormitory_planMap0_3 = {
        operators: this.getList(this.dormitory_plan0_3),
        sort: this.switch_dormitory_plan0_3[0],
        autofill: this.switch_dormitory_plan0_3[1],
      };

      plans_0.rooms.dormitory[0] = dormitory_planMap0_0;
      plans_0.rooms.dormitory[1] = dormitory_planMap0_1;
      plans_0.rooms.dormitory[2] = dormitory_planMap0_2;
      plans_0.rooms.dormitory[3] = dormitory_planMap0_3;

      // B换班表

      plans_1.name = this.name[1];
      plans_1.period = this.setPeriod(this.period_plan1);
      plans_1.description = this.descriptionH2[1];

      if (this.switch_Fiammetta_enable[1]) {
        plans_1.Fiammetta.target = this.Fiammetta[1];
        plans_1.Fiammetta.enable = this.switch_Fiammetta_enable[1];
        plans_1.Fiammetta.order = this.getOrder(this.input_Fiammetta_order[1]);
      } else {
        plans_1.Fiammetta = this.getNull();
      }

      plans_1.drones.room = this.getProductValue(this.radio_drones[1]);
      plans_1.drones.index = parseInt(this.radio_drones_index[1]);
      plans_1.drones.enable = this.switch_drones_enable[1];
      plans_1.drones.order = this.getOrder(this.input_drones_order[1]);

      let control_planMap1_0 = {
        operators: this.getList(this.control_plan1),
      };
      if (this.control_skip[1]) {
        control_planMap1_0 = { skip: true };
      }
      plans_1.rooms.control[0] = control_planMap1_0;

      let trading_planMap1_0 = {
        operators: this.getList(this.trading_plan1_0),
        sort: this.switch_trading_plan1_0[0],
        autofill: this.switch_trading_plan1_0[1],
        product: this.getProductValue(this.radio_trading_plan1[0]),
      };
      if (this.switch_trading_plan1_0[2]) {
        trading_planMap1_0 = { skip: true };
      }

      let trading_planMap1_1 = {
        operators: this.getList(this.trading_plan1_1),
        sort: this.switch_trading_plan1_1[0],
        autofill: this.switch_trading_plan1_1[1],
        product: this.getProductValue(this.radio_trading_plan1[1]),
      };
      if (this.switch_trading_plan1_1[2]) {
        trading_planMap1_1 = { skip: true };
      }

      let trading_planMap1_2 = {
        operators: this.getList(this.trading_plan1_2),
        sort: this.switch_trading_plan1_2[0],
        autofill: this.switch_trading_plan1_2[1],
        product: this.getProductValue(this.radio_trading_plan1[2]),
      };
      if (this.switch_trading_plan1_2[2]) {
        trading_planMap1_2 = { skip: true };
      }

      plans_1.rooms.trading[0] = trading_planMap1_0;
      if ("243" === this.buildingType || "333" === this.buildingType || "252" === this.buildingType) {
        plans_1.rooms.trading[1] = trading_planMap1_1;
      }
      if ("333" === this.buildingType) {
        plans_1.rooms.trading[2] = trading_planMap1_2;
      }

      let manufacture_planMap1_0 = {
        operators: this.getList(this.manufacture_plan1_0),
        sort: this.switch_manufacture_plan1_0[0],
        autofill: this.switch_manufacture_plan1_0[1],
        product: this.getProductValue(this.radio_manufacture_plan1[0]),
      };
      if (this.switch_manufacture_plan1_0[2]) {
        manufacture_planMap1_0 = { skip: true };
      }

      let manufacture_planMap1_1 = {
        operators: this.getList(this.manufacture_plan1_1),
        sort: this.switch_manufacture_plan1_1[0],
        autofill: this.switch_manufacture_plan1_1[1],
        product: this.getProductValue(this.radio_manufacture_plan1[1]),
      };
      if (this.switch_manufacture_plan1_1[2]) {
        manufacture_planMap1_1 = { skip: true };
      }

      let manufacture_planMap1_2 = {
        operators: this.getList(this.manufacture_plan1_2),
        sort: this.switch_manufacture_plan1_2[0],
        autofill: this.switch_manufacture_plan1_2[1],
        product: this.getProductValue(this.radio_manufacture_plan1[2]),
      };
      if (this.switch_manufacture_plan1_2[2]) {
        manufacture_planMap1_2 = { skip: true };
      }

      let manufacture_planMap1_3 = {
        operators: this.getList(this.manufacture_plan1_3),
        sort: this.switch_manufacture_plan1_3[0],
        autofill: this.switch_manufacture_plan1_3[1],
        product: this.getProductValue(this.radio_manufacture_plan1[3]),
      };
      if (this.switch_manufacture_plan1_3[2]) {
        manufacture_planMap1_3 = { skip: true };
      }

      let manufacture_planMap1_4 = {
        operators: this.getList(this.manufacture_plan1_4),
        sort: this.switch_manufacture_plan1_4[0],
        autofill: this.switch_manufacture_plan1_4[1],
        product: this.getProductValue(this.radio_manufacture_plan1[4]),
      };
      if (this.switch_manufacture_plan1_4[2]) {
        manufacture_planMap1_4 = { skip: true };
      }

      plans_1.rooms.manufacture[0] = manufacture_planMap1_0;
      plans_1.rooms.manufacture[1] = manufacture_planMap1_1;
      plans_1.rooms.manufacture[2] = manufacture_planMap1_2;
      if ("153" === this.buildingType || "243" === this.buildingType || "252" === this.buildingType) {
        plans_1.rooms.manufacture[3] = manufacture_planMap1_3;
      }
      if ("153" === this.buildingType || "252" === this.buildingType) {
        plans_1.rooms.manufacture[4] = manufacture_planMap1_4;
      }

      let power_planMap1_0 = {
        operators: this.getList([this.power_plan1_0[0]]),
        // sort: this.switch_power_plan1_0[0],
        autofill: this.switch_power_plan1_0[1],
      };
      if (this.switch_power_plan1_0[2]) {
        power_planMap1_0 = { skip: true };
      }

      let power_planMap1_1 = {
        operators: this.getList([this.power_plan1_0[1]]),
        // sort: this.switch_power_plan1_1[0],
        autofill: this.switch_power_plan1_1[1],
      };
      if (this.switch_power_plan1_1[2]) {
        power_planMap1_1 = { skip: true };
      }

      let power_planMap1_2 = {
        operators: this.getList([this.power_plan1_0[2]]),
        // sort: this.switch_power_plan1_2[0],
        autofill: this.switch_power_plan1_2[1],
      };
      if (this.switch_power_plan1_2[2]) {
        power_planMap1_2 = { skip: true };
      }

      plans_1.rooms.power[0] = power_planMap1_0;
      plans_1.rooms.power[1] = power_planMap1_1;
      if (!("252" === this.buildingType)) {
        plans_1.rooms.power[2] = power_planMap1_2;
      }

      let hire_planMap1_0 = {
        operators: this.getList(this.hire_plan1_0),
        // sort: this.switch_hire_plan1_0[0],
        autofill: this.switch_hire_plan1_0[1],
      };
      if (this.switch_hire_plan1_0[2]) {
        hire_planMap1_0 = { skip: true };
      }

      plans_1.rooms.hire[0] = hire_planMap1_0;

      let meeting_planMap1_0 = {
        operators: this.getList(this.meeting_plan1_0),
        // sort: this.switch_meeting_plan1_0[0],
        autofill: this.switch_meeting_plan1_0[1],
      };
      if (this.switch_meeting_plan1_0[2]) {
        meeting_planMap1_0 = { skip: true };
      }

      plans_1.rooms.meeting[0] = meeting_planMap1_0;

      let dormitory_planMap1_0 = {
        operators: this.getList(this.dormitory_plan1_0),
        sort: this.switch_dormitory_plan1_0[0],
        autofill: this.switch_dormitory_plan1_0[1],
      };

      let dormitory_planMap1_1 = {
        operators: this.getList(this.dormitory_plan1_1),
        sort: this.switch_dormitory_plan1_1[0],
        autofill: this.switch_dormitory_plan1_1[1],
      };

      let dormitory_planMap1_2 = {
        operators: this.getList(this.dormitory_plan1_2),
        sort: this.switch_dormitory_plan1_2[0],
        autofill: this.switch_dormitory_plan1_2[1],
      };

      let dormitory_planMap1_3 = {
        operators: this.getList(this.dormitory_plan1_3),
        sort: this.switch_dormitory_plan1_3[0],
        autofill: this.switch_dormitory_plan1_3[1],
      };

      plans_1.rooms.dormitory[0] = dormitory_planMap1_0;
      plans_1.rooms.dormitory[1] = dormitory_planMap1_1;
      plans_1.rooms.dormitory[2] = dormitory_planMap1_2;
      plans_1.rooms.dormitory[3] = dormitory_planMap1_3;

      // C换班表
      plans_2.name = this.name[2];
      plans_2.period = this.setPeriod(this.period_plan2);
      plans_2.description = this.descriptionH2[2];

      if (this.switch_Fiammetta_enable[2]) {
        plans_2.Fiammetta.target = this.Fiammetta[2];
        plans_2.Fiammetta.enable = this.switch_Fiammetta_enable[2];
        plans_2.Fiammetta.order = this.getOrder(this.input_Fiammetta_order[2]);
      } else {
        plans_2.Fiammetta = this.getNull();
      }

      plans_2.drones.room = this.getProductValue(this.radio_drones[2]);
      plans_2.drones.index = parseInt(this.radio_drones_index[2]);
      plans_2.drones.enable = this.switch_drones_enable[2];
      plans_2.drones.order = this.getOrder(this.input_drones_order[2]);

      let control_planMap2_0 = {
        operators: this.getList(this.control_plan2),
      };
      if (this.control_skip[2]) {
        control_planMap2_0 = { skip: true };
      }
      plans_2.rooms.control[0] = control_planMap2_0;

      let trading_planMap2_0 = {
        operators: this.getList(this.trading_plan2_0),
        sort: this.switch_trading_plan2_0[0],
        autofill: this.switch_trading_plan2_0[1],
        product: this.getProductValue(this.radio_trading_plan2[0]),
      };
      if (this.switch_trading_plan2_0[2]) {
        trading_planMap2_0 = { skip: true };
      }

      let trading_planMap2_1 = {
        operators: this.getList(this.trading_plan2_1),
        sort: this.switch_trading_plan2_1[0],
        autofill: this.switch_trading_plan2_1[1],
        product: this.getProductValue(this.radio_trading_plan2[1]),
      };
      if (this.switch_trading_plan2_1[2]) {
        trading_planMap2_1 = { skip: true };
      }

      let trading_planMap2_2 = {
        operators: this.getList(this.trading_plan2_2),
        sort: this.switch_trading_plan2_2[0],
        autofill: this.switch_trading_plan2_2[1],
        product: this.getProductValue(this.radio_trading_plan2[2]),
      };
      if (this.switch_trading_plan2_2[2]) {
        trading_planMap2_2 = { skip: true };
      }

      plans_2.rooms.trading[0] = trading_planMap2_0;
      if ("243" === this.buildingType || "333" === this.buildingType || "252" === this.buildingType) {
        plans_2.rooms.trading[1] = trading_planMap2_1;
      }
      if ("333" === this.buildingType) {
        plans_2.rooms.trading[2] = trading_planMap2_2;
      }

      let manufacture_planMap2_0 = {
        operators: this.getList(this.manufacture_plan2_0),
        sort: this.switch_manufacture_plan2_0[0],
        autofill: this.switch_manufacture_plan2_0[1],
        product: this.getProductValue(this.radio_manufacture_plan2[0]),
      };
      if (this.switch_manufacture_plan2_0[2]) {
        manufacture_planMap2_0 = { skip: true };
      }

      let manufacture_planMap2_1 = {
        operators: this.getList(this.manufacture_plan2_1),
        sort: this.switch_manufacture_plan2_1[0],
        autofill: this.switch_manufacture_plan2_1[1],
        product: this.getProductValue(this.radio_manufacture_plan2[1]),
      };
      if (this.switch_manufacture_plan2_1[2]) {
        manufacture_planMap2_1 = { skip: true };
      }

      let manufacture_planMap2_2 = {
        operators: this.getList(this.manufacture_plan2_2),
        sort: this.switch_manufacture_plan2_2[0],
        autofill: this.switch_manufacture_plan2_2[1],
        product: this.getProductValue(this.radio_manufacture_plan2[2]),
      };
      if (this.switch_manufacture_plan2_2[2]) {
        manufacture_planMap2_2 = { skip: true };
      }

      let manufacture_planMap2_3 = {
        operators: this.getList(this.manufacture_plan2_3),
        sort: this.switch_manufacture_plan2_3[0],
        autofill: this.switch_manufacture_plan2_3[1],
        product: this.getProductValue(this.radio_manufacture_plan2[3]),
      };
      if (this.switch_manufacture_plan2_3[2]) {
        manufacture_planMap2_3 = { skip: true };
      }

      let manufacture_planMap2_4 = {
        operators: this.getList(this.manufacture_plan2_4),
        sort: this.switch_manufacture_plan2_4[0],
        autofill: this.switch_manufacture_plan2_4[1],
        product: this.getProductValue(this.radio_manufacture_plan2[4]),
      };
      if (this.switch_manufacture_plan2_4[2]) {
        manufacture_planMap2_4 = { skip: true };
      }

      plans_2.rooms.manufacture[0] = manufacture_planMap2_0;
      plans_2.rooms.manufacture[1] = manufacture_planMap2_1;
      plans_2.rooms.manufacture[2] = manufacture_planMap2_2;
      if ("153" === this.buildingType || "243" === this.buildingType || "252" === this.buildingType) {
        plans_2.rooms.manufacture[3] = manufacture_planMap2_3;
      }
      if ("153" === this.buildingType || "252" === this.buildingType) {
        plans_2.rooms.manufacture[4] = manufacture_planMap2_4;
      }

      let power_planMap2_0 = {
        operators: this.getList([this.power_plan2_0[0]]),
        // sort: this.switch_power_plan2_0[0],
        autofill: this.switch_power_plan2_0[1],
      };
      if (this.switch_power_plan2_0[2]) {
        power_planMap2_0 = { skip: true };
      }

      let power_planMap2_1 = {
        operators: this.getList([this.power_plan2_0[1]]),
        // sort: this.switch_power_plan2_1[0],
        autofill: this.switch_power_plan2_1[1],
      };
      if (this.switch_power_plan2_1[2]) {
        power_planMap2_1 = { skip: true };
      }

      let power_planMap2_2 = {
        operators: this.getList([this.power_plan2_0[2]]),
        // sort: this.switch_power_plan2_2[0],
        autofill: this.switch_power_plan2_2[1],
      };
      if (this.switch_power_plan2_2[2]) {
        power_planMap2_2 = { skip: true };
      }

      plans_2.rooms.power[0] = power_planMap2_0;
      plans_2.rooms.power[1] = power_planMap2_1;
      if (!("252" === this.buildingType)) {
        plans_2.rooms.power[2] = power_planMap2_2;
      }

      let hire_planMap2_0 = {
        operators: this.getList(this.hire_plan2_0),
        // sort: this.switch_hire_plan2_0[0],
        autofill: this.switch_hire_plan2_0[1],
      };
      if (this.switch_hire_plan2_0[2]) {
        hire_planMap2_0 = { skip: true };
      }

      plans_2.rooms.hire[0] = hire_planMap2_0;

      let meeting_planMap2_0 = {
        operators: this.getList(this.meeting_plan2_0),
        // sort: this.switch_meeting_plan2_0[0],
        autofill: this.switch_meeting_plan2_0[1],
      };
      if (this.switch_meeting_plan2_0[2]) {
        meeting_planMap2_0 = { skip: true };
      }

      plans_2.rooms.meeting[0] = meeting_planMap2_0;

      let dormitory_planMap2_0 = {
        operators: this.getList(this.dormitory_plan2_0),
        sort: this.switch_dormitory_plan2_0[0],
        autofill: this.switch_dormitory_plan2_0[1],
      };

      let dormitory_planMap2_1 = {
        operators: this.getList(this.dormitory_plan2_1),
        sort: this.switch_dormitory_plan2_1[0],
        autofill: this.switch_dormitory_plan2_1[1],
      };

      let dormitory_planMap2_2 = {
        operators: this.getList(this.dormitory_plan2_2),
        sort: this.switch_dormitory_plan2_2[0],
        autofill: this.switch_dormitory_plan2_2[1],
      };

      let dormitory_planMap2_3 = {
        operators: this.getList(this.dormitory_plan2_3),
        sort: this.switch_dormitory_plan2_3[0],
        autofill: this.switch_dormitory_plan2_3[1],
      };

      plans_2.rooms.dormitory[0] = dormitory_planMap2_0;
      plans_2.rooms.dormitory[1] = dormitory_planMap2_1;
      plans_2.rooms.dormitory[2] = dormitory_planMap2_2;
      plans_2.rooms.dormitory[3] = dormitory_planMap2_3;

      this.scheduleJson.plans.push(plans_0);
      this.scheduleJson.plans.push(plans_1);
      if ("3班" === this.planTimes) this.scheduleJson.plans.push(plans_2);
    },

    importJson() {
      this.title = this.historicalData.title;
      this.descriptionH1 = this.historicalData.description;
      this.author = this.historicalData.author; //作者
      this.buildingType = this.historicalData.buildingType;
      this.planTimes = this.getPlanTimes(this.historicalData.plans.length);

      // 导入A班的信息-------------------------------------------------------------------------------
      console.log("基建类型", this.historicalData.buildingType);
      this.name[0] = this.historicalData.plans[0].name; //班次名称
      this.descriptionH2[0] = this.historicalData.plans[0].description; //班次描述

      if (undefined === this.historicalData.plans[0].period) {
        this.period_plan0 = [];
      } else {
        this.period_plan0 = this.getPeriodReverse(this.historicalData.plans[0].period);
      }

      if (undefined === this.historicalData.plans[0].Fiammetta) {
        this.switch_Fiammetta_enable[0] = false;
      } else {
        this.Fiammetta[0] = this.historicalData.plans[0].Fiammetta.target;
        this.switch_Fiammetta_enable[0] = true;
        this.input_Fiammetta_order[0] = this.getOrderReverse(this.historicalData.plans[0].Fiammetta.order);
      }

      this.radio_drones[0] = this.getProductValueReverse(this.historicalData.plans[0].drones.room);
      this.radio_drones_index[0] = this.historicalData.plans[0].drones.index;
      this.switch_drones_enable[0] = this.historicalData.plans[0].drones.enable;
      this.input_drones_order[0] = this.getOrderReverse(this.historicalData.plans[0].drones.order);

      if (this.historicalData.plans[0].rooms.control[0].skip) {
        this.control_skip[0] = true;
      }

      if (undefined !== this.historicalData.plans[0].rooms.control[0].operators) {
        this.control_plan0 = this.historicalData.plans[0].rooms.control[0].operators;
      }

      if (this.historicalData.plans[0].rooms.trading[0].skip) {
        this.switch_trading_plan0_0[2] = true;
      }
      if (undefined !== this.historicalData.plans[0].rooms.trading[0].operators) {
        this.trading_plan0_0 = this.historicalData.plans[0].rooms.trading[0].operators;
        this.switch_trading_plan0_0[0] = this.historicalData.plans[0].rooms.trading[0].sort;
        this.switch_trading_plan0_0[1] = this.historicalData.plans[0].rooms.trading[0].autofill;
        this.radio_trading_plan0[0] = this.getProductValueReverse(this.historicalData.plans[0].rooms.trading[0].product);
      }

      if ("333" === this.historicalData.buildingType || "243" === this.historicalData.buildingType || "252" === this.historicalData.buildingType) {
        if (this.historicalData.plans[0].rooms.trading[1].skip) {
          this.switch_trading_plan0_1[2] = true;
        }
        console.log(undefined !== this.historicalData.plans[0].rooms.trading[1].operators);
        if (undefined !== this.historicalData.plans[0].rooms.trading[1].operators) {
          this.trading_plan0_1 = this.historicalData.plans[0].rooms.trading[1].operators;
          this.switch_trading_plan0_1[0] = this.historicalData.plans[0].rooms.trading[1].sort;
          this.switch_trading_plan0_1[1] = this.historicalData.plans[0].rooms.trading[1].autofill;
          this.radio_trading_plan0[1] = this.getProductValueReverse(this.historicalData.plans[0].rooms.trading[1].product);
        }
      }

      if ("333" === this.historicalData.buildingType) {
        if (this.historicalData.plans[0].rooms.trading[2].skip) {
          this.switch_trading_plan0_2[2] = true;
        }
        if (undefined !== this.historicalData.plans[0].rooms.trading[2].operators) {
          this.trading_plan0_2 = this.historicalData.plans[0].rooms.trading[2].operators;
          this.switch_trading_plan0_2[0] = this.historicalData.plans[0].rooms.trading[2].sort;
          this.switch_trading_plan0_2[1] = this.historicalData.plans[0].rooms.trading[2].autofill;
          this.radio_trading_plan0[2] = this.getProductValueReverse(this.historicalData.plans[0].rooms.trading[2].product);
        }
      }

      if (this.historicalData.plans[0].rooms.manufacture[0].skip) {
        this.switch_manufacture_plan0_0[2] = true;
      }
      if (undefined !== this.historicalData.plans[0].rooms.manufacture[0].operators) {
        this.manufacture_plan0_0 = this.historicalData.plans[0].rooms.manufacture[0].operators;
        this.switch_manufacture_plan0_0[0] = this.historicalData.plans[0].rooms.manufacture[0].sort;
        this.switch_manufacture_plan0_0[1] = this.historicalData.plans[0].rooms.manufacture[0].autofill;
        this.radio_manufacture_plan0[0] = this.getProductValueReverse(this.historicalData.plans[0].rooms.manufacture[0].product);
      }

      if (this.historicalData.plans[0].rooms.manufacture[1].skip) {
        this.switch_manufacture_plan0_1[2] = true;
      }
      if (undefined !== this.historicalData.plans[0].rooms.manufacture[1].operators) {
        this.manufacture_plan0_1 = this.historicalData.plans[0].rooms.manufacture[1].operators;
        this.switch_manufacture_plan0_1[0] = this.historicalData.plans[0].rooms.manufacture[1].sort;
        this.switch_manufacture_plan0_1[1] = this.historicalData.plans[0].rooms.manufacture[1].autofill;
        this.radio_manufacture_plan0[1] = this.getProductValueReverse(this.historicalData.plans[0].rooms.manufacture[1].product);
      }

      if (this.historicalData.plans[0].rooms.manufacture[2].skip) {
        this.switch_manufacture_plan0_2[2] = true;
      }
      if (undefined !== this.historicalData.plans[0].rooms.manufacture[2].operators) {
        this.manufacture_plan0_2 = this.historicalData.plans[0].rooms.manufacture[2].operators;
        this.switch_manufacture_plan0_2[0] = this.historicalData.plans[0].rooms.manufacture[2].sort;
        this.switch_manufacture_plan0_2[1] = this.historicalData.plans[0].rooms.manufacture[2].autofill;
        this.radio_manufacture_plan0[2] = this.getProductValueReverse(this.historicalData.plans[0].rooms.manufacture[2].product);
      }

      if ("243" === this.historicalData.buildingType || "153" === this.historicalData.buildingType || "252" === this.historicalData.buildingType) {
        if (this.historicalData.plans[0].rooms.manufacture[3].skip) {
          this.switch_manufacture_plan0_3[2] = true;
        }
        if (undefined !== this.historicalData.plans[0].rooms.manufacture[3].operators) {
          this.manufacture_plan0_3 = this.historicalData.plans[0].rooms.manufacture[3].operators;
          this.switch_manufacture_plan0_3[0] = this.historicalData.plans[0].rooms.manufacture[3].sort;
          this.switch_manufacture_plan0_3[1] = this.historicalData.plans[0].rooms.manufacture[3].autofill;
          this.radio_manufacture_plan0[3] = this.getProductValueReverse(this.historicalData.plans[0].rooms.manufacture[3].product);
        }
      }

      if ("153" === this.historicalData.buildingType || "252" === this.historicalData.buildingType) {
        if (this.historicalData.plans[0].rooms.manufacture[4].skip) {
          this.switch_manufacture_plan0_4[2] = true;
        }
        if (undefined !== this.historicalData.plans[0].rooms.manufacture[4].operators) {
          this.manufacture_plan0_4 = this.historicalData.plans[0].rooms.manufacture[4].operators;
          this.switch_manufacture_plan0_4[0] = this.historicalData.plans[0].rooms.manufacture[4].sort;
          this.switch_manufacture_plan0_4[1] = this.historicalData.plans[0].rooms.manufacture[4].autofill;
          this.radio_manufacture_plan0[4] = this.getProductValueReverse(this.historicalData.plans[0].rooms.manufacture[4].product);
        }
      }

      if (this.historicalData.plans[0].rooms.power[0].skip) {
        this.switch_power_plan0_0[2] = true;
      } else {
        this.power_plan0_0[0] = this.historicalData.plans[0].rooms.power[0].operators[0];
        this.switch_power_plan0_0[1] = this.historicalData.plans[0].rooms.power[0].autofill;
      }

      if (this.historicalData.plans[0].rooms.power[1].skip) {
        this.switch_power_plan0_1[2] = true;
      } else {
        this.power_plan0_0[1] = this.historicalData.plans[0].rooms.power[1].operators[0];
        this.switch_power_plan0_1[1] = this.historicalData.plans[0].rooms.power[1].autofill;
      }

      if (!("252" === this.historicalData.buildingType)) {
        if (this.historicalData.plans[0].rooms.power[2].skip) {
          this.switch_power_plan0_2[2] = true;
        } else {
          this.power_plan0_0[2] = this.historicalData.plans[0].rooms.power[2].operators[0];
          this.switch_power_plan0_2[1] = this.historicalData.plans[0].rooms.power[2].autofill;
        }
      }

      if (this.historicalData.plans[0].rooms.hire[0].skip) {
        this.switch_hire_plan0_0[2] = true;
      } else {
        this.hire_plan0_0 = this.historicalData.plans[0].rooms.hire[0].operators;
        this.switch_hire_plan0_0[1] = this.historicalData.plans[0].rooms.hire[0].autofill;
      }

      if (this.historicalData.plans[0].rooms.meeting[0].skip) {
        this.switch_meeting_plan0_0[2] = true;
      } else {
        this.meeting_plan0_0 = this.historicalData.plans[0].rooms.meeting[0].operators;
        this.switch_meeting_plan0_0[1] = this.historicalData.plans[0].rooms.meeting[0].autofill;
      }

      if (undefined === this.historicalData.plans[0].rooms.dormitory[1].operators) {
      } else {
        if (this.historicalData.plans[0].rooms.dormitory[0].skip) {
          this.switch_dormitory_plan0_0[2] = true;
        } else {
          this.dormitory_plan0_0 = this.historicalData.plans[0].rooms.dormitory[0].operators;
          this.switch_dormitory_plan0_0[0] = this.historicalData.plans[0].rooms.dormitory[0].sort;
          this.switch_dormitory_plan0_0[1] = this.historicalData.plans[0].rooms.dormitory[0].autofill;
        }
      }

      if (undefined === this.historicalData.plans[0].rooms.dormitory[1].operators) {
      } else {
        if (this.historicalData.plans[0].rooms.dormitory[1].skip) {
          this.switch_dormitory_plan0_1[2] = true;
        } else {
          this.dormitory_plan0_1 = this.historicalData.plans[0].rooms.dormitory[1].operators;
          this.switch_dormitory_plan0_1[0] = this.historicalData.plans[0].rooms.dormitory[1].sort;
          this.switch_dormitory_plan0_1[1] = this.historicalData.plans[0].rooms.dormitory[1].autofill;
        }
      }

      if (undefined === this.historicalData.plans[0].rooms.dormitory[2].operators) {
      } else {
        if (this.historicalData.plans[0].rooms.dormitory[2].skip) {
          this.switch_dormitory_plan0_2[2] = true;
        } else {
          this.dormitory_plan0_2 = this.historicalData.plans[0].rooms.dormitory[2].operators;
          this.switch_dormitory_plan0_2[0] = this.historicalData.plans[0].rooms.dormitory[2].sort;
          this.switch_dormitory_plan0_2[1] = this.historicalData.plans[0].rooms.dormitory[2].autofill;
        }
      }

      if (undefined === this.historicalData.plans[0].rooms.dormitory[3].operators) {
      } else {
        if (this.historicalData.plans[0].rooms.dormitory[3].skip) {
          this.switch_dormitory_plan0_3[2] = true;
        } else {
          this.dormitory_plan0_3 = this.historicalData.plans[0].rooms.dormitory[3].operators;
          this.switch_dormitory_plan0_3[0] = this.historicalData.plans[0].rooms.dormitory[3].sort;
          this.switch_dormitory_plan0_3[1] = this.historicalData.plans[0].rooms.dormitory[3].autofill;
        }
      }

      // 导入B班的信息-------------------------------------------------------------------------------
      this.name[1] = this.historicalData.plans[1].name;
      this.descriptionH2[1] = this.historicalData.plans[1].description;

      if (undefined === this.historicalData.plans[1].period) {
        this.period_plan1 = [];
      } else {
        this.period_plan1 = this.getPeriodReverse(this.historicalData.plans[1].period);
      }

      if (undefined === this.historicalData.plans[1].Fiammetta) {
        this.switch_Fiammetta_enable[1] = false;
      } else {
        this.Fiammetta[1] = this.historicalData.plans[1].Fiammetta.target;
        this.switch_Fiammetta_enable[1] = true;
        this.input_Fiammetta_order[1] = this.getOrderReverse(this.historicalData.plans[1].Fiammetta.order);
      }

      this.radio_drones[1] = this.getProductValueReverse(this.historicalData.plans[1].drones.room);
      this.radio_drones_index[1] = this.historicalData.plans[1].drones.index;
      this.switch_drones_enable[1] = this.historicalData.plans[1].drones.enable;
      this.input_drones_order[1] = this.getOrderReverse(this.historicalData.plans[1].drones.order);

      if (this.historicalData.plans[1].rooms.control[0].skip) {
        this.control_skip[1] = true;
      }
      if (undefined !== this.historicalData.plans[1].rooms.control[0].operators) {
        this.control_plan1 = this.historicalData.plans[1].rooms.control[0].operators;
      }

      if (this.historicalData.plans[1].rooms.trading[0].skip) {
        this.switch_trading_plan1_0[2] = true;
      }
      if (undefined !== this.historicalData.plans[1].rooms.trading[0].operators) {
        this.trading_plan1_0 = this.historicalData.plans[1].rooms.trading[0].operators;
        this.switch_trading_plan1_0[0] = this.historicalData.plans[1].rooms.trading[0].sort;
        this.switch_trading_plan1_0[1] = this.historicalData.plans[1].rooms.trading[0].autofill;
        this.radio_trading_plan1[0] = this.getProductValueReverse(this.historicalData.plans[1].rooms.trading[0].product);
      }

      if ("333" === this.historicalData.buildingType || "243" === this.historicalData.buildingType || "252" === this.historicalData.buildingType) {
        if (this.historicalData.plans[1].rooms.trading[1].skip) {
          this.switch_trading_plan1_1[2] = true;
        }
        if (undefined !== this.historicalData.plans[1].rooms.trading[1].operators) {
          this.trading_plan1_1 = this.historicalData.plans[1].rooms.trading[1].operators;
          this.switch_trading_plan1_1[0] = this.historicalData.plans[1].rooms.trading[1].sort;
          this.switch_trading_plan1_1[1] = this.historicalData.plans[1].rooms.trading[1].autofill;
          this.radio_trading_plan1[1] = this.getProductValueReverse(this.historicalData.plans[1].rooms.trading[1].product);
        }
      }

      if ("333" === this.historicalData.buildingType) {
        if (this.historicalData.plans[1].rooms.trading[2].skip) {
          this.switch_trading_plan1_2[2] = true;
        }
        if (undefined !== this.historicalData.plans[1].rooms.trading[2].operators) {
          this.trading_plan1_2 = this.historicalData.plans[1].rooms.trading[2].operators;
          this.switch_trading_plan1_2[0] = this.historicalData.plans[1].rooms.trading[2].sort;
          this.switch_trading_plan1_2[1] = this.historicalData.plans[1].rooms.trading[2].autofill;
          this.radio_trading_plan1[2] = this.getProductValueReverse(this.historicalData.plans[1].rooms.trading[2].product);
        }
      }

      if (this.historicalData.plans[1].rooms.manufacture[0].skip) {
        this.switch_manufacture_plan1_0[2] = true;
      }
      if (undefined !== this.historicalData.plans[1].rooms.manufacture[0].operators) {
        this.manufacture_plan1_0 = this.historicalData.plans[1].rooms.manufacture[0].operators;
        this.switch_manufacture_plan1_0[0] = this.historicalData.plans[1].rooms.manufacture[0].sort;
        this.switch_manufacture_plan1_0[1] = this.historicalData.plans[1].rooms.manufacture[0].autofill;
        this.radio_manufacture_plan1[0] = this.getProductValueReverse(this.historicalData.plans[1].rooms.manufacture[0].product);
      }

      if (this.historicalData.plans[1].rooms.manufacture[1].skip) {
        this.switch_manufacture_plan1_1[2] = true;
      }
      if (undefined !== this.historicalData.plans[1].rooms.manufacture[1].operators) {
        this.manufacture_plan1_1 = this.historicalData.plans[1].rooms.manufacture[1].operators;
        this.switch_manufacture_plan1_1[0] = this.historicalData.plans[1].rooms.manufacture[1].sort;
        this.switch_manufacture_plan1_1[1] = this.historicalData.plans[1].rooms.manufacture[1].autofill;
        this.radio_manufacture_plan1[1] = this.getProductValueReverse(this.historicalData.plans[1].rooms.manufacture[1].product);
      }

      if (this.historicalData.plans[1].rooms.manufacture[2].skip) {
        this.switch_manufacture_plan1_2[2] = true;
      }
      if (undefined !== this.historicalData.plans[1].rooms.manufacture[2].operators) {
        this.manufacture_plan1_2 = this.historicalData.plans[1].rooms.manufacture[2].operators;
        this.switch_manufacture_plan1_2[0] = this.historicalData.plans[1].rooms.manufacture[2].sort;
        this.switch_manufacture_plan1_2[1] = this.historicalData.plans[1].rooms.manufacture[2].autofill;
        this.radio_manufacture_plan1[2] = this.getProductValueReverse(this.historicalData.plans[1].rooms.manufacture[2].product);
      }

      if ("243" === this.historicalData.buildingType || "153" === this.historicalData.buildingType || "252" === this.historicalData.buildingType) {
        if (this.historicalData.plans[1].rooms.manufacture[3].skip) {
          this.switch_manufacture_plan1_3[2] = true;
        }
        if (undefined !== this.historicalData.plans[1].rooms.manufacture[3].operators) {
          this.manufacture_plan1_3 = this.historicalData.plans[1].rooms.manufacture[3].operators;
          this.switch_manufacture_plan1_3[0] = this.historicalData.plans[1].rooms.manufacture[3].sort;
          this.switch_manufacture_plan1_3[1] = this.historicalData.plans[1].rooms.manufacture[3].autofill;
          this.radio_manufacture_plan1[3] = this.getProductValueReverse(this.historicalData.plans[1].rooms.manufacture[3].product);
        }
      }

      if ("153" === this.historicalData.buildingType || "252" === this.historicalData.buildingType) {
        if (this.historicalData.plans[1].rooms.manufacture[4].skip) {
          this.switch_manufacture_plan1_4[2] = true;
        }
        if (undefined !== this.historicalData.plans[1].rooms.manufacture[4].operators) {
          this.manufacture_plan1_4 = this.historicalData.plans[1].rooms.manufacture[4].operators;
          this.switch_manufacture_plan1_4[0] = this.historicalData.plans[1].rooms.manufacture[4].sort;
          this.switch_manufacture_plan1_4[1] = this.historicalData.plans[1].rooms.manufacture[4].autofill;
          this.radio_manufacture_plan1[4] = this.getProductValueReverse(this.historicalData.plans[1].rooms.manufacture[4].product);
        }
      }

      if (this.historicalData.plans[1].rooms.power[0].skip) {
        this.switch_power_plan1_0[2] = true;
      } else {
        this.power_plan1_0[0] = this.historicalData.plans[1].rooms.power[0].operators[0];
        this.switch_power_plan1_0[1] = this.historicalData.plans[1].rooms.power[0].autofill;
      }

      if (this.historicalData.plans[1].rooms.power[1].skip) {
        this.switch_power_plan1_1[2] = true;
      } else {
        this.power_plan1_0[1] = this.historicalData.plans[1].rooms.power[1].operators[0];
        this.switch_power_plan1_1[1] = this.historicalData.plans[1].rooms.power[1].autofill;
      }

      if (!("252" === this.historicalData.buildingType)) {
        if (this.historicalData.plans[1].rooms.power[2].skip) {
          this.switch_power_plan1_2[2] = true;
        } else {
          this.power_plan1_0[2] = this.historicalData.plans[1].rooms.power[2].operators[0];
          this.switch_power_plan1_2[1] = this.historicalData.plans[1].rooms.power[2].autofill;
        }
      }

      if (this.historicalData.plans[1].rooms.hire[0].skip) {
        this.switch_hire_plan1_0[2] = true;
      } else {
        this.hire_plan1_0 = this.historicalData.plans[1].rooms.hire[0].operators;
        this.switch_hire_plan1_0[1] = this.historicalData.plans[1].rooms.hire[0].autofill;
      }

      if (this.historicalData.plans[1].rooms.meeting[0].skip) {
        this.switch_meeting_plan1_0[2] = true;
      } else {
        this.meeting_plan1_0 = this.historicalData.plans[1].rooms.meeting[0].operators;
        this.switch_meeting_plan1_0[1] = this.historicalData.plans[1].rooms.meeting[0].autofill;
      }

      if (undefined === this.historicalData.plans[1].rooms.dormitory[0].operators) {
      } else {
        if (this.historicalData.plans[1].rooms.dormitory[0].skip) {
          this.switch_dormitory_plan1_0[2] = true;
        } else {
          this.dormitory_plan1_0 = this.historicalData.plans[1].rooms.dormitory[0].operators;
          this.switch_dormitory_plan1_0[0] = this.historicalData.plans[1].rooms.dormitory[0].sort;
          this.switch_dormitory_plan1_0[1] = this.historicalData.plans[1].rooms.dormitory[0].autofill;
        }
      }

      if (undefined === this.historicalData.plans[1].rooms.dormitory[1].operators) {
      } else {
        if (this.historicalData.plans[1].rooms.dormitory[1].skip) {
          this.switch_dormitory_plan1_1[2] = true;
        } else {
          this.dormitory_plan1_1 = this.historicalData.plans[1].rooms.dormitory[1].operators;
          this.switch_dormitory_plan1_1[0] = this.historicalData.plans[1].rooms.dormitory[1].sort;
          this.switch_dormitory_plan1_1[1] = this.historicalData.plans[1].rooms.dormitory[1].autofill;
        }
      }

      if (undefined === this.historicalData.plans[1].rooms.dormitory[2].operators) {
      } else {
        if (this.historicalData.plans[1].rooms.dormitory[2].skip) {
          this.switch_dormitory_plan1_2[2] = true;
        } else {
          this.dormitory_plan1_2 = this.historicalData.plans[1].rooms.dormitory[2].operators;
          this.switch_dormitory_plan1_2[0] = this.historicalData.plans[1].rooms.dormitory[2].sort;
          this.switch_dormitory_plan1_2[1] = this.historicalData.plans[1].rooms.dormitory[2].autofill;
        }
      }

      if (undefined === this.historicalData.plans[1].rooms.dormitory[3].operators) {
      } else {
        if (this.historicalData.plans[1].rooms.dormitory[3].skip) {
          this.switch_dormitory_plan1_3[2] = true;
        } else {
          this.dormitory_plan1_3 = this.historicalData.plans[1].rooms.dormitory[3].operators;
          this.switch_dormitory_plan1_3[0] = this.historicalData.plans[1].rooms.dormitory[3].sort;
          this.switch_dormitory_plan1_3[1] = this.historicalData.plans[1].rooms.dormitory[3].autofill;
        }
      }

      // 导入C班的信息-------------------------------------------------------------------------------

      if (this.historicalData.plans.length > 2) {
        this.name[2] = this.historicalData.plans[2].name;
        this.descriptionH2[2] = this.historicalData.plans[2].description;

        if (undefined === this.historicalData.plans[2].period) {
          this.period_plan2 = [];
        } else {
          this.period_plan2 = this.getPeriodReverse(this.historicalData.plans[2].period);
        }

        if (undefined === this.historicalData.plans[2].Fiammetta) {
          this.switch_Fiammetta_enable[2] = false;
        } else {
          this.Fiammetta[2] = this.historicalData.plans[2].Fiammetta.target;
          this.switch_Fiammetta_enable[2] = true;
          this.input_Fiammetta_order[2] = this.getOrderReverse(this.historicalData.plans[2].Fiammetta.order);
        }

        this.radio_drones[2] = this.getProductValueReverse(this.historicalData.plans[2].drones.room);
        this.radio_drones_index[2] = this.historicalData.plans[2].drones.index;
        this.switch_drones_enable[2] = this.historicalData.plans[2].drones.enable;
        this.input_drones_order[2] = this.getOrderReverse(this.historicalData.plans[2].drones.order);

        if (this.historicalData.plans[2].rooms.control[0].skip) {
          this.control_skip[2] = true;
        }
        if (undefined !== this.historicalData.plans[2].rooms.control[0].operators) {
          this.control_plan2 = this.historicalData.plans[2].rooms.control[0].operators;
        }

        if (this.historicalData.plans[2].rooms.trading[0].skip) {
          this.switch_trading_plan2_0[2] = true;
        }
        if (undefined !== this.historicalData.plans[2].rooms.trading[0].operators) {
          this.trading_plan2_0 = this.historicalData.plans[2].rooms.trading[0].operators;
          this.switch_trading_plan2_0[0] = this.historicalData.plans[2].rooms.trading[0].sort;
          this.switch_trading_plan2_0[1] = this.historicalData.plans[2].rooms.trading[0].autofill;
          this.radio_trading_plan2[0] = this.getProductValueReverse(this.historicalData.plans[2].rooms.trading[0].product);
        }

        if ("333" === this.historicalData.buildingType || "243" === this.historicalData.buildingType || "252" === this.historicalData.buildingType) {
          if (this.historicalData.plans[2].rooms.trading[1].skip) {
            this.switch_trading_plan2_1[2] = true;
          }
          if (undefined !== this.historicalData.plans[2].rooms.trading[1].operators) {
            this.trading_plan2_1 = this.historicalData.plans[2].rooms.trading[1].operators;
            this.switch_trading_plan2_1[0] = this.historicalData.plans[2].rooms.trading[1].sort;
            this.switch_trading_plan2_1[1] = this.historicalData.plans[2].rooms.trading[1].autofill;
            this.radio_trading_plan2[1] = this.getProductValueReverse(this.historicalData.plans[2].rooms.trading[1].product);
          }
        }

        if ("333" === this.historicalData.buildingType) {
          if (this.historicalData.plans[2].rooms.trading[2].skip) {
            this.switch_trading_plan2_2[2] = true;
          }
          if (undefined !== this.historicalData.plans[2].rooms.trading[2].operators) {
            this.trading_plan2_2 = this.historicalData.plans[2].rooms.trading[2].operators;
            this.switch_trading_plan2_2[0] = this.historicalData.plans[2].rooms.trading[2].sort;
            this.switch_trading_plan2_2[1] = this.historicalData.plans[2].rooms.trading[2].autofill;
            this.radio_trading_plan2[2] = this.getProductValueReverse(this.historicalData.plans[2].rooms.trading[2].product);
          }
        }

        if (this.historicalData.plans[2].rooms.manufacture[0].skip) {
          this.switch_manufacture_plan2_0[2] = true;
        }
        if (undefined !== this.historicalData.plans[2].rooms.manufacture[0].operators) {
          this.manufacture_plan2_0 = this.historicalData.plans[2].rooms.manufacture[0].operators;
          this.switch_manufacture_plan2_0[0] = this.historicalData.plans[2].rooms.manufacture[0].sort;
          this.switch_manufacture_plan2_0[1] = this.historicalData.plans[2].rooms.manufacture[0].autofill;
          this.radio_manufacture_plan2[0] = this.getProductValueReverse(this.historicalData.plans[2].rooms.manufacture[0].product);
        }

        if (this.historicalData.plans[2].rooms.manufacture[1].skip) {
          this.switch_manufacture_plan2_1[2] = true;
        }
        if (undefined !== this.historicalData.plans[2].rooms.manufacture[1].operators) {
          this.manufacture_plan2_1 = this.historicalData.plans[2].rooms.manufacture[1].operators;
          this.switch_manufacture_plan2_1[0] = this.historicalData.plans[2].rooms.manufacture[1].sort;
          this.switch_manufacture_plan2_1[1] = this.historicalData.plans[2].rooms.manufacture[1].autofill;
          this.radio_manufacture_plan2[1] = this.getProductValueReverse(this.historicalData.plans[2].rooms.manufacture[1].product);
        }

        if (this.historicalData.plans[2].rooms.manufacture[2].skip) {
          this.switch_manufacture_plan2_2[2] = true;
        }
        if (undefined !== this.historicalData.plans[2].rooms.manufacture[2].operators) {
          this.manufacture_plan2_2 = this.historicalData.plans[2].rooms.manufacture[2].operators;
          this.switch_manufacture_plan2_2[0] = this.historicalData.plans[2].rooms.manufacture[2].sort;
          this.switch_manufacture_plan2_2[1] = this.historicalData.plans[2].rooms.manufacture[2].autofill;
          this.radio_manufacture_plan2[2] = this.getProductValueReverse(this.historicalData.plans[2].rooms.manufacture[2].product);
        }

        if ("243" === this.historicalData.buildingType || "153" === this.historicalData.buildingType || "252" === this.historicalData.buildingType) {
          if (this.historicalData.plans[2].rooms.manufacture[3].skip) {
            this.switch_manufacture_plan2_3[2] = true;
          }
          if (undefined !== this.historicalData.plans[2].rooms.manufacture[3].operators) {
            this.manufacture_plan2_3 = this.historicalData.plans[2].rooms.manufacture[3].operators;
            this.switch_manufacture_plan2_3[0] = this.historicalData.plans[2].rooms.manufacture[3].sort;
            this.switch_manufacture_plan2_3[1] = this.historicalData.plans[2].rooms.manufacture[3].autofill;
            this.radio_manufacture_plan2[3] = this.getProductValueReverse(this.historicalData.plans[2].rooms.manufacture[3].product);
          }
        }

        if ("153" === this.historicalData.buildingType || "252" === this.historicalData.buildingType) {
          if (this.historicalData.plans[2].rooms.manufacture[4].skip) {
            this.switch_manufacture_plan2_4[2] = true;
          }
          if (undefined !== this.historicalData.plans[2].rooms.manufacture[4].operators) {
            this.manufacture_plan2_4 = this.historicalData.plans[2].rooms.manufacture[4].operators;
            this.switch_manufacture_plan2_4[0] = this.historicalData.plans[2].rooms.manufacture[4].sort;
            this.switch_manufacture_plan2_4[1] = this.historicalData.plans[2].rooms.manufacture[4].autofill;
            this.radio_manufacture_plan2[4] = this.getProductValueReverse(this.historicalData.plans[2].rooms.manufacture[4].product);
          }
        }

        if (this.historicalData.plans[2].rooms.power[0].skip) {
          this.switch_power_plan2_0[2] = true;
        } else {
          this.power_plan2_0[0] = this.historicalData.plans[2].rooms.power[0].operators[0];
          this.switch_power_plan2_0[1] = this.historicalData.plans[2].rooms.power[0].autofill;
        }

        if (this.historicalData.plans[2].rooms.power[1].skip) {
          this.switch_power_plan2_1[2] = true;
        } else {
          this.power_plan2_0[1] = this.historicalData.plans[2].rooms.power[1].operators[0];
          this.switch_power_plan2_1[1] = this.historicalData.plans[2].rooms.power[1].autofill;
        }

        if (!("252" === this.historicalData.buildingType)) {
          if (this.historicalData.plans[2].rooms.power[2].skip) {
            this.switch_power_plan2_2[2] = true;
          } else {
            this.power_plan2_0[2] = this.historicalData.plans[2].rooms.power[2].operators[0];
            this.switch_power_plan2_2[1] = this.historicalData.plans[2].rooms.power[2].autofill;
          }
        }

        if (this.historicalData.plans[2].rooms.hire[0].skip) {
          this.switch_hire_plan2_0[2] = true;
        } else {
          this.hire_plan2_0 = this.historicalData.plans[2].rooms.hire[0].operators;
          this.switch_hire_plan2_0[1] = this.historicalData.plans[2].rooms.hire[0].autofill;
        }

        if (this.historicalData.plans[2].rooms.meeting[0].skip) {
          this.switch_meeting_plan2_0[2] = true;
        } else {
          this.meeting_plan2_0 = this.historicalData.plans[2].rooms.meeting[0].operators;
          this.switch_meeting_plan2_0[1] = this.historicalData.plans[2].rooms.meeting[0].autofill;
        }

        if (undefined === this.historicalData.plans[2].rooms.dormitory[0].operators) {
        } else {
          if (this.historicalData.plans[2].rooms.dormitory[0].skip) {
            this.switch_dormitory_plan2_0[2] = true;
          } else {
            this.dormitory_plan2_0 = this.historicalData.plans[2].rooms.dormitory[0].operators;
            this.switch_dormitory_plan2_0[0] = this.historicalData.plans[2].rooms.dormitory[0].sort;
            this.switch_dormitory_plan2_0[1] = this.historicalData.plans[2].rooms.dormitory[0].autofill;
          }
        }

        if (undefined === this.historicalData.plans[2].rooms.dormitory[1].operators) {
        } else {
          if (this.historicalData.plans[2].rooms.dormitory[1].skip) {
            this.switch_dormitory_plan2_1[2] = true;
          } else {
            this.dormitory_plan2_1 = this.historicalData.plans[2].rooms.dormitory[1].operators;
            this.switch_dormitory_plan2_1[0] = this.historicalData.plans[2].rooms.dormitory[1].sort;
            this.switch_dormitory_plan2_1[1] = this.historicalData.plans[2].rooms.dormitory[1].autofill;
          }
        }

        if (undefined === this.historicalData.plans[2].rooms.dormitory[2].operators) {
        } else {
          if (this.historicalData.plans[2].rooms.dormitory[2].skip) {
            this.switch_dormitory_plan2_2[2] = true;
          } else {
            this.dormitory_plan2_2 = this.historicalData.plans[2].rooms.dormitory[2].operators;
            this.switch_dormitory_plan2_2[0] = this.historicalData.plans[2].rooms.dormitory[2].sort;
            this.switch_dormitory_plan2_2[1] = this.historicalData.plans[2].rooms.dormitory[2].autofill;
          }
        }

        if (undefined === this.historicalData.plans[2].rooms.dormitory[3].operators) {
        } else {
          if (this.historicalData.plans[2].rooms.dormitory[3].skip) {
            this.switch_dormitory_plan2_3[2] = true;
          } else {
            this.dormitory_plan2_3 = this.historicalData.plans[2].rooms.dormitory[3].operators;
            this.switch_dormitory_plan2_3[0] = this.historicalData.plans[2].rooms.dormitory[3].sort;
            this.switch_dormitory_plan2_3[1] = this.historicalData.plans[2].rooms.dormitory[3].autofill;
          }
        }
      }

      this.$message({
        message: "导入成功",
        type: "success",
        showClose: true,
        duration: 3000,
      });
    },

    getNull() {},
    getList(list) {
      let listCopy = [];
      for (let i = 0; i < list.length; i++) {
        if (list[i]==void 0||list[i]==''||list[i]=='空置') {
          continue;
        }
        listCopy.push(list[i]);
      }
      return listCopy;
    },
    setPeriod(list) {
      if (list.length > 1) {
        list[0] = list[0].replace(/\uff1a/g, ":");
        list[1] = list[1].replace(/\uff1a/g, ":");
        let start = parseInt(list[0].substr(0, 2));
        let end = parseInt(list[1].substr(0, 2));
        if (list[0] === "") {
          console.log("这是个空时间段");
          return;
        }
        if (start > end) {
          return [
            [list[0], "23:59"],
            ["00:00", list[1]],
          ];
        }

        return [list];
      }
    },

    getOrder(str) {
      if ("换班前" === str) return "pre";
      if ("换班后" === str) return "post";
    },
    getPlanTimes(num) {
      console.log("这是一个", num, "班作业");
      if (num === 2) return "2班";
      if (num === 3) return "3班";
    },

    getProductValue(label) {
      if (label === "贸易站") return "trading";
      if (label === "制造站") return "manufacture";
      if (label === "龙门币") return "LMD";
      if (label === "合成玉") return "Orundum";
      if (label === "作战记录") return "Battle Record";
      if (label === "赤金") return "Pure Gold";
      if (label === "源石碎片") return "Originium Shard";
      if (label === "双芯片") return "Dualchip";
    },

    getOrderReverse(str) {
      if ("pre" === str) return "换班前";
      if ("post" === str) return "换班后";
    },

    getProductValueReverse(label) {
      if (label === "trading") return "贸易站";
      if (label === "manufacture") return "制造站";
      if (label === "LMD") return "龙门币";
      if (label === "Orundum") return "合成玉";
      if (label === "Battle Record") return "作战记录";
      if (label === "Pure Gold") return "赤金";
      if (label === "Originium Shard") return "源石碎片";
      if (label === "Dualchip") return "双芯片";
    },
    getPeriodReverse(list) {
      if (list.length === 1) {
        return list[0];
      } else {
        return [list[0][0], list[1][1]];
      }
    },
  },
};
</script>

<style>
.el-checkbox__label {
  color: grey;
}

.el-card__body {
  padding:12px;
}

.el-checkbox {
  padding: 0px 4px;
}

.el-radio-group{
  vertical-align: middle;
}
</style>
