# 原コード対応と差分

## ルールの対応

`reference/classes.dex` の `jp.sakihana.cantycoon.MainActivity$Game` と各内部クラスを原本としています。以下の番号は内部クラス名の末尾です。

| 原コード | ブラウザ側 | 保持した内容 |
|---|---|---|
| Expansion.<clinit> | original-data.json / extraction script | イベント・台詞・名前・目標・分類の12配列、240値 |
| Game.<init> | data.base / fresh / validateState | 5地区、価格、解放、6事業、初期値、保存項目 |
| spawn / $3.run | spawn / Game.pick | 金8%、非金の22%緑、容量・道具・回収2倍、収集品15%、地区別4種、25回イベント |
| field / $4.run | value / sell | 地区価格、売却段階×0.2、売価2倍、売却数・所持金・累計更新 |
| shop / $6〜$10 | cost / buy | 道具80×2.3^Lv、袋100×2^Lv、売価200×2.5^Lv、住まい300×12^Lv、事業固定価格と上限 |
| map / $11.run | move | 累計収入による解放、袋あり移動拒否 |
| npc / $19 | meet / accept | 初回のみ評判+1と地区価格×10、1依頼のみ受注、受注時の基準値 |
| metric / progress / $20 / $21 | metric / progress / report / cancelQuest | 収集・売却・収入は受注後差分、段階は絶対値、報酬300×1.5^ID・評判+2、中止可能 |
| achievementMenu / $22 | achMetric / claim | 20目標、報酬200×1.6^ID、一度のみ |
| onDraw / triggerEvent / $16 / $17 | tick / triggerEvent / chooseEvent | 60活動秒、全20件を順番に、報酬max(80,地区価格×30＋現在毎秒収入×3)、参加効果、休憩1/4 |
| rate / onDraw / MainActivity.onResume | rate / frame / lifecycle handlers | プレイ中のみ収入、描画当たり最大1秒、評判補正、再開時の時計設定 |
| saleUntil / pickUntil / bizUntil | 同名の保存フィールド | 60秒の実時刻期限。閉じていても期限が経過 |
| ending / story / $14 / $15 | render / reset | 所持金1億円、ED文言、ED後継続・再鑑賞、やり直し |
| journal / journalList / $24 | journal / journalList / journalItem | 5分類×20項目、発見済み表示、全説明 |

## 意図的なブラウザ差分

1. Android CanvasをブラウザCanvas 2Dへ置換。元の400×800座標を使用し、キーボード／支援技術用の透明なDOMボタンを同じ位置に重ねています。字体はOS依存、狭い文字はボタン幅へ収めます。
2. Android SharedPreferencesを、この作品専用のローカル保存へ置換。型・範囲・進行整合を検査し、書込前の既存値照合を行います。元の各操作・定期保存に加え、缶の回収直後も保存します。
3. 元APKが再起動時に再生成していた20個の缶・表示ページと、未選択イベントのID／報酬を追加保存。再読込で抽選や報酬をやり直さないためです。
4. ページ非表示・blur・手動停止・長い更新間隔では収入とイベント進行を停止し、明示再開を待ちます。実時刻の強化期限は原作のままです。メニュー中は受動収入が進みますが、元のwindow focus条件に合わせて新しい時間制イベントを開始しません。
5. Web Locksでプレイ中の書込所有を保持。対応しないブラウザでは元の保存を一切変更しない一時プレイに限定します。今回の進行のJSON書出しは可能ですが、通常保存・復元・予備保存の書込は行いません。
6. JSON書出し／確認付き復元、復元前／やり直し前の予備保存、再読込案内を追加。原作のゲーム内バランスや解放条件は変えていません。
7. Android通知音は65msのWeb Audio合成音へ置換。音声が利用できなくても無音で継続します。再生を自動許可するブラウザ設定変更はありません。
8. 元APKにも外部画像・楽曲はないため、新しい画像・音楽素材は追加していません。原DEXは変更せず保全しています。

## 検証の境界

自動検証ではモデルの入力・時計を制御します。図鑑100項目の操作と実Canvas2D描画を行いますが、実ブラウザのレイアウト、端末のタッチ、音の聴取、手動による全経営完走を代替しません。元APKをAndroid端末上で実行した比較試験も未実施です。
