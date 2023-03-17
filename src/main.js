import { createApp } from "vue";
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
// import "element-plus/dist/index.css";
// import { createPinia } from 'pinia'

import App from "./App.vue";
import router from "./router";

const app = createApp(App);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// app.use(createPinia())
app.use(ElementPlus);
app.use(router);

app.mount("#app");
