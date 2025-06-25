import {createApp} from 'vue'

import App from '/docs/App.vue'
import router from "/docs/router/index.js";

import 'vuetify/styles'
import vuetify from "/docs/plugins/vuetify.js";



const docsApp = createApp(App)



docsApp.use(router)
docsApp.use(vuetify)
docsApp.mount('#docs')
