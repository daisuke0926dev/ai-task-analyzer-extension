"""汎用RSSフィードフェッチャー。TechCrunch, The Verge, Ars Technica 等に対応。"""

import time

import feedparser
import httpx


async def _fetch_article_content(client: httpx.AsyncClient, url: str) -> str:
    """記事URLから本文テキストを抽出する（deep分析用）。"""
    try:
        from bs4 import BeautifulSoup

        resp = await client.get(url, follow_redirects=True)
        if resp.status_code != 200:
            return ""
        soup = BeautifulSoup(resp.text, "html.parser")
        # 記事本文を推測抽出
        for selector in ["article", "[role='main']", ".post-content", ".entry-content"]:
            el = soup.select_one(selector)
            if el:
                return el.get_text(separator="\n", strip=True)[:3000]
        return ""
    except Exception:
        return ""


async def fetch_rss(
    feed_url: str,
    source_name: str,
    limit: int = 10,
    keywords: list[str] | None = None,
    deep: bool = False,
) -> list[dict]:
    """RSSフィードからニュースを取得する。

    Returns:
        list[dict]: 各要素は {title, url, score, source, timestamp, summary, content} を持つ。
    """
    feed = feedparser.parse(feed_url)
    items = []

    async with httpx.AsyncClient(timeout=30) as client:
        for entry in feed.entries:
            title = entry.get("title", "")
            url = entry.get("link", "")
            summary = entry.get("summary", "")

            if keywords:
                text = f"{title} {summary}".lower()
                if not any(kw.lower() in text for kw in keywords):
                    continue

            published = entry.get("published_parsed")
            timestamp = int(time.mktime(published)) if published else 0

            content = ""
            if deep and url:
                content = await _fetch_article_content(client, url)

            items.append({
                "title": title,
                "url": url,
                "score": 0,
                "source": source_name,
                "timestamp": timestamp,
                "summary": summary[:500],
                "content": content if content else summary[:1000],
            })

            if len(items) >= limit:
                break

    return items
