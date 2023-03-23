import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ssr from "vite-plugin-ssr/plugin";
import { visualizer } from "rollup-plugin-visualizer";
import externalGlobals from "rollup-plugin-external-globals";

import legacy from "@vitejs/plugin-legacy";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
  const config = {
    plugins: [vue(), ssr(), legacy()],
    // plugins: [vue(), ssr()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      cssTarget: "chrome61",
      rollupOptions: {},
    },
  };
  if (command == "build" && mode == "production" && !ssrBuild) {
    config.plugins.push(visualizer());
    // config.plugins.push(legacy());
    config.build.rollupOptions = {
      external: ["vue", "element-plus", "js-cookie", "echarts", "@element-plus/icons-vue", "axios"],
      plugins: [
        externalGlobals({
          vue: "Vue",
          "element-plus": "ElementPlus",
          "js-cookie": "Cookies",
          echarts: "echarts",
          "@element-plus/icons-vue": "ElementPlusIconsVue",
          axios: "axios",
        }),
      ],
    };
  }
  return config;
});
