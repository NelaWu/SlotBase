import { TitansSlotApp, TitansSlotAppConfig } from './TitansSlotApp';
import { GameLoadProgress } from '@/core/GameLoader';
import '@esotericsoftware/spine-pixi-v8';

// 型別宣告：確保可以使用 import.meta.env.BASE_URL 和 BUILD_VERSION
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly BUILD_VERSION?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 根據 Vite 的 base 自動組資源路徑，並添加版本號查詢參數
const asset = (path: string) => {
  const baseUrl = `${import.meta.env.BASE_URL}${path}`;
  const version = import.meta.env.BUILD_VERSION || '1';
  // 如果 URL 已經有查詢參數，使用 &，否則使用 ?
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}v=${version}`;
};

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
      { id: 'bigwin_bgm', url: asset('games/titans/assets/audio/bigwin_bgm.mp3'), type: 'audio' }, // bigwin 背景音樂
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
      { id: 'btm_bonus_close', url: asset('games/titans/assets/audio/btm_bonus_close.mp3'), type: 'audio' }, // 免費遊戲結束時的爆炸音效
      { id: 'btm_bonus_open', url: asset('games/titans/assets/audio/btm_bonus_open.mp3'), type: 'audio' }, // 免費遊戲開始時的爆炸音效
      { id: 'btm_bonus_updrade', url: asset('games/titans/assets/audio/btm_bonus_updrade.mp3'), type: 'audio' }, // 免費遊戲升級時的爆炸音效
      { id: 'btm_coincount_stop', url: asset('games/titans/assets/audio/btm_coincount_stop.mp3'), type: 'audio' }, // 金額跑分停止時的爆炸音效
      { id: 'btm_w_win_loop', url: asset('games/titans/assets/audio/btm_w_win_loop.mp3'), type: 'audio' }, // 贏分時的音效
      { id: 'btm_w_BSM_loop', url: asset('games/titans/assets/audio/btm_w_BSM_loop.mp3'), type: 'audio' }, // BSM贏分時的音效
      { id: 'btm_w_lengendary_loop', url: asset('games/titans/assets/audio/btm_w_lengendary_loop.mp3'), type: 'audio' }, // 傳奇贏分時的音效
      { id: 'btm_w_ultra_loop', url: asset('games/titans/assets/audio/btm_w_ultra_loop.mp3'), type: 'audio' }, // 超級贏分時的音效
      { id: 'btm_w_win_talk', url: asset('games/titans/assets/audio/btm_w_win_talk.mp3'), type: 'audio' }, // 贏分時的音效
      { id: 'btm_w_ultrawin_talk', url: asset('games/titans/assets/audio/btm_w_ultrawin_talk.mp3'), type: 'audio' }, // 超級贏分時的音效
      { id: 'btm_w_superwin_talk', url: asset('games/titans/assets/audio/btm_w_superwin_talk.mp3'), type: 'audio' }, // 超級贏分時的音效
      { id: 'btm_w_megawin_talk', url: asset('games/titans/assets/audio/btm_w_megawin_talk.mp3'), type: 'audio' }, // 超級贏分時的音效
      { id: 'btm_w_legendarywin_talk', url: asset('games/titans/assets/audio/btm_w_legendarywin_talk.mp3'), type: 'audio' }, // 超級贏分時的音效
      { id: 'btm_w_bigwin_talk', url: asset('games/titans/assets/audio/btm_w_bigwin_talk.mp3'), type: 'audio' }, // 超級贏分時的音效
      { id: 'btm_w_jp_loop_2', url: asset('games/titans/assets/audio/btm_w_jp_loop_2.mp3'), type: 'audio' }, // JP贏分時的音效
      { id: 'btm_w_grand_talk', url: asset('games/titans/assets/audio/btm_w_grand_talk.mp3'), type: 'audio' }, // Grand贏分時的音效
      { id: 'btm_w_major_talk', url: asset('games/titans/assets/audio/btm_w_major_talk.mp3'), type: 'audio' }, // Major贏分時的音效
      { id: 'btm_w_minor_talk', url: asset('games/titans/assets/audio/btm_w_minor_talk.mp3'), type: 'audio' }, // Minor贏分時的音效
      { id: 'btm_w_mini_talk', url: asset('games/titans/assets/audio/btm_w_mini_talk.mp3'), type: 'audio' }, // Mini贏分時的音效
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
    enableOfflineMode: true,

    // 載入進度回調（使用 GameLoadProgress 類型）
    onLoadProgress: (progress: GameLoadProgress) => {
      updateLoadingProgress(progress);
    },
    onLoadComplete: () => {
      updateProgressBars(1, 'transform 0.5s ease-out');
      updateLoadingProgress({ percentage: 100, message: '載入完成', phase: 'completed' as any });
      setTimeout(hideLoadingScreen, 600);
    },
    onLoadError: (error: string) => {
      console.error('載入錯誤:', error);
      showError(`載入失敗: ${error}`);
    }
  };

  // 獲取 loading 頁面元素
  const loadingScreen = document.getElementById('loading-screen');
  const loadingPercentage = document.getElementById('loading-percentage');
  const loadingMessage = document.getElementById('loading-message');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressBarEffect = document.getElementById('progress-bar-effect');

  // 更新進度條動畫
  const updateProgressBars = (scaleX: number, transition?: string) => {
    [progressBarFill, progressBarEffect].forEach(el => {
      if (el) {
        if (transition) el.style.transition = transition;
        el.style.transform = `scaleX(${scaleX})`;
      }
    });
  };

  // 顯示錯誤訊息
  const showError = (message: string) => {
    if (loadingMessage) {
      loadingMessage.textContent = message;
      loadingMessage.style.color = '#e74c3c';
    }
    if (loadingPercentage) {
      loadingPercentage.textContent = '錯誤';
      loadingPercentage.style.color = '#e74c3c';
    }
  };

  // 更新載入進度
  const updateLoadingProgress = (progress: GameLoadProgress) => {
    const percentage = Math.round(progress.percentage);
    
    if (loadingPercentage) {
      loadingPercentage.textContent = `${percentage}%`;
    }
    if (loadingMessage) {
      loadingMessage.textContent = progress.message || progress.details || '正在載入資源...';
    }
    
    updateProgressBars(progress.percentage / 100);
  };

  // 隱藏載入畫面
  const hideLoadingScreen = () => {
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen?.style && (loadingScreen.style.display = 'none');
      }, 500);
    }
  };

  try {
    // 創建遊戲應用程式（載入回調已經在 config 中設置）
    const app = new TitansSlotApp(config);

    // 初始化（這會觸發資源載入，載入進度會通過 config 中的回調更新）
    await app.initialize();

    // 開始運行
    app.start();

    // 將 app 實例掛載到 window 供測試使用
    (window as any).TitansSlotApp = app;

    // 設置測試控制按鈕
    // setupTestControls(app);

  } catch (error) {
    console.error('❌ 遊戲啟動失敗:', error);
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    showError(`遊戲啟動失敗: ${errorMessage}`);
  }
}

// 啟動遊戲
startTitansSlotGame().catch((error) => {
  console.error('遊戲啟動失敗:', error);
  // 錯誤處理已在 startTitansSlotGame 中完成
});

