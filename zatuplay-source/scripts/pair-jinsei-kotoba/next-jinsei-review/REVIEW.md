# 人生めぐり3D 1.0-web.1 独立レビュー

対象 `next-jinsei-port/game`。原本 `next-candidate-inspect/jinsei-original/assets`。実装編集・外部書込み・共有ブラウザ操作なし。

## 発見・修正された問題
1. order状態のqueue/values欠員を受理し、次のrollで3人がgroups/orderから消える不整合。`repro-schema.cjs`で当初再現。実装者がqueueとvalues keyの重複なし全4人coverageを追加。
2. cash上限を超す確定操作で保存validationが失敗した場合のrollback順序。実装者がcommit前checkを追加し、webBefore解除をrender成功後へ移動。独立試験で有効なcash1e9・ゴール手前からの加算が全状態を直前手番へ戻し、保存バイトを保持することを確認。上限状態を続行可能にする拡張ではなく、安全な中止。

## 最終再試験
- `node next-jinsei-review/test-model.cjs`: **32 PASS**。
- `node next-jinsei-review/test-dom.cjs`: **47 PASS**。
- `node next-jinsei-port/test.cjs`: **79 PASS**（作者試験の独立再実行）。
- 合計独立79項目。作者79とは別の試験であり、同じ79項目を意味しない。
- 全6配布ファイルのチェックサム一致。原画像events.pngの全バイトが原本同一。
- 元の12コース宣言・マス数倍化・4人/イベント/現金ではないゲーム内金額の規則を静的差分で確認。

## 独立検証範囲
実HTMLをLinkeDOMへ読み込み、script順に評価。12個の実DOM選択ボタンから全コース開始、全マスラベル、4人の順番roll、同じボタン連打の抑止、timer途中blurのrollback、24回の手番操作と駒歩行/マスイベント、カメラ3操作、初期化取消・復旧のイベント配線を確認。CPU描画は有限座標を検証するstubへ実行。
独立モデルでは不整合JSON、cash超過rollback、遅延lock前開始、pagehide途中取消、quotaで以前のバイト保持、reader誤上書き拒否、JSON取消/古い非同期完了無視、不正/過大入力を確認。

## 判定・未確認
レビュー範囲内で未解決の公開阻害問題は見つからない。一般公開の実画面QAは別途必要。
LinkeDOM/CPU stubは実Chrome・WebGL・実描画品質/速度・実ファイルダイアログ・スマホタッチ/iOS/Android/Safari/Firefoxの合格ではない。全12コース自然操作での完走も未確認。原本は音声を含まず追加していない。

再現用repro-schema.cjsは修正前の不正入力を直接試すため、修正後はvalidation例外で停止するのが期待される。回帰PASS判定はtest-model.cjsを使う。
