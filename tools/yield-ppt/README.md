# 收益速览本地生成器

公开页面只导出素材包，不包含 PPT 模板和 PowerPoint 自动化逻辑。

## 使用方式

1. 在公开页面 `/lb/yield-ppt` 下载素材包，或把素材写入本期目录。
2. 将素材包解压到本期目录，例如：
   `D:\AK\2026\A202608\A2608-收益速览`
3. 将模板 PPT 放在同一目录。
4. 运行：

```bat
Generate-YieldOverviewPpt.cmd "D:\AK\2026\A202608\A2608-收益速览" "A2608-收益速览模板.pptx"
```

也可以指定输出文件名：

```bat
Generate-YieldOverviewPpt.cmd "D:\AK\2026\A202608\A2608-收益速览" "A2608-收益速览模板.pptx" "A2608-收益速览.pptx"
```

模板路径和输出路径必须位于期号目录内。脚本会读取 `yield-overview-manifest.json`，复制模板并生成 PPT。

素材包可以不完整。缺失图片时，脚本会保留对应的模板内容，方便在 PowerPoint 中手动补齐；搓玉表也始终保留模板原样。
