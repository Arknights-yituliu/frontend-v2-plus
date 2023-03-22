export { render };
// See https://vite-plugin-ssr.com/data-fetching
export const passToClient = ["pageProps", "urlPathname", "urlParsed"];

import { renderToString } from "@vue/server-renderer";
import { escapeInject, dangerouslySkipEscape } from "vite-plugin-ssr";
import { createApp } from "./app";

async function render(pageContext) {
  const { Page, pageProps } = pageContext;
  // This render() hook only supports SSR, see https://vite-plugin-ssr.com/render-modes for how to modify render() to support SPA
  if (!Page) throw new Error("My render() hook expects pageContext.Page to be defined");
  const app = createApp(Page, pageProps, pageContext);

  const appHtml = await renderToString(app);

  // See https://vite-plugin-ssr.com/head
  const { documentProps } = pageContext.exports;
  const title = (documentProps && documentProps.title) || "Vite SSR app";
  const desc = (documentProps && documentProps.description) || "App using Vite + vite-plugin-ssr";

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="${desc}" />
        <title>${title}</title>
        <script defer src="https://unpkg.com/vue@3.2.47/dist/vue.runtime.global.prod.js"></script>
        <script defer src="https://unpkg.com/element-plus@2.3.0/dist/index.full.min.js"></script>
        <script defer src="https://unpkg.com/axios@1.3.4/dist/axios.min.js"></script>
        <script defer src="https://unpkg.com/js-cookie@3.0.1/dist/js.cookie.min.js"></script>
        <script defer src="https://unpkg.com/echarts@5.4.1/dist/echarts.min.js"></script>
        <script defer src="https://unpkg.com/@element-plus/icons-vue@2.1.0/dist/index.iife.min.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css" />
      </head>
      <body>
        <div id="app">${dangerouslySkipEscape(appHtml)}</div>
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: {
      // We can add some `pageContext` here, which is useful if we want to do page redirection https://vite-plugin-ssr.com/page-redirection
    },
  };
}
