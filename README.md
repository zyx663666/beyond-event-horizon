# Beyond Event Horizon / 事件视界之外

A realtime scientific film and deep-space observatory built with Vite, TypeScript, Three.js and WebGL2. 硬科幻为骨，科幻艺术为皮。

Default entry: **OBSERVATORY / 深空观测台**. START JOURNEY launches the directed film; FREE OBSERVATION offers a stationary observer with drag/arrow look, Home recenter and optical zoom.

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

## Film and editing

The original 6:30 journey is preserved. A 0:36 opening and separate 0:36 archive/credits bring the complete experience to **7:42**. Opening: black → title → atmosphere/clouds/surface → clean Earth → sequential HUD → departure. Horizon crossing is at 5:27, last echo at 5:40, art interpretation at 6:10, credits at 7:06.

Edit `src/content/credits.ts` to replace author, team, school, year, roles and final-message placeholders. The title is shared by the home screen, opening and credits. Opening theme copy lives in `src/content/opening.ts`; chapter, scientific, poetic, event and instrument text have separate files in the same content directory.

The film offers pause, replay, a mission timeline, chapter selection, optional temporary sound and fullscreen. Sound starts only after the SOUND button is activated. WebGL2 and desktop hardware acceleration are required.

## GitHub Pages

Repository: <https://github.com/zyx663666/beyond-event-horizon>

Expected site URL: <https://zyx663666.github.io/beyond-event-horizon/>

Pushes to main build and deploy via `.github/workflows/deploy-pages.yml`. In repository Settings → Pages, set Source to GitHub Actions. The workflow obtains the site base pathname from Pages configuration. Local development continues to use `/`.

For a production subpath check:

```powershell
$env:VITE_BASE_PATH='/beyond-event-horizon/'
npm run build
npm run check:dist
npm run preview -- --port 5177 --strictPort
```

Open <http://127.0.0.1:5177/beyond-event-horizon/>. Deployment details and future custom-domain support are in [GitHub Pages guide](docs/github-pages.md).

## Scope and validation

Schwarzschild light propagation and causal structure support the black-hole sequence. Journey distances, epochs and scene scales are compressed archival visualization. Feeding events are controlled dynamics/radiance approximations rather than hydrodynamic simulations. Instrument diagrams are schematic. The labeled artistic epilogue makes no claim to describe a singularity.

Earth uses a NASA / GSFC SVS Blue Marble texture; [asset attribution](public/cosmos/CREDITS.md). Principal cosmic scenes and events are procedural/realtime. Distribution contains only runtime assets from `scripts/deploy-assets.mjs`, without screenshots, logs or retired image backgrounds.

```powershell
npm test
npm run build
npm run check:dist
```

See [Final experience report](docs/final-experience-pass.md), [visual refinement](docs/visual-refinement-pass.md), and [physical core](docs/complete-journey-0.6.md). RTX 4060 remains the performance target; actual 2K/4K frame rate still requires a hardware run. GTX 760 is only a development preview.
