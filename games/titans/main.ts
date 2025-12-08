import { TitansSlotApp, TitansSlotAppConfig } from './TitansSlotApp';
import '@esotericsoftware/spine-pixi-v8';

// Titans 拉霸遊戲入口
async function startTitansSlotGame() {
  console.log('⚡ 啟動 Titans 拉霸遊戲...');

  // 獲取遊戲容器
  const container = document.getElementById('game-container');
  if (!container) {
    console.error('找不到遊戲容器 #game-container');
    return;
  }

  //語系轉換(真尷尬這邊太早執行了，只好再寫一次語系😅)
  const urlParams = new URLSearchParams(window.location.search);
  const language = urlParams.get('lang');
  let lang:string = '';
  if( language == 'zh-TW'){
    lang = 'cnt';
  }else if(language == 'en'){
    lang = 'en';
  }else{
    lang = 'cns';
  }
  console.log('🌐 語言:', language, '轉換後語言:', lang);

  // 配置遊戲
  const config: TitansSlotAppConfig = {
    // 基礎配置
    container,
    width: 1080,
    height: 1920,
    backgroundColor: 0x000000, // 黑色背景
    resolution: window.devicePixelRatio || 1,

    // API 配置
    apiConfig: {
      baseUrl: 'https://your-api-server.com/api',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000
    },


    // 資源配置
    resources: [
      // 背景圖片
      { id: 'mg_bg_00', url: '/games/titans/assets/mg_bg_00.png', type: 'image' },
      { id: 'mg_bg_01', url: '/games/titans/assets/mg_bg_01.png', type: 'image' },
      { id: 'mg_bg_02', url: '/games/titans/assets/mg_bg_02.png', type: 'image' },
      { id: 'mg_frame_roof', url: '/games/titans/assets/mg_frame_roof.png', type: 'image' },
      { id: 'fg_info_bg', url: '/games/titans/assets/fg_info_bg.png', type: 'image' },
      { id: 'game_logo_cnt', url: '/games/titans/assets/game_logo_'+lang+'.png', type: 'image' },
      { id: 'mg_frame', url: '/games/titans/assets/mg_frame.png', type: 'image' },
      { id: 'fg_bg', url: '/games/titans/assets/fg_bg.png', type: 'image' },
      { id: 'fg_frame_roof', url: '/games/titans/assets/fg_frame_roof.png', type: 'image' },
      { id: 'fg_frame', url: '/games/titans/assets/fg_frame.png', type: 'image' },
      // 按鈕圖片 - spin_btn 所有狀態
      { id: 'spin_btn_normal', url: '/games/titans/assets/spin_btn_normal.png', type: 'image' },
      { id: 'spin_btn_hover', url: '/games/titans/assets/spin_btn_hover.png', type: 'image' },
      { id: 'spin_btn_pressed', url: '/games/titans/assets/spin_btn_pressed.png', type: 'image' },
      { id: 'spin_btn_disable', url: '/games/titans/assets/spin_btn_disable.png', type: 'image' },
      { id: 'spin_btn_logo', url: '/games/titans/assets/spin_btn_logo.png', type: 'image' },
      { id: 'spin_btn_shadow', url: '/games/titans/assets/spin_btn_shadow.png', type: 'image' },
      // auto_btn 所有狀態
      { id: 'auto_btn_normal', url: '/games/titans/assets/auto_btn_normal.png', type: 'image' },
      { id: 'auto_btn_hover', url: '/games/titans/assets/auto_btn_hover.png', type: 'image' },
      { id: 'auto_btn_pressed', url: '/games/titans/assets/auto_btn_pressed.png', type: 'image' },
      { id: 'auto_btn_disable', url: '/games/titans/assets/auto_btn_disable.png', type: 'image' },
      // option_btn 所有狀態
      { id: 'option_btn_normal', url: '/games/titans/assets/option_btn_normal.png', type: 'image' },
      { id: 'option_btn_hover', url: '/games/titans/assets/option_btn_hover.png', type: 'image' },
      { id: 'option_btn_pressed', url: '/games/titans/assets/option_btn_pressed.png', type: 'image' },
      { id: 'option_btn_disable', url: '/games/titans/assets/option_btn_disable.png', type: 'image' },
      { id: 'option_back_btn_normal', url: '/games/titans/assets/option_back_btn_normal.png', type: 'image' },
      { id: 'option_back_btn_hover', url: '/games/titans/assets/option_back_btn_hover.png', type: 'image' },
      { id: 'option_back_btn_pressed', url: '/games/titans/assets/option_back_btn_pressed.png', type: 'image' },
      { id: 'option_back_btn_disable', url: '/games/titans/assets/option_back_btn_disable.png', type: 'image' },
      // turbo_btn 所有狀態
      { id: 'turbo_btn_normal', url: '/games/titans/assets/turbo_btn_normal.png', type: 'image' },
      { id: 'turbo_btn_hover', url: '/games/titans/assets/turbo_btn_hover.png', type: 'image' },
      { id: 'turbo_btn_pressed', url: '/games/titans/assets/turbo_btn_pressed.png', type: 'image' },
      { id: 'turbo_btn_disable', url: '/games/titans/assets/turbo_btn_disable.png', type: 'image' },
      // plus_btn 所有狀態
      { id: 'plus_btn_normal', url: '/games/titans/assets/plus_btn_normal.png', type: 'image' },
      { id: 'plus_btn_hover', url: '/games/titans/assets/plus_btn_hover.png', type: 'image' },
      { id: 'plus_btn_pressed', url: '/games/titans/assets/plus_btn_pressed.png', type: 'image' },
      { id: 'plus_btn_disable', url: '/games/titans/assets/plus_btn_disable.png', type: 'image' },
      // sub_btn 所有狀態
      { id: 'sub_btn_normal', url: '/games/titans/assets/sub_btn_normal.png', type: 'image' },
      { id: 'sub_btn_hover', url: '/games/titans/assets/sub_btn_hover.png', type: 'image' },
      { id: 'sub_btn_pressed', url: '/games/titans/assets/sub_btn_pressed.png', type: 'image' },
      { id: 'sub_btn_disable', url: '/games/titans/assets/sub_btn_disable.png', type: 'image' },
      // free_btn 所有狀態
      { id: 'fg_btn_cnt_disable', url: '/games/titans/assets/fg_btn_'+lang+'_disable.png', type: 'image' },
      { id: 'fg_btn_cnt_normal', url: '/games/titans/assets/fg_btn_'+lang+'_normal.png', type: 'image' },
      { id: 'fg_btn_cnt_hover', url: '/games/titans/assets/fg_btn_'+lang+'_hover.png', type: 'image' },
      { id: 'fg_btn_cnt_pressed', url: '/games/titans/assets/fg_btn_'+lang+'_pressed.png', type: 'image' },
      // settings_btn 所有狀態
      { id: 'logout_btn_normal', url: '/games/titans/assets/logout_btn_normal.png', type: 'image' },
      { id: 'logout_btn_hover', url: '/games/titans/assets/logout_btn_hover.png', type: 'image' },
      { id: 'logout_btn_pressed', url: '/games/titans/assets/logout_btn_pressed.png', type: 'image' },
      { id: 'logout_btn_disable', url: '/games/titans/assets/logout_btn_disable.png', type: 'image' },
      { id: 'record_btn_normal', url: '/games/titans/assets/record_btn_normal.png', type: 'image' },
      { id: 'record_btn_hover', url: '/games/titans/assets/record_btn_hover.png', type: 'image' },
      { id: 'record_btn_pressed', url: '/games/titans/assets/record_btn_pressed.png', type: 'image' },
      { id: 'record_btn_disable', url: '/games/titans/assets/record_btn_disable.png', type: 'image' },
      { id: 'info_btn_normal', url: '/games/titans/assets/info_btn_normal.png', type: 'image' },
      { id: 'info_btn_hover', url: '/games/titans/assets/info_btn_hover.png', type: 'image' },
      { id: 'info_btn_pressed', url: '/games/titans/assets/info_btn_pressed.png', type: 'image' },
      { id: 'info_btn_disable', url: '/games/titans/assets/info_btn_disable.png', type: 'image' },
      //下注資訊
      { id: 'wallet_ui', url: '/games/titans/assets/wallet_ui.png', type: 'image' },
      { id: 'trophy_ui', url: '/games/titans/assets/trophy_ui.png', type: 'image' },
      { id: 'multiple_ui', url: '/games/titans/assets/multiple_ui.png', type: 'image' },
      // 符號圖片
      { id: 'symbol_01', url: '/games/titans/assets/Symbol/symbol_01.png', type: 'image' },
      { id: 'symbol_02', url: '/games/titans/assets/Symbol/symbol_02.png', type: 'image' },
      { id: 'symbol_03', url: '/games/titans/assets/Symbol/symbol_03.png', type: 'image' },
      { id: 'symbol_04', url: '/games/titans/assets/Symbol/symbol_04.png', type: 'image' },
      { id: 'symbol_05', url: '/games/titans/assets/Symbol/symbol_05.png', type: 'image' },
      { id: 'symbol_06', url: '/games/titans/assets/Symbol/symbol_06.png', type: 'image' },
      { id: 'symbol_07', url: '/games/titans/assets/Symbol/symbol_07.png', type: 'image' },
      { id: 'symbol_08', url: '/games/titans/assets/Symbol/symbol_08.png', type: 'image' },
      { id: 'symbol_09', url: '/games/titans/assets/Symbol/symbol_09.png', type: 'image' },
      { id: 'symbol_10', url: '/games/titans/assets/Symbol/symbol_10.png', type: 'image' },
      { id: 'symbol_11', url: '/games/titans/assets/Symbol/symbol_11.png', type: 'image' },
      // 免費結算
      { id: 'fg_summary_alart_bg', url: '/games/titans/assets/fg_summary_alart_bg.png', type: 'image' },
      { id: 'fg_summary_alart_btn_hover', url: '/games/titans/assets/fg_summary_alart_btn_hover.png', type: 'image' },
      { id: 'fg_summary_alart_btn_normal', url: '/games/titans/assets/fg_summary_alart_btn_normal.png', type: 'image' },
      { id: 'fg_summary_alart_btn_pressed', url: '/games/titans/assets/fg_summary_alart_btn_pressed.png', type: 'image' },
      { id: 'fg_summary_alart_btntext_cnt', url: '/games/titans/assets/fg_summary_alart_btntext_'+lang+'.png', type: 'image' },
      { id: 'fg_summary_alart_Title_cnt', url: '/games/titans/assets/fg_summary_alart_Title_'+lang+'.png', type: 'image' },
      { id: 'fg_summary_alart_number_0', url: '/games/titans/assets/fg_summary_alart_number_0.png', type: 'image' },
      { id: 'fg_summary_alart_number_1', url: '/games/titans/assets/fg_summary_alart_number_1.png', type: 'image' },
      { id: 'fg_summary_alart_number_2', url: '/games/titans/assets/fg_summary_alart_number_2.png', type: 'image' },
      { id: 'fg_summary_alart_number_3', url: '/games/titans/assets/fg_summary_alart_number_3.png', type: 'image' },
      { id: 'fg_summary_alart_number_4', url: '/games/titans/assets/fg_summary_alart_number_4.png', type: 'image' },
      { id: 'fg_summary_alart_number_5', url: '/games/titans/assets/fg_summary_alart_number_5.png', type: 'image' },
      { id: 'fg_summary_alart_number_6', url: '/games/titans/assets/fg_summary_alart_number_6.png', type: 'image' },
      { id: 'fg_summary_alart_number_7', url: '/games/titans/assets/fg_summary_alart_number_7.png', type: 'image' },
      { id: 'fg_summary_alart_number_8', url: '/games/titans/assets/fg_summary_alart_number_8.png', type: 'image' },
      { id: 'fg_summary_alart_number_9', url: '/games/titans/assets/fg_summary_alart_number_9.png', type: 'image' },
      { id: 'fg_summary_alart_number_,', url: '/games/titans/assets/fg_summary_alart_number_,.png', type: 'image' },
      { id: 'fg_summary_alart_number_.', url: '/games/titans/assets/fg_summary_alart_number_..png', type: 'image' },
      // fessSpin
      { id: 'buyfg_bg_startbtn_normal', url: '/games/titans/assets/buyfg_bg_startbtn_normal.png', type: 'image' },
      { id: 'buyfg_bg_startbtn_pressed', url: '/games/titans/assets/buyfg_bg_startbtn_pressed.png', type: 'image' },
      { id: 'buyfg_bg_startbtn_hover', url: '/games/titans/assets/buyfg_bg_startbtn_hover.png', type: 'image' },
      { id: 'buyfg_bg_cancelbtn_normal', url: '/games/titans/assets/buyfg_bg_cancelbtn_normal.png', type: 'image' },
      { id: 'buyfg_bg_cancelbtn_pressed', url: '/games/titans/assets/buyfg_bg_cancelbtn_pressed.png', type: 'image' },
      { id: 'buyfg_bg_cancelbtn_hover', url: '/games/titans/assets/buyfg_bg_cancelbtn_hover.png', type: 'image' },
      { id: 'buyfg_bg_btntext_start_normal', url: '/games/titans/assets/buyfg_bg_btntext_start_normal_'+lang+'.png', type: 'image' },
      { id: 'buyfg_bg_btntext_start_pressed', url: '/games/titans/assets/buyfg_bg_btntext_start_pressed_'+lang+'.png', type: 'image' },
      { id: 'buyfg_bg_btntext_cancel_normal', url: '/games/titans/assets/buyfg_bg_btntext_cancel_normal_'+lang+'.png', type: 'image' },
      { id: 'buyfg_bg_btntext_cancel_pressed', url: '/games/titans/assets/buyfg_bg_btntext_cancel_pressed_'+lang+'.png', type: 'image' },
      // { id: 'fessSpin_bg', url: '/games/titans/assets/fessSpin_bg.png', type: 'image' },
      // spine 動畫資源 - @esotericsoftware/spine-pixi-v8 需要分別載入 atlas 和 skeleton
      { id: 'Spin_Btn_skel', url: '/games/titans/assets/spine/Spin_Btn.skel', type: 'skel' },
      { id: 'Spin_Btn_atlas', url: '/games/titans/assets/spine/Spin_Btn.atlas', type: 'atlas' },
      { id: 'Big_Treasure_skel', url: '/games/titans/assets/spine/Big_Treasure.skel', type: 'skel' },
      { id: 'Big_Treasure_atlas', url: '/games/titans/assets/spine/Big_Treasure.atlas', type: 'atlas' },
      
    ],

    // 遊戲配置
    gameConfig: {
      autoSpinDelay: 2000,
      spinDuration: 3000,
      celebrationDuration: 2000,
      errorRetryDelay: 3000
    },

    // Titans 拉霸特定配置
    TitansConfig: {
      TitansTypes: ['titan1', 'titan2', 'titan3', 'titan4', 'titan5'],
      bonusThreshold: 3,
      jackpotMultiplier: 100,
      autoSpinDelay: 2000,
      spinDuration: 3000,
      celebrationDuration: 2000,
      errorRetryDelay: 3000
    },

    // 開發時啟用離線模式
    enableOfflineMode: true
  };

  try {
    // 創建遊戲應用程式
    const app = new TitansSlotApp(config);

    // 初始化
    await app.initialize();

    // 開始運行
    app.start();

    // 將 app 實例掛載到 window 供測試使用
    (window as any).TitansSlotApp = app;

    // 設置測試控制按鈕
    setupTestControls(app);

  } catch (error) {
    console.error('❌ 遊戲啟動失敗:', error);
  }
}

// 設置測試控制按鈕
function setupTestControls(app: TitansSlotApp) {
  // 創建控制面板
  const controlPanel = document.createElement('div');
  controlPanel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    z-index: 1000;
  `;

  controlPanel.innerHTML = `
    <h3 style="margin: 0 0 15px 0;">🎮 測試控制台</h3>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button id="test-spin" style="padding: 10px; cursor: pointer;">旋轉</button>
      <button id="test-add-balance" style="padding: 10px; cursor: pointer;">增加餘額 (+1000)</button>
      <button id="test-set-bet-10" style="padding: 10px; cursor: pointer;">設置投注 $10</button>
      <button id="test-set-bet-50" style="padding: 10px; cursor: pointer;">設置投注 $50</button>
      <button id="test-bonus-free" style="padding: 10px; cursor: pointer;">觸發免費旋轉</button>
      <button id="test-reset" style="padding: 10px; cursor: pointer;">重設遊戲</button>
    </div>
    <div style="margin-top: 15px; font-size: 12px;">
      <div id="test-info"></div>
    </div>
  `;

  document.body.appendChild(controlPanel);

  // 綁定事件
  document.getElementById('test-spin')?.addEventListener('click', () => {
    console.log('🎲 測試：旋轉');
    app.spin();
  });

  document.getElementById('test-add-balance')?.addEventListener('click', () => {
    console.log('💰 測試：增加餘額');
    app.addBalance(1000);
  });

  document.getElementById('test-set-bet-10')?.addEventListener('click', () => {
    console.log('💵 測試：設置投注 $10');
    app.setBet(10);
  });

  document.getElementById('test-set-bet-50')?.addEventListener('click', () => {
    console.log('💵 測試：設置投注 $50');
    app.setBet(50);
  });

  document.getElementById('test-bonus-free')?.addEventListener('click', () => {
    console.log('🎁 測試：觸發免費旋轉');
    app.triggerBonus('freeSpins');
  });

  document.getElementById('test-reset')?.addEventListener('click', () => {
    console.log('🔄 測試：重設遊戲');
    app.resetGame();
  });

  // 更新資訊顯示
  const updateInfo = () => {
    const infoDiv = document.getElementById('test-info');
    if (infoDiv) {
      infoDiv.innerHTML = `
        <strong>狀態:</strong> ${app.getCurrentState()}<br>
        <strong>餘額:</strong> $${app.getBalance()}<br>
        <strong>投注:</strong> $${app.getTitansModel().getCurrentBet()}<br>
        <strong>免費旋轉:</strong> ${app.getFreeSpinsRemaining()}
      `;
    }
  };

  // 定期更新資訊
  setInterval(updateInfo, 500);
  updateInfo();
}

// 啟動遊戲
startTitansSlotGame().then(() => {
  // 隱藏載入畫面
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }
}).catch((error) => {
  console.error('遊戲啟動失敗:', error);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `
      <h2>❌ 載入失敗</h2>
      <p>${error.message}</p>
      <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">重新載入</button>
    `;
  }
});

