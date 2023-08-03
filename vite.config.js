import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ssr from "vite-plugin-ssr/plugin";
import { visualizer } from "rollup-plugin-visualizer";
import externalGlobals from "rollup-plugin-external-globals";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
  const config = {
    plugins: [vue(), ssr()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      target: "es2015",
      cssTarget: "chrome61",
      rollupOptions: {},
    },
  };
  if (command == "build" && mode == "production" && !ssrBuild) {
    config.plugins.push(visualizer());
    config.build.rollupOptions = {
      external: ["vue", "element-plus", "js-cookie", "echarts", "@element-plus/icons-vue", "axios", "mdui"],
      plugins: [
        externalGlobals({
          vue: "Vue",
          "element-plus": "ElementPlus",
          "js-cookie": "Cookies",
          echarts: "echarts",
          "@element-plus/icons-vue": "ElementPlusIconsVue",
          axios: "axios",
          mdui: "mdui",
        }),
      ],
      output: {
        manualChunks: (id, { getModuleInfo }) => {
          if (getModuleInfo(id).isEntry) {
            if (id.includes("src/renderer")) {
              return "bundle";
            }
          } else if (!id.includes("/src/components/")) {
            return "bundle";
          }
        },
      },
    };
  }
  return config;
});
