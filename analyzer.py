"""OpenAI GPT-4o を使ったニュース分析・要約モジュール。"""

import json
import os

from openai import AsyncOpenAI

SYSTEM_PROMPT = """あなたはテクノロジーと内部監査の専門家です。
ニュース記事を分析し、以下の形式でJSON配列として出力してください。

各記事について:
{
  "title": "記事タイトル",
  "summary": "一行の日本語サマリー（50文字以内）",
  "core_value": "この記事の核心価値・解決する課題（日本語）",
  "inspiration": "技術的・業務的インスピレーション（日本語）",
  "impact": "影響範囲（監査系の場合のみ）",
  "action_point": "対応ポイント（監査系の場合のみ）",
  "tags": ["#タグ1", "#タグ2", "#タグ3"],
  "relevance_score": 1-10の関連度スコア
}

必ずJSON配列のみを出力してください。説明文は不要です。"""


async def analyze_articles(
    articles: list[dict],
    category: str = "tech",
) -> list[dict]:
    """記事リストをGPT-4oで分析し、要約・タグ付けを行う。

    Args:
        articles: 記事データのリスト。各要素に title, url, content を含む。
        category: 'tech' or 'audit'

    Returns:
        分析結果が付与された記事リスト。
    """
    if not articles:
        return []

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        # APIキーがない場合はスキップして元データを返す
        for article in articles:
            article.setdefault("summary", "")
            article.setdefault("tags", [])
            article.setdefault("relevance_score", 5)
        return articles

    client = AsyncOpenAI(api_key=api_key)

    # 記事をバッチ（最大20件ずつ）で処理
    batch_size = 20
    analyzed = []

    for i in range(0, len(articles), batch_size):
        batch = articles[i : i + batch_size]

        articles_text = "\n\n---\n\n".join(
            f"【{a['source']}】{a['title']}\nURL: {a['url']}\n{a.get('content', '')[:1000]}"
            for a in batch
        )

        category_hint = (
            "テクノロジー・AI関連の記事です。" if category == "tech"
            else "内部監査・コンプライアンス関連の記事です。impact と action_point も必ず含めてください。"
        )

        try:
            response = await client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"{category_hint}\n\n{articles_text}"},
                ],
                max_tokens=4096,
                temperature=0.3,
            )

            result_text = response.choices[0].message.content.strip()
            # JSON部分を抽出
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            analysis_results = json.loads(result_text)

            for j, article in enumerate(batch):
                if j < len(analysis_results):
                    ar = analysis_results[j]
                    article["summary"] = ar.get("summary", "")
                    article["core_value"] = ar.get("core_value", "")
                    article["inspiration"] = ar.get("inspiration", "")
                    article["impact"] = ar.get("impact", "")
                    article["action_point"] = ar.get("action_point", "")
                    article["tags"] = ar.get("tags", [])
                    article["relevance_score"] = ar.get("relevance_score", 5)
                analyzed.append(article)

        except Exception as e:
            print(f"[analyzer] 分析エラー: {e}")
            for article in batch:
                article.setdefault("summary", "")
                article.setdefault("tags", [])
                article.setdefault("relevance_score", 5)
                analyzed.append(article)

    # スコア順にソート
    analyzed.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    return analyzed
