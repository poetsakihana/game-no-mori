# Instant browser acceptance — verified scope and remaining limits

## Local modeled evidence

`node scripts/test-model.cjs` currently reports 109 assertions. `node scripts/test-interruptions.cjs` reports 17 interrupted-flow assertions. Independent production regression: storage 32, validator 12, extended fixtures 10, long-term fixtures 20, async 9 checks pass. The long-term suite includes the 10 extended cases; do not sum these as unique coverage. Test imports use synthetic locally constructed state; no real user credentials/media are involved. Fake IndexedDB and linkedom are testing implementations, not browser verification. All 37 original scripts load along with the extracted inline script and adapters. Story branch tests exercise all 64 paths and post gates in the original story functions; they are not manual story playthroughs.

## Full acceptance checklist (items below are not all completed)

1. Normal startup: all original assets, local-only disclosure, correct version, no external network calls. New fictitious adult account using a game-only password; logout, wrong password, correct password and reload remembered state. Inspect private account isolation without using real user data.
2. Ordinary text/image/carousel/video/reel/story投稿, image library selection, file chooser cancellation and same-file retries. Verify original 200 photo bases/10,000 variations and original icon/gallery rendering. Local user audio attachment remains browser-only.
3. Six-story chapters, required posts in chapters 2/4/6, all three endings and replay collection. Count no duplicated choice after repeated click/reload.
4. CPU feed/DM/group DM/studio/season/events/missions and original long-term catch-up. Check identity/points/events do not duplicate after hidden/return. Distinguish computed model outcomes from actual long-duration observation.
5. Actual downloaded JSON→cancel→same-file select→confirmed restore→reload; previous-record recovery, malformed/oversized and deliberately adversarial input rejection without mutation. Test video/audio omission notice and same-browser retained media. ID backup is not game backup.
6. Interrupted image decoding, password derivation, media DB writes, profile save and post publication: change screen, cancel dialog, hide, reload, Back/Forward. Old jobs must not overwrite new context. Check keyboard/scroll/focus and repeated actions.
7. Second actual tab: explicit memory-only, no overwriting original localStorage or writer IndexedDB. Close writer and reload reader. Simulate quota/corrupt saves in a disposable origin only; durable bytes remain intact and status is truthful. Back/BFCache requires reload to regain save ownership.
8. Physical Android/iOS, touch, playback/codecs, Safari/Firefox, offline and installed-PWA behavior are separate acceptance tasks. No success claim until tested.

## Open review items

Independent findings addressed: late async/profile/dialog/CPU cache work, CPU reaction IDs above 239, pre-boot save/credential validation, quota-time IDB abort, monthly/seasonal ranking HTML inputs, and numeric chance-reward rates. Final independent production regression passed; no remaining reproduced blocker in tested paths. Actual browser acceptance for the tested core flows is recorded below; the full checklist is not an exhaustive pass. Real media and original extended simulation systems are not exhaustively tested. Temporary reader IndexedDB and orphaned media retention consume storage; cleanup currently relies on deliberate browser site-data removal.

## Independent review

Review date 2026-11-12. The separate reviewer ran the production validator/store against synthetic data and original runtime-generated monthly and seasonal settlement records. Every original path is retained: 335 unchanged, 15 intentionally changed, zero missing; all original asset bytes are unchanged. See the accompanying independent-review report and portable test scripts. This is not exhaustive proof for every long-lived extension state.

### Conflict-message regression

Composer save failure now distinguishes another-tab conflict, corrupt records, unavailable storage and quota. A modeled competing write verifies the form explains the conflict without claiming low capacity, rolls back the unsaved post and preserves competing durable bytes. The 17 interrupted-flow checks include five message mappings and four actual modeled publish-conflict outcomes. Actual Chrome recheck belongs to the coordinator.

## Actual public Chrome evidence — 2026-11-12

Actual Chrome public QA, 2026-11-12. Initial 0ac0bad07261f5037379009686c2bbeeb3c68328 (Pages43211241669/build131159104459), final competing-tab message fix46e5d6e8470da28c5474b663b7f7e118643632e9 (Pages43213117002/build131165489642), both success and actual checkout SHA read in logs.
Public URL https://poetsakihana.github.io/game-no-mori/zatuplay/games/instant/?v=4.4.1-web.1
Actual fictitious local account creation; icon, game-only password, remembered login/reload, logout/wrong-password message/correct login. No real user credentials or external account used.
Completed all six story chapters through normal UI and mandatory posts for2/4/6; one ending returned and survivesreload. Model tests cover64routes, actual other2endings not played.
Created4posts: initial2-page textcarousel with next page, original built-in library photo selection/render/canvas conversion, closing/reopening draft, double-click submit producedonepost. Library count10000 visible, notall10000 visuallychecked.
Actual save JSON download, fourposts then cancelrestore leaves4; same-file reselect accept/restorereload gives3; recoverprevious reload gives4. Save excludes video/audio; onlycurrentbrowsermedia retained. No actual hostile/quota file test; modeledcoverage only.
Normal CPUfollow, natural followback noticed, DM sent/CPUreply, groupDMscreen andseasonaleventscreen render. No full longtermdays/months simulation. Some CPUprofiles have0recentposts; no claim allCPUfeeds exhaustivelyverified.
Actual secondarytab conflict blockswrite. Found misleadingcapacityerror, fixedphase-specific composererror; independentreview passes. Finalpublic recheck: conflictshows別タブ, inputdraft retained, original4posts andwriter note remainafterreload.
Catalog->browserback displaysBFCache reloadingneeded, thenreload retains4posts/follow.
Visual screenshot confirms originalcatavatarandphoto render/readableUI. Physicalmobile/touch, Safari/Firefox, installedPWA/offline, actualvideo/reel/audio codecs/fileimport, allstoryendings, allgalleryvariations, fullgroupDM/studio/lifetimeevents notexhaustivelytested.
