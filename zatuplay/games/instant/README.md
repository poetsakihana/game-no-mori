# Instant browser port — 4.4.1-web.1 (local candidate)

## Original and scope

Faithful local-only browser adaptation of `Instant-Login-v4.4.1.apk`, 47,477,987 bytes, SHA256 `799ebf9b373c3d626224c59f7a4efbc9ee2fda5e376a834a5e658a821e2178b8`. Original extracted `assets/www`: 350 files, 48,087,851 bytes. All original data and images are retained, including 200 photo bases, 10,000 generated photo variations, 100 beginner drawings, the 144 icon collection, CPU simulation, community/DM/studio/event systems, and six-chapter story with three endings. No APK is changed.

The original source labels CPU images as game-generated shared assets and portraits as fictitious people/original characters. Representative original atlases/photos were inspected; no specific evidence of copied third-party characters was identified. This provenance is not independent legal certification of every asset.

This is a fictional, device-local SNS simulation, not an online social network. The original local ID/password registration and PBKDF2 SHA256 600,000-iteration credential mechanism are retained. Use a unique game-only password, not an external account password. There is no mail verification/server login or cross-device synchronization. The APK's disabled, empty Supabase configuration remains disabled; browser startup does not request an authentication endpoint. CPU messages do not contact actual people.

## Browser differences

- Original scripts/data remain in original order; the original inline script is extracted to `original-inline-0.js`. Bootstrap waits for an exclusive Web Lock before starting. No original Android bridge is invoked in the browser.
- All original localStorage calls route through one isolated `zatuplay:instant:4.4.1:web.1` record; original native keys are untouched. Credentials, accounts/index and remembered-login strings are held together in this isolated record. Updates compare exact prior stored bytes before writing. A second tab or Web Locks-unavailable browser uses explicit memory-only state.
- Media and CPU-feed IndexedDB databases use exclusive browser namespaces. Reader tabs use session-specific temporary databases, not the writer databases. Readwrite transactions are rejected after writer ownership loss and active ones are aborted. Original user video/audio is still local-only. Temporary database cleanup is not yet implemented; browser site-data cleanup removes it.
- Corrupt/unreadable/quota/conflicting durable saves are not silently repaired/overwritten. The existing bytes remain available for raw export. Quota failure is a failed save, not a success message. Reload is required to regain ownership after browser Back/BFCache or closing the prior owner tab.
- Import validates bounded JSON and retains a previous local record before replacement; canceled or superseded reads do not apply. Recovery reloads the prior account records. Native save backups remain game-state-only: video/audio bytes and password credentials are not in that file. ID-only backups remain login aids, not full saves. Raw local-record export can contain password hashes and should be kept private.
- Returning from hidden/blur pauses the page with an explicit Continue overlay. Interval simulation stops while paused. The original wall-clock offline/catch-up simulation remains, and may advance CPU outcomes when resuming. Pending profile/image/post/password work checks context tickets; interrupted operations must not apply to a newer screen/account.
- Account withdrawal keeps media bytes rather than irreversibly deleting them before the game save succeeds. One previous replacement record is retained. Unreferenced media may occupy space until browser site-data cleanup.
- Direct same-tab catalogue link, honest save status and backup/recovery controls added. CSP prevents external connections and object embedding. No service worker is added; standalone offline installation is not claimed.

## Verification status

Local full-source DOM/IndexedDB model tests currently pass **109 assertions**, including local registration/real PBKDF2, original text posting, six chapter gates and completion, all 64 choice branches, 17 route renders, JSON cancel/accept, reload/remembered account, and reader isolation. Seventeen additional interrupted-flow model assertions pass. Independent review results are recorded in QA.md. These are modeled DOM, locks and IndexedDB, not physical browser/phone/media acceptance.

Independent security/import-schema findings have been addressed and production regression passed with no remaining reproduced blocker in tested paths. Actual browser acceptance remains pending. This folder is a candidate, not approval to publish or add to the catalogue. See QA.md. No actual Chrome UI, image/video/audio picker/playback, physical device, Safari/Firefox, or full simulation-time acceptance has been completed for this port.
