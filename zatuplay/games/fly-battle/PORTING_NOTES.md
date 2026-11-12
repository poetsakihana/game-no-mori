# 復元対応表

元アプリ: `jp.sakihana.frybattle` / versionName `1.0`。

| 原DEXの責務 | ブラウザ対応 |
| --- | --- |
| MainActivity / onCreate, onPause, onResume | app.js / Sound, 起動と可視性・フォーカス処理 |
| Game / start, take, finish | core.js / Game |
| Game / onDraw, food, box, button, text | render.js / Renderer |
| Game / onTouchEvent | app.js / 安定したDOMボタンとpointerdown/キーボード |
| Game$Food | core.js / Game.food, targetTime |
| Game$Flight | core.js / flights, render.js / すくい網・得点表示 |
| Game$1 Comparator | core.js / 降順・安定したTOP10 |
| Game$2 名前保存 | app.js / 名前フォーム、12 UTF-16文字・trim・空時「料理人」 |
| SharedPreferences fry | 専用namespaceとWeb Locks / JSON |

主要float32定数の原DEXビット値:

| 値 | ビットの符号なし10進表記 |
| --- | --- |
| 0.015f | 1014350479 |
| 0.002f | 990057071 |
| 0.34f | 1051595899 |
| 0.38f | 1052938076 |
| 1.65f | 1070805811 |
| 0.05f | 1028443341 |
| 0.65f | 1059481190 |
| 0.24f | 1047904911 |
| 1.4f | 1068708659 |

食材生成の順序は目標時間用nextFloat → 種別nextInt(4)。回収時はCPU用nextFloat → 次食材のnextFloat → nextInt(4)。焦げでも同じ回収処理を通ります。四つの食材を左から判定し、焦げ処理の後に45秒の終了判定を行う順序を保持しています。平均表示は小数1桁。勝敗は丸めた表示値ではなく累積値の厳密な `>` 比較です。

描画座標は原1000×650。CanvasをCSSで同比率に縮小し、通常操作ボタンは同じ座標へ百分率で重ねます。食材操作領域は原作と同じ x=52+225i, y=239, w=196, h=242。キーボード追加のためにヒット判定や精度式を緩めていません。

READMEに記載した固定時間ステップ・中断時停止・120ms重複抑止・開始直後180ms誤操作抑止・保存拡張以外に、難度の緩和・ライバルの変更・ステージ省略は行っていません。原DEXとWAV以外の配布コードはブラウザ向けの新規実装です。
