import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { visualizer } from "rollup-plugin-visualizer";
import externalGlobals from "rollup-plugin-external-globals";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), visualizer()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      external: ["vue", "element-plus", "vue-router", "js-cookie", "echarts", "@element-plus/icons-vue", "axios"],
      plugins: [
        externalGlobals({
          vue: "Vue",
          "element-plus": "ElementPlus",
          "vue-router": "VueRouter",
          "js-cookie": "Cookies",
          echarts: "echarts",
          "@element-plus/icons-vue": "ElementPlusIconsVue",
          "axios": "axios",
        }),
      ],
    },
  },
});
