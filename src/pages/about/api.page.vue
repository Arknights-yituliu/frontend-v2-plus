<template>
  <div class="api_page mdui-typo">
    <h1><b>一图流API文档</b></h1>
    <p>HTTP GET</p>
    <h2><b>一图流API请求说明</b></h2>
    <div class="mdui-table-fluid">
      <table class="mdui-table mdui-table-hoverable">
        <thead>
          <tr>
            <th style="width: 100px">注意事项</th>
            <th style="width: 600px">说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>请求 URL</td>
            <td>/API路径?参数名=参数值&参数名=参数值......</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>HTTP POST</p>
    <div class="mdui-table-fluid">
      <table class="mdui-table mdui-table-hoverable">
        <thead>
          <tr>
            <th style="width: 100px">注意事项</th>
            <th style="width: 600px">说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>请求 URL</td>
            <td>/API路径</td>
          </tr>
          <tr>
            <td>请求体</td>
            <td>请求体可以使用 JSON 也可以使用 Form 表单，一般为json</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2><b>一图流API响应格式说明</b></h2>

    <p>一般情况下API无论GET、POST或其他请求，调用成功后返回的都是统一格式，格式如下</p>
    <pre class="response">{{ parse(apiResponseDemo) }}</pre>
    <p>统一响应格式字段说明</p>
    <div class="mdui-table-fluid">
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
            <td>msg</td>
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
    <p>因此文档后续除特殊情况外，只说明data（返回数据）内字段</p>

    <h1><b>公开的API</b></h1>

    <div class="mdui-panel mdui-panel-gapless api_wrap" mdui-panel v-for="(api, index) in APIList" :key="index" :id="api.path">
      <div class="mdui-panel-item mdui-panel-item-open">
        <div class="mdui-panel-item-header api-header">
          <h2>
            <b>#&nbsp;{{ api.apiContent }} &emsp;{{ api.requestMethod }}</b> <br />
            <div class="api_wrap_divider"></div>
          </h2>

          <p>{{ api.description }}</p>
        </div>

        <div class="mdui-panel-item-body">
          <h3><b> API路径</b></h3>

          <div class="requestURL">
            {{ api.path }}
          </div>

          <h3><b> 请求参数</b></h3>

          <div v-show="api.requestParms === undefined">无参数</div>

          <div class="mdui-table-fluid" v-show="api.requestParms !== undefined">
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
</template>

<script setup>
import { ref } from "vue";
import apiJson from "/src/static/json/api.json";
import { cMessage } from "/src/custom/message";

let visibleList = ref([0, 1, 2, 3, 4, 5, 6, 7]);
// let visibleList = ref([])

let APIList = ref(apiJson);
let language = ref("cn");

// var origin = window.location.origin
var origin = "https://ark.yituliu.cn/backend";

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

let apiResponseDemo = {
  code: 200,
  msg: "调用成功",
  data: {},
};

let apiResponse = ref({
  code: 200,
  msg: "调用成功",
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

<style scoped lang="scss">
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

.api_wrap_divider {
  border-bottom: 1px solid rgb(109, 109, 109);
  width: 100%;

  margin-top: 4px;
  margin-bottom: 4px;
}

.table_header {
  margin: 8px;
  display: block;
}

.api_page {
  width: 800px;
  margin: auto;
}

.api_wrap {
  margin-bottom: 24px;
}

.api-header {
  height: 96px;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;

  h2 {
    margin: 0;
  }
}

.api_response_table {
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
}

.try_btn {
  margin: auto;
}

.response {
  background: #4e4e4e;
  border-radius: 3px;
  color: white;
  overflow: auto;

  max-height: 480px;
}
</style>
