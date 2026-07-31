# 收益速览 PPT 本地组装器

公开页面 `/lb/yield-ppt` 只负责导出素材包。这个本地工具读取素材包与本期 PPT 模板，自动将已有图片放入对应模板页并生成成品 PPT。

需要本机安装 Microsoft PowerPoint。工具通过 PowerPoint 自动化编辑模板副本，因此会保留模板原有的动画。

## 使用方式

1. 在 `/lb/yield-ppt` 选择本期素材包目录，生成并写入素材与 `yield-overview-manifest.json`。
2. 将素材包目录和模板 PPT 放在本期目录下。素材包可以是子目录，例如：
   `D:\AK\2026\A202608\A2608收益速览\收益速览素材包-20260731`
3. 运行：

```bat
Generate-YieldOverviewPpt.cmd "D:\AK\2026\A202608\A2608收益速览" "A2608-收益速览模板.pptx"
```

默认输出为 `模板文件名.generated.pptx`。也可以指定输出文件名：

```bat
Generate-YieldOverviewPpt.cmd "D:\AK\2026\A202608\A2608收益速览" "A2608-收益速览模板.pptx" "A2608-收益速览.pptx"
```

脚本会优先读取本期根目录的 `yield-overview-manifest.json`；若根目录没有且子目录中恰好有一份，会自动使用那份清单。模板与输出文件必须位于本期目录内。

素材包可以不完整。缺失图片时，脚本会保留对应模板内容，方便在 PowerPoint 中手动补齐；搓玉表始终保留模板原样。组装完成后可直接打开输出文件修改标题、补图或添加自由发挥页，不需要再手动把已导出的图片塞入模板。
