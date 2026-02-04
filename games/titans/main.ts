import { TitansSlotApp, TitansSlotAppConfig } from './TitansSlotApp';
import '@esotericsoftware/spine-pixi-v8';

// 型別宣告：確保可以使用 import.meta.env.BASE_URL
interface ImportMetaEnv {
  readonly BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 根據 Vite 的 base 自動組資源路徑
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

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
  const language = urlParams.get('language');
  let lang:string = '';
  if( language == 'zh-tw'){
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
      // Sprite Sheet 資源（multipack，只需要載入第一個 JSON 文件）
      // PixiJS 會自動載入其他相關的 pack 文件
      { id: 'titans_spritesheet', url: asset('games/titans/assets/png/titans1-0.json'), type: 'spritesheet' },
      
      // audio 音頻資源
      // 背景音樂（循環播放）
      { id: 'mg_bgm', url: asset('games/titans/assets/audio/mg_bgm.mp3'), type: 'audio' }, // mg主旋律（循環播放）
      { id: 'fg_bgm', url: asset('games/titans/assets/audio/fg_bgm.mp3'), type: 'audio' }, // fg主旋律（循環播放）
      { id: 'btm_fg_out_bgm', url: asset('games/titans/assets/audio/btm_fg_out_bgm.mp3'), type: 'audio' }, // fg結算畫面的背景循環音樂
      
      // 按鈕音效
      { id: 'btm_butt', url: asset('games/titans/assets/audio/btm_butt.mp3'), type: 'audio' }, // 一般按鈕按下音效
      { id: 'btm_butt_cancel', url: asset('games/titans/assets/audio/btm_butt_cancel.mp3'), type: 'audio' }, // 一般按鈕取消音效
      { id: 'btm_spin', url: asset('games/titans/assets/audio/btm_spin.mp3'), type: 'audio' }, // 啟動Spin轉軸的按鈕音效
      { id: 'btm_fg_press_start', url: asset('games/titans/assets/audio/btm_fg_press_start.mp3'), type: 'audio' }, // 購買free spins 介面按下START按鈕的音效
      
      // 輪軸轉動音效
      { id: 'btm_fall_normal_2', url: asset('games/titans/assets/audio/btm_fall_normal-2.mp3'), type: 'audio' }, // 輪軸轉動-一般
      { id: 'btm_fall_auto_2', url: asset('games/titans/assets/audio/btm_fall_auto_2.mp3'), type: 'audio' }, // 輪軸轉動-快速
      
      // Symbol 音效
      { id: 'btm_symbol_hit', url: asset('games/titans/assets/audio/btm_symbol_hit.mp3'), type: 'audio' }, // 一般Symbol落定
      { id: 'btm_fx_symbol_frame', url: asset('games/titans/assets/audio/btm_fx_symbol_frame.mp3'), type: 'audio' }, // 一般Symbol得分
      { id: 'btm_symbol_out', url: asset('games/titans/assets/audio/btm_symbol_out.mp3'), type: 'audio' }, // 一般Symbol消除爆炸音效
      
      // 倍數Symbol音效
      { id: 'btm_fx_symbol_function_2', url: asset('games/titans/assets/audio/btm_fx_symbol_function_2.mp3'), type: 'audio' }, // 倍數Symbol_一般落定
      { id: 'btm_fx_symbol_function_2_100x', url: asset('games/titans/assets/audio/btm_fx_symbol_function_2_100x.mp3'), type: 'audio' }, // 倍數Symbol_高倍落定
      { id: 'btm_multiple_total', url: asset('games/titans/assets/audio/btm_multiple_total.mp3'), type: 'audio' }, // 倍數symbol往贏分框飛的時後將出現此音效
      
      // 特殊音效
      { id: 'btm_w_jp_line', url: asset('games/titans/assets/audio/btm_w_jp_line.mp3'), type: 'audio' }, // JP觸發音效（與scatter共用）
      { id: 'gaint_angry', url: asset('games/titans/assets/audio/gaint_angry.mp3'), type: 'audio' }, // 巨人怒吼音效
      { id: 'btm_trans', url: asset('games/titans/assets/audio/btm_trans.mp3'), type: 'audio' }, // 閃電雲的轉場音效
      { id: 'treasure_chest_open', url: asset('games/titans/assets/audio/treasure_chest_open.mp3'), type: 'audio' }, // 寶箱開啟的整段畫面的音效
      { id: 'btm_fg_out', url: asset('games/titans/assets/audio/btm_fg_out.mp3'), type: 'audio' }, // fg結算畫面彈出時的爆炸音效
      { id: 'btm_counting', url: asset('games/titans/assets/audio/btm_counting.mp3'), type: 'audio' }, // 金額跑分時播放的單顆錢幣音效（每跳兩個數字播一次）
      // spine 動畫資源 - @esotericsoftware/spine-pixi-v8 需要分別載入 atlas 和 skeleton
      // 主目錄下的 Spine 資源
      { id: 'BG_Multi_Ball_skel', url: asset('games/titans/assets/spine/BG_Multi_Ball.skel'), type: 'skel' },
      { id: 'BG_Multi_Ball_atlas', url: asset('games/titans/assets/spine/BG_Multi_Ball.atlas'), type: 'atlas' },
      { id: 'Big_Treasure_skel', url: asset('games/titans/assets/spine/Big_Treasure.skel'), type: 'skel' },
      { id: 'Big_Treasure_atlas', url: asset('games/titans/assets/spine/Big_Treasure.atlas'), type: 'atlas' },
      { id: 'Buy_FG_skel', url: asset('games/titans/assets/spine/Buy_FG.skel'), type: 'skel' },
      { id: 'Buy_FG_atlas', url: asset('games/titans/assets/spine/Buy_FG.atlas'), type: 'atlas' },
      { id: 'FG_Summary_Alart_skel', url: asset('games/titans/assets/spine/FG_Summary_Alart.skel'), type: 'skel' },
      { id: 'FG_Summary_Alart_atlas', url: asset('games/titans/assets/spine/FG_Summary_Alart.atlas'), type: 'atlas' },
      { id: 'Free_Game_BG_skel', url: asset('games/titans/assets/spine/Free_Game_BG.skel'), type: 'skel' },
      { id: 'Free_Game_BG_atlas', url: asset('games/titans/assets/spine/Free_Game_BG.atlas'), type: 'atlas' },
      { id: 'Main_Game_BG_skel', url: asset('games/titans/assets/spine/Main_Game_BG.skel'), type: 'skel' },
      { id: 'Main_Game_BG_atlas', url: asset('games/titans/assets/spine/Main_Game_BG.atlas'), type: 'atlas' },
      { id: 'Prize_Win_Vfx_skel', url: asset('games/titans/assets/spine/Prize_Win_Vfx.skel'), type: 'skel' },
      { id: 'Prize_Win_Vfx_atlas', url: asset('games/titans/assets/spine/Prize_Win_Vfx.atlas'), type: 'atlas' },
      { id: 'Prize_Win_skel', url: asset('games/titans/assets/spine/Prize_Win.skel'), type: 'skel' },
      { id: 'Prize_Win_atlas', url: asset('games/titans/assets/spine/Prize_Win.atlas'), type: 'atlas' },
      { id: 'Spin_Btn_skel', url: asset('games/titans/assets/spine/Spin_Btn.skel'), type: 'skel' },
      { id: 'Spin_Btn_atlas', url: asset('games/titans/assets/spine/Spin_Btn.atlas'), type: 'atlas' },
      { id: 'symbol_10_skel', url: asset('games/titans/assets/spine/symbol_10.skel'), type: 'skel' },
      { id: 'symbol_10_atlas', url: asset('games/titans/assets/spine/symbol_10.atlas'), type: 'atlas' },
      { id: 'symbol_11_skel', url: asset('games/titans/assets/spine/symbol_11.skel'), type: 'skel' },
      { id: 'symbol_11_atlas', url: asset('games/titans/assets/spine/symbol_11.atlas'), type: 'atlas' },
      { id: 'Symbol_Explosion_skel', url: asset('games/titans/assets/spine/Symbol_Explosion.skel'), type: 'skel' },
      { id: 'Symbol_Explosion_atlas', url: asset('games/titans/assets/spine/Symbol_Explosion.atlas'), type: 'atlas' },
      { id: 'Symbol_Multi_Up_skel', url: asset('games/titans/assets/spine/Symbol_Multi_Up.skel'), type: 'skel' },
      { id: 'Symbol_Multi_Up_atlas', url: asset('games/titans/assets/spine/Symbol_Multi_Up.atlas'), type: 'atlas' },
      { id: 'Symbol_Multi_skel', url: asset('games/titans/assets/spine/Symbol_Multi.skel'), type: 'skel' },
      { id: 'Symbol_Multi_atlas', url: asset('games/titans/assets/spine/Symbol_Multi.atlas'), type: 'atlas' },
      { id: 'Transition_skel', url: asset('games/titans/assets/spine/Transition.skel'), type: 'skel' },
      { id: 'Transition_atlas', url: asset('games/titans/assets/spine/Transition.atlas'), type: 'atlas' },
      { id: 'BG_Multi_Ball_Big_skel', url: asset('games/titans/assets/spine/BG_Multi_Ball_Big.skel'), type: 'skel' },
      { id: 'BG_Multi_Ball_Big_atlas', url: asset('games/titans/assets/spine/BG_Multi_Ball_Big.atlas'), type: 'atlas' },
      { id: 'BG_Win_Bar_skel', url: asset('games/titans/assets/spine/BG_Win_Bar.skel'), type: 'skel' },
      { id: 'BG_Win_Bar_atlas', url: asset('games/titans/assets/spine/BG_Win_Bar.atlas'), type: 'atlas' },
      { id: 'Character_skel', url: asset('games/titans/assets/spine/Character.skel'), type: 'skel' },
      { id: 'Character_atlas', url: asset('games/titans/assets/spine/Character.atlas'), type: 'atlas' },
      { id: 'Free_Spin_Board_skel', url: asset('games/titans/assets/spine/Free_Spin_Board.skel'), type: 'skel' },
      { id: 'Free_Spin_Board_atlas', url: asset('games/titans/assets/spine/Free_Spin_Board.atlas'), type: 'atlas' },
      // Symbol_01-09 目錄下的 Spine 資源
      { id: 'symbol_01_skel', url: asset('games/titans/assets/spine/Symbol_01.skel'), type: 'skel' },
      { id: 'symbol_01_atlas', url: asset('games/titans/assets/spine/Symbol_01.atlas'), type: 'atlas' },
      { id: 'symbol_02_skel', url: asset('games/titans/assets/spine/Symbol_02.skel'), type: 'skel' },
      { id: 'symbol_02_atlas', url: asset('games/titans/assets/spine/Symbol_02.atlas'), type: 'atlas' },
      { id: 'symbol_03_skel', url: asset('games/titans/assets/spine/Symbol_03.skel'), type: 'skel' },
      { id: 'symbol_03_atlas', url: asset('games/titans/assets/spine/Symbol_03.atlas'), type: 'atlas' },
      { id: 'symbol_04_skel', url: asset('games/titans/assets/spine/Symbol_04.skel'), type: 'skel' },
      { id: 'symbol_04_atlas', url: asset('games/titans/assets/spine/Symbol_04.atlas'), type: 'atlas' },
      { id: 'symbol_05_skel', url: asset('games/titans/assets/spine/Symbol_05.skel'), type: 'skel' },
      { id: 'symbol_05_atlas', url: asset('games/titans/assets/spine/Symbol_05.atlas'), type: 'atlas' },
      { id: 'symbol_06_skel', url: asset('games/titans/assets/spine/Symbol_06.skel'), type: 'skel' },
      { id: 'symbol_06_atlas', url: asset('games/titans/assets/spine/Symbol_06.atlas'), type: 'atlas' },
      { id: 'symbol_07_skel', url: asset('games/titans/assets/spine/Symbol_07.skel'), type: 'skel' },
      { id: 'symbol_07_atlas', url: asset('games/titans/assets/spine/Symbol_07.atlas'), type: 'atlas' },
      { id: 'symbol_08_skel', url: asset('games/titans/assets/spine/Symbol_08.skel'), type: 'skel' },
      { id: 'symbol_08_atlas', url: asset('games/titans/assets/spine/Symbol_08.atlas'), type: 'atlas' },
      { id: 'symbol_09_skel', url: asset('games/titans/assets/spine/Symbol_09.skel'), type: 'skel' },
      { id: 'symbol_09_atlas', url: asset('games/titans/assets/spine/Symbol_09.atlas'), type: 'atlas' },
      //說明書 manual

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
    // setupTestControls(app);

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
  // 隱藏載入畫面（支援兩種 ID：loading 和 loading-screen）
  const loading = document.getElementById('loading') || document.getElementById('loading-screen');
  if (loading) {
    loading.classList.add('hidden');
  }
}).catch((error) => {
  console.error('遊戲啟動失敗:', error);
  const loading = document.getElementById('loading') || document.getElementById('loading-screen');
  if (loading) {
    loading.innerHTML = `
      <h2>❌ 載入失敗</h2>
      <p>${error.message}</p>
      <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">重新載入</button>
    `;
  }
});

