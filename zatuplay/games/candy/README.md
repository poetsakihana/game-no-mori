# キャンディ・レヴェリー ブラウザ版

公開先: https://poetsakihana.github.io/game-no-mori/zatuplay/games/candy/

APK 1.0.0 の assets/index.html を元にしたブラウザ専用配信です。原本APKは変更していません。全10ワールド・50ステージと元の図柄・ゲームルールを維持しています。

変更点: ブラウザ版の表記と一覧への戻りリンク、Androidブリッジ依存の無効化、開始・再開時のキーボードフォーカス、ボタンのキーボード操作を妨げない入力処理。

進行は localStorage の candy-reverie-v1 に保存します。他のキーを削除しません。APK版との自動同期はありません。candy-reverie-save-v1 形式のJSONを書き出し・読み込み可能です。元の作品に音声実装はありません。

検証: node zatuplay-source/scripts/test-candy.cjs

14項目の単体・ロジック検証が成功。50ステージの初期化・描画関数・クリア遷移はDOM/Canvasスタブを使ったシミュレーションであり、全ステージの手動プレイ完走やスマートフォン実機検証を意味しません。公開Chromeで1-1を通常操作でクリアし、火・水の仕掛け、仲間交代、停止・再開、次ステージ解放、再読み込み後の進行保持、JSON保存と再読込を確認しました（2026-11-10T22:01:25Z）。ゲーム由来のコンソールエラーはありませんでした。スマートフォン実機およびSafari/Firefoxは未検証です。

---

# Candy local ending / safe records candidate

Existing 50-stage ending retained, with cleared=50-only replay that adds no rewards. Original sugar/dream/base/wins/job/stamp/cleared schema and candy-reverie-v1 key remain.

Merged inventory records.html/manage-core/manage-ui/record-config with main-game protection. Both pages use the same Web Lock (candy-reverie-v1) and same one-generation raw backup (candy-reverie-v1.reset-recovery-v1). Game scripts execute only after lock and schema validation. Invalid data stops rather than being silently clamped/overwritten. Initial load no longer writes. Normal game mutations still save.

Main reset/import confirms, suspends old writer, backs up exact raw bytes, then writes and reloads. Backup failure stops. Main recovery panel remains accessible when corrupt or stopped. Record page keeps explicit pre-backup checkbox and confirmation; its write adapter refuses after pagehide. Both pages reload BFCache returns. The interval checks stopped and RAF stops; no audio exists in this game.

Inventory index modifications were a records link and BFCache reload hook. Both are included by the integrated main page/gate. Inventory's old unguarded game persist/load were not copied back. Black-sensei and other apps were not modified.

Tests: node test-candy.cjs (actual inline script, 50 direct stage wins, old ending, no-reward replay, no boot writes, RAF/timer stop); node test-storage.cjs (lock/backup/cancel/corrupt/quota/stale pagehide). Inventory /tmp test-two-records.cjs passed 55 assertions, but it tests isolated management functions, not complete browser execution. Node mocks do not prove actual Canvas visuals, ordinary full playthrough, media or mobile behavior. Local Chromium was not retried due socket restrictions; a subsequent isolated official preview browser check is described below. No upload, publication, commit or push.

Original main index SHA256: 4ed8591450b321ab6ce792829b4c15decfebcf10b8a14003fb5d11b739612dfc
Inventory original matched after trailing-LF normalization.

## Isolated preview browser verification — 2026-11-19
The coordinating agent verified the following through the official isolated preview, not the public production app or a user profile:
- Start and pause; navigation between the game and records page.
- Restore an artificial cleared=50 JSON fixture through the normal textarea and confirmation; replay the ending. The records page also showed the matching completed ending. This was not a normal 50-stage playthrough.
- Confirm reset in the main page, verify the saved before-change raw bytes exactly matched the previous data, then restore the 50/50 fixture.
- With records open, a second game tab was stopped by the shared lock.

Not verified: ordinary full 50-stage completion, physical mobile devices, downloaded file contents, or reset through the records page's prepare/checkbox flow. These browser observations do not expand the mocked tests into claims about untested routes. This update changes documentation and the visible verification note only, not game logic.
