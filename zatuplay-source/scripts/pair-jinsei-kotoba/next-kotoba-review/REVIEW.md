# 全国ことばRPG 独立レビュー（最終）
2026-11-12。実装は編集せず、next-kotoba-review内だけに試験を作成。実ブラウザ・外部書込み・公開なし。

## 成果
- test-independent.cjs: 80 PASS
- test-boundaries.cjs: 77 PASS
- test-reward-integrity.cjs: 10 PASS
- 作者 test.cjs: 181 PASS（独立再実行）
- 全配布チェックサム照合PASS。実画面合格ではない。

## 発見→修正→再確認
1. xp=1e9の有効JSONから正解でライブ値だけ1000000008、保存済表示とJSON出力不能になった。作者が上限操作guard/rollbackを追加。xp/goldの正解、県報酬、カード枚数上限を独立確認し操作前状態復帰/永続保存維持。dailyだけは上限で増加せず受取日更新する仕様を確認（原作との差としてREADMEあり）。
2. 未解放の沖縄問題をfresh.answeredへ挿入したJSONを受理。作者が問題県<=解放県を追加し拒否を再確認。
再現コードrepro.cjsは現在修正済み結果（xpは1e9保持/出力可、locked answers false）を出す。

## 原作保全/出典
products.js、map-index.js、47maps、party.pngの50原素材バイト完全一致。
national-data.jsはlocal16-r38-08のexplanation1件だけ。content-change.jsonとbefore/after一致し、その他meta/prefs/units/questions全体は同一。設問/選択肢/答え/出典不変。SOURCES.htmlに加工主体/版/利用規約/非認定表示を追加。地理院リンクpreventDefault除去確認。

## 独立試験範囲
厳格な未知ID/重複/不正日付/範囲/余剰フィールド/不成立クリア/報酬参照の拒否、通常回答の連打/中断/再読込、古い非同期JSON復元の無効化、初期化/前世代回復、破損/容量不足で既存bytes保護、遅延lock取得前の初期化と設定・前世代保持、別タブ置換の非上書き、JST日付境界一度だけ報酬。
地図はスタブcanvasで実map.jsのControllerを実行。1→2切替後の1の遅延完了が2を壊さない、2の完了採用、明示停止、load失敗表示と新scriptによる再試行、復元後の遅延完了無効化を確認。描画引数有限値検査。実ネット地理院/ブラウザ描画確認とは異なる。

## 追加報酬整合の結論
作者が完了unit集合とunitRewards集合の一致を強制。独立回帰で報酬欠落・未完了報酬・重複を拒否し、通常choose/continueQuizでunitを完了、JSON往復、同unit再回答で報酬再加算なしを確認（10 PASS）。県報酬上限fixtureは新スキーマに従い完了unitRewardsを付与するよう更新。データの空unitは0、unit参照6571・一意6571で全問題数と一致。公開を止める未解決の報酬整合問題は確認されなかった。

## 残る検証
実DOM/browser UI、実ファイル入力/同一ファイル再選択、視覚/狭幅/物理タッチ、音聴取、実タイルON/OFF/通信失敗、オフライン、ブラウザ実quota等は未確認。全6571問を通常UIで解いていない。作者の全47県試験も逐次fixtureであり人手完走ではない。

## reviewed hashes
- game.js aa9e0c6ab4991ed7114bc3af298428e039177eb82614e0b90b4ed78c60138988
- store.js c9c8775fe90c1c30000d4c5061b5986efb0dad12fe298da7c8a3537f7610036d
- browser.js 6ff676a77fe5411de987d136db8a48d4c7eaf3e1eef8c3cd759ae74499ace98c
- map.js f4e49450426c036f8accb76a6bd71e943975ab450004f365e45836b88d3f361a
- national-data.js 2a880de08140b7b15b83e0fe4b68d94b264160a952cf1de63adc9fd11005e118
