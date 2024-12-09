import {createApp} from 'vue'

import ElementPlus from 'element-plus'
import App from './App.vue'
import router from "./router/index.js";


import 'element-plus/dist/index.css'
import "element-plus/theme-chalk/dark/css-vars.css";
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

// Vuetify
import 'vuetify/styles'
import vuetify from "/src/plugins/vuetify/vuetify.js";
import '/src/plugins/vuetify/vuetify.scss'


const app = createApp(App)

const files = import.meta.glob('/src/custom/*.vue', {eager: true})
for (let index in files) {
    const name = files[index].default.__name
    app.component('c-' + name, files[index].default)
}


app.use(ElementPlus, {locale: zhCn,})
app.use(router)
app.use(vuetify)
app.mount('#app')
