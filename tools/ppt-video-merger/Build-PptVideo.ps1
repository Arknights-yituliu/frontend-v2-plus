[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Config,
    [string]$Python = 'python',
    [switch]$Check,
    [switch]$PptxOnly,
    [switch]$Overwrite,
    [switch]$KeepWorkFiles,
    [ValidateRange(1, 1440)]
    [int]$ExportTimeoutMinutes = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$configPath = (Resolve-Path -LiteralPath $Config).Path
$compilerPath = Join-Path $PSScriptRoot 'merge_pptx.py'

function Invoke-Compiler([string[]]$Arguments) {
    & $Python $compilerPath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "PPTX preparation failed (exit $LASTEXITCODE)."
    }
}

if ($Check) {
    Invoke-Compiler -Arguments @('--config', $configPath, '--check')
    return
}

$workRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$workPath = Join-Path $workRoot ('ppt-video-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workPath | Out-Null
$foregroundPath = Join-Path $workPath 'foreground.pptx'
$planPath = Join-Path $workPath 'plan.json'
$stagedDeck = Join-Path $workPath 'merged.pptx'
$stagedVideo = Join-Path $workPath 'merged.mp4'
$application = $null
$presentation = $null
$success = $false
$ownsEmptyApplication = $false

try {
    Invoke-Compiler -Arguments @('--config', $configPath, '--output', $foregroundPath, '--plan', $planPath)
    $plan = Get-Content -LiteralPath $planPath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($warning in $plan.warnings) { Write-Warning $warning }
    $outputs = @([string]$plan.output_pptx)
    if (-not $PptxOnly) { $outputs += [string]$plan.output_video }
    foreach ($output in $outputs) {
        if ((Test-Path -LiteralPath $output) -and -not $Overwrite) {
            throw "Output already exists: $output. Choose a new name, or explicitly use -Overwrite."
        }
        if (Test-Path -LiteralPath $output -PathType Container) {
            throw "Output is a directory: $output"
        }
        New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($output)) -Force | Out-Null
    }

    Write-Host 'Opening PowerPoint to embed background videos...'
    $application = New-Object -ComObject PowerPoint.Application
    $ownsEmptyApplication = ($application.Presentations.Count -eq 0)
    # No visible presentation window is needed. PowerPoint remains responsible
    # for interpreting native objects, animations and the final video export.
    $presentation = $application.Presentations.Open($foregroundPath, 0, 0, 0)
    if ($presentation.Slides.Count -ne @($plan.groups).Count) {
        throw 'PowerPoint opened a different number of slides than expected.'
    }
    $width = [single]$presentation.PageSetup.SlideWidth
    $height = [single]$presentation.PageSetup.SlideHeight

    for ($index = 0; $index -lt @($plan.groups).Count; $index++) {
        $group = $plan.groups[$index]
        $slide = $presentation.Slides.Item($index + 1)
        # LinkToFile=false, SaveWithDocument=true embeds the MP4 in the deck.
        $video = $slide.Shapes.AddMediaObject2([string]$group.background, 0, -1, 0, 0, -1, -1)
        $video.Name = "Continuous background $($index + 1)"
        $video.LockAspectRatio = 0
        if ($group.fit -eq 'stretch') {
            $video.Width = $width
            $video.Height = $height
        } else {
            if ($video.Width -le 0 -or $video.Height -le 0) {
                throw "PowerPoint could not determine the video dimensions: $($group.background)"
            }
            $widthScale = $width / $video.Width
            $heightScale = $height / $video.Height
            $scale = if ($group.fit -eq 'cover') {
                [Math]::Max($widthScale, $heightScale)
            } else {
                [Math]::Min($widthScale, $heightScale)
            }
            $video.Width = [single]($video.Width * $scale)
            $video.Height = [single]($video.Height * $scale)
        }
        $video.Left = [single](($width - $video.Width) / 2)
        $video.Top = [single](($height - $video.Height) / 2)
        $video.ZOrder(1) # msoSendToBack
        $clipLength = [long]$video.MediaFormat.Length
        if ($clipLength -le 0) {
            throw "PowerPoint cannot read the background duration: $($group.background)"
        }
        if (-not $group.loop -and $clipLength -lt [long]$group.duration_ms) {
            throw "Background is shorter than group $($index + 1). Use a longer clip or enable loop."
        }
        if ($clipLength -gt [long]$group.duration_ms) {
            # Otherwise PowerPoint video export can wait for the untrimmed clip
            # after the foreground has finished, despite the saved slide time.
            $video.MediaFormat.EndPoint = [long]$group.duration_ms
        }
        # An explicit first, automatic media-play effect starts the background
        # at slide time zero. Legacy PlayOnEntry alone can leave it at the end
        # of the animation order or with a click trigger.
        $play = $slide.TimeLine.MainSequence.AddEffect($video, 83, 0, 2, 1)
        $play.Timing.TriggerDelayTime = 0
        if ($clipLength -lt [long]$group.duration_ms) {
            $play.Timing.RepeatCount = [int][Math]::Ceiling($group.duration_ms / [double]$clipLength)
            $play.Timing.RepeatDuration = [single]($group.duration_ms / 1000.0)
        }
        if ($group.mute) { $video.MediaFormat.Volume = 0 }
        $slide.SlideShowTransition.AdvanceOnClick = 0
        $slide.SlideShowTransition.AdvanceOnTime = -1
        $slide.SlideShowTransition.AdvanceTime = [single]($group.duration_ms / 1000.0)
        Write-Host "Group $($index + 1): $($group.duration_ms / 1000.0)s, background embedded."
    }
    $presentation.SlideShowSettings.AdvanceMode = 2 # ppSlideShowUseSlideTimings
    $presentation.SaveAs($stagedDeck, 24) # ppSaveAsOpenXMLPresentation
    Invoke-Compiler -Arguments @('--verify', $stagedDeck, '--against', $foregroundPath)

    if (-not $PptxOnly) {
        Write-Host "Exporting video: $($plan.resolution)p / $($plan.fps)fps..."
        $presentation.CreateVideo($stagedVideo, $true, 5, [int]$plan.resolution, [int]$plan.fps, [int]$plan.quality)
        $deadline = [DateTime]::UtcNow.AddMinutes($ExportTimeoutMinutes)
        do {
            Start-Sleep -Seconds 1
            $status = [int]$presentation.CreateVideoStatus
            if ([DateTime]::UtcNow -gt $deadline) {
                throw "Video export timed out after $ExportTimeoutMinutes minutes."
            }
            if ($status -eq 4) { throw 'PowerPoint reported a video export failure.' }
        } while ($status -ne 3) # ppMediaTaskStatusDone
        if (-not (Test-Path -LiteralPath $stagedVideo -PathType Leaf) -or (Get-Item -LiteralPath $stagedVideo).Length -eq 0) {
            throw 'PowerPoint did not produce a nonempty video file.'
        }
    }
    $presentation.Close()
    [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation)
    $presentation = $null

    Move-Item -LiteralPath $stagedDeck -Destination ([string]$plan.output_pptx) -Force:$Overwrite
    if (-not $PptxOnly) {
        Move-Item -LiteralPath $stagedVideo -Destination ([string]$plan.output_video) -Force:$Overwrite
    }
    $success = $true
    Write-Host "PPTX: $($plan.output_pptx)"
    if (-not $PptxOnly) { Write-Host "MP4:  $($plan.output_video)" }
} finally {
    if ($null -ne $presentation) {
        try { $presentation.Close() } catch { Write-Warning $_.Exception.Message }
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation)
    }
    if ($null -ne $application) {
        # PowerPoint may reuse an existing application instance. Never quit an
        # instance that still has the user's presentations open.
        if ($ownsEmptyApplication -and $application.Presentations.Count -eq 0) {
            try { $application.Quit() } catch { Write-Warning $_.Exception.Message }
        }
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($application)
    }
    $resolvedWorkPath = [System.IO.Path]::GetFullPath($workPath)
    $expectedPrefix = $workRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar + 'ppt-video-'
    if ($success -and -not $KeepWorkFiles -and $resolvedWorkPath.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolvedWorkPath -Recurse -Force
    } else {
        Write-Host "Intermediate files: $resolvedWorkPath"
    }
}
