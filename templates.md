# テンプレート一覧

## 利用可能なコマンド

1. **全ソーススキャン** — `python fetch_news.py --source all --limit 10`
2. **テック系のみ** — `python fetch_news.py --category tech --limit 10`
3. **監査系のみ** — `python fetch_news.py --category audit --limit 10`
4. **AI関連ディープ分析** — `python fetch_news.py --category tech --keyword AI --deep`
5. **監査ニュース + Discord配信** — `python fetch_news.py --category audit --deep --notify discord`
6. **全ソースフル分析 + 配信** — `python fetch_news.py --source all --limit 15 --deep --notify discord`
