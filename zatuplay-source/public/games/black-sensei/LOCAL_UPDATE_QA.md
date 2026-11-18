# Black Sensei local integration (unpublished)

The existing game ending and 250-stage progression are unchanged. records.html displays the original ending prose only after stars[249]>=1, not merely unlocked=249. Reading does not save or award anything.

The game and records page share save-guard.js, key black-sensei-v1, and Web Lock zatu-black-sensei-writer. Only one cooperating page runs. pagehide stops writing and releases; persisted pageshow reloads. No boot rewrite. The old game load/write sites now use BlackSave; a stopped gate cancels the next RAF and suspends active audio/input.

Reset, JSON import, and previous-record restore confirm first, stop the old writer, preserve exact primary raw to .before-change and read-verify, recheck primary, then replace. Backup failure prevents primary replacement. Backup is one generation; export important JSON first. Corrupt/unknown data stops gameplay but raw export and explicit confirmed recovery/reset remain available. Inventory separate manage-core/manage-ui were NOT merged: their different backup key/unlocked writer would conflict. The ending prose/condition and records-page concept were retained.

Run node test-save.cjs. This uses actual gate code with mocked DOM/storage/WebLocks, not a browser. Syntax checks and source/live byte comparisons also required. No full gameplay or real audio test completed here. No publish/commit/push.

Limit: an already-open PREVIOUS published game does not participate in Web Locks. Close all old tabs before opening this candidate. Storage-change stop and compare-before-write reduce but cannot make an uncooperative legacy writer atomic. Web Locks unavailable means fail closed. Existing browser storage is not automatically shared with APK/other origins.

## Parent-reported isolated browser QA — 2026-11-19

The coordinating agent verified the official isolated preview through CUA (not the production site):
- Start and pause.
- Import through the normal file chooser using an artificial completed-save fixture with stars[249]=3; records page displayed the ending.
- Cancel reset on records preserved the record; confirm reset displayed the not-yet-completed text.
- Restore the immediately preceding backup displayed the ending again.
- With records open, another game tab was stopped by the shared writer lock.

These are scoped browser checks reported by the coordinating agent, not a natural 250-stage playthrough. Physical-device testing, audible output, and actual downloaded-file contents remain unverified. This note does not imply publication.
