# AI Task Analyzer

> ブラウザ操作を記録し、AI代替可能なタスクを提案するChrome拡張機能

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://www.google.com/chrome/)
[![OpenAI](https://img.shields.io/badge/Powered%20by-OpenAI-412991.svg)](https://openai.com/)

</div>

## 💡 What is this?

AI Task Analyzerは、あなたの日々のブラウザ操作を分析し、**AIで自動化できる作業**を見つけ出すChrome拡張機能です。

毎日18時に、その日のブラウザ操作をAIが分析し、「この作業、AIにやらせた方が良いですよ」という提案を通知します。

### 主な機能

- 🔍 **自動記録** - ページ訪問、クリック、フォーム入力などの操作を自動記録
- 🤖 **AI分析** - OpenAI GPT-4oで自動化可能なタスクを特定
- ⏰ **定時通知** - 毎日18時に分析結果を通知（カスタマイズ可能）
- 📊 **詳細レポート** - 推定削減時間、優先度、実装方法を提案
- 📝 **Markdownエクスポート** - 分析結果をMD形式で保存、自動化のネタ帳として活用
- 📚 **分析履歴管理** - 過去30件の分析結果を保存、いつでもエクスポート可能
- 🔐 **プライバシー優先** - データはローカル保存、機密情報は記録しません

## 🚀 Quick Start

### 前提条件

- Google Chrome ブラウザ
- [OpenAI API Key](https://platform.openai.com/api-keys)

### インストール

1. リポジトリをクローン
   ```bash
   git clone https://github.com/yourusername/ai-task-analyzer-extension.git
   ```

2. Chromeで拡張機能を読み込み
   - `chrome://extensions/` を開く
   - 「デベロッパーモード」をON
   - 「パッケージ化されていない拡張機能を読み込む」
   - クローンしたフォルダを選択

3. OpenAI API Keyを設定
   - 拡張機能アイコンをクリック
   - 「設定」タブでAPI Keyを入力
   - 保存

これで準備完了！ブラウザ操作が自動的に記録されます。

## 📖 使い方

### 自動分析

通常は何もする必要はありません。毎日18時になると：

1. その日のブラウザ操作を自動分析
2. 通知でAI代替可能なタスクを表示
3. クリックして詳細を確認

### 手動分析

いつでも分析を実行できます：

1. 拡張機能アイコンをクリック
2. 「ダッシュボード」→「今すぐ分析」
3. 結果が「分析結果」タブに表示

### Markdownエクスポート

分析結果を自動化のネタ帳として保存できます：

1. 「分析結果」タブを開く
2. 「📝 MDエクスポート」ボタンをクリック
3. Markdownファイルがダウンロードされます（ファイル名: `ai-task-analysis_YYYY-MM-DD.md`）

**エクスポートされる内容：**
- 自動化可能なタスク一覧（優先度、削減時間、実装方法）
- プロダクト提案
- 総評

**過去の分析もエクスポート可能：**
- 分析履歴セクションから過去5件を表示
- 各履歴に個別のエクスポートボタン付き
- 最大30件まで保存

## 🔍 分析例

AIは以下のような観点から、自動化の提案を行います：

| 検出パターン | 提案例 |
|------------|--------|
| 同じフォームへの毎日アクセス | ブラウザ自動化（Puppeteer）の導入 |
| 複数サイトからの情報収集 | RSSリーダー、AIニュース要約の活用 |
| 頻繁なコピー＆ペースト | API連携、データ転記自動化ツール |
| 繰り返しクリック操作 | ブラウザマクロ、Chrome API活用 |

分析結果には以下が含まれます：

- ✅ 自動化可能なタスク一覧
- ⏱️ 推定削減時間（分/日）
- 🎯 優先度（高/中/低）
- 💡 実装方法の提案
- 🛠️ プロダクトアイデア

## 🔒 プライバシー・セキュリティ

### 🛡️ プライバシー保護機能

このプロジェクトでは、プライバシーを最優先に設計しています：

✅ **URLクエリパラメータを除外** - `?user_id=123`などの個人情報を含む可能性のあるパラメータは記録しません
✅ **ページタイトルを記録しない** - 個人名や機密情報が含まれる可能性を排除
✅ **機密サイトを自動除外** - password、login、auth、tokenなどのキーワードを含むURLは自動でマスキング
✅ **パスワード入力フィールドは記録しない** - 入力内容はもちろん、入力イベント自体も記録しません
✅ **クレジットカード情報は記録しない** - カード番号入力フィールドは完全に除外
✅ **データはローカルのみに保存** - Chrome Storage API（ブラウザ内のみ）
✅ **分析時のみ外部送信** - OpenAI APIへは分析実行時のみ送信

### 記録される情報

```
記録される: https://example.com/products/category
記録されない: https://example.com/products?user_id=123&session=xyz
             ↑ クエリパラメータは自動除外
```

### ⚠️ 注意事項

**完全な保証はできません**。以下のリスクが残ります：

- フォームフィールド名から情報が推測される可能性
- URLパス自体に個人情報が含まれる場合（例: `/users/john-doe/profile`）

**推奨事項：**
- 機密情報を扱うサイトでは「記録を無効化」を設定で切り替える
- 業務利用の場合は、組織のセキュリティポリシーを確認する

### データの保存先

- **ローカル**: Chrome Storage API（ブラウザ内のみ）
- **外部送信**: OpenAI API（分析実行時のみ）

## 🛠️ 開発者向け

### ファイル構造

```
ai-task-analyzer-extension/
├── manifest.json          # 拡張機能設定（Manifest V3）
├── background.js          # Service Worker（記録・分析・通知）
├── content.js            # Content Script（操作記録）
└── popup/
    ├── popup.html        # ポップアップUI
    ├── popup.css         # スタイル
    └── popup.js          # UIロジック
```

### デバッグ

**Background Service Worker:**
```
chrome://extensions/ → サービスワーカー → コンソール
```

**Content Script:**
```
任意のページでF12 → コンソールタブ
```

**Popup:**
```
ポップアップで右クリック → 検証
```

### カスタマイズ

分析プロンプトを変更するには、`background.js`の`analyzeWithOpenAI`関数を編集してください。

記録する操作を追加するには、`content.js`にイベントリスナーを追加してください。

## 🗺️ Roadmap

- [x] プライバシー保護の強化（URLパラメータのマスキング）✅
- [x] ページタイトルの記録除外✅
- [x] 機密サイトの自動検出とマスキング✅
- [ ] ローカルLLMのサポート
- [ ] 自動化スクリプトの自動生成
- [ ] 週次/月次レポート
- [ ] Chrome Web Storeへの公開

## 🤝 Contributing

コントリビューションを歓迎します！

1. このリポジトリをFork
2. Feature branchを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をCommit (`git commit -m 'Add some AmazingFeature'`)
4. BranchにPush (`git push origin feature/AmazingFeature`)
5. Pull Requestを作成

### バグ報告・機能リクエスト

[Issues](https://github.com/yourusername/ai-task-analyzer-extension/issues)から報告してください。

## 📄 License

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## ⚠️ Disclaimer

- この拡張機能は**開発版**です
- OpenAI API使用料金が発生します
- 業務利用の場合は、組織のセキュリティポリシーを確認してください
- プライバシーに配慮していますが、完全な保証はできません
- 機密情報を扱うサイトでの使用は推奨しません

## 📮 Contact

質問や提案があれば、[Issues](https://github.com/yourusername/ai-task-analyzer-extension/issues)でお知らせください。

---

<div align="center">

**楽しいAI活用を！** 🤖✨

Made with ❤️ and [Claude Code](https://claude.com/claude-code)

</div>
