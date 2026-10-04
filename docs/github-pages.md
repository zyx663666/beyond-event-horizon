# GitHub Pages deployment

The repository is a static Vite + TypeScript + Three.js/WebGL2 application. GitHub Pages serves `dist/`; no backend, account or database is needed to view it.

## Repository and automatic deployment

1. Create a public repository named `beyond-event-horizon`, without initializing conflicting starter files.
2. Push this project root to its `main` branch.
3. Open Settings → Pages → Build and deployment → Source, and select **GitHub Actions**.
4. A main-branch push runs `.github/workflows/deploy-pages.yml`. If the first push preceded enabling Pages, use Actions → Deploy Beyond Event Horizon → Run workflow.
5. A successful deployment appears in the github-pages environment. The URL format is `https://USERNAME.github.io/REPOSITORY/`.

This project's repository is `https://github.com/zyx663666/beyond-event-horizon`; its expected site root is `https://zyx663666.github.io/beyond-event-horizon/`.

The workflow uses Node.js 24, pinned official Actions, dependency caching and minimum job permissions. Sequence: checkout → read Pages metadata → `npm ci` → `npm run build` → `npm run check:dist` → upload dist artifact → deploy Pages. Only the deploy job gets pages write and OIDC token permission. Concurrent pushes replace an older in-progress deployment.

## Vite base and resources

`vite.config.mjs` keeps development at `/`. Builds/previews accept `VITE_BASE_PATH`, with a normalized trailing slash. Actions supplies `${{ steps.pages.outputs.base_path }}/`, so repository subpaths and future domain-root sites use the same workflow.

Shaders are bundled through `?raw`. Earth texture and scientific lookup data use `import.meta.env.BASE_URL`. All mode links are query-relative, retaining the deployment directory. The favicon is rewritten by Vite. There are no external fonts, audio files or model downloads: system fonts, optional synthesized audio and procedural models are used.

The build disables copying the whole public folder. `scripts/deploy-assets.mjs` includes the Earth texture, attribution, favicon and four lensing/orbit assets; Vite adds JS/CSS and `.nojekyll`. Diagnostic stills, old Webb backgrounds, temporary archives, logs and source maps are excluded. `check-dist` checks file presence, HTML base links, runtime directory references and excluded-file patterns. Add new runtime assets to the manifest when introduced.

## Browser behavior

Sound defaults to off. A user click resumes/creates AudioContext. Fullscreen is requested by a click, may be declined by the host browser, and does not block playback if unavailable. WebGL2 failures show a bilingual support message. The 16:9 stage is letterboxed instead of rearranged. No portrait/mobile design is offered.

Film queries remain usable: `quality=preview|target|ultra`, `debug=0|1`, paused keyframe `t=SECONDS`, event switches `event=0`, `gas=0`, `debris=0`. `t` uses the full film clock including the 36-second opening. Default is Observatory, `mode=free` is basic free observation, and `mode=lab` preserves the legacy laboratory. Audience links should omit diagnostic switches.

## Local build and future domain

```powershell
npm ci
$env:VITE_BASE_PATH='/beyond-event-horizon/'
npm run build
npm run check:dist
npm run preview -- --port 5177 --strictPort
```

For a future custom domain, configure it in GitHub Pages Settings and set the required DNS records according to GitHub guidance. Then redeploy: Pages metadata will supply the root base. No domain purchase, DNS change or CNAME is part of this pass.

Official references: [Vite static deployment](https://vite.dev/guide/static-deploy.html), [GitHub publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [custom-domain setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
