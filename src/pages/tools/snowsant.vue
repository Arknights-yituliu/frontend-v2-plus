<script setup>
import { ref, onMounted } from "vue";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import axios from "axios";

const term_e = ref(null);
const input_e = ref(null);
const user_input = ref("");

const term = new Terminal();
const ws = new WebSocket("wss://ark.yituliu.cn/backend/snowsant");

const p_count = ref(0);
const P_LIMIT = ref(0);

onMounted(async () => {
  const resp = await axios.get("https://ark.yituliu.cn/backend/snowsant/p");
  p_count.value = resp.data.p_count;
  P_LIMIT.value = resp.data.P_LIMIT;

  if (p_count.value >= P_LIMIT.value) {
    return;
  }

  p_count.value += 1;

  input_e.value.focus();
  term.open(term_e.value);

  ws.onmessage = async (event) => {
    const text = await event.data.text();
    for (const c of text) {
      if (c == "\n") {
        term.write("\r");
      }
      term.write(c);
    }
  };
});

function submit() {
  const msg = user_input.value;
  user_input.value = "";
  term.write(msg + "\r\n");
  ws.send(msg);
}
</script>

<template>
  <div class="mdui-container mdui-typo">
    <h2>Konano的雪雉计算器</h2>
    <button class="mdui-btn mdui-btn-raised"><a href="https://github.com/Konano"><p>作者：Konano</p></a></button>
    <button class="mdui-btn mdui-btn-raised"><a href="https://github.com/Konano/snowsant-calculator" target="_blank"><p>代码仓库</p></a></button>
    <button class="mdui-btn mdui-btn-raised"><a href="https://ark.yituliu.cn/backend/snowsant/Konano的雪雉计算器.exe">
      <p>下载(windows)(4.4 MB) </p></a></button>
    <hr />
    <p>运算对网站服务器性能影响较大，仅供{{ P_LIMIT }}名用户同时使用。当前用户数量：{{ p_count }}</p>
    <p><em>请在下方的输入框中输入，按回车确认。</em></p>
    <div ref="term_e" id="terminal"></div>
    <p v-if="p_count >= P_LIMIT">请您稍后再试</p>
    <div class="mdui-textfield">
      <input ref="input_e" v-model="user_input" class="mdui-textfield-input" type="text" placeholder="按回车确认" @keyup.enter="submit" />
    </div>
  </div>
</template>

<style scoped>
.mdui-container {
  min-height: 100vh;
}
.mdui-btn{
  margin-right: 8px;
}

</style>
