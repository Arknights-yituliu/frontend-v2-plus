<template>
    <v-container>
          <v-row>
            <v-col cols="12" sm="6" md="4" lg="3">
              <v-card outlined>
                <v-card-title>种子名称: 毒示例1</v-card-title>
                <v-card-subtitle>得分: 95</v-card-subtitle>
                <v-card-text>
                  <p>难度: 高</p>
                  <p>版本: 1.0.1</p>
                </v-card-text>
                <v-card-actions>
                  <v-btn color="success" text>查看详情</v-btn>
                  <v-btn color="primary" text>收藏</v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="4" lg="3">
              <v-card outlined>
                <v-card-title>种子名称: 胡种示例2</v-card-title>
                <v-card-subtitle>得分: 89</v-card-subtitle>
                <v-card-text>
                  <p>难度: 中</p>
                  <p>版本: 1.2.0</p>
                </v-card-text>
                <v-card-actions>
                  <v-btn color="success" text>查看详情</v-btn>
                  <v-btn color="primary" text>收藏</v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
    </v-container>
  </template>
  
  <script>
  export default {
    name: "HuZhongBang",
  };
  </script>
  
  <style scoped>
  .text-h5 {
    font-size: 1.5rem;
    font-weight: bold;
  }
  </style>
  