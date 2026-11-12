# 干支大レース 0.2-web.1 独立レビュー

対象: `next-poetry-port/eto-port`。外部書込み・ブラウザ操作・実装編集は実施していない。

## 結果
- 発見した公開前修正事項: WebLock取得前に元の `initial.state` がゲームから更新され、保存準備完了後に差分なしと誤判定し永続化されない問題。表示はsavedでも再読込で訓練等を失う。
- 実装者がdirtyフラグに修正。保存要求でdirtyにし、永続化成功時のみ解除。遅延ロック後に再保存する。
- 独立再現試験 `repro-loading.cjs`: 修正前FAIL、修正後PASS。80ポイントの保存を確認。
- 独立試験 `test-independent.cjs`: **54 assertions PASS**。
- 作者試験を独立再実行 `../test-eto.cjs`: **91 assertions PASS**。
- 最終5ファイルのchecksums.jsonと実バイトを照合、一致。
- 最終store.js SHA256: `c527e45ef303f62368f4255a0c61c686a1a9d8be1e44cfe20a1e7e45ec06f4ab`。

## 確認範囲
独立VM試験でpre-lock操作、lock前離脱、保存の一世代退避・getter隔離、再読込、別キーstorageイベント無視、競合拒否、quota時元バイト保持、破損envelopeの上書き拒否、入力上限を確認した。
原本との静的差分で主要地形・コース・タイプ・描画関数を照合。レース更新式全体はpause guard追加以外同一。12干支/12コースの内容保持、CSP connect-src none・inline HTML event handlerなしを確認。

## 未確認 / 判定の限界
実Chrome画面、表示性能、実ファイル入力、GPU WebGL、実音声、タッチ・iOS/Android・他ブラウザ、自然操作による全コース星獲得は未確認。VMでの完走やスタブ描画はこれらの合格ではない。現在コース・選択干支・走行中座標の非永続化は原仕様を維持しておりREADME記載済み。公開・カタログ登録判断には担当者の実画面QAが必要。
