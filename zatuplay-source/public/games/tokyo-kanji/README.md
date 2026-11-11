# 東京よみめぐり ブラウザ版

Browser version: `1.0.0-web.1`. APK catalog id: `tokyo`.

This is the original APK web application adapted for static subdirectory hosting, not a rewritten game. Deploy this directory as `public/games/tokyo-kanji/`. The catalog link resolves to `../../browser/`.

## Source and retained material

- Supplied APK: 東京地名難読漢字.apk.
- Source: https://drive.google.com/file/d/1LyXfqpkucYAJLoGXLREhdCHtWVKVUfW_/view
- APK SHA-256: `b790ce1869a1333d23ff5e6f67c06851a009eb84adb3616035f5a2b8e64b761c`.
- APK version was not established; the browser version is a separate label.
- All 62 regional SVG illustrations, the favicon and `THIRD-PARTY-LICENSES.txt` are retained. The original application bundle is unchanged except for its regional SVG URL prefix and browser-specific platform/save/offline guidance.

## Browser changes

- Favicon, script, stylesheet and regional illustrations use relative URLs.
- Removed the optional Google Fonts CSS import. Existing Japanese system-font fallbacks remain; there is no external font request.
- Added a responsive browser catalog link, local-save explanation and no-JavaScript notice.
- Original save key `tokyo-yomimeguri-v1` is retained. The browser does not read APK app data and does not synchronize devices. Clearing this site's data removes progress. Private browsing or restrictive storage settings can prevent durable saves.
- No service worker, remote game-data API, accounts or additional dependencies were introduced.

## Broader manual release QA

Open the production subdirectory URL with a trailing slash in desktop Chrome, mobile Safari and mobile Chrome:

1. Verify the catalog link, title, 62 region choices, artwork and narrow-screen layout.
2. Select regions in the wards, Tama and islands groups; confirm their illustrations appear without 404s.
3. Start a quiz. Submit a wrong answer, a correct answer, use a hint and proceed to the next question. Check Japanese IME Enter behavior.
4. Close and reopen dialogs, repeat navigation, refresh after progress and verify the save is retained. Confirm the APK save is not implicitly shared.
5. Check sound starts only after a user action and can be disabled. Check reference links open as ordinary outside links.
6. Block external hosts and confirm core play still works. Exercise unavailable local storage and verify the page remains usable.
7. Inspect console/network for runtime failures, missing files and unwanted remote font requests. Check keyboard focus and mobile touch controls.

Static preservation, JavaScript syntax and subdirectory-path checks are in the sibling batch test directory. These checks are not a visual or device-play QA pass.

## Public Chrome QA, 2026-11-11

Confirmed startup; wards, Tama and islands navigation with representative illustrations; wrong answer, hint, correct answer and next-question flow in Chiyoda; reload persistence at 1/60 Chiyoda and 1/1,706 overall; resume to Iidabashi; Toshima island completion and treasure receipt (1/62); quiz/help dialog closing and collection navigation. No internal game state or storage was manipulated.

QA found inherited Android-only save/offline help copy and the Android footer. These labels were corrected to Browser, local browser saves independent from APK, and communication required for initial/reload access.

All regions/questions, IME composition Enter, physical mobile devices, audible sound, blocked-network/storage scenarios and exhaustive console/network inspection remain unverified.
