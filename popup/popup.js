// Popup UI Logic

document.addEventListener('DOMContentLoaded', init);

function init() {
  setupTabs();
  loadDashboard();
  loadAnalysisResults();
  loadSettings();
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

    // 結果の表示
    displayAnalysisResults(lastAnalysis.result);

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
