[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$IssueDir,

    [string]$ManifestFile = 'yield-overview-manifest.json',

    [string]$TemplateFile = '',

    [string]$OutputFile = '',

    [switch]$Overwrite,

    [switch]$ValidateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$msoFalse = 0
$msoTrue = -1
$expectedAnimatedEffects = 26

function Get-TextValue($Object, [string]$Name, [string]$Default = '') {
    if ($null -eq $Object) {
        return $Default
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value) {
        return $Default
    }

    return [string]$property.Value
}

function Get-ListValue($Object, [string]$Name) {
    if ($null -eq $Object) {
        return @()
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value) {
        return @()
    }

    return @($property.Value)
}

function Resolve-IssuePath([string]$Path, [string]$Description) {
    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw "$Description is required."
    }

    try {
        $candidate = if ([System.IO.Path]::IsPathRooted($Path)) {
            [System.IO.Path]::GetFullPath($Path)
        } else {
            [System.IO.Path]::GetFullPath((Join-Path $script:issueRoot $Path))
        }
    } catch {
        throw "$Description has an invalid path '$Path' (issue directory '$script:issueRoot')."
    }

    $rootPrefix = $script:issueRoot.TrimEnd('\') + '\'
    if (-not $candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Description must stay inside the issue directory: $Path"
    }

    return $candidate
}

function Resolve-ManifestAssetPath([string]$Path, [string]$Description) {
    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw "$Description is required."
    }

    try {
        $candidate = if ([System.IO.Path]::IsPathRooted($Path)) {
            [System.IO.Path]::GetFullPath($Path)
        } else {
            [System.IO.Path]::GetFullPath((Join-Path $script:manifestRoot $Path))
        }
    } catch {
        throw "$Description has an invalid asset path '$Path' (manifest directory '$script:manifestRoot')."
    }

    $rootPrefix = $script:issueRoot.TrimEnd('\') + '\'
    if (-not $candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Description must stay inside the issue directory: $Path"
    }

    return $candidate
}

function Assert-ImageFile([string]$Path, [string]$Description) {
    $resolvedPath = Resolve-ManifestAssetPath $Path $Description
    if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
        throw "$Description was not found: $Path"
    }

    $extension = [System.IO.Path]::GetExtension($resolvedPath).ToLowerInvariant()
    if ($extension -notin @('.png', '.jpg', '.jpeg')) {
        throw "$Description must be a PNG, JPG, or JPEG image: $Path"
    }

    return $resolvedPath
}

function Get-OptionalImageFile([string]$Path, [string]$Description) {
    if ([string]::IsNullOrWhiteSpace($Path)) {
        return ''
    }

    try {
        return Assert-ImageFile $Path $Description
    } catch {
        Write-Warning "$Description is unavailable. Keeping the template content. $($_.Exception.Message)"
        return ''
    }
}

function Get-SlideById($Presentation, [int]$SlideId, [string]$Description) {
    $slide = $Presentation.Slides.FindBySlideID($SlideId)
    if ($null -eq $slide) {
        throw "Template slide for $Description is no longer available."
    }

    return $slide
}

function Get-Shape($Slide, [string]$ShapeName, [string]$Description) {
    try {
        return $Slide.Shapes.Item($ShapeName)
    } catch {
        throw "$Description is missing shape '$ShapeName' on slide $($Slide.SlideIndex)."
    }
}

function Set-ShapeText($Slide, [string]$ShapeName, [string]$Text, [string]$Description) {
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return
    }

    $shape = Get-Shape $Slide $ShapeName $Description
    $shape.TextFrame.TextRange.Text = $Text
}

function Remove-ShapeIfPresent($Slide, [string]$ShapeName) {
    try {
        $Slide.Shapes.Item($ShapeName).Delete()
    } catch {
        # The template can have a variant without this decorative source image.
    }
}

function Add-FittedPicture($Slide, [string]$ImagePath, [single]$Left, [single]$Top, [single]$Width, [single]$Height) {
    $picture = $Slide.Shapes.AddPicture($ImagePath, $msoFalse, $msoTrue, $Left, $Top, -1, -1)
    $sourceRatio = $picture.Width / $picture.Height
    $frameRatio = $Width / $Height

    if ($sourceRatio -ge $frameRatio) {
        $picture.Width = $Width
        $picture.Left = $Left
        $picture.Top = $Top + (($Height - $picture.Height) / 2)
    } else {
        $picture.Height = $Height
        $picture.Top = $Top
        $picture.Left = $Left + (($Width - $picture.Width) / 2)
    }

    return $picture
}

function Replace-ShapeWithPicture($Slide, [string]$ShapeName, [string]$ImagePath, [string]$Description) {
    $shape = Get-Shape $Slide $ShapeName $Description
    $left = $shape.Left
    $top = $shape.Top
    $width = $shape.Width
    $height = $shape.Height
    $shape.Delete()
    return Add-FittedPicture $Slide $ImagePath $left $top $width $height
}

function Get-TemplateSlideIds($Presentation) {
    return [ordered]@{
        materialDetails = @(
            $Presentation.Slides.Item(5).SlideID,
            $Presentation.Slides.Item(7).SlideID,
            $Presentation.Slides.Item(9).SlideID
        )
        materialCurves = @(
            $Presentation.Slides.Item(6).SlideID,
            $Presentation.Slides.Item(8).SlideID,
            $Presentation.Slides.Item(10).SlideID
        )
        activityStore = $Presentation.Slides.Item(14).SlideID
        packPages = @(
            $Presentation.Slides.Item(15).SlideID,
            $Presentation.Slides.Item(16).SlideID,
            $Presentation.Slides.Item(17).SlideID
        )
        excludedCultivation = $Presentation.Slides.Item(20).SlideID
        cultivationDetail = $Presentation.Slides.Item(21).SlideID
        cultivationCompact = $Presentation.Slides.Item(22).SlideID
        firstStaticAfterCultivation = $Presentation.Slides.Item(23).SlideID
    }
}

function Update-MaterialSlides($Presentation, $TemplateIds, $Materials) {
    $detailImageSlots = @('Picture 1', 'Picture 11', 'Picture 3')
    $curveChartSlots = @('Chart 6', 'Chart 6', 'Chart 2')
    $detailTitleSlots = @('TextBox 4', 'TextBox 6', 'TextBox 6')
    $curveTitleSlots = @('TextBox 5', 'TextBox 2', 'TextBox 5')
    $detailFooterSlots = @('Picture 6', 'Picture 7', 'Picture 7')
    $curveFooterSlots = @('Picture 3', 'Picture 7', 'Picture 6')

    for ($index = 0; $index -lt $Materials.Count; $index++) {
        $material = $Materials[$index]
        $detailImage = Get-OptionalImageFile (Get-TextValue $material 'detailImage') "Material $($index + 1) detail image"
        $curveImage = Get-OptionalImageFile (Get-TextValue $material 'curveImage') "Material $($index + 1) curve image"
        $title = Get-TextValue $material 'title'

        $detailSlide = Get-SlideById $Presentation $TemplateIds.materialDetails[$index] "material detail $($index + 1)"
        $curveSlide = Get-SlideById $Presentation $TemplateIds.materialCurves[$index] "material curve $($index + 1)"

        if (-not [string]::IsNullOrWhiteSpace($detailImage)) {
            Replace-ShapeWithPicture $detailSlide $detailImageSlots[$index] $detailImage "material detail $($index + 1)" | Out-Null
            Remove-ShapeIfPresent $detailSlide $detailFooterSlots[$index]
        }
        if (-not [string]::IsNullOrWhiteSpace($curveImage)) {
            Replace-ShapeWithPicture $curveSlide $curveChartSlots[$index] $curveImage "material curve $($index + 1)" | Out-Null
            Remove-ShapeIfPresent $curveSlide $curveFooterSlots[$index]
        }
        Set-ShapeText $detailSlide $detailTitleSlots[$index] $title "material detail $($index + 1)"
        Set-ShapeText $curveSlide $curveTitleSlots[$index] $title "material curve $($index + 1)"
    }

    for ($index = $Materials.Count; $index -lt 3; $index++) {
        (Get-SlideById $Presentation $TemplateIds.materialCurves[$index] "unused material curve").Delete()
        (Get-SlideById $Presentation $TemplateIds.materialDetails[$index] "unused material detail").Delete()
    }
}

function Update-ActivityStoreSlide($Presentation, $TemplateIds, $ActivityStoreConfig) {
    $imagePath = Get-TextValue $ActivityStoreConfig 'image'
    $title = Get-TextValue $ActivityStoreConfig 'title'
    if ([string]::IsNullOrWhiteSpace($imagePath) -and [string]::IsNullOrWhiteSpace($title)) {
        return
    }

    $slide = Get-SlideById $Presentation $TemplateIds.activityStore 'activity store'
    $image = Get-OptionalImageFile $imagePath 'Activity store image'
    if (-not [string]::IsNullOrWhiteSpace($image)) {
        Replace-ShapeWithPicture $slide 'Picture 9' $image 'activity store' | Out-Null
    }
    Set-ShapeText $slide 'TextBox 5' $title 'activity store'
}

function Update-PackSlides($Presentation, $TemplateIds, $PackPages) {
    if ($PackPages.Count -eq 0) {
        return
    }

    $existingSlides = @()
    foreach ($slideId in $TemplateIds.packPages) {
        $existingSlides += Get-SlideById $Presentation $slideId 'pack template'
    }

    $targetSlides = @()
    for ($index = 0; $index -lt $PackPages.Count; $index++) {
        if ($index -lt $existingSlides.Count) {
            $targetSlides += $existingSlides[$index]
        } else {
            $targetSlides += $targetSlides[-1].Duplicate().Item(1)
        }
    }

    for ($index = $PackPages.Count; $index -lt $existingSlides.Count; $index++) {
        $existingSlides[$index].Delete()
    }

    for ($index = 0; $index -lt $PackPages.Count; $index++) {
        $page = $PackPages[$index]
        $slide = $targetSlides[$index]
        $image = Get-OptionalImageFile (Get-TextValue $page 'image') "Pack page $($index + 1) image"
        if (-not [string]::IsNullOrWhiteSpace($image)) {
            Replace-ShapeWithPicture $slide 'Picture 9' $image "pack page $($index + 1)" | Out-Null
        }
        Set-ShapeText $slide 'TextBox 3' (Get-TextValue $page 'title') "pack page $($index + 1)"
        Set-ShapeText $slide 'TextBox 10' (Get-TextValue $page 'caption') "pack page $($index + 1)"
    }
}

function Update-CultivationSlides($Presentation, $TemplateIds, $CultivationPages) {
    if ($CultivationPages.Count -eq 0) {
        return
    }

    $sourceDetail = Get-SlideById $Presentation $TemplateIds.cultivationDetail 'cultivation detail'
    $sourceCompact = Get-SlideById $Presentation $TemplateIds.cultivationCompact 'cultivation compact'
    $firstStaticSlide = Get-SlideById $Presentation $TemplateIds.firstStaticAfterCultivation 'first static slide'
    $generatedSlides = @()

    foreach ($page in $CultivationPages) {
        $operators = @(Get-ListValue $page 'operators')

        $layout = Get-TextValue $page 'layout' 'auto'
        if ($layout -eq 'auto') {
            $layout = if ($operators.Count -ge 3) { 'compact' } else { 'detail' }
        }
        if ($layout -notin @('detail', 'compact')) {
            throw "Cultivation page layout must be detail, compact, or auto."
        }

        $slide = if ($layout -eq 'detail') {
            $sourceDetail.Duplicate().Item(1)
        } else {
            $sourceCompact.Duplicate().Item(1)
        }

        $image = Get-OptionalImageFile (Get-TextValue $page 'image') "Cultivation page image"
        if (-not [string]::IsNullOrWhiteSpace($image)) {
            if ($layout -eq 'detail') {
                @('Picture 7', 'Picture 5', 'Picture 9') | ForEach-Object { Remove-ShapeIfPresent $slide $_ }
                Add-FittedPicture $slide $image 169 78 700 350 | Out-Null
            } else {
                @('Picture 8', 'Picture 2', 'Picture 5') | ForEach-Object { Remove-ShapeIfPresent $slide $_ }
                Add-FittedPicture $slide $image 169 78 700 350 | Out-Null
            }
        }

        Set-ShapeText $slide 'TextBox 6' (Get-TextValue $page 'caption') 'cultivation page'
        $generatedSlides += $slide
    }

    (Get-SlideById $Presentation $TemplateIds.excludedCultivation 'excluded cultivation slide').Delete()
    $sourceDetail.Delete()
    $sourceCompact.Delete()

    for ($index = $generatedSlides.Count - 1; $index -ge 0; $index--) {
        $generatedSlides[$index].MoveTo($firstStaticSlide.SlideIndex)
    }
}

function Test-Manifest($Manifest) {
    $materials = @(Get-ListValue $Manifest 'materials')
    if ($materials.Count -lt 2 -or $materials.Count -gt 3) {
        throw "The manifest must contain 2 to 3 materials."
    }

}

$issueRoot = [System.IO.Path]::GetFullPath($IssueDir).TrimEnd('\')
if (-not (Test-Path -LiteralPath $issueRoot -PathType Container)) {
    throw "Issue directory does not exist: $IssueDir"
}

$manifestPath = Resolve-IssuePath $ManifestFile 'Manifest file'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -and $ManifestFile -eq 'yield-overview-manifest.json') {
    $manifestCandidates = @(
        Get-ChildItem -LiteralPath $issueRoot -Filter $ManifestFile -File -Recurse |
            Where-Object {
                $_.DirectoryName.StartsWith($issueRoot, [System.StringComparison]::OrdinalIgnoreCase)
            }
    )

    if ($manifestCandidates.Count -eq 1) {
        $manifestPath = $manifestCandidates[0].FullName
    } elseif ($manifestCandidates.Count -gt 1) {
        throw "Multiple material package manifests were found. Specify -ManifestFile explicitly."
    }
}
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Manifest file was not found: $ManifestFile"
}

$script:manifestRoot = [System.IO.Path]::GetDirectoryName($manifestPath)
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
Test-Manifest $manifest

$templateName = if (-not [string]::IsNullOrWhiteSpace($TemplateFile)) {
    $TemplateFile
} else {
    Get-TextValue $manifest 'templateFile'
}
if ([string]::IsNullOrWhiteSpace($templateName)) {
    throw 'TemplateFile is required when the material manifest does not include a template.'
}
$templatePath = Resolve-IssuePath $templateName 'Template file'

if (-not (Test-Path -LiteralPath $templatePath -PathType Leaf)) {
    throw "Template file was not found: $templatePath"
}

$outputName = if (-not [string]::IsNullOrWhiteSpace($OutputFile)) {
    $OutputFile
} else {
    Get-TextValue $manifest 'outputFile'
}
if ([string]::IsNullOrWhiteSpace($outputName)) {
    $templateBase = [System.IO.Path]::GetFileNameWithoutExtension($templatePath)
    $outputName = "$templateBase.generated.pptx"
}

$outputPath = Resolve-IssuePath $outputName 'Output file'
$materials = @(Get-ListValue $manifest 'materials')
$packPages = @(Get-ListValue $manifest 'packPages')
$cultivationPages = @(Get-ListValue $manifest 'cultivationPages')

if ($ValidateOnly) {
    [pscustomobject]@{
        issueDirectory = $issueRoot
        manifest = $manifestPath
        template = $templatePath
        output = $outputPath
        materials = $materials.Count
        packPages = $packPages.Count
        cultivationPages = $cultivationPages.Count
        validation = 'passed'
    } | ConvertTo-Json -Depth 8
    exit 0
}

if ((Test-Path -LiteralPath $outputPath) -and -not $Overwrite) {
    throw "Output file already exists. Use -Overwrite to replace the generated copy: $outputName"
}

Copy-Item -LiteralPath $templatePath -Destination $outputPath -Force

$powerPoint = $null
$presentation = $null
try {
    $powerPoint = New-Object -ComObject PowerPoint.Application
    $presentation = $powerPoint.Presentations.Open($outputPath, $msoFalse, $msoFalse, $msoFalse)
    $templateIds = Get-TemplateSlideIds $presentation

    Update-MaterialSlides $presentation $templateIds $materials
    Update-ActivityStoreSlide $presentation $templateIds $manifest.activityStore
    Update-PackSlides $presentation $templateIds $packPages
    Update-CultivationSlides $presentation $templateIds $cultivationPages

    $presentation.Save()
    $effectCount = 0
    foreach ($slide in $presentation.Slides) {
        $effectCount += $slide.TimeLine.MainSequence.Count
    }
    if ($effectCount -ne $expectedAnimatedEffects) {
        throw "Animation verification failed: expected $expectedAnimatedEffects effects, found $effectCount."
    }

    $report = [ordered]@{
        generatedAt = (Get-Date).ToString('o')
        manifest = [System.IO.Path]::GetFileName($manifestPath)
        template = [System.IO.Path]::GetFileName($templatePath)
        output = [System.IO.Path]::GetFileName($outputPath)
        slides = $presentation.Slides.Count
        animationEffects = $effectCount
        materials = $materials.Count
        packPages = $packPages.Count
        cultivationPages = $cultivationPages.Count
    }
    $reportPath = Join-Path $issueRoot 'yield-overview-build-report.json'
    $report | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    $report | ConvertTo-Json -Depth 16
} finally {
    if ($null -ne $presentation) {
        $presentation.Close()
        [Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
    }
    if ($null -ne $powerPoint) {
        $powerPoint.Quit()
        [Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
