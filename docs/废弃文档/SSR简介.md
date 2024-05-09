# SSR简介
## 什么是 SSR？

### 与 SPA 对比

在单页面应用（SPA）中，js 代码运行在浏览器里。用户打开网页时，在第一轮网络请求中，服务端返回一个带有空 `<div>` 标签的网页，用户看到的屏幕内容是空白的。浏览器解析网页中的链接，发起第二轮网络请求，下载 js。Js 渲染页面，用户才能看到页面内容。此时网页可以交互（可以显示加载动画等），但是不含数据。Js 发起第三轮网络请求，下载数据，随后将数据渲染到网页中，用户才能看到完整的、带有数据的网页。

服务端渲染（SSR）需要在服务端用 Node.js 运行 js 代码。在用户打开网页时，js 在服务端下载数据，生成带有数据的网页并返回。于是用户直接看到带有数据的网页。不过此时网页是不可交互的，要等浏览器解析链接、发起第二轮网络请求以下载 js 后，用户才可以与网页交互。

与 SPA 相比，SSR 减少了整整一轮的网络请求，而且用户能够在第一时间看到带有数据的完整网页，对于体验有明显的提升；搜索引擎爬虫也能直接抓取带有完整数据的网页，对于搜索引擎排名也非常有利。

### 灵活使用 SSR

在使用 SSR 时，需要注意，同样一套代码在服务端与浏览器两处运行，虽然它们都对应同样的网页结构，但起到的作用却并不相同。在服务端，代码负责生成 html；在浏览器中，代码不会操作 dom、再生成一遍相同的网页结构，而是激活（hydrate）在服务端生成的 html，为其添加交互性。

SSR 是非常灵活的。在服务端与客户端各做什么，完全视需求而定。对于有交互需求的一般数据展示网站，可以采用上一节所述的流程，但也完全可以像 SPA 那样，在浏览器中请求数据再渲染。也可以让一部分数据在服务端加载，另一部分在浏览器中请求。

很多前端的库在设计时只考虑了浏览器中的运行环境，有些在服务端运行没有意义（如 cookie 相关的代码），有些会出错（比如 ECharts 或 Element Plus 的一些组件）。我们可以只在浏览器中运行这部分代码，也可以在服务端通过一些手段模拟浏览器的环境，来运行它们。

### SSR 与路由

使用 SSR 时，既可以采用服务端路由，也可以使用客户端路由。服务端路由更简单，在切换页面时，通过链接，直接请求新的 html，不过这也意味着需要离开当前的页面。使用客户端导航时，页面内容的改变通过 js 进行，虽然比服务端导航复杂，但能实现更多功能。

### 推荐阅读

本项目使用了 vite-plugin-ssr，文档详细解释了许多 SSR 相关的概念。以下列出推荐阅读的部分：

- [SPA vs SSR (and more)](https://vite-plugin-ssr.com/SPA-vs-SSR)
- [Client-only Components](https://vite-plugin-ssr.com/client-only-components)
- [Server Routing VS Client Routing](https://vite-plugin-ssr.com/server-routing-vs-client-routing)

## SSR 相关代码说明

先看这个：[Vue 教程](https://cn.vite-plugin-ssr.com/vue-tour)

### renderer

`src/renderer` 路径下是关于网页渲染的代码。

首先是 [`app.js`](./src/renderer/app.js)，其中定义了函数 `createVPSApp()`。它的第二个参数是 `clientOnly`，用于区分页面是采用 SSR 还是 SPA 模式。对于前者，使用 Vue 的 `createApp`，对于后者，则是 `createSSRApp`。接下来使用选定的函数，使用 [`App.vue`](./src/App.vue) 创建一个 Vue 应用实例，并引入 Element Plus 及其图标。参考：[Render Modes (SPA, SSR, SSG, HTML-only)](https://cn.vite-plugin-ssr.com/render-modes) 中 _2. render() hooks (SPA + SSR)_ 一节、[AaronBeaudoin/vite-plugin-ssr-example](https://github.com/AaronBeaudoin/vite-plugin-ssr-example) 中的示例代码。

接下来是 [`usePageContext.js`](./src/renderer/usePageContext.js)。PageContext 包含渲染当前页面所需的信息。它有两个重要的作用：一是为服务端与客户端代码统一地提供 URL 信息，二是传递数据。第一点，在浏览器中，URL 相关信息可以直接获取；在服务端，则由网页服务器提供。统一使用 pageContext，即可方便地获取 URL 相关信息。第二点，网页中的交互式部分，其数据在服务端与浏览器中均要用到：在服务端，使用数据渲染 html；在浏览器中，也要使用这些数据进行交互处理。使用 pageContext 传递数据时，vite-plugin-ssr 框架会把服务端下载到的数据序列化为 JSON，附在生成的 html 中。在浏览器中，反序列化这部分数据，浏览器中的代码也能访问到这些数据了。参考：[Data Fetching](https://vite-plugin-ssr.com/data-fetching) 及 [pageContext](https://vite-plugin-ssr.com/pageContext)。

每个页面默认运行 [`_default.page.client.js`](./src/renderer/_default.page.client.js) 和 [`_default.page.server.js`](./src/renderer/_default.page.server.js)。`_default.page.client.js` 只运行在浏览器中，而 `_default.page.server.js` 只运行在服务端。两个文件各定义了 `render` 函数。如果页面采用 SPA 模式，则后端生成一个含加载页面的 html，前端将网页以 SPA 模式渲染。如果页面使用 SSR 模式，后端将网页渲染成 html 并返回，前端进行激活。

渲染网页时，还需要网页的标题等信息，在下面的 pages 一节中提到。

### server

SSR 需要在服务端渲染页面。在开发与部署时，调用渲染代码、返回网页均由 [`server/index.js`](./server/index.js) 实现。此文件来源于 vite-plugin-ssr 的脚手架（[文件链接](https://github.com/brillout/vite-plugin-ssr/blob/main/boilerplates/boilerplate-vue/server/index.js)）。

由于我们使用的反代 Nginx 目前不支持 103 状态码，因此关闭了 [Early Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/103) 相关的功能。

### pages

在 [`src/pages`](./src/pages) 目录下，是各个页面的文件。根据文件名与目录结构，确定对应页面的 URL。文件名为 `*.page.js` 的代码同时运行在客户端与服务端，`*.page.server.js` 的代码只在服务端运行，`*.page.client.js` 的代码只在客户端运行。参考：[Filesystem Routing](https://vite-plugin-ssr.com/filesystem-routing)

渲染页面时要用到页面的标题与描述信息。在 `*.page.js`（或 `*.page.vue` 的 `<script>` 标签）中加入以下代码即可：

```javascript
export const documentProps = {
  title: "一图流 - 礼包性价比",
  description: "明日方舟一图流，礼包性价比，礼包内容，氪金规划",
};
```

### 示例：添加新页面

下面举例说明如何在项目中添加新页面。

首先确定礼包页面的路径（`/demo`），由此得到文件应为 `src/pages/demo.page.vue`（也可以用 `src/pages/demo/index.page.vue`）。我们对此页面使用 SSR 的渲染方式，因此还要新建对应的 `demo.page.server.js`，在其中下载数据并添加到 `pageContext` 中。

`demo.page.vue`：

```vue
<template>
  <div @click="data = 'qwerty'">
    {{ data }}
  </div>
</template>

<script setup>
import { usePageContext } from "@/renderer/usePageContext";
import { ref } from "vue";

const pageContext = usePageContext();
const data = ref(pageContext.pageProps.data);
</script>

<script>
export const documentProps = {
  title: "示例页面",
  description: "示例描述",
};
</script>
```

`demo.page.server.js`：

```javascript
export async function onBeforeRender(pageContext) {
  const data = "Hello, World!";
  const pageProps = { data };
  return {
    pageContext: {
      pageProps,
    },
  };
}
```

## 哪些页面用了 SSR？

- 首页（`/`）：打开网页后，屏幕空间几乎全被蓝材料占据。如果只对蓝材料部分采用服务端渲染，就能得到不错的效果。如果所有数据都在服务端渲染，经过 gzip 压缩后的页面大小约为 65 KB，完全可以接受，所以对整个首页都采用 SSR。
- 攒抽（`/gachaCal`）：虽然页面的交互性很强，在下载 js 前无法使用，但使用服务端渲染能更早看到页面，显得加载速度更快。
- 基建排班（`/riicCal`）：在浏览器中渲染。因为这个页面的加载速度实在是太慢了，如果用服务端渲染，页面到达之后有很长时间不能交互，看起来像坏了一样。所以还是在浏览器中渲染，至少页面显示出来的时候就是可交互的。
- 礼包性价比（`/pack`）：在服务端渲染。