@echo off
setlocal

if "%~1"=="" (
  echo Run:
  echo Generate-YieldOverviewPpt.cmd "D:\AK\2026\A202608\A2608-收益速览" "A2608-收益速览模板.pptx" ["A2608-收益速览-AS-0432.pptx"] ["收益速览素材包-07310432.zip"]
  pause
  exit /b 1
)

if "%~2"=="" (
  echo The template file is required because the public material package does not contain PPT template metadata.
  echo Example:
  echo Generate-YieldOverviewPpt.cmd "%~1" "A2608-收益速览模板.pptx"
  pause
  exit /b 1
)

if "%~4"=="" (
  if "%~3"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-YieldOverviewPpt.ps1" -IssueDir "%~1" -TemplateFile "%~2" -Overwrite
  ) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-YieldOverviewPpt.ps1" -IssueDir "%~1" -TemplateFile "%~2" -OutputFile "%~3" -Overwrite
  )
) else (
  if "%~3"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-YieldOverviewPpt.ps1" -IssueDir "%~1" -TemplateFile "%~2" -PackageFile "%~4" -Overwrite
  ) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-YieldOverviewPpt.ps1" -IssueDir "%~1" -TemplateFile "%~2" -OutputFile "%~3" -PackageFile "%~4" -Overwrite
  )
)

if errorlevel 1 (
  pause
)
