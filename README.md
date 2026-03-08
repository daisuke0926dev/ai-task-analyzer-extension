# News Aggregator Skill

テック系グローバルニュースと内部監査・コンプライアンス系ニュースを収集・AI分析し、Discord/Slackに日本語ダイジェストとして配信するOpenClawスキル。

## ニュースソース

### テック系
- Hacker News (API)
- GitHub Trending (スクレイピング)
- Product Hunt (RSS)
- TechCrunch (RSS)
- The Verge (RSS)
- Ars Technica (RSS)

### 内部監査・コンプライアンス系
- SEC 米国証券取引委員会 (RSS)
- 金融庁 (スクレイピング)
- ISACA (RSS)
- IIA 内部監査人協会 (RSS)
- JICPA 日本公認会計士協会 (スクレイピング)
- Compliance Week (RSS)

## セットアップ

```bash
pip install -r requirements.txt
```

### 環境変数

```bash
export OPENAI_API_KEY="sk-..."           # AI分析に必要
export DISCORD_WEBHOOK_URL="https://..."  # Discord配信に必要
export SLACK_WEBHOOK_URL="https://..."    # Slack配信に必要（任意）
```

## 使い方

```bash
# 全ソースからニュース取得（基本）
python fetch_news.py --source all --limit 5

# テック系のみ、AI関連でフィルタ + ディープ分析
python fetch_news.py --category tech --keyword AI --deep

# 内部監査系をDiscordに配信
python fetch_news.py --category audit --deep --notify discord

# 全ソースフル分析 + Discord配信
python fetch_news.py --source all --limit 15 --deep --notify discord
```

### オプション

| オプション | デフォルト | 説明 |
|-----------|----------|------|
| `--source` | all | ソース指定 (hackernews, github_trending, techcrunch 等) |
| `--category` | all | カテゴリ (tech, audit, all) |
| `--limit` | 10 | ソースあたりの取得件数 |
| `--keyword` | - | フィルタキーワード（カンマ区切り、自動展開対応） |
| `--deep` | false | AI分析を有効化 |
| `--notify` | none | 配信先 (discord, slack, both, none) |
| `--output` | reports | レポート保存先ディレクトリ |
| `--config` | config.yaml | 設定ファイルパス |

## キーワード自動展開

| 入力 | 展開先 |
|------|--------|
| AI | AI, LLM, GPT, Claude, Generative, Machine Learning, RAG, Agent, Transformer |
| 監査 | 監査, Audit, 内部統制, Internal Control, コンプライアンス, Compliance, SOX, J-SOX |
| セキュリティ | セキュリティ, Security, Cybersecurity, 脆弱性, Vulnerability, ゼロデイ |

## ディレクトリ構成

```
├── fetch_news.py         # メインCLI
├── sources/
│   ├── hackernews.py     # Hacker News API
│   ├── github_trending.py # GitHub Trending
│   ├── rss_generic.py    # 汎用RSSフェッチャー
│   └── audit_sources.py  # 内部監査系ソース
├── analyzer.py           # GPT-4o AI分析
├── formatter.py          # Markdownレポート生成
├── notifier.py           # Discord/Slack配信
├── config.yaml           # 設定ファイル
├── templates.md          # コマンドテンプレート
├── reports/              # 生成レポート保存先
├── SKILL.md              # OpenClawスキル定義
└── requirements.txt
```

## ライセンス

MIT
