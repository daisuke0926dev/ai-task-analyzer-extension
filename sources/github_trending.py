"""GitHub Trending からトレンドリポジトリを取得する。"""

import httpx
from bs4 import BeautifulSoup


async def fetch_github_trending(
    limit: int = 10,
    keywords: list[str] | None = None,
    spoken_language: str = "",
) -> list[dict]:
    """GitHub Trending ページをスクレイピングしてトレンドリポジトリを取得する。

    Returns:
        list[dict]: 各要素は {title, url, score, source, description, language, stars_today} を持つ。
    """
    url = "https://github.com/trending"
    params = {}
    if spoken_language:
        params["spoken_language_code"] = spoken_language

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    rows = soup.select("article.Box-row")

    items = []
    for row in rows:
        h2 = row.select_one("h2 a")
        if not h2:
            continue

        repo_path = h2.get("href", "").strip().lstrip("/")
        repo_url = f"https://github.com/{repo_path}"
        title = repo_path

        desc_el = row.select_one("p")
        description = desc_el.get_text(strip=True) if desc_el else ""

        lang_el = row.select_one("[itemprop='programmingLanguage']")
        language = lang_el.get_text(strip=True) if lang_el else ""

        stars_today_el = row.select("span.d-inline-block")
        stars_today = ""
        if stars_today_el:
            stars_today = stars_today_el[-1].get_text(strip=True)

        if keywords:
            text = f"{title} {description}".lower()
            if not any(kw.lower() in text for kw in keywords):
                continue

        items.append({
            "title": title,
            "url": repo_url,
            "score": 0,
            "source": "GitHub Trending",
            "description": description,
            "language": language,
            "stars_today": stars_today,
            "content": description,
        })

        if len(items) >= limit:
            break

    return items
