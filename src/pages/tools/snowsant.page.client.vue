<script setup>
import { ref, onMounted } from "vue";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

const term_e = ref(null);
const input_e = ref(null);
const user_input = ref("");

const term = new Terminal();
const ws = new WebSocket("wss://backend.yituliu.site/snowsant");

onMounted(() => {
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
  <div class="mdui-container">
    <div ref="term_e" id="terminal"></div>
    <div class="mdui-textfield">
      <input ref="input_e" v-model="user_input" class="mdui-textfield-input" type="text" placeholder="按回车确认" @keyup.enter="submit" />
    </div>
  </div>
</template>
