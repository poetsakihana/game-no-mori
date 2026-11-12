# collection-48 人生めぐり3D v1.0 → 1.0-web.1 候補

ローカル実装のみ。外部公開・実ブラウザQA未実施。collection-26人生ゲームや鑑定論とは別の識別で扱う。

原本: Drive 1ayTYqqKokIMZCYJjpf0OGIXkaEkZYOhm / APK SHA256 7ff62d4f7a61d8cc3799c26d422b0ca51ba39b580bcfdaed867233e23354ba35。next-candidate-inspect/jinsei-original が未改変原本。汎用16絵アトラス/独自コード描画を観測、明白な市販固有素材は見つからないが権利保証ではない。

4人交代・12コース64〜128マス・順番同点再抽選・横取り・6イベント・到着ボーナス・所持金順位・原画像・WebGL/CPU投影を保持。画像バイトは原本同一。

変更: HTML inline scriptをgame.jsへ分離、inlineonclick廃止、専用store.jsとbrowser.js追加。namespace zatuplay:jinsei-meguri:1、64KB JSON厳密形式/値検証、復元確認・取消、同ファイル再選択、直前ゲーム一世代復旧、初期化、navigator.locks単writer、競合照合、破損/容量不足時は以前の保存保持とメモリ動作。排他非対応環境はメモリのみ。名前は端末内で保存、外部送信なし。

非同期のサイコロ待ち/駒歩行は中断時に直前の確定手番へ戻す。画面非表示・blur・一覧移動・JSON操作で取消。歩行中座標・カメラは永続化しない。戻る復帰後はメモリ動作として再読込案内。旧APKの保存を自動移行しない。原作にない音声・新素材は追加しない。

#lightはCPU投影を強制。WebGL初期化失敗時も新canvasでCPUへ。フォーム/ボタンのフォーカス枠、420px以下の縦並びを追加。実際のタッチ/狭幅/キーボードと描画は未確認。

試験: `node next-jinsei-port/test.cjs`。現時点79モデルassertion。全12コース4人自然完走（ランダムモデル）、状態検証、二重ゴール防止、連打・中断、保存再開、復元取消/再選択、復旧、第二タブ、遅延ロック前操作を確認。全12コースCPU描画コードもスタブで実行。実描画/実JSON選択/ブラウザ/音声/スマホの合格を意味しない。追加モデルと独立レビュー・親による実QAが必要。

原本差分: `original-diff.txt`。game/配下のみ配布候補。元画像は game/assets/events.png。

独立指摘修正：順番決定時queueとvaluesの全4人・重複なし被覆を検証。報酬等が検証上限を超えた場合はcommit前検証で直前手番へ戻し、未保存状態を成功扱いしない。上限状態ではJSONを保管し初期化が必要。4回帰追加済み。
