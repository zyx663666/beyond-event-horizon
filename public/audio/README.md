# Replaceable score

Place your licensed music at `public/audio/score.mp3` and restart the dev server.
Edit `src/content/audio.config.json` for volume, fade-in/out, offset, looping and credits behavior.
The original director edit lasts 462 seconds. A shorter non-looping score ends naturally; the film continues.
`credits: "continue"` fades at the film end; `"fade-at-credits"` fades out before credits.
Only set `publishAllowed: true` after confirming permission to distribute the audio publicly in the repository and website.
The production build refuses an existing score without this declaration. No third-party score is supplied in this release.
