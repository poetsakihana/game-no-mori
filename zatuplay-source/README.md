# ZatuPlay — GitHub Pages

GAMESELECTのAndroidアプリを紹介する静的サイトです。検索、カテゴリー、お気に入り、配布バージョンの選択、入手ページの履歴、ホーム画面への追加に対応します。

公開先: https://poetsakihana.github.io/game-no-mori/zatuplay/

## 開発と配置

Node.js 22.13以降で `npm ci` → `npm run build` を実行します。`dist/` の中身をリポジトリの `zatuplay/` に配置してください。元のゲームの森のファイルは別の場所に残します。

## カタログの更新

配信中の `zatuplay/data/app-catalog.json` を差し替えるだけで、JavaScriptを作り直さずに更新できます。完全なGAMESELECT走査から生成されたカタログのみ配置し、読み取りに失敗した場合は前回の一覧を保持します。公開JSONには作品紹介と配布ファイル情報だけを含めます。

既存の「ZatuPlayのアプリ自動更新」が約1時間ごとにGAMESELECTを確認し、追加や変更をこのJSONにも反映します。GitHub Pagesへの反映にはデプロイ完了まで少し時間がかかります。

APK原本はGoogleドライブにあります。各作品の「Googleドライブで入手」から配布ページを開き、Android端末で保存・インストールします。共有権限の変更や自動インストールは行いません。0バイトのAPKは確認待ちとして表示します。
