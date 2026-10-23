# 光锥之外 / Beyond the Light Cone

A realtime scientific film and deep-space observatory built with Vite, TypeScript, Three.js and WebGL2. 硬科幻为骨，科幻艺术为皮。

默认入口：**深空观测台 / OBSERVATORY**。开始航行 / START JOURNEY launches the directed film; 自由观测 / FREE OBSERVATION offers a stationary observer with drag/arrow look, Home recenter and optical zoom.

The presentation uses a single 16:9 stage with letterboxing. 2560×1440 is the target render profile; `quality=ultra` permits 3840×2160. Other aspect ratios keep the same layout.

## Local preview

Node.js 22.12+ is required; deployment uses Node.js 24.

```powershell
npm ci
npm run dev -- --port 5176 --strictPort
```

- Observatory: <http://127.0.0.1:5176/?mode=observatory&quality=target&debug=0>
- Film: <http://127.0.0.1:5176/?mode=film&quality=target&debug=0>
- Free observation: <http://127.0.0.1:5176/?mode=free&quality=target&debug=0>

Keep the preview terminal running. Reopen one of these addresses later; after restarting the computer, run the preview command again. Do not open index.html directly.

## 离线播放版

首页“开始航行”下方提供“开始航行（离线版）”，地址为 `?mode=offline`。
该页面使用浏览器视频播放器，不创建 WebGL 渲染器，支持暂停、拖动进度、音量和全屏。

将含画面与配乐的最终 MP4 放在 `public/video/journey.mp4`，然后重启本地开发服务器。
生产站点需重新构建，构建会自动包含存在的视频文件，并支持站点子路径。
视频尚未添加时显示待就绪提示。视频路径在 `src/content/video.config.json` 中配置。
完整站点文件夹可由本地服务器提供，以便断网播放；仅访问线上地址不会自动下载整站供离线使用。

## Film and editing

The original 6:30 journey is preserved. A 0:36 opening brings the complete experience to **7:06**, ending with the journey. Opening: black → title → atmosphere/clouds/surface → clean Earth → sequential HUD → departure. Horizon crossing is at 5:27, last echo at 5:40, art interpretation at 6:10, and the film ends at 7:06.

Edit `src/content/title.ts` to change the title shared by the home screen and opening. Opening theme copy lives in `src/content/opening.ts`; chapter, scientific, poetic, event and instrument text have separate files in the same content directory.

The lower-left navigation terminal offers 音乐链路 / MUSIC LINK and 航行等级 / NAVIGATION DRIVE. STANDBY holds the film; AHEAD I, II, III and DEEP TRANSIT use 0.55, 1, 1.75 and 4 times the film clock. AHEAD II is the director standard. This is distinct from the archived physical velocity shown in c. All scene, subtitle, event and media timing shares the film clock. Music starts only through START JOURNEY or a music-link click; direct entry and refresh remain silent. Pause, hidden tabs and WebGL recovery suspend audio. WebGL2 and desktop hardware acceleration are required.

## Score

The current score is the user-supplied track 深空独航 (approximately 3:31). It loops to cover the full film in browser playback and offline video export, with the configured fade-in and final fade-out. Playback settings are in `src/content/audio.config.json`; the audio file is `public/audio/score.mp3`. The retained `scripts/generate-score.py` utility generated the previous score.

Chinese is the primary visual language and English is secondary. UI content is in `src/content/`; language order is in `language.ts`, flight controls in `flight.ts`. See [release integration](docs/release-pass.md).

## Offline video render

Save the film exactly as it plays — canvas, HUD, subtitles and controls, with the score mixed in — as one MP4. To export from the project, double-click `render-video.bat`, or use the CLI for other settings. The default is **realtime capture**: the film plays once in a headless browser while the full page is recorded as a timestamped frame stream, then encoded. Recording takes the film length itself (7:06), so a full render finishes in roughly 15–25 minutes including encoding.

```
npm run render:video                            # full film, realtime, 2560x1440 → render-output/
npm run render:video -- --max-seconds 10        # 10 s test / speed benchmark
npm run render:video -- --quality ultra         # capture at 3840x2160 canvas
npm run render:video -- --frame                 # deterministic per-frame master (slow, hours)
```

The realtime output preserves the exact presentation pacing via per-frame timestamps, so occasional GPU hiccups never desync audio — they only lower the effective frame rate. On a laptop that plays the film smoothly at your chosen quality, expect a stable ~30 fps capture. `--frame` mode instead seeks every frame deterministically (pixel-exact pacing, quality independent of realtime speed); it is much slower — roughly 25,560 frames at 4K60, i.e. several hours — and is meant for a final master when time is no concern. Run a short range first (`--max-seconds 10` or `--frame --t0 150 --t1 160`) and read the printed ETA. `Ctrl+C` stops cleanly.

## Cinematic finish

A display-space pass (`src/rendering/CinematicPass.ts`) sits after ACES and adds lens vignette, edge-weighted lateral chromatic split, animated film grain, and a short radial surge at the horizon crossing. In the ray tracer, star fields streak along the flight direction with an authored envelope (slow smear leaving the solar system, a brief dash before the horizon), the tidal disruption launches an expanding wavefront ring across the disk plane, and the crossing gets a sub-second exposure pop weighted toward the hole. Bloom is slightly raised. Every one of these is authored lens/punctuation language layered on top of the traced radiance — the geodesics, multi-path images and Doppler terms are unchanged.

## GitHub Pages

Repository: <https://github.com/zyx663666/beyond-event-horizon>

Project domain: <https://bs.beiguo.fun/>

The custom domain is bound to this repository in GitHub Pages. Its DNS record is `bs CNAME zyx663666.github.io`. HTTPS becomes available after GitHub completes domain validation and certificate issuance.

Pushes to main build and deploy via `.github/workflows/deploy-pages.yml`. In repository Settings → Pages, set Source to GitHub Actions. The workflow obtains the site base pathname from Pages configuration. Local development continues to use `/`.

For a production subpath check:

```powershell
$env:VITE_BASE_PATH='/beyond-event-horizon/'
npm run build
npm run check:dist
npm run preview -- --port 5177 --strictPort
```

Open <http://127.0.0.1:5177/beyond-event-horizon/>. Deployment and custom-domain details are in [GitHub Pages guide](docs/github-pages.md).

## Scope and validation

Schwarzschild light propagation and causal structure support the black-hole sequence. Journey distances, epochs and scene scales are compressed archival visualization. Feeding events are controlled dynamics/radiance approximations rather than hydrodynamic simulations. Instrument diagrams are schematic. The labeled artistic epilogue makes no claim to describe a singularity.

Earth uses a NASA / GSFC SVS Blue Marble texture; [asset attribution](public/cosmos/CREDITS.md). Principal cosmic scenes and events are procedural/realtime. Distribution contains only runtime assets from `scripts/deploy-assets.mjs`, without screenshots, logs or retired image backgrounds.

```powershell
npm test
npm run build
npm run check:dist
```

See [Final experience report](docs/final-experience-pass.md), [visual refinement](docs/visual-refinement-pass.md), and [physical core](docs/complete-journey-0.6.md). RTX 4060 remains the performance target; actual 2K/4K frame rate still requires a hardware run. GTX 760 is only a development preview.
