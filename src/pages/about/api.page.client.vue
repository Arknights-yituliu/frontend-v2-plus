<template>
  <div class="api_page mdui-typo">
    <h1><b>一图流API文档</b></h1>
    <h2><b>一图流API响应格式说明</b></h2>

    <p>一般情况下API无论GET、POST或其他请求返回的都是统一格式，格式如下</p>
    <div class="mdui-table-fluid api_response_table">
      <table class="mdui-table mdui-table-hoverable">
        <thead>
          <tr>
            <th>参数名</th>
            <th>类型</th>
            <th>参数说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>code</td>
            <td>int</td>
            <td>响应状态值</td>
          </tr>
          <tr>
            <td>mes</td>
            <td>string</td>
            <td>响应信息</td>
          </tr>
          <tr>
            <td>data</td>
            <td>object</td>
            <td>返回数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>因此文档后续只展示data（返回数据）内字段</p>

    <h2><b>公开的API</b></h2>

    <div class="api_wrap" >
      <div class="mdui-collapse" mdui-collapse v-for="(api, index) in APIList" :key="index" :id="api.path">
        <div class="mdui-collapse-item mdui-collapse-item-open" >
          <div class="mdui-collapse-item-header">
            <h3><b>{{ api.apiContent }} &emsp;{{ api.requestMethod }}</b></h3>
          </div>

          <div class="mdui-collapse-item-body">
            <h3><b> API路径</b></h3>

            <div class="requestURL">
              {{ api.path }}
            </div>

            <h3><b> 请求参数</b></h3>

            <div v-show="api.requestParms === undefined">无参数</div>

            <div class="mdui-table-fluid api_response_table" v-show="api.requestParms !== undefined">
              <table class="mdui-table mdui-table-hoverable">
                <thead>
                  <tr>
                    <th>参数名</th>
                    <th>参数类型</th>
                    <th>参数说明</th>
                    <th>参数值</th>
                  </tr>
                </thead>

                <tbody>
                  <tr v-for="(parm, index) in api.requestParms" :key="index">
                    <td>{{ parm.name }}</td>
                    <td>{{ parm.type }}</td>
                    <td>{{ parm.description }}</td>
                    <td>
                      <div class="mdui-textfield">
                        <input class="mdui-textfield-input" type="text" :placeholder="parm.value" v-model="parm.value" />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3><b> 请求格式示例</b></h3>

            <div class="requestURL">
              {{ requestURL(index) }}
            </div>

            <h3><b> 返回字段说明</b></h3>

            <div class="api_response_table" v-for="(model, index) in api.model" :key="index">
              <p class="table_header">{{ model.description }}</p>

              <table class="mdui-table mdui-table-hoverable">
                <thead>
                  <tr>
                    <th>参数名</th>
                    <th>参数类型</th>
                    <th>参数说明</th>
                  </tr>
                </thead>

                <tbody>
                  <tr v-for="(value, index) in model.value" :key="index">
                    <td>{{ value.name }}</td>
                    <td>{{ value.type }}</td>
                    <td>{{ value.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button class="mdui-btn mdui-color-blue-accent mdui-ripple tryBtn" @click="tryBtn(index)">尝试一下</button>

            <h3><b> 服务响应结果</b></h3>

            <div class="response_body">
              <div>返回消息体</div>
              <pre class="response">{{ parse(apiResponse) }}</pre>
            </div>

            <div class="nullblock"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import apiJson from "@/static/json/api.json";
import { cMessage } from "@/element/message";

let visibleList = ref([0, 1, 2, 3, 4, 5, 6, 7]);
// let visibleList = ref([])

let APIList = ref(apiJson);
let language = ref("cn");

// var origin = window.location.origin
var origin = "https://backend.yituliu.site";

function parse(obj) {
  return JSON.stringify(obj, null, 4);
}

function requestURL(index) {
  var item = APIList.value[index];
  let url = origin + item.path;
  for (let i in item.requestParms) {
    url = url + "?" + item.requestParms[i].name + "=" + item.requestParms[i].value;
  }
  return url;
}

let apiResponse = ref({
  code: 200,
  mes: "调用成功",
  data: {},
});

function tryBtn(index) {
  axios.get(requestURL(index)).then(
    (response) => {
      cMessage("调用成功");
      // console.log(response.data)
      apiResponse.value = response.data;
    },
    (response) => {
      console.log("error");
    }
  );
}

let menu_index = ref(0);
</script>

<style scoped>
.title1 {
  font-size: 32px;
  font-weight: 700;
}
.title2 {
  font-size: 28px;
  font-weight: 600;
}
.title3 {
  font-size: 24px;
  font-weight: 600;
}
.title4 {
  font-size: 20px;
  font-weight: 600;
}

.table_header {
  margin: 8px;
  display: block;
}

.api_page {
  width: 96%;
  margin: auto;
}
.api_response_table {
  width: 810px;
  margin-top: 20px;
}

.noParm {
  margin-left: 30px;
}

.tryBtn {
  margin: auto;
  margin-top: 10px;
  font-weight: 600;
  /* margin-bottom: 10px; */
}

.requestURL {
  background: #4e4e4e;
  color: white;
  padding: 2px;
  padding-left: 10px;
  border-radius: 4px;
  height: 32px;
  line-height: 32px;
  width: 800px;
}

.try_btn {
  margin: auto;
}

.response {
  background: #4e4e4e;
  border-radius: 3px;
  color: white;
  overflow: auto;
  width: 810px;
  max-height: 480px;
}
</style>
