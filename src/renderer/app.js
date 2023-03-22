import { createSSRApp, h } from "vue";
import ElementPlus, { ID_INJECTION_KEY } from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import App from "@/App.vue";
import { setPageContext } from "./usePageContext";

export { createApp };

function createApp(Page, pageProps, pageContext) {
  const PageWithLayout = {
    render() {
      return h(
        App,
        {},
        {
          default() {
            return h(Page, pageProps || {});
          },
        }
      );
    },
  };

  const app = createSSRApp(PageWithLayout);
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }
  app.use(ElementPlus);
  app.provide(ID_INJECTION_KEY, {
    prefix: 1024,
    current: 0,
  });

  // We make pageContext available from any Vue component
  setPageContext(app, pageContext);

  return app;
}
