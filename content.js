// Основний скрипт для приховування куплених ігор
let isEnabled = true;

// Завантаження налаштувань
chrome.storage.sync.get(['enabled'], function(result) {
  setEnabled(result.enabled !== false);
  if (isEnabled) {
    showFirstRunNotification();
  }
});

// Синхронізація стану між усіма вкладками PSDeals
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.enabled) {
    setEnabled(changes.enabled.newValue !== false);
  }
});

// Увімкнення/вимкнення приховування
function setEnabled(enabled) {
  isEnabled = enabled;
  if (isEnabled) {
    hideOwnedGames();
    observePageChanges();
  } else {
    if (window.psdealsObserver) {
      window.psdealsObserver.disconnect();
    }
    clearTimeout(window.psdealsHideTimeout);
    showAllGames();
  }
}

// Приховування куплених ігор
function hideOwnedGames() {
  // Шукаємо всі іконки куплених ігор
  const purchasedIcons = document.querySelectorAll('.icon-purchaseslist.active');
  let hiddenCount = 0;
  
  purchasedIcons.forEach(icon => {
    // Знаходимо батьківський елемент - картку гри (.game-collection-item)
    const gameCard = icon.closest('.game-collection-item');
    
    if (gameCard && !gameCard.classList.contains('psdeals-hidden')) {
      gameCard.style.display = 'none';
      gameCard.classList.add('psdeals-hidden');
      gameCard.setAttribute('data-psdeals-owned', 'true');
      hiddenCount++;
    }
  });
  
  if (hiddenCount > 0) {
    console.log(`PSDeals: Приховано ${hiddenCount} куплених ігор`);
  }
}

// Показ всіх прихованих ігор
function showAllGames() {
  const hiddenGames = document.querySelectorAll('.psdeals-hidden');
  hiddenGames.forEach(el => {
    el.style.display = '';
    el.classList.remove('psdeals-hidden');
    el.removeAttribute('data-psdeals-owned');
  });
  if (hiddenGames.length > 0) {
    console.log(`PSDeals: Показано ${hiddenGames.length} куплених ігор`);
  }
}

// Спостереження за змінами на сторінці (для динамічного завантаження)
function observePageChanges() {
  // Відключаємо попередній observer якщо він існує
  if (window.psdealsObserver) {
    window.psdealsObserver.disconnect();
  }
  
  window.psdealsObserver = new MutationObserver((mutations) => {
    if (isEnabled) {
      // Затримка для уникнення зайвих викликів
      clearTimeout(window.psdealsHideTimeout);
      window.psdealsHideTimeout = setTimeout(() => {
        hideOwnedGames();
      }, 100);
    }
  });
  
  window.psdealsObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Слухаємо повідомлення від popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    // Рахуємо лише ігри в картках сітки — на сторінках профілю (/user/...)
    // ігри показані списком і не приховуються
    const hiddenCount = document.querySelectorAll('.psdeals-hidden').length;
    const totalOwned = document.querySelectorAll('.game-collection-item .icon-purchaseslist.active').length;
    sendResponse({
      profilePage: window.location.pathname.startsWith('/user/'),
      enabled: isEnabled,
      hidden: hiddenCount,
      total: totalOwned
    });
  }
});

// Показ повідомлення при першому запуску
function showFirstRunNotification() {
  chrome.storage.local.get(['firstRun'], function(result) {
    if (result.firstRun) {
      return;
    }
    // Чекаємо трохи щоб контент завантажився
    setTimeout(() => {
      const hiddenCount = document.querySelectorAll('.psdeals-hidden').length;
      if (isEnabled && hiddenCount > 0) {
        chrome.storage.local.set({ firstRun: true });
        showNotification(`🎮 PSDeals: Приховано ${hiddenCount} ${getPluralForm(hiddenCount)}`);
      }
    }, 1000);
  });
}

// Функція для правильних відмінків
function getPluralForm(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'куплених ігор';
  }
  if (lastDigit === 1) {
    return 'куплену гру';
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'куплені гри';
  }
  return 'куплених ігор';
}

// Показ повідомлення
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    max-width: 300px;
  `;
  notification.textContent = message;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(120%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(120%);
        opacity: 0;
      }
    }
  `;
  
  if (!document.getElementById('psdeals-notification-styles')) {
    style.id = 'psdeals-notification-styles';
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    setTimeout(() => notification.remove(), 400);
  }, 3000);
}
