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

## ブラウザ版の追加

`BROWSER_RELEASES.md` を参照してください。APKの追加・更新だけではブラウザ版の公開数は増えません。作品ごとに動作確認してから公開URLを追加します。

確認済みのブラウザ公開URLがない作品は「対応準備中」と表示し、起動ボタンは表示しません。所有者限定SitesやソースZIP、DriveのAPKプレビューをプレイURLとして掲載しないでください。
