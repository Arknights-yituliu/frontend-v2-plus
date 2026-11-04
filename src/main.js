import {createApp} from 'vue'
import {createHead} from '@unhead/vue/client'

import { plugin as Slicksort } from 'vue-slicksort'
import App from './App.vue'
import router from "/src/router/index.js";

// Element Plus 与 Naive UI 的组件由 unplugin-vue-components 在构建时按需引入，
import 'element-plus/dist/index.css'
import "element-plus/theme-chalk/dark/css-vars.css";

import 'vuetify/styles'
import vuetify from "/src/plugins/vuetify/vuetify.js";



const app = createApp(App)
const head = createHead()

// const files = import.meta.glob('/src/custom/*.vue', {eager: true})
// for (let index in files) {
//     const name = files[index].default.__name
//     app.component('c-' + name, files[index].default)
// }


app.use(Slicksort)
app.use(router)
app.use(vuetify)
app.use(head)
app.mount('#app')
