"""Discord / Slack Webhook 配信モジュール。"""

import os

import httpx

# Discord の埋め込みメッセージ文字数上限
DISCORD_CONTENT_LIMIT = 2000
SLACK_BLOCK_LIMIT = 3000


async def send_discord(report: str, webhook_url: str | None = None) -> bool:
    """MarkdownレポートをDiscord Webhookに送信する。

    長いレポートは複数メッセージに分割して送信する。
    """
    url = webhook_url or os.environ.get("DISCORD_WEBHOOK_URL", "")
    if not url:
        print("[notifier] Discord Webhook URLが設定されていません。")
        return False

    chunks = _split_text(report, DISCORD_CONTENT_LIMIT)

    async with httpx.AsyncClient(timeout=30) as client:
        for chunk in chunks:
            payload = {"content": chunk}
            resp = await client.post(url, json=payload)
            if resp.status_code not in (200, 204):
                print(f"[notifier] Discord送信エラー: {resp.status_code} {resp.text}")
                return False

    print(f"[notifier] Discord送信完了 ({len(chunks)}メッセージ)")
    return True


async def send_slack(report: str, webhook_url: str | None = None) -> bool:
    """MarkdownレポートをSlack Webhookに送信する。"""
    url = webhook_url or os.environ.get("SLACK_WEBHOOK_URL", "")
    if not url:
        print("[notifier] Slack Webhook URLが設定されていません。")
        return False

    chunks = _split_text(report, SLACK_BLOCK_LIMIT)

    async with httpx.AsyncClient(timeout=30) as client:
        for chunk in chunks:
            payload = {"text": chunk}
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                print(f"[notifier] Slack送信エラー: {resp.status_code} {resp.text}")
                return False

    print(f"[notifier] Slack送信完了 ({len(chunks)}メッセージ)")
    return True


async def notify(report: str, target: str = "none") -> None:
    """指定された配信先にレポートを送信する。

    Args:
        report: Markdown形式のレポート文字列。
        target: 'discord', 'slack', 'both', or 'none'
    """
    if target in ("discord", "both"):
        await send_discord(report)
    if target in ("slack", "both"):
        await send_slack(report)


def _split_text(text: str, max_length: int) -> list[str]:
    """テキストを改行区切りで分割し、各チャンクが max_length 以下になるようにする。"""
    lines = text.split("\n")
    chunks = []
    current = ""

    for line in lines:
        if len(current) + len(line) + 1 > max_length:
            if current:
                chunks.append(current)
            current = line
        else:
            current = f"{current}\n{line}" if current else line

    if current:
        chunks.append(current)

    return chunks
