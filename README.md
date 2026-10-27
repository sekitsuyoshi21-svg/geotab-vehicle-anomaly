# Geotab 車両異常管理 Add-In

## ファイル
- `configuration.json`: MyGeotabへ登録する設定
- `vehicle-anomaly.html`: 画面
- `vehicle-anomaly.css`: デザイン
- `vehicle-anomaly.js`: Geotab API取得・検索・詳細表示

## GitHubへ置く前に
1. `configuration.json` の `YOUR_EMAIL@example.com` を実際のサポート用メールアドレスに変更します。
2. `YOUR_GITHUB_USERNAME` をGitHubユーザー名に変更します。
3. Repository名を変更する場合、URL中の `geotab-vehicle-anomaly` も同じ名前に変更します。

## GitHub Pages
1. GitHubで `geotab-vehicle-anomaly` というPublic Repositoryを作成します。
2. このフォルダー内のファイルをRepository直下へアップロードします。
3. Settings > Pages > Deploy from a branch を選択します。
4. Branch: `main`、Folder: `/ (root)` を選択してSaveします。
5. 公開後、`vehicle-anomaly.html`をブラウザーで開きます。MyGeotab外ではサンプルデータが表示されます。

## MyGeotabへ登録
GitHub PagesのURLが正しいことを確認後、編集済みの`configuration.json`をMyGeotabのAdd-In設定から登録します。

## 注意
- APIキー、パスワード、MyGeotab認証情報をGitHubへ保存しないでください。
- すべてのFaultに説明、推奨対応、Severityが入るとは限りません。このコードは不足値をフォールバック表示します。
- Databaseの件数が多い場合は、期間、resultsLimit、ページング方法を運用規模に合わせて調整してください。
