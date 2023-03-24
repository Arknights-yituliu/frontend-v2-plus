export { render };
// See https://vite-plugin-ssr.com/data-fetching
export const passToClient = ["pageProps", "urlPathname", "urlParsed"];

import { renderToString } from "@vue/server-renderer";
import { escapeInject, dangerouslySkipEscape } from "vite-plugin-ssr";
import { createVPSApp } from "./app";

async function render(pageContext) {
  // See https://vite-plugin-ssr.com/head
  const { documentProps } = pageContext.exports;
  const title = (documentProps && documentProps.title) || "明日方舟一图流";
  const desc = (documentProps && documentProps.description) || "明日方舟一图流";

  const { Page } = pageContext;
  let appHtml;
  if (Page) {
    const app = createVPSApp(pageContext, false);
    appHtml = await renderToString(app);
  } else {
    appHtml = `<div id="client_only" style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding-top: 200px;">
                <img style="width: 128px;" src="/img/website/icon-large.webp" />
                <div style="font-size: 32px; font-weight: bold; font-family: sans-serif; margin: 40px 0 10px 0;">${title}</div>
                <div style="font-size: 32px; font-family: sans-serif;">加载中……</div>
              </div>`;
  }

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=0.68, maximum-scale=0.68, user-scalable=no" />
        <meta name="description" content="${desc}" />
        <meta name="keywords" content="素材获取,一图流,明日方舟,攒抽计算器,公招招募计算,基建排班生成器,刷图推荐,性价比,公开招募,掉率" />
        <title>${title}</title>
        <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
      </head>
      <body>
        <div id="app">${dangerouslySkipEscape(appHtml)}</div>
        <script src="https://unpkg.com/vue@3.2.47/dist/vue.runtime.global.prod.js"></script>
        <script src="https://unpkg.com/element-plus@2.3.0/dist/index.full.min.js"></script>
        <script src="https://unpkg.com/axios@1.3.4/dist/axios.min.js"></script>
        <script src="https://unpkg.com/js-cookie@3.0.1/dist/js.cookie.min.js"></script>
        <script src="https://unpkg.com/echarts@5.4.1/dist/echarts.min.js"></script>
        <script src="https://unpkg.com/@element-plus/icons-vue@2.1.0/dist/index.iife.min.js"></script>
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: {
      // We can add some `pageContext` here, which is useful if we want to do page redirection https://vite-plugin-ssr.com/page-redirection
    },
  };
}
