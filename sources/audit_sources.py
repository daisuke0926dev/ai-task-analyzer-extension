"""内部監査・コンプライアンス系ニュースソース。

RSS対応ソース: SEC, ISACA, IIA, Compliance Week
スクレイピング対応: 金融庁, JICPA
"""

import time

import feedparser
import httpx
from bs4 import BeautifulSoup


async def _scrape_fsa_japan(client: httpx.AsyncClient, limit: int) -> list[dict]:
    """金融庁の新着情報をスクレイピング。"""
    url = "https://www.fsa.go.jp/news/index.html"
    try:
        resp = await client.get(url)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        items = []
        for li in soup.select("ul.news-list li, .news_list li, #main-body li"):
            a = li.select_one("a")
            if not a:
                continue
            href = a.get("href", "")
            if not href.startswith("http"):
                href = f"https://www.fsa.go.jp{href}"

            items.append({
                "title": a.get_text(strip=True),
                "url": href,
                "score": 0,
                "source": "金融庁",
                "timestamp": 0,
                "summary": "",
                "content": "",
            })
            if len(items) >= limit:
                break
        return items
    except Exception:
        return []


async def _scrape_jicpa(client: httpx.AsyncClient, limit: int) -> list[dict]:
    """JICPAの新着情報をスクレイピング。"""
    url = "https://jicpa.or.jp/news/"
    try:
        resp = await client.get(url)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        items = []
        for li in soup.select(".news-list li, .p-news__list li, article"):
            a = li.select_one("a")
            if not a:
                continue
            href = a.get("href", "")
            if not href.startswith("http"):
                href = f"https://jicpa.or.jp{href}"

            items.append({
                "title": a.get_text(strip=True),
                "url": href,
                "score": 0,
                "source": "JICPA",
                "timestamp": 0,
                "summary": "",
                "content": "",
            })
            if len(items) >= limit:
                break
        return items
    except Exception:
        return []


async def fetch_audit_source(
    source_key: str,
    feed_url: str,
    source_name: str,
    source_type: str,
    limit: int = 10,
    keywords: list[str] | None = None,
) -> list[dict]:
    """内部監査・コンプライアンス系ソースからニュースを取得する。

    source_type が 'rss' の場合はRSS、'scraping' の場合はスクレイピングを行う。
    """
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        if source_type == "scraping":
            if source_key == "fsa_japan":
                items = await _scrape_fsa_japan(client, limit)
            elif source_key == "jicpa":
                items = await _scrape_jicpa(client, limit)
            else:
                return []
        else:
            # RSS
            feed = feedparser.parse(feed_url)
            items = []
            for entry in feed.entries:
                title = entry.get("title", "")
                url = entry.get("link", "")
                summary = entry.get("summary", "")
                published = entry.get("published_parsed")
                timestamp = int(time.mktime(published)) if published else 0

                items.append({
                    "title": title,
                    "url": url,
                    "score": 0,
                    "source": source_name,
                    "timestamp": timestamp,
                    "summary": summary[:500],
                    "content": summary[:1000],
                })
                if len(items) >= limit:
                    break

    # キーワードフィルタ
    if keywords:
        items = [
            item for item in items
            if any(
                kw.lower() in f"{item['title']} {item.get('summary', '')}".lower()
                for kw in keywords
            )
        ]

    return items[:limit]
