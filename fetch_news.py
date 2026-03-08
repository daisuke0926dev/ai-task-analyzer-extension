#!/usr/bin/env python3
"""ニュースアグリゲーター メインCLIエントリポイント。

Usage:
    python fetch_news.py --source all --limit 5
    python fetch_news.py --category tech --keyword AI --deep
    python fetch_news.py --category audit --deep --notify discord
"""

import argparse
import asyncio
import os

import yaml

from analyzer import analyze_articles
from formatter import format_report
from notifier import notify
from sources import fetch_audit_source, fetch_github_trending, fetch_hackernews, fetch_rss


def load_config(path: str = "config.yaml") -> dict:
    """設定ファイルを読み込む。環境変数を展開する。"""
    with open(path, encoding="utf-8") as f:
        text = f.read()

    # ${ENV_VAR} を環境変数で置換
    for key, val in os.environ.items():
        text = text.replace(f"${{{key}}}", val)

    return yaml.safe_load(text)


def expand_keywords(keywords: list[str], expansion_map: dict) -> list[str]:
    """キーワードを自動展開する。"""
    expanded = []
    for kw in keywords:
        if kw in expansion_map:
            expanded.extend(expansion_map[kw].split(","))
        else:
            expanded.append(kw)
    return list(set(expanded))


async def fetch_all(
    config: dict,
    source_filter: str = "all",
    category_filter: str = "all",
    limit: int = 10,
    keywords: list[str] | None = None,
    deep: bool = False,
) -> tuple[list[dict], list[dict]]:
    """全ソースからニュースを非同期で取得する。

    Returns:
        (tech_articles, audit_articles) のタプル。
    """
    sources = config.get("sources", {})
    tech_articles = []
    audit_articles = []

    tasks = []

    for key, src in sources.items():
        if not src.get("enabled", True):
            continue
        if source_filter != "all" and key != source_filter:
            continue
        if category_filter != "all" and src.get("category") != category_filter:
            continue

        src_type = src.get("type")
        src_name = src.get("name", key)
        src_url = src.get("url", "")
        category = src.get("category", "tech")

        if key == "hackernews":
            tasks.append(("tech", fetch_hackernews(limit=limit, keywords=keywords)))
        elif key == "github_trending":
            tasks.append(("tech", fetch_github_trending(limit=limit, keywords=keywords)))
        elif category == "audit":
            tasks.append((
                "audit",
                fetch_audit_source(
                    source_key=key,
                    feed_url=src_url,
                    source_name=src_name,
                    source_type=src_type,
                    limit=limit,
                    keywords=keywords,
                ),
            ))
        elif src_type == "rss":
            tasks.append((
                "tech",
                fetch_rss(
                    feed_url=src_url,
                    source_name=src_name,
                    limit=limit,
                    keywords=keywords,
                    deep=deep,
                ),
            ))

    # 並行実行
    if tasks:
        categories, coros = zip(*tasks)
        results = await asyncio.gather(*coros, return_exceptions=True)

        for cat, result in zip(categories, results):
            if isinstance(result, Exception):
                print(f"[fetch] エラー: {result}")
                continue
            if cat == "tech":
                tech_articles.extend(result)
            else:
                audit_articles.extend(result)

    return tech_articles, audit_articles


async def main():
    parser = argparse.ArgumentParser(description="ニュースアグリゲーター")
    parser.add_argument("--source", default="all", help="ソース指定 (hackernews, github_trending, techcrunch, ... or all)")
    parser.add_argument("--category", default="all", help="カテゴリ (tech, audit, all)")
    parser.add_argument("--limit", type=int, default=10, help="ソースあたりの取得件数")
    parser.add_argument("--keyword", default="", help="フィルタキーワード（カンマ区切り）")
    parser.add_argument("--deep", action="store_true", help="AI分析を有効化")
    parser.add_argument("--notify", default="none", help="配信先 (discord, slack, both, none)")
    parser.add_argument("--output", default="reports", help="レポート保存先")
    parser.add_argument("--config", default="config.yaml", help="設定ファイルパス")
    args = parser.parse_args()

    config = load_config(args.config)

    # キーワード処理
    keywords = None
    if args.keyword:
        raw_keywords = [k.strip() for k in args.keyword.split(",")]
        expansion_map = config.get("keyword_expansion", {})
        keywords = expand_keywords(raw_keywords, expansion_map)
        print(f"[fetch] キーワード展開: {raw_keywords} → {keywords}")

    # ニュース取得
    print(f"[fetch] ソース={args.source}, カテゴリ={args.category}, 件数={args.limit}")
    tech_articles, audit_articles = await fetch_all(
        config=config,
        source_filter=args.source,
        category_filter=args.category,
        limit=args.limit,
        keywords=keywords,
        deep=args.deep,
    )

    print(f"[fetch] テック系: {len(tech_articles)}件, 監査系: {len(audit_articles)}件")

    # AI分析
    if args.deep:
        print("[analyzer] AI分析を実行中...")
        if tech_articles:
            tech_articles = await analyze_articles(tech_articles, category="tech")
        if audit_articles:
            audit_articles = await analyze_articles(audit_articles, category="audit")
        print("[analyzer] 分析完了")

    # レポート生成
    report = format_report(tech_articles, audit_articles, report_dir=args.output)
    print(f"\n{report}")

    # 配信
    if args.notify != "none":
        await notify(report, target=args.notify)


if __name__ == "__main__":
    asyncio.run(main())
