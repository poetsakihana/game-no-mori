# KomorebiWorks browser edition

Static browser port of **KomorebiWorks v1.0.0** (こもれびワークス), preserving the APK's workshop-management simulation, artwork, reference links and third-party notices. Manage six work categories, people, facilities and monthly finances over up to 99 years. Health/support events are fictional game scenarios, not personal records or medical advice.

## Deployment

Serve this folder under `games/komorebiworks/` with the browser collection at `../../browser/`. The existing APK catalog identifier is `komorebi`; the browser folder name can remain `komorebiworks`. There is no build step, server API or external runtime asset. Deploy all files, including `THIRD_PARTY_NOTICES.txt` and `workshop.webp`. Use HTTPS for normal browser security and cryptographic random seeding. No service worker is included; a fresh offline reload is not guaranteed.

## Browser adaptations

- Changed the workshop illustration from `/workshop.webp` to `./workshop.webp` so it loads under a project/game subdirectory.
- Added a document-flow collection link, expandable browser/local-save notice, JavaScript-disabled message and `browser.css`. The notice aligns beside the existing fixed desktop sidebar and returns to full width on mobile.
- The original JSON file input is already mounted by React and already resets after selection. No picker patch was required.
- Original optional Android bridge checks remain. Standard browser download/file-picker and external-link behavior work without Android.
- Every other byte of the game bundle and all original CSS, SVG, WebP and notices remain unchanged.

Progress is stored under `komorebi-works-v1` on the current browser origin. APK and browser saves are not automatically shared. Use Settings to export/import JSON backups. Clearing site data, private browsing or blocked storage can lose progress.

## Source integrity

APK: `54.KomorebiWorks-v1.0.0.apk`

SHA-256: `6d3a629d0a2a06f69e5d2c05bb95a1bf57f2cff4334965b6f31e679a2d115a09`

## Verification status

Automated source/path/security checks and engine tests passed: six work categories, plan validation, upgrades, recruitment, JSON save round trips, malformed-save rejection and a controlled 1,188-month engine simulation through the 99-year ending. The simulation used high starting cash as a test fixture, handled 121 health confirmations and 121 return-to-work reviews, and does not represent a normal-difficulty playthrough. Public-browser rendering, image loading, file dialogs and responsive layout had not run when this release was prepared.

## Public Chrome QA, 2026-11-11

Confirmed startup, workshop illustration, normal monthly progression from April to May, forecast/result agreement (+39,300 yen), closing results, reload persistence (year 1 May, 3,239,300 yen, confidence 89, one elapsed month), settings/help dialog closing and collection navigation. No internal game state or storage was manipulated. JSON end-to-end restore, full-length play, physical mobile devices and audible sound require separate verification.
