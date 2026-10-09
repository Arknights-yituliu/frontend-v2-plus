# PowerPoint 连续背景合页脚本（实验原型）

把几页 PPT 的前景内容与原生自动动画放到同一张长幻灯片的时间轴上，在最底层嵌入一段持续播放的视频，再用桌面版 PowerPoint 导出 MP4。每组对应一张合并页、一个背景视频。

**目前是已完成概念验证的原型。** 已用本机 PowerPoint 制作 6 页原稿，自动合成 2 页，导出约 18 秒、720p 的成片，并检查内容交接处的动画与背景计时。淡入、飞入、缩放强调、退场及短背景循环已通过这个样片验证；不同模板和其他复杂效果仍需适配。通过结构检查不等于任意原稿的画面都正确。

## 最简单的分段规则

第 1 页放背景 A，后面几页只编辑内容；遇到另一页放背景 B，就开始第二段，一直沿用到下一个背景或最后一页。

例如第 1、4 页有背景视频，原稿一共 6 页，脚本自动分成 1～3 页和 4～6 页。无需填写分组页码或重新选择背景文件。

背景应嵌入 PPT、放在最底层并铺满页面。脚本自动识别这种视频；也可以在“选择窗格”把视频命名为 `背景视频`、`背景` 或 `PPT_BACKGROUND`，明确其用途。每个新背景页都作为新段起点，即使使用的是同一个视频。源页中的普通前景音视频暂不支持。

最少配置：

```json
{
  "input": "original.pptx",
  "group_by_background": true
}
```

默认读取保存后的页计时，并在配置目录输出 `merged.pptx` 和 `merged.mp4`。背景从 PPT 的嵌入素材中读取，不另存到原稿目录。

样片输出位于 `demo/`：`background-markers-source.pptx` 是原 6 页，`background-markers-merged.pptx` 是合并后的 2 页，`background-markers-merged.mp4` 是成片。右下角的背景计时可以确认内容换页时视频没有归零。输出 PPT 用于查看和导出；修改内容或动画时，建议编辑原稿再生成。

## 环境与文件

- Windows、桌面版 Microsoft PowerPoint、Python 3.10 或更高版本。
- Python 脚本仅使用标准库，无需安装第三方包。
- 输入使用 `.pptx`，背景建议使用 PowerPoint 可播放的 H.264 MP4。
- 配置中的相对路径以**配置文件所在目录**为准。
- 输入文件保持不变；输出默认禁止覆盖，只有显式传入 `-Overwrite` 才覆盖指定输出。

把 `config.example.json` 复制到素材目录，改成实际文件名和页码。默认从保存后的 PPT 中读取每页的自动切换时间，不必逐页填写时长。

## 准备原稿

1. 把需要保留的动画设置为“与上一动画同时”或“上一动画之后”。
2. 完成排练计时并保存文件，确认页面能按时间自动切换。
3. 去掉需要合并的页面之间的切换效果。尤其是 Morph，不能直接作为同页对象动画保留下来。
4. 第一版要求同一组中的页面使用同一版式及颜色映射；不同版式可以拆成不同组。
5. 原页背景填充会被替换。但如果还有不透明的整页矩形或图片，它仍会挡住视频：先在原稿中去掉这种底图，或者通过手动分组配置的 `remove_shape_names` 移除。

**排练计时不一定把点击动画转换成自动动画。** 此原型读取保存的页时长，但不读取录制的逐次点击轨迹；动画树中仍等待点击的页面会被拒绝。旁白、前景音视频、交互动画及按字/词迭代动画暂不支持；识别出的背景视频会自动从前景与原动画中剥离。

## 参数

| 参数 | 用途 |
| --- | --- |
| `input` | 原 PPTX |
| `output_pptx`、`output_video` | 合并后的 PPTX 和 MP4 路径 |
| `resolution`、`fps`、`quality` | 导出垂直分辨率、帧率和质量；默认 1080、30、85 |
| `group_by_background` | 设为 `true` 时，按照 PPT 内的背景视频自动分段，不填写 `groups` |
| `groups[].slides` | 该组包含的原页码，从 1 开始，按给定顺序播放 |
| `groups[].background` | 背景 MP4 |
| `groups[].durations` | 可选，逐页秒数，例如 `[6, 8, 6]`；省略时读取原稿保存的页时长 |
| `groups[].fit` | `cover` 铺满并裁边；`contain` 完整显示并留黑边；`stretch` 拉伸 |
| `groups[].loop` | 背景不足时是否循环，默认 `true`；循环是否无缝取决于素材本身 |
| `groups[].mute` | 背景是否静音，默认 `true` |
| `groups[].remove_shape_names` | 要去掉的整页底图等对象名称，精确匹配 |

每组内只在前景内容之间切换，背景持续播放；组与组之间切换背景。第一版的前景页交接采用即时显隐，原有对象动画保留；未实现自动重建页间淡化、Morph 或背景跨组交叉淡化。

手动指定分组仍可使用：

```json
{
  "input": "original.pptx",
  "groups": [
    { "slides": [1, 2, 3], "background": "background-a.mp4" },
    { "slides": [4, 5], "background": "background-b.mp4" }
  ]
}
```

手动分组模式下，原页的前景中不能再包含背景视频；自动模式会剥离识别出的背景对象。自动模式默认铺满、循环、静音。

## 使用

先检查参数和输入结构。这一步不会启动 PowerPoint，也不导出文件：

```powershell
powershell -NoProfile -File "D:\codes\frontend-v2-plus\tools\ppt-video-merger\Build-PptVideo.ps1" -Config "D:\你的素材目录\config.json" -Check
```

只生成合并 PPT，便于先查看两三页样片：

```powershell
powershell -NoProfile -File "D:\codes\frontend-v2-plus\tools\ppt-video-merger\Build-PptVideo.ps1" -Config "D:\你的素材目录\config.json" -PptxOnly
```

生成合并 PPT 并导出视频：

```powershell
powershell -NoProfile -File "D:\codes\frontend-v2-plus\tools\ppt-video-merger\Build-PptVideo.ps1" -Config "D:\你的素材目录\config.json"
```

这两条生成命令会调用本机 PowerPoint，实际耗时取决于页数、素材大小和视频时长。脚本不操作鼠标和键盘。它只关闭自己打开的演示文稿，已有演示文稿仍打开时不会退出 PowerPoint。

可用 `-Python "C:\路径\python.exe"` 指定解释器、`-KeepWorkFiles` 保留中间文件、`-ExportTimeoutMinutes 60` 调整导出超时。失败时保留中间文件并打印路径，便于检查。

## 验证边界

本地定向检查：

```powershell
python -m unittest discover -s tools/ppt-video-merger -p "test_*.py" -v
```

检查对象和动画 ID 重映射、图片关系、自动页时长与覆盖时长、内容显隐边界、动画完成后再播放的依赖计算、背景识别/分段/提取、兼容性命名空间、原稿不被修改，以及不支持的动画/切换被明确拒绝。PowerPoint 保存后再检查一次动画类型与数量，防止无声丢失。

新模板的样片应确认：背景在同组原页之间不重新起播；后续页内容不会提前出现；上一页在交接处消失；入场、移动、强调与退场的时间正确；文字继承的版式、图片和图表正常；视频循环点没有明显跳变。脚本使用一个原生主时间轴，复制各动画的行为并重排开始时间；尚未覆盖所有 PowerPoint 特效和文本构建方式，不能仅凭动画数量判断兼容性。
