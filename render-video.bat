@echo off
rem One-click offline render for Beyond Event Horizon.
rem Plays the film in a headless browser and captures it exactly as presented
rem - canvas, HUD, subtitles, controls - then muxes the score and saves
rem render-output\beyond-event-horizon-target.mp4
rem Recording takes about the film length (7:42); encoding adds a few
rem minutes. Expect roughly 15-25 minutes total. Ctrl+C stops cleanly.
title Beyond Event Horizon - offline render
cd /d "%~dp0"
echo Rendering the film at display quality (2560x1440). Recording runs for
echo the film length itself, then encoding takes a few more minutes.
echo Keep the PC plugged in and awake while this runs.
echo.
call npm run render:video
echo.
if exist "render-output\beyond-event-horizon-target.mp4" (
  echo Done. Video saved to: render-output\beyond-event-horizon-target.mp4
) else (
  echo Something went wrong - scroll up for the error message.
)
pause
