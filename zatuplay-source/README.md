# ZatuPlay — APK版とブラウザ版

公開入口: https://poetsakihana.github.io/game-no-mori/zatuplay/

- Android用APK一覧: https://poetsakihana.github.io/game-no-mori/zatuplay/apk/
- ブラウザで遊ぶ作品一覧: https://poetsakihana.github.io/game-no-mori/zatuplay/browser/

APK版はGAMESELECTにある作品のAndroid用ファイルです。ブラウザ版はWeb向けに個別に移植・公開した作品です。APKをそのままブラウザで実行するものではありません。ZatuPlay本体の独立APKは、このリポジトリにはありません。

## ビルド・配置

Node.js 22.13以降で `npm ci` → `npm run build` を実行し、`dist/` の中身をリポジトリの `zatuplay/` へ配置します。3ページでコードとカタログを共有します。Viteのbaseは `/game-no-mori/zatuplay/` です。

既存の `?app=作品ID` 形式はAPK一覧の作品詳細へ引き継ぎます。

## APKカタログ

既存の `zatuplay/data/app-catalog.json` を使用します。自動更新は従来どおりこのファイルを更新します。失敗時に空の一覧で上書きしないでください。APK原本やDriveの共有権限は変更しません。

### 再ビルド時の一覧保護

`public/data/app-catalog.json` はビルド用の初期データであり、自動更新される配信側の一覧より古い場合があります。UIやブラウザ版を再ビルドして配置する際は、`zatuplay/data/app-catalog.json` を配置対象から除外し、main 上の最新ファイルをそのまま維持してください。`dist/` を丸ごとコピーして公開一覧を戻さないでください。

カタログを意図的に更新するときは、専用の同期手順でこの1ファイルだけを更新します。公開前に main を再読込して並行更新がないか確認し、公開後は revision・作品数・APK件数が最新の一覧と一致することを確認します。ブラウザ版の更新もAPKカタログを書き換えません。

## ブラウザ版の追加

`BROWSER_RELEASES.md` を参照してください。APKの追加・更新だけではブラウザ版の公開数は増えません。作品ごとに動作確認してから公開URLを追加します。

確認済みのブラウザ公開URLがない作品は「対応準備中」と表示し、起動ボタンは表示しません。所有者限定SitesやソースZIP、DriveのAPKプレビューをプレイURLとして掲載しないでください。


## ZatuPlay本体のPWA

ZatuPlayをひとつのアプリとしてホーム画面に追加し、その中で公開済みの作品を選びます。作品ごとにPWAをインストールする方式ではありません。

- マニフェストの `id: ./` と `scope: ./` を維持し、開始URLは `./browser/?launch=pwa` です。
- トップと作品一覧にAndroid・iPhone・パソコン向けの追加ボタンと手順があります。インストール済みアプリ内では案内を簡略化します。
- ゲームのリンクは同一画面（`target=_self`）で開きます。アプリ内の作品は同一オリジンかつ `/game-no-mori/zatuplay/` 内で公開し、作品から一覧へ戻るリンクを維持してください。
- PWA本体のキャッシュ保存／オフラインプレイは未対応です。起動と作品の読み込みには通信が必要です。APKのセーブとは自動同期しません。
- 既存インストールのマニフェスト反映時期はOS・ブラウザに依存します。古い開始先のままでもホームから作品一覧へ進めます。
- `node scripts/test-pwa.cjs` でアプリ識別子・範囲・ゲームの起動／戻り導線・基本案内を検査します。`npm run build` で型検査と本番ビルドを行います。これらは実機インストールやOSの表示確認を代替しません。

PWA入口だけを更新する場合は、変更したソース、生成された3つのHTML・JS・CSS・マニフェストだけを配置します。`dist/` に含まれるカタログやゲームを一括上書きしないでください。APKカタログ、作品カタログ、ゲーム本体の同時更新を保護します。
