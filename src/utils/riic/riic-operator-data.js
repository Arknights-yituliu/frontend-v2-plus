// 干员目录数据聚合模块。
//
// 这里的 438 个干员 JSON 在构建期被展开为静态导入，运行时只产生 **1 个 chunk**。
// 之所以不再用「非 eager 的 import.meta.glob」逐文件拆包：
//   1. 调用方 loadRiicEfficiencyCatalog() 本来就是 Promise.all 全量加载，
//      逐个拆 chunk 换不到任何按需收益；
//   2. 438 个 chunk 会让产物文件数暴涨（占 dist/assets 的 58%），
//      Rollup 写盘时在低 fd 上限的构建容器里会触发 EMFILE；
//   3. 438 个并发请求的头部开销远大于数据本身。
//
// 该模块只应被动态 import（见 riic-efficiency-adapter.js），
// 否则 1.6MB 数据会被静态引用它的页面一起加载。
const operatorModules = import.meta.glob(
  "/src/vendor/riic-efficiency/data/operators/*.json",
  { eager: true, import: "default" },
);

export const RIIC_OPERATOR_PROFILES = Object.values(operatorModules);
