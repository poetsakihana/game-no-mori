# ASTERIA browser edition

Static browser port of **ASTERIA v1.1.0**, preserving the APK's bundled game, illustrations and licenses. It is a constellation-themed action RPG with 88 constellations, 440 stages and 352 ally variants. The engine and campaign were not rewritten.

## Deployment

Serve this folder under `games/asteria/` with the browser collection at `../../browser/`. There is no build step, server API or external runtime asset. Deploy all files, including `licenses/`. HTTPS is recommended. No service worker is included; a fresh offline reload is not guaranteed.

## Browser adaptations

- Added a document-flow collection link and expandable browser/local-save notice in `index.html`, styled by `browser.css`.
- The existing JSON import field is already mounted by React. Reset its value after selection so the same backup can be selected again.
- Original Android bridge checks are retained but optional. In a normal browser, the existing JSON download/file-picker fallbacks run without Android.
- Changed the title-screen platform label from Android to Browser. Every other byte of the game bundle and all original CSS, SVG and license files remain unchanged.

Progress is stored under `asteria-save-v1` on the current browser origin. APK and browser saves are not automatically shared. Use Settings to export/import JSON backups. Clearing site data, private browsing or blocked storage can lose progress.

## Source integrity

APK: `49.ASTERIA-v1.1.0.apk`

SHA-256: `67604cd3b8b6225e4bb1742e70ac41913ba2c674afa40483950182ff13495eaf`

## Verification status

Automated source/path/security checks and engine tests passed: 88 constellation definitions, 440 stage definitions, stage gating, summoning rarity/pity, save round trips, invalid-save rejection and settings normalization. Browser rendering, actual sound, gameplay completion, real file pickers and mobile device checks remain separate manual QA targets. Public-browser QA had not run when this release was prepared.

## Public Chrome QA, 2026-11-11

Confirmed title/start flow, chapter 1 stage 1 clear through normal controls, +60 stardust and stage 2 unlock, pause/resume, reload persistence (1/440 stages and 660 stardust), JSON download and restore through the real browser file chooser, repeating the same-file restore, settings, browser-save notice and collection navigation/Back. No internal game state or storage was manipulated. The only captured error logs came from the browser extension, not the app.

Full 440-stage completion, constellation drawing/summon UI, malformed JSON through the picker, mobile widths/devices, Firefox/Safari and audible sound remain unverified. Engine tests cover malformed-save validation independently.

The entry HTML versions its JavaScript URL with a content hash so existing browser caches receive revised browser-specific guidance.

---

# ASTERIA — 星をつなぐ旅 1.2.0-web.1

ZatuPlayブラウザ版で遊べる、88星座・440ステージのアクションRPGです。元の物語、バトル、夜空イベント、仲間の召喚と全ステージを保持しています。

- 拠点の「星巡り手帳」で本編、全ステージ、星座別の達成数を確認できます。「未クリアの物語へ」から続きに進めます。
- 本編60ステージで「星をつなぐ旅」、全440ステージで「夜空はひとつではない」が開きます。クリア後は星巡り手帳から再読できます。
- 設定のリセットは確認画面を表示し、設定を残して進行を初期化します。リセットやJSON読み込みの直前の記録を1件残します。「この端末の控えから復元」で新旧を入れ替えられます。別の端末へ保管するときはJSONを書き出してください。
- 公開ブラウザ版の旧セーブ（v1）を読み継ぎ、旧セーブ自体は書き換えず新しい領域に保存します。別タブからの古い上書きを拒否します。APKとの自動共有はありません。

配備：全ファイルをHTTPSで同じディレクトリに置いて配信してください（Web Locksと端末データ保存に対応したブラウザを使用）。外部API、外部アセット、インストール、ビルド工程は不要です。ZIPを確認する場合は展開し、Web配信先で `index.html` を開きます。コレクションに戻るリンクはZatuPlay配備時の相対パスです。端末のサイトデータを消すと控えも失われます。

配備差分では旧HTMLを開いている人のため従来の `app.js` を削除せず、更新した本体は別名 `app-final-1.2.0.js` に配置します。元の配備済み `style.css`、`favicon.svg`、`licenses/` は編集不要です。
