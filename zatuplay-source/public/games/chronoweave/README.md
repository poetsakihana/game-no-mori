# Chronoweave browser edition

Deploy `index.html` and `icon.svg` together. The catalogue link expects this game under a two-level game directory with the catalogue at `../../browser/`. No build or remote runtime assets are required.

## Source and version

Extracted from `56.Chronoweave-v1.1.2.apk` (90,808 bytes), SHA-256:
`8d2fab410fdc12aa703ae6832ec90184a73a2c4b477baf529c292904be6f5dce`.

The APK asset footer identifies Android version **1.1.2**, but its JavaScript diagnostic API reports `window.chronoweave.version === '1.1.0'`. This discrepancy already exists in the supplied source. The browser port retains that diagnostic value and identifies itself as based on APK 1.1.2, without claiming an independent engine upgrade. Save schema version remains 3.

## Browser adaptation

- Removed Android backup/storage-prototype interception, native import/export branches and native ready callback.
- Retained existing browser JSON import/export, storage-failure messages, local auto-save, compatibility polyfills and boot diagnostics.
- Added a browser catalogue link and local-save/backup notice.
- Campaign, engine and canvas renderer are unchanged, including all 20 chapters and five game modes.
- Saves use `chronoweave-v3` on the current origin. Android app saves are not automatically shared with browsers; use JSON export/import where available. Private browsing, cleared site data or disabled storage may lose progress.

`www/` contains unchanged extracted source assets and is not required for deployment.

## Checks

Run `node scripts/test-chronoweave.cjs` from `zatuplay-source`. This parses all inline scripts, checks resource paths, verifies unchanged campaign/engine/renderer, exercises boot and chapter progression, all campaign puzzle definitions, branch restore, JSON round trips and malformed-save rejection.

These are JavaScript unit/static checks, not browser automation. Full 20-chapter manual completion, mobile devices, narrow-width layouts, Safari/Firefox and actual audio listening remain untested. No service worker is included, so offline reload is not guaranteed.

## Public desktop Chrome verification

Completed chapter 1 through normal UI actions: story introduction, planting the past seed, travelling to the future tree, collecting the clue, rejecting an incorrect causal sequence, solving the corrected sequence and reading the epilogue. Chapter 2 and the planted seed remained after reload. The audio toggle changed to ON (actual sound listening was not verified). JSON export downloaded successfully. The original transient file input was attached to the DOM for reliable browser import and removed after selection/cancellation.

2026-11-10 22:46 UTC: the exported JSON was selected through the browser file picker, the replacement confirmation was accepted, and the UI reported a successful import with chapter 2 still active. The link back to the ZatuPlay browser collection opened correctly. Console inspection found browser-extension metadata errors, not a game-origin runtime error in the captured results. These checks used desktop Chrome; actual audio listening and full mobile/game completion remain outside the verified scope.
