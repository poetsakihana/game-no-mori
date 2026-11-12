# SlotTen 1.0-web.1 public desktop Chrome QA

Date: 2026-11-12. Target: https://poetsakihana.github.io/game-no-mori/zatuplay/games/slotten/?v=1.0-web.1

Deployment: commit `58292425df3670c4d16db83f125f2264488bcf63`, tree `2b7e85952f6ecff1f7ea712838596c176ec146d0`. Pages workflow 43159436529 was verified completed/success before browser testing. The catalog still contained 26 published entries at the end of this test; registration is coordinated separately.

## Verified through real UI

- All ten machines, original names/subtitles/symbols/paytable multipliers; all four BET choices and all three speeds. Normal controls produced one debit and one spin increment per completed spin.
- A bounded normal-play run ended on the first natural win, at spin 78. Machine 9, 氷のクリスタル, BET 5, three ice cubes: 149 coins. Before spin 975; after spin 1,119; wins 1; earned 149. Reload preserved these values and the three ice cubes. No random function, save, or hidden game state was altered to produce the result.
- Normal losses reached 50 coins. Free refill produced 1,050, adding 1,000 rather than resetting. A second refill was correctly refused.
- Auto stop during an active spin completed only the current result. Opening settings stopped auto and settled. Pending-spin reload was performed after waiting for visible “回転中…”, taking spin count 37 to 38, coins 665 to 660; a second reload kept 38/660. Settings and help are distinct from an actual OS visibility test.
- Selected machine 9, BET 25, speed 1,000, and sound OFF survived reload.
- Actual browser JSON download: 1,025 coins, 71 spins, machine 9, sound OFF. Canceled reset retained it; confirmed reset produced 1,000/0/machine 1. Downloaded previous-state backup restored 1,025/71/machine 9/OFF. Canceled JSON import retained the reset state. The same downloaded normal JSON was then selected and confirmed twice, with state preserved after reload.
- The real native Japanese “ファイルを開く” chooser was observed, then canceled using native Escape. Coins 995 and spins 73 were unchanged. Supported filechooser APIs handled the successful import cases; cancellation was tested through the native chooser because empty-selection API input was unsupported.
- Two actual same-origin tabs began at 1,025/71. Tab A completed a normal spin and saved 1,000/72. Tab B displayed the conflict warning and disabled spinning, restore, reset, and save retry while retaining its 1,025/71 snapshot for export. Reload picked up 1,000/72 and enabled normal controls.
- Keyboard Enter performed one manual spin. Enter opened settings and Escape closed it. The direct catalog return worked. Both owned game pages were unloaded at the catalog; the extra tab was closed.
- Game-URL console warnings/errors: zero in captured inspection. Browser-extension metadata transport errors were observed separately. No complete network request/HAR audit was performed.

## Coverage limits

- Attempts to stop in the exact 450ms auto gap crossed into the next spin because browser-control latency was longer than that gap. The active spin then settled correctly. This is **not a passed real gap-stop test**; deterministic gap tests passed.
- No independent actual active-spin blur/hidden test, browser quota/denied-storage injection, physical touch, smartphone hardware, narrow viewport emulation, or audio audition was performed. Sound OFF persistence is not proof of audibility.
- Initial and natural-win JPEG captures show the real browser, not a model rendering. Some accessibility evidence files are only diffs/no-change headers; the structured UI observations and matching screenshots provide the substantive evidence.
- All 8,640 payout outcomes, malformed JSON, storage failures, and deeper interruption cases remain separately covered by deterministic tests. They are not mislabeled as physical browser play.

No game-runtime code change was required during this public QA. README/provenance/checksum/mirror were updated afterward; staging, commits, catalog edits, and publication were left to the coordinating task.
