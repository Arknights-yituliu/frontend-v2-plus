<template>
  <v-container>
    <v-card>
      <v-card-title class="text-h5">种子上传</v-card-title>
      <v-card-text>
        <!-- 种子输入框 -->
        <v-text-field clearable v-model="seed" variant="outlined" hide-details="auto" dense
          placeholder="在此粘贴种子"></v-text-field>
        <v-radio-group inline  hide-details="auto" style="margin: 8px auto;">
          <v-radio label="胡种" value="one" style="padding-right: 8px;"></v-radio>
          <v-radio label="毒种" value="two" style="padding-right: 8px;"></v-radio>
          <v-radio label="特殊种" value="three" style="padding-right: 8px;"></v-radio>
        </v-radio-group>
        <!-- 描述输入框 -->
        <v-textarea label="简单描述一下这个种子" clearable v-model="description" variant="outlined" hide-details="auto" dense
          placeholder="简单描述一下这个种子"></v-textarea>

        <!-- 编队选择按钮组 -->
        <div class="my-2">
          <!-- <h4>编队：</h4> -->
          <v-select v-model="selectedTeams" hide-details="auto" :items="teams"></v-select>
          <!-- <v-row dense>
              <v-col cols="auto" v-for="team in teams" :key="team">
                <v-btn :class="{ 'selected': selectedTeams.includes(team) }" color="primary" outlined
                  @click="toggleTeam(team)">
                  {{ team }}
                </v-btn>
              </v-col>
            </v-row> -->

        </div>
        <div class="my-2">
          <v-text-field v-model="score" label="（可选）结算分数" hide-details="auto" variant="outlined" type="number"
            color="primary"></v-text-field>
        </div>
        <div class="my-2">
          <v-btn color="success" outlined @click="seedType = '胡种'">
            填好了，上传种子！
          </v-btn>
        </div>
      </v-card-text>

    </v-card>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      seed: "", // 种子名称
      description: "", // 种子描述
      tags: ["胡种", "毒种", "特殊种"], // tag选项
      teams: ["-不限分队-", "因地制宜", "魂灵护送", "博闻广记", "蓝图测绘", "指挥分队", "集群分队", "后勤分队", "矛头分队", "近锋分队", "重辅分队", "狙医分队", "术特分队", "高规格", "点刺成锭", "拟态学者", "异想天开", "专业人士"], // 编队选项
      selectedTag: null,
      selectedTeams: [], // 用户选择的编队
      seedType: null, // 种子类型
    };
  },
  methods: {
    uploadSeed() {
      if (!this.seed || !this.seedType) {
        alert("请填写种子名称并选择种子类型！");
        return;
      }
      // 上传逻辑
      console.log("种子名称：", this.seed);
      console.log("种子描述：", this.description);
      console.log("选择的编队：", this.selectedTeams);
      console.log("种子类型：", this.seedType);
      alert("种子上传成功！");
    },
    selectTag(tag) {
      this.selectedTag = tag; // 设置为选中的按钮
    },
  },
};
</script>

<style scoped>
.text-h5 {
  font-size: 1.5rem;
  font-weight: bold;
}

.my-4 {
  margin: 1rem 0;
}
</style>
