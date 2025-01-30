<template>

  <v-card>
    <v-card-text>
      <!-- 种子输入框 -->
      <v-text-field :rules="seedInputRules" v-model="seedForm.seed" variant="outlined" hide-details="auto" dense>
        <template v-slot:label>
          <span style="color: red">*</span>在此粘贴种子
        </template>
      </v-text-field>
      <v-radio-group inline hide-details="auto" class="m-8-a" v-model="seedForm.seedType" color="primary">
        <v-radio :label="item.label" :value="item.value" v-for="item in seedType"></v-radio>
      </v-radio-group>
      <!-- 描述输入框 -->
      <v-textarea v-model="seedForm.description"
                  variant="outlined"
                  :rules="descriptionRules"
                  hide-details="auto"
                  dense
                  placeholder="写下你的描述"
                  counter
      >
        <template v-slot:label>
          <span style="color: red">*</span>简单描述一下这个种子（最少10字）
        </template>
      </v-textarea>
      <!-- 编队选择按钮组 -->
      <div class="my-2">
        <!-- <h4>编队：</h4> -->
        <v-select v-model="seedForm.squad" label="（非必填）选择分队，可多选" variant="outlined" hide-details="auto"
                  :items="teams" chips multiple></v-select>
      </div>

      <div class="my-2">
        <v-text-field v-model="seedForm.score" label="（非必填）结算分数" hide-details="auto" variant="outlined"
                      type="number"
                      color="primary"></v-text-field>
      </div>
      <div class="my-2">
        <v-btn color="success" @click="uploadSeed">
          填好了，上传种子！
        </v-btn>
      </div>
    </v-card-text>
  </v-card>

</template>

<script setup>

import {ref} from "vue";
import rogueSeedAPI from "/src/api/rogueSeed.js";
import deepClone from "/src/utils/deepClone.js";
import {cMessage} from "/src/utils/message.js";

const teams = ["不限分队", "因地制宜", "魂灵护送", "博闻广记", "蓝图测绘", "指挥分队", "集群分队",
  "后勤分队", "矛头分队", "近锋分队", "重辅分队", "狙医分队", "术特分队", "高规格", "点刺成锭", "拟态学者", "异想天开", "专业人士"] // 编队选项
const seedType = [{label: "胡种", value: 1}, {label: "毒种", value: 2}, {label: "特殊种", value: 3}]

const seedInputRules = [value => extractContent(value)]

const descriptionRules = [
  v => {
    if (v.length < 10) {
      return '最少需要输入10个字'
    }
  },

  v => {
    if (v.length > 200) {
      return '至多可输入200个字'
    }
  }
]

function extractContent(inputString) {
  inputString = inputString.replace(/[ \f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]+/g, '');
  // 正则表达式匹配[]中的内容
  if (inputString.indexOf("]") > -1) {
    console.log('有方括号')
    let content = inputString.slice(0, inputString.indexOf("]"))
    content = content.replace('[', '')
    // 如果匹配成功，检查提取出的内容是否符合特定格式
    return validateFormat(content);
  } else {
    console.log('没有方括号')
    // 如果没有方括号，则直接验证输入字符串的格式
    return validateFormat(inputString);
  }
}

const formatRegex = /^[A-Za-z0-9]{18},rogue_4,\d{1,2}$/;

function validateFormat(str) {
  console.log('要验证的字符串', str)
  if (formatRegex.test(str)) {
    // 如果字符串符合特定格式，返回原字符串
    seedForm.value.seed = str
  } else {
    // 如果不符合特定格式，返回提示信息
    return "正确种子格式为第一个逗号前为18个字符，第二个逗号后为1到2位数字";
  }
}

let seedForm = ref({
  "seed": "",
  "seedType": 0,
  "difficulty": 15,
  "rogueVersion": "DLC_2",
  "rogueTheme": "rogue_4",
  "squad": [],
  "score": 0,
  "source": '一图流',
  "operatorTeam": [''],
  "description": "",
  "tags": ["萨卡兹的无终奇语", "DLC_2"],
  "summaryImageLink": ""
})


function uploadSeed() {
  let data = deepClone(seedForm.value)

  data.difficulty = _extractNumberAfterSecondComma(data.seed)

  rogueSeedAPI.uploadRogueSeed(data).then(response => {
    cMessage('上传成功')
  })

  function _extractNumberAfterSecondComma(inputString) {
    // 首先以逗号分割字符串
    const parts = inputString.split(',');
    // 检查是否至少有3部分，保证有足够的逗号
    if (parts.length >= 3) {
      // 返回第二逗号后的数字（即数组的第三项）
      return parts[2];
    } else {
      return "输入字符串格式不正确，无法提取数字。";
    }
  }
}


</script>

<style scoped>
.text-h5 {
  font-size: 1.5rem;
  font-weight: bold;
}


</style>
