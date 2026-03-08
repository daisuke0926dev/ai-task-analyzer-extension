# News Aggregator Skill

## 概要
テック系グローバルニュースと内部監査・コンプライアンス系ニュースを収集・分析し、日本語のダイジェストレポートとしてDiscord/Slackに配信するスキル。

## ツール

### fetch_news.py
ニュースの取得・分析・配信を行うメインスクリプト。

**パラメータ:**
- `--source`: ソース指定（hackernews, github_trending, techcrunch, sec_gov, all 等）。デフォルト: all
- `--limit`: ソースあたりの取得件数。デフォルト: 10
- `--keyword`: フィルタキーワード（カンマ区切り）。自動展開あり
- `--deep`: AI分析を有効化し、記事本文を取得して要約・タグ付け
- `--category`: カテゴリフィルタ（tech, audit, all）。デフォルト: all
- `--notify`: 配信先（discord, slack, both, none）。デフォルト: none
- `--output`: レポート保存先ディレクトリ。デフォルト: reports/

## 使用例

### 全ソースからニュースを取得（基本）
```
python fetch_news.py --source all --limit 5
```

### テック系のみ、AI関連でフィルタ
```
python fetch_news.py --category tech --keyword AI --deep
```

### 内部監査系をDiscordに配信
```
python fetch_news.py --category audit --deep --notify discord
```

### 全ソース深掘り分析＋Discord配信
```
python fetch_news.py --source all --limit 15 --deep --notify discord
```

## 出力フォーマット

レポートは日本語のMarkdown形式で生成される。

```markdown
# デイリーニュースダイジェスト — YYYY-MM-DD

## 🔧 テック & AI
1. **[記事タイトル](URL)** — ソース名 | 🔥 スコア
   > 一行サマリー
   - 核心価値: ...
   - インスピレーション: ...
   - #タグ1 #タグ2 #タグ3

## 📋 内部監査 & コンプライアンス
1. **[記事タイトル](URL)** — ソース名 | 日付
   > 一行サマリー
   - 影響範囲: ...
   - 対応ポイント: ...
```

## キーワード自動展開

簡単なキーワードを包括的な検索語に自動展開する。
- "AI" → AI, LLM, GPT, Claude, Generative, Machine Learning, RAG, Agent, Transformer
- "監査" → 監査, Audit, 内部統制, Internal Control, コンプライアンス, Compliance, SOX, J-SOX

## 保存先

レポートは `reports/` ディレクトリに `news_YYYYMMDD_HHMM.md` 形式で保存される。
