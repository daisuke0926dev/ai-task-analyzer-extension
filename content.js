// Content Script
// ページ内での詳細な操作を記録

(function() {
  'use strict';

  // ページ滞在開始時刻
  const pageLoadTime = Date.now();
  let lastActivityTime = Date.now();

  // クリック追跡用のマップ（繰り返しパターンの検出）
  const clickPatterns = new Map();

  // フォーム入力の追跡
  const formInteractions = new Map();

  // コピー＆ペーストの追跡
  let copyPasteCount = 0;

  // スクロール追跡
  let scrollCount = 0;
  let lastScrollTime = 0;

  // 初期化
  function init() {
    console.log('AI Task Analyzer content script loaded');

    // イベントリスナーの登録
    setupEventListeners();

    // ページアンロード時に滞在時間を記録
    window.addEventListener('beforeunload', recordPageDuration);

    // 定期的に統計を送信（5分ごと）
    setInterval(sendStatistics, 5 * 60 * 1000);
  }

  // イベントリスナーの設定
  function setupEventListeners() {
    // クリックイベント
    document.addEventListener('click', handleClick, true);

    // フォーム入力
    document.addEventListener('input', handleInput, true);
    document.addEventListener('change', handleChange, true);

    // フォーム送信
    document.addEventListener('submit', handleSubmit, true);

    // コピー＆ペースト
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);

    // スクロール
    window.addEventListener('scroll', throttle(handleScroll, 1000), true);

    // キーボードショートカット
    document.addEventListener('keydown', handleKeydown, true);
  }

  // クリックイベントの処理
  function handleClick(event) {
    const target = event.target;
    const tagName = target.tagName.toLowerCase();
    const classList = Array.from(target.classList);
    const id = target.id;

    // クリックしたエレメントの情報
    const elementInfo = {
      tag: tagName,
      id: id || null,
      classes: classList.length > 0 ? classList : null,
      text: target.textContent?.substring(0, 50) || null
    };

    // ボタンやリンクのクリックを記録
    if (tagName === 'button' || tagName === 'a' || target.closest('button, a')) {
      recordActivity({
        type: 'click',
        data: {
          element: elementInfo,
          href: target.href || target.closest('a')?.href || null
        }
      });

      // 繰り返しパターンの検出
      const elementKey = `${tagName}-${id || classList.join('-')}`;
      const count = (clickPatterns.get(elementKey) || 0) + 1;
      clickPatterns.set(elementKey, count);

      // 同じ要素を3回以上クリックしたら記録
      if (count >= 3) {
        recordActivity({
          type: 'repeated_click',
          data: {
            element: elementInfo,
            count: count
          }
        });
      }
    }
  }

  // 入力イベントの処理
  function handleInput(event) {
    const target = event.target;
    const tagName = target.tagName.toLowerCase();

    if (tagName === 'input' || tagName === 'textarea') {
      const inputType = target.type;
      const name = target.name;
      const id = target.id;

      // パスワードやクレジットカードは除外
      if (inputType === 'password' || inputType === 'credit-card') {
        return;
      }

      // フォームフィールドの入力回数を記録（内容は記録しない）
      const fieldKey = `${name || id || 'unknown'}`;
      const interactions = formInteractions.get(fieldKey) || { count: 0, type: inputType };
      interactions.count++;
      formInteractions.set(fieldKey, interactions);
    }
  }

  // 変更イベントの処理（セレクトボックスなど）
  function handleChange(event) {
    const target = event.target;
    const tagName = target.tagName.toLowerCase();

    if (tagName === 'select') {
      recordActivity({
        type: 'select_change',
        data: {
          name: target.name || target.id || null,
          optionsCount: target.options.length
        }
      });
    }
  }

  // フォーム送信の処理
  function handleSubmit(event) {
    const form = event.target;

    // フォームの情報を記録
    const formData = {
      action: form.action,
      method: form.method,
      fieldCount: form.elements.length
    };

    recordActivity({
      type: 'form_submit',
      data: formData
    });

    // フォーム入力の統計も送信
    if (formInteractions.size > 0) {
      recordActivity({
        type: 'form_interactions',
        data: {
          fields: Array.from(formInteractions.entries()).map(([key, value]) => ({
            field: key,
            type: value.type,
            interactionCount: value.count
          }))
        }
      });
      formInteractions.clear();
    }
  }

  // コピーイベントの処理
  function handleCopy(event) {
    copyPasteCount++;
    recordActivity({
      type: 'copy',
      data: {
        length: window.getSelection().toString().length
      }
    });
  }

  // ペーストイベントの処理
  function handlePaste(event) {
    copyPasteCount++;
    recordActivity({
      type: 'paste',
      data: {
        targetTag: event.target.tagName.toLowerCase()
      }
    });

    // コピー&ペーストが頻繁に行われている場合
    if (copyPasteCount >= 5) {
      recordActivity({
        type: 'frequent_copy_paste',
        data: {
          count: copyPasteCount
        }
      });
    }
  }

  // スクロールイベントの処理
  function handleScroll() {
    const now = Date.now();
    if (now - lastScrollTime > 1000) { // 1秒以上経過している場合のみ
      scrollCount++;
      lastScrollTime = now;

      // 過度なスクロールは情報探索の可能性
      if (scrollCount >= 10) {
        recordActivity({
          type: 'excessive_scrolling',
          data: {
            count: scrollCount,
            pageHeight: document.body.scrollHeight
          }
        });
        scrollCount = 0; // リセット
      }
    }
  }

  // キーボードショートカットの処理
  function handleKeydown(event) {
    // Ctrl/Cmd + F (検索)
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      recordActivity({
        type: 'search_shortcut',
        data: { action: 'page_search' }
      });
    }

    // Ctrl/Cmd + Tab (タブ切り替え)
    if ((event.ctrlKey || event.metaKey) && event.key === 'Tab') {
      recordActivity({
        type: 'tab_switch_shortcut',
        data: { action: 'keyboard_tab_switch' }
      });
    }

    // Ctrl/Cmd + W (タブを閉じる)
    if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
      recordActivity({
        type: 'tab_close_shortcut',
        data: { action: 'keyboard_tab_close' }
      });
    }
  }

  // ページ滞在時間の記録
  function recordPageDuration() {
    const duration = Date.now() - pageLoadTime;

    // 10秒以上滞在した場合のみ記録
    if (duration > 10000) {
      recordActivity({
        type: 'page_duration',
        data: {
          durationMs: duration,
          durationMin: Math.round(duration / 60000)
        }
      });
    }
  }

  // 統計情報の送信
  function sendStatistics() {
    const stats = {
      clickPatterns: Array.from(clickPatterns.entries()).map(([key, count]) => ({
        element: key,
        count
      })),
      formInteractions: Array.from(formInteractions.entries()).map(([key, value]) => ({
        field: key,
        type: value.type,
        count: value.count
      })),
      copyPasteCount,
      scrollCount,
      timeOnPage: Date.now() - pageLoadTime
    };

    recordActivity({
      type: 'statistics',
      data: stats
    });
  }

  // アクティビティの記録（background scriptに送信）
  function recordActivity(activity) {
    try {
      chrome.runtime.sendMessage({
        type: 'recordActivity',
        data: activity
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to record activity:', chrome.runtime.lastError);
        }
      });

      lastActivityTime = Date.now();
    } catch (error) {
      console.error('Error recording activity:', error);
    }
  }

  // スロットル関数（イベントの頻度を制限）
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // 初期化実行
  init();

})();
