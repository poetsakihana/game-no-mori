# ASTERIA browser edition

Static browser port of **ASTERIA v1.1.0**, preserving the APK's bundled game, illustrations and licenses. It is a constellation-themed action RPG with 88 constellations, 440 stages and 352 ally variants. The engine and campaign were not rewritten.

## Deployment

Serve this folder under `games/asteria/` with the browser collection at `../../browser/`. There is no build step, server API or external runtime asset. Deploy all files, including `licenses/`. HTTPS is recommended. No service worker is included; a fresh offline reload is not guaranteed.

## Browser adaptations

- Added a document-flow collection link and expandable browser/local-save notice in `index.html`, styled by `browser.css`.
- The existing JSON import field is already mounted by React. Reset its value after selection so the same backup can be selected again.
- Original Android bridge checks are retained but optional. In a normal browser, the existing JSON download/file-picker fallbacks run without Android.
- Every other byte of the game bundle and all original CSS, SVG and license files remain unchanged.

Progress is stored under `asteria-save-v1` on the current browser origin. APK and browser saves are not automatically shared. Use Settings to export/import JSON backups. Clearing site data, private browsing or blocked storage can lose progress.

## Source integrity

APK: `49.ASTERIA-v1.1.0.apk`

SHA-256: `67604cd3b8b6225e4bb1742e70ac41913ba2c674afa40483950182ff13495eaf`

## Verification status

Automated source/path/security checks and engine tests passed: 88 constellation definitions, 440 stage definitions, stage gating, summoning rarity/pity, save round trips, invalid-save rejection and settings normalization. Browser rendering, actual sound, gameplay completion, real file pickers and mobile device checks remain separate manual QA targets. Public-browser QA had not run when this release was prepared.
