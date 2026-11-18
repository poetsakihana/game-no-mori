# クロスロード 全国鉄道の旅 ブラウザ版

版: 2.0-web.1。`06.クロスロード_全国鉄道_v2.0.apk` のWeb資産を移植。47都道府県・8,987駅・1駅10盤面（合計89,870盤面）、駅名標のスライド、鉄道種別・路線の絞り込み、スタンプ・市区町村マーク、日替わり問題を維持しています。

原本SHA-256: `22bca6d6f1d6f75e72e8afbab990d351bc297585683dc5187e560bce6fad8b2d`

## ブラウザ向けの変更

- ゲーム・語彙・駅データと盤面生成エンジンを保持。scriptsは読み込み順を維持したdefer指定。
- ZatuPlay一覧へ戻るリンク、保存対象・APKとは別の記録である説明を追加。オフライン保証の表示を変更し、初回/再読込には通信が必要と明記。
- 元の圧縮保存とJSONバックアップ・復元を保持。Androidのオブジェクトだけがあっても、対応メソッドが無ければ通常ブラウザの方法を使う。
- 前/次の駅を早く押すと表示と選択が食い違う問題を修正。ボタン操作では選択を即時に更新。スワイプのスクロールと駅の選択も維持。
- 駅データのCC BY-SA 4.0とlz-stringのMITについて `THIRD_PARTY_NOTICES.txt` を追加。駅データ `data.js` とlz-stringは原本から変更していません。

セーブキーは元の `crossroad-save-v1`。入力中の文字、クリア、コインなどはこのブラウザ内に保存。サイトデータの削除で消える場合があります。APK・別端末とは自動同期しません。

## 検証

ローカルChromeで県選択、駅一覧、前/次の連続切替（1→2→1）、稚内駅の問題1を4つのカギの入力でクリア、35コインと市区町村マーク獲得を確認。再読込後の1盤面クリア・95コインを確認。問題2へ移り7/20マス入力後に再読込し、同じ問題2と7文字の途中状態から再開できることも確認。実際にダウンロードしたJSONから復元し、不正なJSONの拒否も確認。

`node scripts/test-browser-batch.cjs` で駅IDの一意性・47県すべての駅データ、圧縮保存の往復、日本語入力正規化を確認。8駅×10盤面＝80盤面の交差一致・範囲・連結性・盤面の一意性と再生成時の決定性を確認しました。全89,870盤面の生成・手動完走を行ったものではありません。

スマホ実機、Safari/Firefox、IME変換中のEnter、音の実聴取、すべての地域・盤面の手動完走は未確認。公開URLの確認日はBROWSER_RELEASES.mdとカタログのcheckedAtを参照。

## 一般公開URLのChrome確認

2026-11-11T01:05:00.843Z に一般公開URLで起動・代表的な操作・保存を確認。詳細はBROWSER_RELEASES.mdの継続制作第2回を参照。

## 2.0-web.2 local candidate: journey milestone and safe reset
- Existing actual railway-ui rules remain: all 47 prefectures selectable, 10 generated boards per station. The old app.js Tedako-Uranishi ending was overridden by railway-ui.js and is not used as a completion claim.
- Added 「全国ひとめぐり」 epilogue when at least one valid station stamp exists in each of 47 prefectures. Derived from existing cleared records, including old saves; not a new save field. Explicitly not every station or all boards. Can be replayed without rewards or writes. First crossing shows the epilogue after the normal puzzle reward is safely saved.
- Keeps crossroad-save-v1, version1 JSON and LZ: UTF16 encoding. Existing station/round data stays compatible. Game scripts are loaded only after Web Lock and schema validation. Corrupt saves stop before app execution instead of becoming defaults. Initial render/in-memory round migration no longer automatically overwrites storage. Future deliberate play writes include the existing in-memory legacy-round compatibility mapping.
- Reset/import confirm and copy exact previous raw bytes into crossroad-save-v1.before-change before replacement. Backup failure aborts. Stop old writer before replacement/reload. Recovery panel stays available after corruption, save failures or conflict; raw compressed or plain JSON can be restored. Backup is one replacement deep, so copy important data elsewhere.
- Broken/normal boot retain lock until pagehide; no-lock second tab cannot replace. Pagehide stops and BFCache return reloads. Halt freezes game surfaces, toast/scroll timers and audio; confetti removal timers only remove decorative nodes.
- node test-port.cjs: loads actual app+railway scripts with mocked DOM, verifies no boot writes, 46/47 region threshold, no-reward replay, generated puzzle completion. Storage tests cover corruption, quota, cancel, backup failure, stopped writer, broken-boot lock retention, second-tab refusal and pagehide.
- 2026-11-19: 公式Sites previewをCUAで操作し、札幌駅の問題1を自然操作でクリア（35コイン獲得）、95コイン・1クリアの再読込後の保持を確認。リセット取消／確定、変更前の保存原文の完全一致、LZ原文から95コイン・1クリアへの復元、2タブ目の保護停止を確認。
- 47県達成の人工fixtureで結末の再鑑賞を確認。これは通常プレイによる47県完走ではありません。
- この候補のスマホ実機・実音声・通常プレイでの全国完走は未確認。上記は公式Sites previewでの確認であり、この候補の一般公開を示すものではありません。
