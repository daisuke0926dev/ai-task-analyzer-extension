"""Markdownレポート生成モジュール。"""

import os
from datetime import datetime


def format_report(
    tech_articles: list[dict],
    audit_articles: list[dict],
    report_dir: str = "reports",
) -> str:
    """分析済み記事からMarkdownレポートを生成し、ファイルに保存する。

    Returns:
        生成されたMarkdownテキスト。
    """
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    lines = [f"# デイリーニュースダイジェスト — {date_str}\n"]

    # テック系セクション
    if tech_articles:
        lines.append("## テック & AI\n")
        for i, a in enumerate(tech_articles, 1):
            title = a.get("title", "無題")
            url = a.get("url", "")
            source = a.get("source", "")
            score = a.get("relevance_score", "")
            summary = a.get("summary", "")
            core_value = a.get("core_value", "")
            inspiration = a.get("inspiration", "")
            tags = " ".join(a.get("tags", []))

            lines.append(f"{i}. **[{title}]({url})** — {source} | スコア: {score}")
            if summary:
                lines.append(f"   > {summary}")
            if core_value:
                lines.append(f"   - 核心価値: {core_value}")
            if inspiration:
                lines.append(f"   - インスピレーション: {inspiration}")
            if tags:
                lines.append(f"   - {tags}")
            lines.append("")

    # 内部監査系セクション
    if audit_articles:
        lines.append("## 内部監査 & コンプライアンス\n")
        for i, a in enumerate(audit_articles, 1):
            title = a.get("title", "無題")
            url = a.get("url", "")
            source = a.get("source", "")
            score = a.get("relevance_score", "")
            summary = a.get("summary", "")
            impact = a.get("impact", "")
            action_point = a.get("action_point", "")
            tags = " ".join(a.get("tags", []))

            lines.append(f"{i}. **[{title}]({url})** — {source} | スコア: {score}")
            if summary:
                lines.append(f"   > {summary}")
            if impact:
                lines.append(f"   - 影響範囲: {impact}")
            if action_point:
                lines.append(f"   - 対応ポイント: {action_point}")
            if tags:
                lines.append(f"   - {tags}")
            lines.append("")

    if not tech_articles and not audit_articles:
        lines.append("該当するニュースが見つかりませんでした。\n")

    # フッター
    lines.append("---")
    lines.append(f"*生成日時: {now.strftime('%Y-%m-%d %H:%M')} | News Aggregator Skill*\n")

    report = "\n".join(lines)

    # ファイルに保存
    os.makedirs(report_dir, exist_ok=True)
    filename = f"news_{now.strftime('%Y%m%d_%H%M')}.md"
    filepath = os.path.join(report_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"[formatter] レポート保存: {filepath}")
    return report
