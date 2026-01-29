// Popup UI Logic

document.addEventListener('DOMContentLoaded', init);

function init() {
  setupTabs();
  loadDashboard();
  loadAnalysisResults();
  loadSettings();
  loadSummary('week'); // デフォルトは週次
  setupEventListeners();
}

// タブの切り替え
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;

      // すべてのタブを非アクティブに
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // クリックされたタブをアクティブに
      button.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

// ダッシュボードの読み込み
async function loadDashboard() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'getActivities' });
    const activities = response.activities || [];

    // 総アクティビティ数
    document.getElementById('totalActivities').textContent = activities.length;

    // ユニークなサイト数
    const uniqueSites = new Set();
    activities.forEach(activity => {
      if (activity.url) {
        try {
          const url = new URL(activity.url);
          uniqueSites.add(url.hostname);
        } catch (e) {
          // 無効なURLは無視
        }
      }
    });
    document.getElementById('uniqueSites').textContent = uniqueSites.size;

    // 記録状態
    const settings = await chrome.storage.local.get('settings');
    const recordingEnabled = settings.settings?.recordingEnabled ?? true;
    document.getElementById('recordingStatus').textContent = recordingEnabled ? '記録中' : '停止中';
    document.getElementById('recordingStatus').style.color = recordingEnabled ? '#43a047' : '#e53935';

  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// 分析結果の読み込み
async function loadAnalysisResults() {
  try {
    const result = await chrome.storage.local.get('lastAnalysis');
    const lastAnalysis = result.lastAnalysis;

    if (!lastAnalysis) {
      return; // 分析結果がない場合は何もしない
    }

    // 分析時刻の表示
    const analysisDate = new Date(lastAnalysis.timestamp);
    document.getElementById('analysisTime').textContent =
      analysisDate.toLocaleString('ja-JP');

    // 空状態を非表示、結果を表示
    document.querySelector('#analysisResults .empty-state').style.display = 'none';
    document.getElementById('analysisContent').style.display = 'block';

    // エクスポートボタンを表示
    document.getElementById('exportMarkdown').style.display = 'block';

    // 結果の表示
    displayAnalysisResults(lastAnalysis.result);

    // 履歴の表示
    loadAnalysisHistory();

  } catch (error) {
    console.error('Failed to load analysis results:', error);
  }
}

// 分析結果の表示
function displayAnalysisResults(analysis) {
  // 自動化可能なタスク
  const tasksList = document.getElementById('tasksList');
  tasksList.innerHTML = '';

  if (analysis.automatable_tasks && analysis.automatable_tasks.length > 0) {
    analysis.automatable_tasks.forEach(task => {
      const taskItem = document.createElement('div');
      taskItem.className = `task-item ${task.priority}`;
      taskItem.innerHTML = `
        <div class="task-title">${escapeHtml(task.task)}</div>
        <div class="task-meta">
          <span>頻度: ${getFrequencyLabel(task.frequency)}</span>
          <span>削減時間: ${task.time_saving}分/日</span>
          <span>優先度: ${getPriorityLabel(task.priority)}</span>
        </div>
        <div class="task-method">${escapeHtml(task.automation_method)}</div>
      `;
      tasksList.appendChild(taskItem);
    });
  } else {
    tasksList.innerHTML = '<p class="empty-state">自動化可能なタスクが見つかりませんでした。</p>';
  }

  // プロダクト提案
  const productsList = document.getElementById('productsList');
  productsList.innerHTML = '';

  if (analysis.product_ideas && analysis.product_ideas.length > 0) {
    analysis.product_ideas.forEach(product => {
      const productItem = document.createElement('div');
      productItem.className = 'product-item';
      productItem.innerHTML = `
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div class="product-description">${escapeHtml(product.description)}</div>
        <div class="product-targets">対象: ${product.target_tasks.join(', ')}</div>
      `;
      productsList.appendChild(productItem);
    });
  } else {
    productsList.innerHTML = '<p class="empty-state">プロダクト提案はありません。</p>';
  }

  // サマリー
  const summary = document.getElementById('summary');
  summary.textContent = analysis.summary || '分析結果のサマリーはありません。';
}

// 設定の読み込み
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || {};

    document.getElementById('apiKey').value = settings.openaiApiKey || '';
    document.getElementById('notificationTime').value = settings.notificationTime || '18:00';
    document.getElementById('recordingEnabled').checked = settings.recordingEnabled ?? true;

  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// イベントリスナーの設定
function setupEventListeners() {
  // 今すぐ分析ボタン
  document.getElementById('analyzeNow').addEventListener('click', handleAnalyzeNow);

  // データをクリアボタン
  document.getElementById('clearData').addEventListener('click', handleClearData);

  // 設定を保存ボタン
  document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);

  // Markdownエクスポートボタン
  document.getElementById('exportMarkdown').addEventListener('click', handleExportMarkdown);

  // サマリー期間切り替えボタン
  document.querySelectorAll('.btn-period').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadSummary(e.target.dataset.period);
    });
  });

  // サマリーエクスポートボタン
  document.getElementById('exportSummary').addEventListener('click', handleExportSummary);
}

// 今すぐ分析
async function handleAnalyzeNow() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  loadingOverlay.style.display = 'flex';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'triggerAnalysis' });

    if (response.success) {
      // 分析結果を再読み込み
      await loadAnalysisResults();

      // 分析結果タブに切り替え
      document.querySelector('.tab-btn[data-tab="analysis"]').click();

      alert('分析が完了しました！');
    } else {
      alert(`分析に失敗しました: ${response.error}`);
    }

  } catch (error) {
    console.error('Analysis error:', error);
    alert(`エラーが発生しました: ${error.message}`);
  } finally {
    loadingOverlay.style.display = 'none';
  }
}

// データをクリア
async function handleClearData() {
  if (confirm('本日の記録データをすべて削除しますか？')) {
    try {
      await chrome.storage.local.set({ activities: [] });
      await loadDashboard();
      alert('データをクリアしました。');
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('データのクリアに失敗しました。');
    }
  }
}

// 設定を保存
async function handleSaveSettings() {
  const saveStatus = document.getElementById('saveStatus');

  try {
    const apiKey = document.getElementById('apiKey').value.trim();
    const notificationTime = document.getElementById('notificationTime').value;
    const recordingEnabled = document.getElementById('recordingEnabled').checked;

    // バリデーション
    if (!apiKey) {
      showSaveStatus('OpenAI API Keyを入力してください。', 'error');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      showSaveStatus('有効なOpenAI API Keyを入力してください。', 'error');
      return;
    }

    // 設定を保存
    await chrome.storage.local.set({
      settings: {
        openaiApiKey: apiKey,
        notificationTime: notificationTime,
        recordingEnabled: recordingEnabled
      }
    });

    // アラームの再設定（通知時刻が変更された場合）
    // Note: この機能は将来的に実装可能

    showSaveStatus('設定を保存しました。', 'success');

    // ダッシュボードを再読み込み
    await loadDashboard();

  } catch (error) {
    console.error('Failed to save settings:', error);
    showSaveStatus('設定の保存に失敗しました。', 'error');
  }
}

// 保存ステータスの表示
function showSaveStatus(message, type) {
  const saveStatus = document.getElementById('saveStatus');
  saveStatus.textContent = message;
  saveStatus.className = `save-status ${type}`;

  setTimeout(() => {
    saveStatus.className = 'save-status';
  }, 3000);
}

// 頻度ラベルの取得
function getFrequencyLabel(frequency) {
  const labels = {
    high: '高',
    medium: '中',
    low: '低'
  };
  return labels[frequency] || frequency;
}

// 優先度ラベルの取得
function getPriorityLabel(priority) {
  const labels = {
    high: '高',
    medium: '中',
    low: '低'
  };
  return labels[priority] || priority;
}

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Markdownエクスポート
async function handleExportMarkdown() {
  try {
    const result = await chrome.storage.local.get('lastAnalysis');
    const lastAnalysis = result.lastAnalysis;

    if (!lastAnalysis) {
      alert('エクスポートする分析結果がありません。');
      return;
    }

    const markdown = generateMarkdown(lastAnalysis);
    downloadMarkdown(markdown, lastAnalysis.timestamp);

    alert('Markdownファイルをダウンロードしました！');

  } catch (error) {
    console.error('Export error:', error);
    alert(`エクスポートに失敗しました: ${error.message}`);
  }
}

// Markdown生成
function generateMarkdown(analysisData) {
  const date = new Date(analysisData.timestamp);
  const dateStr = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const analysis = analysisData.result;

  let markdown = `# AI Task Analyzer - 分析レポート\n\n`;
  markdown += `**分析日時**: ${date.toLocaleString('ja-JP')}\n\n`;
  markdown += `---\n\n`;

  // 自動化可能なタスク
  markdown += `## 🎯 自動化可能なタスク\n\n`;

  if (analysis.automatable_tasks && analysis.automatable_tasks.length > 0) {
    analysis.automatable_tasks.forEach((task, index) => {
      markdown += `### ${index + 1}. ${task.task}\n\n`;
      markdown += `- **頻度**: ${getFrequencyLabel(task.frequency)}\n`;
      markdown += `- **優先度**: ${getPriorityLabel(task.priority)}\n`;
      markdown += `- **推定削減時間**: ${task.time_saving}分/日\n`;
      markdown += `- **自動化方法**:\n\n`;
      markdown += `  ${task.automation_method}\n\n`;
      markdown += `---\n\n`;
    });
  } else {
    markdown += `自動化可能なタスクは検出されませんでした。\n\n`;
  }

  // プロダクトアイデア
  markdown += `## 💡 プロダクト提案\n\n`;

  if (analysis.product_ideas && analysis.product_ideas.length > 0) {
    analysis.product_ideas.forEach((product, index) => {
      markdown += `### ${index + 1}. ${product.name}\n\n`;
      markdown += `${product.description}\n\n`;
      markdown += `**対象タスク**:\n`;
      product.target_tasks.forEach(task => {
        markdown += `- ${task}\n`;
      });
      markdown += `\n`;
    });
  } else {
    markdown += `プロダクト提案はありません。\n\n`;
  }

  // サマリー
  markdown += `## 📝 総評\n\n`;
  markdown += `${analysis.summary || '総評はありません。'}\n\n`;

  // フッター
  markdown += `---\n\n`;
  markdown += `*このレポートは [AI Task Analyzer](https://github.com/yourusername/ai-task-analyzer-extension) によって生成されました。*\n`;

  return markdown;
}

// Markdownダウンロード
function downloadMarkdown(content, timestamp) {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `ai-task-analysis_${dateStr}.md`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

// 分析履歴の読み込み
async function loadAnalysisHistory() {
  try {
    const result = await chrome.storage.local.get('analysisHistory');
    const history = result.analysisHistory || [];

    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-state">過去の分析履歴はありません。</p>';
      return;
    }

    // 最新の5件のみ表示
    const recentHistory = history.slice(0, 5);

    recentHistory.forEach((record, index) => {
      const date = new Date(record.timestamp);
      const dateStr = date.toLocaleDateString('ja-JP');
      const timeStr = date.toLocaleTimeString('ja-JP');

      const taskCount = record.result?.automatable_tasks?.length || 0;

      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <div class="history-info">
          <span class="history-date">${dateStr} ${timeStr}</span>
          <span class="history-tasks">${taskCount}個のタスク</span>
        </div>
        <button class="btn-history-export" data-index="${index}">📝 エクスポート</button>
      `;

      historyList.appendChild(historyItem);
    });

    // 履歴エクスポートボタンのイベントリスナー
    document.querySelectorAll('.btn-history-export').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        const record = recentHistory[index];
        const markdown = generateMarkdown(record);
        downloadMarkdown(markdown, record.timestamp);
        alert('Markdownファイルをダウンロードしました！');
      });
    });

  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

// サマリーの読み込み
async function loadSummary(period = 'week') {
  try {
    const summaryContent = document.getElementById('summaryContent');
    const summaryStats = document.getElementById('summaryStats');
    const summaryLoading = document.getElementById('summaryLoading');

    // ローディング表示
    summaryContent.style.display = 'none';
    summaryStats.style.display = 'none';
    summaryLoading.style.display = 'block';

    // バックグラウンドにサマリー生成を依頼
    const response = await chrome.runtime.sendMessage({
      type: 'getSummary',
      period: period
    });

    summaryLoading.style.display = 'none';

    if (!response.success) {
      summaryContent.style.display = 'block';
      summaryContent.innerHTML = '<p class="empty-state">サマリーの生成に失敗しました。</p>';
      return;
    }

    const summary = response.summary;

    if (summary.totalAnalyses === 0) {
      summaryContent.style.display = 'block';
      summaryContent.innerHTML = `<p class="empty-state">過去${period === 'week' ? '7日間' : '30日間'}の分析データがありません。</p>`;
      return;
    }

    // 統計を表示
    summaryStats.style.display = 'block';
    document.getElementById('summaryAnalysesCount').textContent = summary.totalAnalyses;
    document.getElementById('summaryUniqueTasksCount').textContent = summary.totalUniqueTasks;
    document.getElementById('summaryTimeSavings').textContent = `${summary.totalTimeSavings}分`;

    // 繰り返しタスクの表示
    const recurringTasksList = document.getElementById('recurringTasksList');
    recurringTasksList.innerHTML = '';

    if (summary.recurringTasks.length === 0) {
      recurringTasksList.innerHTML = '<p class="empty-state">繰り返し提案されたタスクはありません。</p>';
    } else {
      summary.recurringTasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'recurring-task-item';
        taskItem.innerHTML = `
          <div class="recurring-task-header">
            <div class="recurring-task-title">${escapeHtml(task.task)}</div>
            <div class="recurring-task-badge">${task.count}回</div>
          </div>
          <div class="recurring-task-meta">
            <span>累積削減: ${task.totalTimeSavings}分</span>
            <span>優先度: ${getPriorityLabel(task.priority)}</span>
          </div>
          <div class="recurring-task-method">${escapeHtml(task.automation_method)}</div>
        `;
        recurringTasksList.appendChild(taskItem);
      });
    }

    // プロダクトアイデアの表示
    const summaryProductsList = document.getElementById('summaryProductsList');
    summaryProductsList.innerHTML = '';

    if (summary.productIdeas.length === 0) {
      summaryProductsList.innerHTML = '<p class="empty-state">プロダクト提案はありません。</p>';
    } else {
      summary.productIdeas.forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="product-description">${escapeHtml(product.description)}</div>
          <div class="product-targets">対象: ${product.target_tasks.join(', ')}</div>
        `;
        summaryProductsList.appendChild(productItem);
      });
    }

    // サマリーデータを一時保存（エクスポート用）
    window.currentSummary = summary;

  } catch (error) {
    console.error('Failed to load summary:', error);
    document.getElementById('summaryLoading').style.display = 'none';
    document.getElementById('summaryContent').style.display = 'block';
    document.getElementById('summaryContent').innerHTML = '<p class="empty-state">エラーが発生しました。</p>';
  }
}

// サマリーのMarkdownエクスポート
async function handleExportSummary() {
  try {
    if (!window.currentSummary) {
      alert('エクスポートするサマリーがありません。');
      return;
    }

    const summary = window.currentSummary;
    const markdown = generateSummaryMarkdown(summary);

    const period = summary.period === 'week' ? 'weekly' : 'monthly';
    const date = new Date().toISOString().split('T')[0];
    const filename = `ai-task-summary_${period}_${date}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);

    alert('サマリーをエクスポートしました！');

  } catch (error) {
    console.error('Export error:', error);
    alert(`エクスポートに失敗しました: ${error.message}`);
  }
}

// サマリーのMarkdown生成
function generateSummaryMarkdown(summary) {
  const periodLabel = summary.period === 'week' ? '週次' : '月次';
  const periodDays = summary.period === 'week' ? '7日間' : '30日間';

  let markdown = `# AI Task Analyzer - ${periodLabel}サマリー\n\n`;

  if (summary.dateRange) {
    const start = summary.dateRange.start.toLocaleDateString('ja-JP');
    const end = summary.dateRange.end.toLocaleDateString('ja-JP');
    markdown += `**期間**: ${start} 〜 ${end}\n\n`;
  }

  markdown += `---\n\n`;

  // 統計サマリー
  markdown += `## 📊 統計サマリー\n\n`;
  markdown += `- **分析回数**: ${summary.totalAnalyses}回\n`;
  markdown += `- **ユニークタスク数**: ${summary.totalUniqueTasks}個\n`;
  markdown += `- **累積削減可能時間**: **${summary.totalTimeSavings}分** (${Math.round(summary.totalTimeSavings / 60 * 10) / 10}時間)\n\n`;

  if (summary.totalTimeSavings > 0) {
    const dailyAverage = Math.round(summary.totalTimeSavings / (summary.period === 'week' ? 7 : 30));
    markdown += `💡 1日平均 **${dailyAverage}分** の削減が可能です！\n\n`;
  }

  markdown += `---\n\n`;

  // 繰り返しタスク
  markdown += `## 🔁 繰り返し提案されたタスク（優先度順）\n\n`;

  if (summary.recurringTasks.length === 0) {
    markdown += `繰り返し提案されたタスクはありません。\n\n`;
  } else {
    summary.recurringTasks.forEach((task, index) => {
      markdown += `### ${index + 1}. ${task.task}\n\n`;
      markdown += `- **出現回数**: ${task.count}回\n`;
      markdown += `- **累積削減時間**: ${task.totalTimeSavings}分\n`;
      markdown += `- **優先度**: ${getPriorityLabel(task.priority)}\n`;
      markdown += `- **自動化方法**:\n\n`;
      markdown += `  ${task.automation_method}\n\n`;
      markdown += `---\n\n`;
    });
  }

  // プロダクトアイデア
  markdown += `## 💡 統合プロダクト提案\n\n`;

  if (summary.productIdeas.length === 0) {
    markdown += `プロダクト提案はありません。\n\n`;
  } else {
    summary.productIdeas.forEach((product, index) => {
      markdown += `### ${index + 1}. ${product.name}\n\n`;
      markdown += `${product.description}\n\n`;
      markdown += `**対象タスク**:\n`;
      product.target_tasks.forEach(task => {
        markdown += `- ${task}\n`;
      });
      markdown += `\n`;
    });
  }

  // フッター
  markdown += `---\n\n`;
  markdown += `*この${periodLabel}サマリーは [AI Task Analyzer](https://github.com/yourusername/ai-task-analyzer-extension) によって生成されました。*\n`;

  return markdown;
}
