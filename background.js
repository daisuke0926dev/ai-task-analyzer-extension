// Background Service Worker
// ブラウザ操作の記録と18時の通知を管理

// 拡張機能インストール時の初期化
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Task Analyzer installed');

  // 毎日18時のアラームを設定
  setupDailyAlarm();

  // 初期データの設定
  initializeStorage();
});

// 毎日18時のアラーム設定
function setupDailyAlarm() {
  // 既存のアラームをクリア
  chrome.alarms.clear('dailyAnalysis');

  // 18時のアラームを作成
  const now = new Date();
  const target = new Date();
  target.setHours(18, 0, 0, 0);

  // 今日の18時が過ぎていたら明日にする
  if (now > target) {
    target.setDate(target.getDate() + 1);
  }

  const delayInMinutes = (target - now) / (1000 * 60);

  chrome.alarms.create('dailyAnalysis', {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 24 * 60 // 24時間ごと
  });

  console.log(`Next analysis scheduled for: ${target}`);
}

// ストレージの初期化
async function initializeStorage() {
  const result = await chrome.storage.local.get(['activities', 'settings']);

  if (!result.activities) {
    await chrome.storage.local.set({ activities: [] });
  }

  if (!result.settings) {
    await chrome.storage.local.set({
      settings: {
        openaiApiKey: '',
        notificationTime: '18:00',
        recordingEnabled: true
      }
    });
  }
}

// タブの作成・更新を監視
chrome.tabs.onCreated.addListener((tab) => {
  recordActivity({
    type: 'tab_created',
    timestamp: Date.now(),
    url: tab.url,
    title: tab.title
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    recordActivity({
      type: 'page_visit',
      timestamp: Date.now(),
      url: tab.url,
      title: tab.title
    });
  }
});

// タブの切り替えを監視
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  recordActivity({
    type: 'tab_switched',
    timestamp: Date.now(),
    url: tab.url,
    title: tab.title
  });
});

// ページ遷移を監視
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) { // メインフレームのみ
    recordActivity({
      type: 'navigation',
      timestamp: Date.now(),
      url: details.url
    });
  }
});

// コンテンツスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'recordActivity') {
    recordActivity({
      ...message.data,
      timestamp: Date.now(),
      url: sender.tab?.url,
      title: sender.tab?.title
    });
    sendResponse({ success: true });
  } else if (message.type === 'getActivities') {
    getActivities().then(activities => {
      sendResponse({ activities });
    });
    return true; // 非同期レスポンス
  } else if (message.type === 'triggerAnalysis') {
    performAnalysis().then(result => {
      sendResponse(result);
    });
    return true; // 非同期レスポンス
  }
});

// URLをサニタイズ（プライバシー保護）
function sanitizeUrl(urlString) {
  try {
    const url = new URL(urlString);

    // chrome:// や chrome-extension:// は記録しない
    if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
      return null;
    }

    // 機密情報が含まれる可能性のあるページは除外
    const sensitiveKeywords = ['password', 'login', 'signin', 'auth', 'token', 'key', 'secret'];
    const lowerPath = url.pathname.toLowerCase();
    const lowerHost = url.hostname.toLowerCase();

    for (const keyword of sensitiveKeywords) {
      if (lowerHost.includes(keyword) || lowerPath.includes(keyword)) {
        return `${url.protocol}//${url.hostname}/[${keyword} page]`;
      }
    }

    // クエリパラメータとハッシュを除外（個人情報が含まれる可能性が高い）
    // プロトコル + ホスト + パスのみを返す
    return `${url.protocol}//${url.hostname}${url.pathname}`;

  } catch (e) {
    // 無効なURLは記録しない
    return null;
  }
}

// アクティビティの記録
async function recordActivity(activity) {
  const result = await chrome.storage.local.get(['activities', 'settings']);
  const activities = result.activities || [];
  const settings = result.settings || {};

  if (!settings.recordingEnabled) {
    return;
  }

  // URLをサニタイズ
  if (activity.url) {
    const sanitizedUrl = sanitizeUrl(activity.url);
    if (!sanitizedUrl) {
      return; // 記録しないURLの場合
    }
    activity.url = sanitizedUrl;
  }

  // タイトルも除外（個人情報が含まれる可能性）
  if (activity.title) {
    delete activity.title;
  }

  activities.push(activity);

  // 今日のデータのみ保持（メモリ節約）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  const todayActivities = activities.filter(a => a.timestamp >= todayTimestamp);

  await chrome.storage.local.set({ activities: todayActivities });
}

// アクティビティの取得
async function getActivities() {
  const result = await chrome.storage.local.get('activities');
  return result.activities || [];
}

// アラームのリスナー
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyAnalysis') {
    console.log('Daily analysis triggered');
    performAnalysis();
  }
});

// OpenAI APIを使った分析
async function performAnalysis() {
  try {
    const result = await chrome.storage.local.get(['activities', 'settings']);
    const activities = result.activities || [];
    const settings = result.settings || {};

    if (!settings.openaiApiKey) {
      showNotification(
        'API Key未設定',
        '設定でOpenAI API Keyを入力してください',
        'error'
      );
      return { success: false, error: 'No API key' };
    }

    if (activities.length === 0) {
      showNotification(
        '記録データなし',
        '本日の操作記録がありません',
        'info'
      );
      return { success: false, error: 'No activities' };
    }

    // アクティビティをサマリー化
    const summary = summarizeActivities(activities);

    // OpenAI APIで分析
    const analysis = await analyzeWithOpenAI(summary, settings.openaiApiKey);

    // 結果を通知
    showNotification(
      'AI分析完了',
      'クリックして詳細を確認してください',
      'analysis',
      analysis
    );

    // 分析結果を保存
    const timestamp = Date.now();
    const analysisRecord = {
      timestamp: timestamp,
      result: analysis
    };

    await chrome.storage.local.set({
      lastAnalysis: analysisRecord
    });

    // 分析履歴にも追加（最大30件保持）
    const historyResult = await chrome.storage.local.get('analysisHistory');
    const history = historyResult.analysisHistory || [];
    history.unshift(analysisRecord); // 最新を先頭に追加

    // 最大30件に制限
    const limitedHistory = history.slice(0, 30);

    await chrome.storage.local.set({
      analysisHistory: limitedHistory
    });

    return { success: true, analysis };

  } catch (error) {
    console.error('Analysis error:', error);
    showNotification(
      '分析エラー',
      error.message,
      'error'
    );
    return { success: false, error: error.message };
  }
}

// アクティビティのサマリー化
function summarizeActivities(activities) {
  const urlCounts = {};
  const actionCounts = {};
  const timeSpent = {};

  activities.forEach(activity => {
    // URLごとのアクセス回数
    if (activity.url) {
      try {
        const url = new URL(activity.url);
        const domain = url.hostname;
        urlCounts[domain] = (urlCounts[domain] || 0) + 1;
      } catch (e) {
        // 無効なURLは無視
      }
    }

    // アクション種別ごとのカウント
    actionCounts[activity.type] = (actionCounts[activity.type] || 0) + 1;
  });

  return {
    totalActivities: activities.length,
    urlCounts: Object.entries(urlCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20), // 上位20サイト
    actionCounts,
    activities: activities.slice(0, 100) // 最初の100件の詳細
  };
}

// OpenAI APIで分析
async function analyzeWithOpenAI(summary, apiKey) {
  const prompt = `あなたは業務効率化の専門家です。以下のブラウザ操作記録を分析し、AIで自動化・代替できるタスクを特定してください。

## 本日の操作記録
総アクティビティ数: ${summary.totalActivities}

訪問したサイト（上位20）:
${summary.urlCounts.map(([domain, count]) => `- ${domain}: ${count}回`).join('\n')}

操作タイプ:
${Object.entries(summary.actionCounts).map(([type, count]) => `- ${type}: ${count}回`).join('\n')}

詳細な操作ログ（抜粋）:
${summary.activities.slice(0, 30).map(a => `- [${new Date(a.timestamp).toLocaleTimeString('ja-JP')}] ${a.type}: ${a.url || 'N/A'} ${a.data ? JSON.stringify(a.data) : ''}`).join('\n')}

## 分析指示
以下の観点から、AI自動化の提案をしてください：

1. **繰り返し作業**: 同じサイトへの頻繁なアクセスや、同じような操作パターン
2. **データ入力**: フォーム入力や検索など、AIが代替できる可能性のある作業
3. **情報収集**: 複数のサイトからの情報収集で、AIエージェントが代替できるもの
4. **コピー＆ペースト**: データの転記作業
5. **プロダクト提案**: これらの作業を自動化するプロダクトのアイデア

## 出力フォーマット
JSON形式で以下の構造で回答してください：
{
  "automatable_tasks": [
    {
      "task": "タスクの説明",
      "frequency": "頻度（high/medium/low）",
      "automation_method": "自動化の方法",
      "time_saving": "推定削減時間（分/日）",
      "priority": "優先度（high/medium/low）"
    }
  ],
  "product_ideas": [
    {
      "name": "プロダクト名",
      "description": "説明",
      "target_tasks": ["対象タスク1", "対象タスク2"]
    }
  ],
  "summary": "全体的な所感と推奨事項"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'あなたは業務効率化とAI活用の専門家です。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  return JSON.parse(content);
}

// 通知の表示
function showNotification(title, message, type, analysisData) {
  const notificationOptions = {
    type: 'basic',
    title: title,
    message: message,
    priority: 2
  };

  // 分析データがある場合はリッチ通知に変更
  if (analysisData && analysisData.automatable_tasks) {
    const topTasks = analysisData.automatable_tasks
      .slice(0, 3)
      .map(task => `• ${task.task}`)
      .join('\n');

    notificationOptions.type = 'basic';
    notificationOptions.message = `AI自動化可能なタスク:\n${topTasks}\n\nクリックして詳細を確認`;
  }

  chrome.notifications.create(`notification-${Date.now()}`, notificationOptions);
}

// 通知クリック時の処理
chrome.notifications.onClicked.addListener((notificationId) => {
  // ポップアップを開く（新しいタブでも可）
  chrome.action.openPopup();
});

console.log('Background service worker loaded');
