<template>
  <v-container>
    <v-card>
      <v-card-title class="text-h5">种子上传</v-card-title>
      <v-card-text>
        <!-- 种子输入框 -->
        <v-text-field label="粘贴种子" v-model="seed" outlined dense placeholder="请输入种子名称"></v-text-field>

        <!-- 描述输入框 -->
        <v-textarea label="种子描述" v-model="description" outlined dense placeholder="请输入种子描述"></v-textarea>
        <!-- 种子类型三联按钮 -->
        <div class="my-4">
          <h4>选择种子类型并上传：</h4>
          <v-row dense>
            <v-col cols="auto">
              <v-btn color="success" outlined @click="seedType = '胡种'">
                上传胡种
              </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn color="error" outlined @click="seedType = '毒种'">
                上传毒种
              </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn color="warning" outlined @click="seedType = '特殊种'">
                上传特殊种
              </v-btn>
            </v-col>

          </v-row>
        </div>

        <!-- 编队选择按钮组 -->
        <div class="my-4">
  <h4>（可选）选择编队：</h4>
  <v-btn-toggle v-model="selectedTeams" multiple>
    <v-btn v-for="team in teams" :key="team" color="primary" outlined>{{ team }}</v-btn>
  </v-btn-toggle>
</div>
<div class="my-4">
  <v-text-field
    v-model="score"
    label="（可选）结算分数"
    outlined
    type="number"
    color="primary"
  ></v-text-field>
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
      teams: ["编队1", "编队2", "编队3", "编队4", "编队5", "编队6", "编队7", "编队8", "编队9", "编队10"], // 编队选项
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
