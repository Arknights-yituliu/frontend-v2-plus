"""Create the six-slide native PowerPoint sample used to verify background grouping.

This optional demo builder requires pywin32 and a local FFmpeg executable.
The production merge compiler still requires only the Python standard library.
"""

import argparse
import gzip
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

import win32com.client


def rgb(red, green, blue):
    return red | green << 8 | blue << 16


def textbox(slide, text, x, y, width, height, size, color, bold=False):
    shape = slide.Shapes.AddTextbox(1, x, y, width, height)
    shape.TextFrame.MarginLeft = 0
    shape.TextFrame.MarginRight = 0
    shape.TextFrame.MarginTop = 0
    shape.TextFrame.MarginBottom = 0
    run = shape.TextFrame.TextRange
    run.Text = text
    run.Font.Name = "Microsoft YaHei"
    run.Font.Size = size
    run.Font.Bold = -1 if bold else 0
    run.Font.Color.RGB = rgb(*color)
    return shape


def animate(slide, shape, effect_id, delay, duration=0.6, exit_effect=False):
    effect = slide.TimeLine.MainSequence.AddEffect(shape, effect_id, 0, 2)
    if exit_effect:
        effect.Exit = -1
    effect.Timing.TriggerDelayTime = delay
    effect.Timing.Duration = duration
    return effect


def make_background(ffmpeg, output, hue, tint, label):
    if output.exists():
        return
    video_filter = (
        f"hue=h={hue}:s=0.55,"
        f"drawbox=x=0:y=0:w=iw:h=ih:color={tint}@0.78:t=fill,"
        "drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':"
        f"text='{label}  |  %{{pts\\:hms}}':"
        "fontcolor=white:fontsize=20:x=w-tw-28:y=h-th-22"
    )
    subprocess.run([
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
        "testsrc2=size=960x540:rate=30:duration=10", "-vf", video_filter,
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-an", str(output),
    ], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).with_name("demo"))
    parser.add_argument("--ffmpeg", type=Path, default=Path(tempfile.gettempdir()) / "ppt-video-demo-ffmpeg/ffmpeg.exe")
    args = parser.parse_args()
    root = args.output_dir.resolve()
    root.mkdir(parents=True, exist_ok=True)
    ffmpeg = args.ffmpeg.resolve()
    if not ffmpeg.exists() and ffmpeg.with_suffix(".exe.gz").exists():
        with gzip.open(ffmpeg.with_suffix(".exe.gz"), "rb") as source, ffmpeg.open("xb") as target:
            shutil.copyfileobj(source, target)
    source_path = root / "background-markers-source.pptx"
    if source_path.exists():
        raise FileExistsError(source_path)
    make_background(ffmpeg, root / "background-a.mp4", 190, "0x07182c", "BACKGROUND A")
    make_background(ffmpeg, root / "background-b.mp4", 315, "0x23102e", "BACKGROUND B")

    app = win32com.client.Dispatch("PowerPoint.Application")
    already_open = app.Presentations.Count
    deck = app.Presentations.Add(0)
    try:
        deck.PageSetup.SlideWidth = 960
        deck.PageSetup.SlideHeight = 540
        titles = [
            "一段背景，三页内容", "文字进入，背景继续", "图形变化，背景不停",
            "出现新背景，自动分段", "下一页，共用背景 B", "两段背景，六页合成两页",
        ]
        descriptions = [
            "第 1 页放背景 A；第 2、3 页只编辑前景。",
            "保留文字淡入与飞入，背景时间继续向前。",
            "保留强调动画；到 9 秒时切换下一段背景。",
            "第 4 页放背景 B；这是第二段的起点。",
            "无需配置页码分组：继续沿用上一段背景。",
            "每页 3 秒；每段 9 秒；整段成片约 18 秒。",
        ]
        for index in range(6):
            slide = deck.Slides.Add(index + 1, 12)
            slide.FollowMasterBackground = 0
            slide.Background.Fill.Solid()
            slide.Background.Fill.ForeColor.RGB = rgb(7, 17, 33)
            if index in (0, 3):
                filename = root / ("background-a.mp4" if index == 0 else "background-b.mp4")
                background = slide.Shapes.AddMediaObject2(str(filename), 0, -1, 0, 0, 960, 540)
                background.Name = "PPT_BACKGROUND"
                background.ZOrder(1)
                background.MediaFormat.Volume = 0
                settings = background.AnimationSettings.PlaySettings
                settings.LoopUntilStopped = -1
                settings.PauseAnimation = 0
                play = slide.TimeLine.MainSequence.AddEffect(background, 83, 0, 2, 1)
                play.Timing.TriggerDelayTime = 0
            accent = (107, 185, 255) if index < 3 else (218, 153, 255)
            textbox(slide, "POWERPOINT / 连续背景合页样片", 60, 48, 840, 35, 16, accent)
            title = textbox(slide, titles[index], 60, 132, 840, 100, 42, (245, 249, 255), True)
            body = textbox(slide, descriptions[index], 60, 258, 840, 95, 24, (213, 226, 245))
            badge = slide.Shapes.AddShape(5, 60, 388, 290, 54)
            badge.Fill.Solid()
            badge.Fill.ForeColor.RGB = rgb(*accent)
            badge.Line.Visible = 0
            badge.TextFrame.TextRange.Text = f"原第 {index + 1} 页 / 自动播放 3 秒"
            badge.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
            badge.TextFrame.TextRange.Font.Size = 18
            badge.TextFrame.TextRange.Font.Color.RGB = rgb(7, 17, 33)
            badge.TextFrame.TextRange.ParagraphFormat.Alignment = 2
            animate(slide, title, 10, 0.2, 0.5)
            animate(slide, body, 2, 0.65, 0.6)
            emphasize = animate(slide, badge, 59, 1.4, 0.4)
            emphasize.Timing.AutoReverse = -1
            animate(slide, title, 10, 2.65, 0.25, True)
            slide.SlideShowTransition.AdvanceOnClick = 0
            slide.SlideShowTransition.AdvanceOnTime = -1
            slide.SlideShowTransition.AdvanceTime = 3
        deck.SlideShowSettings.AdvanceMode = 2
        deck.SaveAs(str(source_path), 24)
    finally:
        deck.Close()
        if already_open == 0 and app.Presentations.Count == 0:
            app.Quit()
    configuration = {
        "input": source_path.name,
        "output_pptx": "background-markers-merged.pptx",
        "output_video": "background-markers-merged.mp4",
        "resolution": 720,
        "fps": 30,
        "group_by_background": True,
    }
    with (root / "demo-config.json").open("x", encoding="utf-8") as handle:
        json.dump(configuration, handle, ensure_ascii=False, indent=2)
    print(f"Source PPTX: {source_path}")
    print(f"Config: {root / 'demo-config.json'}")


if __name__ == "__main__":
    main()
