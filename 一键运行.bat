@echo off
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-preview.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. Please keep this window open and check the message above.
  pause
)
