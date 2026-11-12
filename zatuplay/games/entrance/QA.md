# Public Chrome observation — 2026-11-12 10:22 UTC

Reported by the coordinating tester after public browser interaction. GitHub Pages run **43198292067** succeeded for commit prefix **435117bc**. These observations are distinct from the 93 modeled assertions.

## Observed
- Standard URL started using the original Canvas2D lightweight fallback because WebGL was unavailable. Explicit `#light` also started. This does not verify hardware WebGL/GPU rendering.
- Normal W movement and turning supported natural progression from entrance 1 through entrance 6. Red anomalies and a bending tactile paving anomaly were correctly handled by turning back. Overlooking white footprints caused the original reset to entrance 1.
- At entrance 2, reload and saved-hallway resume worked.
- Actual local JSON download → restore cancellation → reselect the same file → confirmed restore → reload retained the save and allowed resume. Reset cancellation was checked.
- A second tab displayed memory-only mode. Changing its headbob setting and reloading did not overwrite the writer's saved `true` setting.
- Following the catalogue link and going back stopped play and displayed the memory-only warning.

## Not yet verified
Natural final escape / all eight successful passages; all 30 anomalies by manual play; audible sound listening; hardware WebGL/GPU rendering; physical mobile/touch devices; invalid JSON rejection through actual file-picker UI. Safari/Firefox and offline reload are not verified. The observations above do not establish complete gameplay acceptance or cover every checklist scenario below.

# Remaining acceptance checklist (not all completed)

Do not treat modeled scenario/geometry tests as manual play. No user personal data or permission is needed.

1. Open `games/entrance/?v=1.3.1-web.1`. Check version, boot status, all5 local image loads, visual corridor/commuter, console and renderer. Light mode uses the original software renderer, not substitute geometry. Verify actual standard and #light paths separately; no GPU claim from fallback.
2. Start normally, walk with WASD/arrows and screen stick/drag, turn with Space/button, pause/close settings. Try pointer release/cancel and keyboard repeats. Observe original ambient/footstep/musical effects separately from speaker audition. Audio unavailable must not block movement.
3. Observe the actual corridor, choose forward if normal/back if abnormal. Record naturally drawn anomalies. Finish8 correct passages then the ticket gate without injecting position/state/RNG. Record wins/losses and real ending. Do not call all30 manually tested unless actually done.
4. After a stage decision, reload. Use saved-hallway resume. Check stage/anomaly unchanged and position/time reset to entrance; no progression/reward from resume. Test wrong-choice reset and trap loss separately, then new-run confirmation cancel/accept.
5. Hold movement, blur/hide. Resume and verify no stuck movement/hidden progress/audio. Interrupt a transition by pause/menu/reload: stage settles at most once. Check pagehide/BFCache memory-only notice and reload ownership.
6. Actual download→file picker cancel→same-file select→replacement cancel→same-file accept→reload. Test malformed/oversize JSON and verify no mutation. Reset cancel then accept, recover previous state. Inspect settings+checkpoint consistency. Check no stale read after navigation/action. Download raw original when appropriate.
7. Two actual tabs: writer setting change; reader memory-only edit cannot overwrite; reload reader sees writer. Close writer/reload reader to obtain ownership. Test quota/denial/corrupt record only with disposable test-origin fixtures, not by deleting real data. Note memory-only limitations honestly.
8. Check small landscape/portrait, touch device if available, keyboard focus, read status text, same-tab direct catalog return. Ordinary desktop pointer events are not physical-touch evidence. Verify published files/commit and catalogue only after deployment. Safari/Firefox/offline reload remain separate tests.
