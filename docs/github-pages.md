# GitHub Pages deployment

The repository is `https://github.com/zyx663666/beyond-event-horizon`.
The project domain is `https://bs.beiguo.fun/`, bound specifically to this repository.
The site is a static Vite + TypeScript + Three.js/WebGL2 application served from `dist/`.

## Custom domain

In the repository's Settings → Pages, keep the publishing source set to GitHub Actions
and the Custom domain set to `bs.beiguo.fun`.

In Alibaba Cloud DNS, the `beiguo.fun` zone contains:

| Type | Host | Value | TTL |
|---|---|---|---|
| CNAME | bs | zyx663666.github.io | 10 minutes |

The CNAME value contains no protocol or repository path. GitHub selects this project
using its repository-level Custom domain setting. Other subdomains remain independently configurable.

After changing the custom domain, redeploy the site so asset URLs use the new root path.
DNS validation and HTTPS certificate issuance are separate from deployment; enable Enforce HTTPS
in Pages settings once the certificate is available. A custom GitHub Actions publishing workflow
does not require a CNAME file in the repository.

## Automatic deployment and asset paths

A push to `main` runs `.github/workflows/deploy-pages.yml`: read Pages configuration,
install dependencies with Node.js 24, run tests, build, check assets, upload the artifact and deploy.
Only the deployment job receives Pages write and OIDC permissions.

The configure-pages action supplies `base_path` to `VITE_BASE_PATH` for both the build
and the asset checks. A project URL uses `/beyond-event-horizon/`; the custom domain uses `/`.
Local development always uses `/`. Do not hardcode a repository prefix in runtime links.

Shaders are bundled through `?raw`. Texture, scientific data, audio and recorded-video paths
inherit `import.meta.env.BASE_URL`. Mode links use relative query strings.
The runtime manifest in `scripts/deploy-assets.mjs` includes the Earth texture, attribution,
favicon, scientific lookup tables, the existing score, and an optional recorded MP4.
The video is configured in `src/content/video.config.json` and is included only when present.
Diagnostics, temporary captures, archives and source maps are excluded.

## Local verification

For a custom-domain build:

```powershell
$env:VITE_BASE_PATH='/'
npm run build
npm run check:dist
npm run preview -- --port 5177 --strictPort
```

Open `http://127.0.0.1:5177/`. To verify repository-subpath compatibility, repeat with
`VITE_BASE_PATH=/beyond-event-horizon/` and open that pathname instead.

## Browser behavior

The default mode is Observatory; `mode=film` starts the directed journey, `mode=free`
opens free observation, and `mode=offline` opens the standalone recorded-video player.
The recorded player creates no WebGL renderer. Without its MP4, it displays a waiting message.
Realtime modes require WebGL2 and desktop hardware acceleration. The presentation retains
its 16:9 stage with letterboxing. Music requires a user gesture and follows the film clock.

Official references: [GitHub custom-domain setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site),
[GitHub DNS troubleshooting](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages),
[Alibaba Cloud DNS records](https://help.aliyun.com/zh/dns/pubz-add-parsing-record/).
