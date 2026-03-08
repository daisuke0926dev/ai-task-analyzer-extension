"""Hacker News API からニュースを取得する。"""

import httpx

HN_API = "https://hacker-news.firebaseio.com/v0"


async def _get_item(client: httpx.AsyncClient, item_id: int) -> dict | None:
    resp = await client.get(f"{HN_API}/item/{item_id}.json")
    if resp.status_code == 200:
        return resp.json()
    return None


async def fetch_hackernews(limit: int = 10, keywords: list[str] | None = None) -> list[dict]:
    """Hacker News のトップストーリーを取得する。

    Returns:
        list[dict]: 各要素は {title, url, score, source, timestamp, comments_url} を持つ。
    """
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{HN_API}/topstories.json")
        story_ids = resp.json()[: limit * 3]  # キーワードフィルタ用に多めに取得

        items = []
        for sid in story_ids:
            item = await _get_item(client, sid)
            if item is None or item.get("type") != "story":
                continue

            title = item.get("title", "")
            url = item.get("url", f"https://news.ycombinator.com/item?id={sid}")

            if keywords:
                title_lower = title.lower()
                if not any(kw.lower() in title_lower for kw in keywords):
                    continue

            items.append({
                "title": title,
                "url": url,
                "score": item.get("score", 0),
                "source": "Hacker News",
                "timestamp": item.get("time", 0),
                "comments_url": f"https://news.ycombinator.com/item?id={sid}",
                "content": "",
            })

            if len(items) >= limit:
                break

    return items
