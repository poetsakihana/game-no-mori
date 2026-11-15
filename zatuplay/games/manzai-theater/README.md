# 漫才＆コント劇場 — ZatuPlay browser v1-web.1

Source: user-provided GAMESELECT APK 44.漫才 20354871.apk.
SHA256: e22b766e0c12aca2f8443ba6a3ad936587742667074b427c027db3452348271d.
Original 150-person roster, nine genre templates, solo/duo/trio formations, free in-game gacha and random-result tournament retained. Names are roster references; dialogues are fictional template combinations, not performers' actual statements, recordings or endorsement. No real-money purchase, advertising SDK, remote AI call, recorded music or video is included. Voice defaults off and uses the browser/OS speech service when enabled. Such services may use their own network connection.

## Browser changes
Self-hosted compiled Tailwind 3.4.17 and Font Awesome Free 6.5.1, with MIT/SIL/CC notices. Original Google Fonts dependency removed. Playback cancellation and stale-callback protection; pause replays the interrupted line; reward only once after completion; autoplay counter follows completions, not starts; tournament duplicate-start guard and cancellation on page hide. Browser-only versioned state key with validation and single-writer Web Lock. Temporary play is clearly marked when another tab owns the lock or persistence is unavailable. JSON export/import (100 KB maximum) validates game/version/state and confirms replacement. APK saves do not sync automatically. Stop/hidden-page interruption earns no completion reward. Current script/tournament position is not saved.

## Verified 2026-11-15
61 Node model assertions and JavaScript syntax check passed. In cloud Chrome, normal nine-line solo performance completed once (+200 points). Pause/resume and Stop retained no interrupted reward. Single and 10-draw gacha charged the expected points; insufficient balance was rejected. Tournament double-click started only one run and its natural win awarded 2000 points. Reload preserved 2600 points and 16 unlocked performers. Genre selection and automatic formation persisted after fixes. Actual JSON download, canceled restoration, repeated selection of the same file and successful restoration/reload were checked. A second tab's temporary-play purchase did not overwrite the first tab's record. Autoplay start/stop left completion count and reward at zero when stopped early.

Not verified: real-device/touch/narrow-screen behavior, actual speech/audio listening, every performer/genre dialogue and all random tournament outcomes, blocked-storage UI and malformed-file browser UI. These are not claims of perfect operation. The 61 model assertions are not 61 browser checks.
