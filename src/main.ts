import { SlotMachineApp, SlotMachineAppConfig } from './SlotMachineApp';
import { ResourceDefinition } from '@core/ResourceManager';
import { GameLoadProgress } from '@core/GameLoader';

// DOM 元素
const loadingScreen = document.getElementById('loading-screen')!;
const loadingPercentage = document.getElementById('loading-percentage')!;
const loadingMessage = document.getElementById('loading-message')!;
const progressBarFill = document.getElementById('progress-bar-fill')!;
const progressBarEffect = document.getElementById('progress-bar-effect')!;
const controlPanel = document.getElementById('control-panel')!;
const errorMessage = document.getElementById('error-message')!;
const errorText = document.getElementById('error-text')!;

// 控制面板元素
const balanceDisplay = document.getElementById('balance-display')!;
const betDisplay = document.getElementById('bet-display')!;
const stateDisplay = document.getElementById('state-display')!;
const spinButton = document.getElementById('spin-button')! as HTMLButtonElement;
const betPlusButton = document.getElementById('bet-plus')! as HTMLButtonElement;
const betMinusButton = document.getElementById('bet-minus')! as HTMLButtonElement;

// 遊戲實例
let slotMachineApp: SlotMachineApp | null = null;

// 示例資源配置（實際使用時應該從配置文件載入）
const gameResources: ResourceDefinition[] = [
  // 示例圖片資源
  // { id: 'symbol1', url: '/assets/images/symbol1.png', type: 'image', preload: true },
  // { id: 'symbol2', url: '/assets/images/symbol2.png', type: 'image', preload: true },
  // { id: 'background', url: '/assets/images/background.jpg', type: 'image', preload: true },
  
  // 示例音效資源
  // { id: 'spin_sound', url: '/assets/sounds/spin.mp3', type: 'audio', preload: true },
  // { id: 'win_sound', url: '/assets/sounds/win.mp3', type: 'audio', preload: true },
  
  // 示例配置文件
  // { id: 'game_config', url: '/assets/config/game.json', type: 'json', preload: true }
];

// 應用程式配置
const appConfig: SlotMachineAppConfig = {
  container: document.getElementById('game-canvas')!,
  width: 1024,
  height: 768,
  backgroundColor: 0x1a1a2e,
  apiConfig: {
    baseUrl: 'https://api.example.com', // 替換為實際的 API 地址
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  gameConfig: {
    autoSpinDelay: 2000,
    spinDuration: 3000,
    celebrationDuration: 2000,
    errorRetryDelay: 3000
  },
  resources: gameResources,
  enableOfflineMode: true // 開發模式下啟用離線模式
};

// 顯示錯誤訊息
function showError(message: string): void {
  errorText.textContent = message;
  errorMessage.style.display = 'block';
  console.error('遊戲錯誤:', message);
}

// 隱藏載入畫面
function hideLoadingScreen(): void {
  loadingScreen.classList.add('hidden');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    controlPanel.style.display = 'flex';
  }, 500);
}

// 更新載入進度
function updateLoadingProgress(progress: GameLoadProgress): void {
  const percentage = Math.round(progress.percentage);
  loadingPercentage.textContent = `${percentage}%`;
  loadingMessage.textContent = progress.message || progress.details || '正在載入資源...';
  
  // 更新進度條寬度
  const width = `${progress.percentage}%`;
  progressBarFill.style.width = width;
  progressBarEffect.style.width = width;
}

// 更新 UI 顯示
function updateUI(): void {
  if (!slotMachineApp) return;

  const model = slotMachineApp.getModel();
  const currentState = slotMachineApp.getCurrentState();
  console.log('updateUI', model.getBalance());
  
  // 更新餘額和投注顯示
  balanceDisplay.textContent = model.getBalance().toString();
  betDisplay.textContent = model.getCurrentBet().toString();
  stateDisplay.textContent = currentState || '未知';

  // 更新按鈕狀態
  const canSpin = model.canSpin() && currentState === 'idle';
  spinButton.disabled = !canSpin;
  betPlusButton.disabled = currentState !== 'idle';
  betMinusButton.disabled = currentState !== 'idle';
}

// 設置事件監聽器
function setupEventListeners(): void {
  if (!slotMachineApp) return;

  const model = slotMachineApp.getModel();
  const stateMachine = slotMachineApp.getStateMachine();

  // 監聽模型事件
  model.on('balanceChanged', updateUI);
  model.on('betChanged', updateUI);
  model.on('spinStarted', updateUI);
  model.on('spinCompleted', updateUI);
  model.on('error', (error: string) => showError(error));

  // 監聽狀態機變更
  stateMachine.onStateChange(() => updateUI());

  // 設置控制面板事件
  spinButton.addEventListener('click', () => {
    try {
      slotMachineApp?.spin();
    } catch (error) {
      showError(`轉動失敗: ${error}`);
    }
  });

  betPlusButton.addEventListener('click', () => {
    const currentBet = model.getCurrentBet();
    const newBet = Math.min(currentBet + 10, 100); // 最大投注 100
    model.setBet(newBet);
  });

  betMinusButton.addEventListener('click', () => {
    const currentBet = model.getCurrentBet();
    const newBet = Math.max(currentBet - 10, 10); // 最小投注 10
    model.setBet(newBet);
  });

  // 鍵盤事件
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !spinButton.disabled) {
      event.preventDefault();
      slotMachineApp?.spin();
    }
  });
}

// 初始化應用程式
async function initializeApp(): Promise<void> {
  try {
    // 創建拉霸機應用程式實例
    slotMachineApp = new SlotMachineApp(appConfig);

    // 設置載入進度回調（在初始化之前設置）
    const loader = (slotMachineApp as any).loader;
    if (loader) {
      loader.setCallbacks(
        updateLoadingProgress,
        () => {
          console.log('載入完成');
          hideLoadingScreen();
          setupEventListeners();
          updateUI();
          
          // 啟動應用程式
          slotMachineApp?.start();
        },
        (error: string) => {
          showError(`載入失敗: ${error}`);
        }
      );
    }

    // 初始化應用程式
    await slotMachineApp.initialize();

  } catch (error) {
    console.error('初始化失敗:', error);
    showError(`初始化失敗: ${error}`);
  }
}

// 應用程式清理
function cleanup(): void {
  if (slotMachineApp) {
    slotMachineApp.destroy();
    slotMachineApp = null;
  }
}

// 頁面生命週期事件
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// 錯誤處理
window.addEventListener('error', (event) => {
  showError(`頁面錯誤: ${event.error?.message || event.message}`);
});

window.addEventListener('unhandledrejection', (event) => {
  showError(`未處理的 Promise 錯誤: ${event.reason}`);
  event.preventDefault();
});

// 啟動應用程式
console.log('正在啟動拉霸機應用程式...');
initializeApp().catch(error => {
  console.error('啟動失敗:', error);
  showError(`啟動失敗: ${error}`);
});

// 開發模式下的全域變數（便於除錯）
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  (window as any).slotMachineApp = slotMachineApp;
  (window as any).updateUI = updateUI;
  console.log('開發模式：可通過 window.slotMachineApp 存取應用程式實例');
} 