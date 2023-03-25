import { createSSRApp, createApp, h } from "vue";
import ElementPlus, { ID_INJECTION_KEY } from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import App from "@/App.vue";
import { setPageContext } from "./usePageContext";

export { createVPSApp };

function createVPSApp(pageContext, clientOnly) {
  const { Page, pageProps } = pageContext;
  const createAppFunc = clientOnly ? createApp : createSSRApp;
  const PageWithLayout = {
    render() {
      return h(App, pageProps || {}, {
        default() {
          return h(Page, pageProps || {});
        },
      });
    },
  };

  const app = createAppFunc(PageWithLayout);
  
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }
  app.use(ElementPlus);
  if (!clientOnly) {
    app.provide(ID_INJECTION_KEY, {
      prefix: 1024,
      current: 0,
    });
  }

  // We make pageContext available from any Vue component
  setPageContext(app, pageContext);

  return app;
}