// Popup скрипт
document.addEventListener('DOMContentLoaded', function() {
  const enableToggle = document.getElementById('enableToggle');
  const statusMessage = document.getElementById('statusMessage');
  const statsContainer = document.getElementById('statsContainer');
  const statsCount = document.getElementById('statsCount');

  // Завантаження поточного стану
  chrome.storage.sync.get(['enabled'], function(result) {
    enableToggle.checked = result.enabled !== false;
  });

  updateStats();

  // Перемикач увімкнення/вимкнення
  // Вкладки PSDeals отримують зміну через chrome.storage.onChanged
  enableToggle.addEventListener('change', function() {
    const enabled = this.checked;
    chrome.storage.sync.set({ enabled: enabled }, function() {
      showStatus(
        enabled ? '✅ Приховування увімкнено' : '❌ Приховування вимкнено',
        'success'
      );

      // Оновлюємо статистику після застосування змін на сторінці
      setTimeout(() => updateStats(true), 200);
    });
  });

  // Отримання статистики з поточної вкладки
  function updateStats(keepStatus) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const currentTab = tabs[0];

      if (!currentTab || !currentTab.url || !currentTab.url.includes('psdeals.net')) {
        statsContainer.style.display = 'none';
        if (!keepStatus) {
          showStatus('Відкрийте сайт PSDeals для використання розширення', 'info');
        }
        return;
      }

      chrome.tabs.sendMessage(currentTab.id, { action: 'getStats' }, function(response) {
        if (chrome.runtime.lastError) {
          showStatus('Оновіть сторінку для роботи розширення', 'info');
          return;
        }

        if (response && response.total > 0) {
          statsContainer.style.display = 'block';
          statsCount.textContent = response.hidden;

          if (!keepStatus && response.enabled && response.hidden < response.total) {
            showStatus(`Приховано ${response.hidden} з ${response.total} куплених ігор`, 'success');
          }
        } else {
          statsContainer.style.display = 'none';
          if (!keepStatus) {
            showStatus('Куплених ігор не знайдено на цій сторінці', 'info');
          }
        }
      });
    });
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.style.display = 'block';
  }
});
