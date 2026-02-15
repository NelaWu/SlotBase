import { SlotMachineApp, SlotMachineAppConfig } from '@/SlotMachineApp';
import { TitansSlotModel, TitansSlotConfig, TitansSlotResult } from './models/TitansSlotModel';
import { TitansSlotView } from './views/TitansSlotView';
import { TitansSlotController } from './controllers/TitansSlotController';
import { WebSocketManager, WebSocketEvent } from '@/core/WebSocketManager';
import { SymbolMapper } from './constants/SymbolMapper';
import { MathUtil } from '@/core/MathUtil';
import { SoundManager } from './core/SoundManager';

// Titans 拉霸應用程式配置
export interface TitansSlotAppConfig extends SlotMachineAppConfig {
  TitansConfig: TitansSlotConfig;
}

// Titans 拉霸應用程式
export class TitansSlotApp extends SlotMachineApp {
  private TitansModel: TitansSlotModel;
  private TitansView: TitansSlotView;
  private TitansController: TitansSlotController;
  private wsManager?: WebSocketManager;
  private spinStartedHandler?: () => void;
  private isWaitingRespin: boolean = false; // 是否正在等待 respin
  private isFreeGameMode: boolean = false; // 是否在免費遊戲模式
  private freeGameRemainingSpins: number = 0; // 免費遊戲剩餘次數
  private lastFreeGameWinType: number = 0; // 上一盤免費遊戲的 WinType
  private betMultiple: number = 1; // 用於 BetMultiples/BetMultiple 轉換：BetUnit * Line / MoneyFractionMultiple
  private moneyFractionMultiple: number = 1; // 用於 Balance/Win 轉換
  private pendingServerBalance: number | null = null; // 暫存 1005 的 Balance（服務器金額）
  private betPurchaseCost: number = 0; // 購買免費遊戲的費用（從 11001 消息獲取）
  private freeTotalWin: number = 0; // 免費遊戲總獲勝金額
  private totalWin: number = 0; // 總獲勝金額(11011才重置) - 累積的是未乘以倍數的原始金額
  private jpOn: boolean = false;
  private multiplier:number = 1; // 倍數
  private totalMultiplier: number = 1; // 累積的總倍數（所有倍數球的乘積）
  private useMockData: boolean = false; // 是否使用假資料測試
  private mockDataIndex: number = 0; // 假資料索引
  private exitUrl: string = ''; // 離開 URL（從 URL 參數 r 獲取）
  private errorMessages: Record<string, string> = {
    'IdleForceClose': '闲置时间过久，请重新登入',
    'ConnectClose': 'Connect Close.',
    'TokenInvalid': 'Token Invalid.'
  };

  /**
   * 將服務器金額轉換為客戶端金額（用於 BetMultiples/BetMultiple）
   * 轉換公式：serverAmount * betMultiple
   * @param serverAmount 服務器金額
   * @returns 客戶端金額
   */
  private convertBetServerToClient(serverAmount: number): number {
    return MathUtil.multiply(serverAmount, this.betMultiple);
  }

  /**
   * 將客戶端金額轉換為服務器金額（用於 BetMultiples/BetMultiple）
   * 轉換公式：clientAmount / betMultiple
   * @param clientAmount 客戶端金額
   * @returns 服務器金額
   */
  private convertBetClientToServer(clientAmount: number): number {
    return MathUtil.divide(clientAmount, this.betMultiple);
  }

  /**
   * 將服務器金額轉換為客戶端金額（用於 Balance/Win）
   * 轉換公式：serverAmount / MoneyFractionMultiple
   * @param serverAmount 服務器金額
   * @returns 客戶端金額
   */
  private convertMoneyServerToClient(serverAmount: number): number {
    return MathUtil.divide(serverAmount, this.moneyFractionMultiple);
  }

  constructor(config: TitansSlotAppConfig) {
    super(config);

    // 創建 Titans 拉霸特定的組件
    this.TitansModel = new TitansSlotModel(config.TitansConfig);
    this.TitansView = new TitansSlotView(this.getPixiApp());
    this.TitansController = new TitansSlotController(this.TitansModel, this.TitansView);

    console.log('⚡ Titans 拉霸應用程式已創建');
  }

  // 重寫初始化方法
  async initialize(): Promise<void> {
    try {
      // 先初始化底層
      await super.initialize();

      // 初始化 Titans 拉霸特定組件
      await this.TitansController.initialize();

      // 將視圖添加到舞台
      this.getPixiApp().stage.addChild(this.TitansView);

      // 初始化 WebSocket 連接
      await this.initializeWebSocket();

      // 監聽 Model 的 spinStarted 事件，發送 WebSocket 訊息
      this.bindModelEvents();

      this.TitansView.setGetBetAmount(() => {
        return this.TitansModel.getCurrentBet() * this.betPurchaseCost;
      });

      // 監聽購買免費遊戲事件
      this.TitansView.getMainGame().on('buyFreeGame', () => {
        this.handleBuyFreeGame();
      });

      // 監聽免費遊戲開始事件
      this.TitansView.getMainGame().on('freeGameStarted', () => {
        this.startFreeGameMode();
      });

      // 監聽免費遊戲結束事件
      this.TitansView.on('freeGameEnded', () => {
        // 發送 11010 確認免費遊戲結束
        console.log('📤11010 免費遊戲結束，發送 11010');
        this.sendWebSocketMessage({
          code: 11010
        });
        // this.endFreeGameMode();
      });

      this.TitansView.setOnSpinAnimationComplete(() => {
        if (this.isWaitingRespin == false && this.isFreeGameMode == false) {
          console.log('📤11010 動畫表演完畢2，發送 11010');
          this.sendWebSocketMessage({
            code: 11010
          });
        }
      });

      console.log('⚡ Titans 拉霸應用程式初始化完成');
      console.log('🎮 餘額:', this.TitansModel.getBalance());
      console.log('💰 投注:', this.TitansModel.getCurrentBet());

    } catch (error) {
      console.error('❌ Titans 拉霸初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 載入遊戲配置文件
   */
  private async loadGameConfig(): Promise<{ JpOn: boolean }> {
    try {
      // 根據 Vite 的 base 自動組資源路徑，並添加版本號查詢參數
      const baseUrl = `${import.meta.env.BASE_URL}games/titans/config/game-config.json`;
      const version = import.meta.env.BUILD_VERSION || '1';
      const configPath = `${baseUrl}?v=${version}`;
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const config = await response.json();
      console.log('📋 載入遊戲配置:', config);
      return config;
    } catch (error) {
      console.warn('⚠️  無法載入遊戲配置文件，使用預設值:', error);
      // 如果載入失敗，返回預設值
      return { JpOn: false };
    }
  }

  /**
   * 初始化 WebSocket 連接
   */
  private async initializeWebSocket(): Promise<void> {
    try {
      // 載入遊戲配置文件
      const gameConfig = await this.loadGameConfig();
      this.jpOn = gameConfig.JpOn ?? false; 

      // 獲取 URL 參數
      const urlParams = new URLSearchParams(window.location.search);
      const language = urlParams.get('language') || 'en';
      const tokenParam = urlParams.get('token') || '';
      const serverParam = urlParams.get('s') || '';
      const exitUrlParam = urlParams.get('r') || '';

      // Base64 解碼函數
      const decodeBase64 = (str: string): string => {
        try {
          return atob(str);
        } catch (error) {
          console.error('Base64 解碼失敗:', error);
          return str; // 如果解碼失敗，返回原始值
        }
      };

      // 處理遊戲服務器 URL
      let _gameServer: string = '';
      let _betQuery: string = '';

      if (serverParam) {
        // 有收到從 server 來的資訊
        const decode: string = decodeBase64(serverParam);
        const parts = decode.split(',');
        _gameServer = parts[0] || '';
        _betQuery = parts[1] || '';
      } else {
        // 使用預設值
        _gameServer = '127.0.0.1:22201';
      }

      // 處理離開 URL
      let _exitUrl: string = '';
      if (exitUrlParam) {
        _exitUrl = decodeBase64(exitUrlParam);
        this.exitUrl = _exitUrl; // 保存退出 URL
      }

      // 拼接 WebSocket URL
      const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
      const url = protocol + _gameServer + '/gameserver';

      console.log('🔗 WebSocket URL:', url);
      console.log('🔗 Bet Query:', _betQuery);
      console.log('🔗 Exit URL:', _exitUrl);
      console.log('🎮 Demo Mode:', this.jpOn);

      // 創建 WebSocket 管理器實例
      this.wsManager = WebSocketManager.getInstance({
        url: url,
        // url: 'wss://7c88ea38ff35.ngrok-free.app/gameserver',
        reconnectInterval: 3000,        // 3秒重連間隔
        maxReconnectAttempts: -1,      // 無限重連
        heartbeatInterval: 5000,      // 30秒心跳（確保 > 0 才會發送心跳）
        autoReconnect: false,          // 禁用自動重連
        initMessage: {
          GameToken: tokenParam,
          GameID: 7,
          DemoOn: false,
          Lang: language.toLowerCase() // 轉換為小寫，如 'zh-cn'
        }
      });
      // 監聽連接事件
      this.wsManager.on(WebSocketEvent.CONNECT, (data) => {
        console.log('✅ WebSocket 連接成功', data);
        // 連接成功時隱藏錯誤訊息
        this.TitansView.hideErrorOverlay();
        // 恢復背景音樂
        SoundManager.getInstance().resumeBGMForReconnect();
      });

      // 監聽斷開事件
      this.wsManager.on(WebSocketEvent.DISCONNECT, (event: CloseEvent) => {
        console.warn('⚠️  WebSocket 連接斷開:', event);
        // 暫停背景音樂
        SoundManager.getInstance().pauseBGMForDisconnect();
        // 根據關閉原因判斷錯誤類型
        this.handleWebSocketDisconnect(event);
      });

      // 監聽消息事件
      this.wsManager.on(WebSocketEvent.MESSAGE, (data) => {
        this.handleWebSocketMessage(data);
      });

      // 監聽錯誤事件
      this.wsManager.on(WebSocketEvent.ERROR, (error) => {
        console.error('❌ WebSocket 錯誤:', error);
        // 顯示連接錯誤訊息
        this.showError('ConnectClose');
      });

      // 開始連接
      await this.wsManager.connect();
    } catch (error) {
      console.error('❌ WebSocket 初始化失敗:', error);
      // WebSocket 連接失敗不影響遊戲啟動，只記錄錯誤
    }
  }

  /**
   * 綁定 Model 事件監聽器
   */
  private bindModelEvents(): void {
    // 監聽旋轉開始事件，發送 WebSocket 訊息
    this.spinStartedHandler = () => {
      const betMultiple = this.TitansModel.getCurrentBet();
      const currentBalance = this.TitansModel.getBalance();
      const newBalance = MathUtil.subtract(currentBalance, betMultiple);
      this.TitansModel.setBalance(newBalance);
      if (this.isFreeGameMode) {
        console.log('🔄 免費遊戲 removeWinSymbols 完成2，自動發送下一次 11008');
        // 免費遊戲模式：發送 11008（參數與 11002 相同）
        this.sendWebSocketMessage({
          code: 11008,
          BetMultiple: this.convertBetClientToServer(betMultiple)
        });
      } else {
        // 主遊戲模式：發送 11002
        this.sendWebSocketMessage({
          code: 11002,
          BetMultiple: this.convertBetClientToServer(betMultiple)
        });
      }
    };
    this.TitansModel.on('spinStarted', this.spinStartedHandler);

    // 監聽加注按鈕點擊事件
    this.TitansView.on('plusButtonClicked', () => {
      this.handleBetIncrease();
    });

    // 監聽減注按鈕點擊事件
    this.TitansView.on('minusButtonClicked', () => {
      this.handleBetDecrease();
    });
  }

  /**
   * 處理加注按鈕點擊
   */
  private handleBetIncrease(): void {
    const betList = this.TitansModel.getBetList();
    const currentBet = this.TitansModel.getCurrentBet();

    if (betList.length === 0) {
      console.warn('⚠️ BetList 為空，無法加注');
      return;
    }

    // 找到當前 bet 在陣列中的索引
    const currentIndex = betList.indexOf(currentBet);

    if (currentIndex === -1) {
      // 如果找不到當前 bet，使用最接近的值
      const closestIndex = betList.findIndex(bet => bet > currentBet);
      if (closestIndex !== -1) {
        this.TitansModel.setBet(betList[closestIndex]);
      } else {
        // 如果沒有更大的值，使用陣列最後一個
        this.TitansModel.setBet(betList[betList.length - 1]);
      }
    } else if (currentIndex < betList.length - 1) {
      // 如果不在最後一個，加注到下一個
      const newBet = betList[currentIndex + 1];
      this.TitansModel.setBet(newBet);
    } else {
      console.log('➕ 已達最大投注:', currentBet);
    }
  }

  /**
   * 處理減注按鈕點擊
   */
  private handleBetDecrease(): void {
    const betList = this.TitansModel.getBetList();
    const currentBet = this.TitansModel.getCurrentBet();

    if (betList.length === 0) {
      console.warn('⚠️ BetList 為空，無法減注');
      return;
    }

    // 找到當前 bet 在陣列中的索引
    const currentIndex = betList.indexOf(currentBet);

    if (currentIndex === -1) {
      // 如果找不到當前 bet，從後往前找最接近且小於當前 bet 的值
      let closestIndex = -1;
      for (let i = betList.length - 1; i >= 0; i--) {
        if (betList[i] < currentBet) {
          closestIndex = i;
          break;
        }
      }
      if (closestIndex !== -1) {
        this.TitansModel.setBet(betList[closestIndex]);
      } else {
        // 如果沒有更小的值，使用陣列第一個
        this.TitansModel.setBet(betList[0]);
      }
    } else if (currentIndex > 0) {
      // 如果不在第一個，減注到上一個
      const newBet = betList[currentIndex - 1];
      this.TitansModel.setBet(newBet);
    } else {
      console.log('➖ 已達最小投注:', currentBet);
    }
  }

  /**
   * 開始免費遊戲模式
   */
  private startFreeGameMode(): void {
    console.log('🎁 開始免費遊戲模式');
    this.isFreeGameMode = true;
    this.lastFreeGameWinType = 0; // 重置上一盤的 WinType
    // 啟用自動旋轉模式
    this.TitansController.setAutoSpin(true);
    // 自動發送第一次免費遊戲 spin（使用 11008，因為已經是免費遊戲狀態）
    // const betMultiple = this.TitansModel.getCurrentBet();
    // this.sendWebSocketMessage({
    //   code: 11008,
    //   BetMultiple: this.convertBetClientToServer(betMultiple)
    // });
  }

  /**
   * 處理購買免費遊戲請求
   */
  private handleBuyFreeGame(): void {
    console.log('🛒 購買免費遊戲，發送 11014');
    const betMultiple = this.TitansModel.getCurrentBet();
    this.sendWebSocketMessage({
      code: 11014,
      BetMultiple: this.convertBetClientToServer(betMultiple)
    });
  }

  /**
   * 處理購買免費遊戲結果 (Code 11015)
   * 展示盤面，動畫完成後檢查是否中獎免費遊戲
   */
  private handleBuyFreeGameSpinResult(data: any): void {
    if (!data.SpinInfo) {
      console.warn('⚠️  購買免費遊戲結果缺少 SpinInfo');
      return;
    }

    const spinInfo = data.SpinInfo;
    const serverReels: number[][] | null = spinInfo.SymbolResult;

    if (!serverReels || !Array.isArray(serverReels)) {
      console.warn('⚠️  無效的購買免費遊戲牌面結果:', serverReels);
      return;
    }

    const reels: number[][] = SymbolMapper.serverToClientArray(serverReels);
    const totalWin = this.convertMoneyServerToClient(spinInfo.Win || 0);
    const multiplier = spinInfo.Multiplier || 1;

    const winLineInfos = (spinInfo.WinLineInfos || []).map((info: any) => ({
      ...info,
      SymbolID: SymbolMapper.serverToClient(info.SymbolID || info.SymbolId || 0),
      Win: this.convertMoneyServerToClient(info.Win || 0),
      WinOrg: this.convertMoneyServerToClient(info.WinOrg || 0),
    }));

    const winLines: number[] = [];
    if (spinInfo.WinLineInfos && Array.isArray(spinInfo.WinLineInfos)) {
      winLines.push(...spinInfo.WinLineInfos.map((info: any) => info.LineNo || info.LineIndex || 0));
    }

    const result: TitansSlotResult = {
      reels,
      winLines,
      totalWin,
      multiplier,
      bonusTriggered: false,
      winLineInfos,
      serverSpinInfo: spinInfo as any,
      gameStateType: spinInfo.GameStateType,
      gameState: spinInfo.GameState,
      winType: spinInfo.WinType,
      screenOrg: spinInfo.ScreenOrg,
      screenOutput: spinInfo.ScreenOutput,
      fgTotalTimes: spinInfo.FGTotalTimes,
      fgCurrentTimes: spinInfo.FGCurrentTimes,
      fgRemainTimes: spinInfo.FGRemainTimes,
      fgMaxFlag: spinInfo.FGMaxFlag,
      rndNum: spinInfo.RndNum,
      extraData: spinInfo.ExtraData,
      stage: spinInfo.Stage,
      collection: spinInfo.Collection,
      demoModeRound: spinInfo.DemoModeRound
    };

    // 更新餘額
    if (result.totalWin > 0) {
      this.TitansModel['setBalance'](this.TitansModel.getBalance() + result.totalWin);
    }
    this.multiplier = result.multiplier || 1;

    // 展示盤面（清空牌面並顯示新結果）
    const fastDrop = this.TitansController?.getTurboEnabled() || false;
    this.TitansModel.setSpinResult(result);

    // 等待所有動畫完成後，檢查是否中獎免費遊戲
    // 使用一次性監聽器，在動畫完成後檢查
    const checkFreeGameWin = () => {
      // 檢查是否中獎免費遊戲：FGTotalTimes == FGRemainTimes
      if (spinInfo.FGTotalTimes === spinInfo.FGRemainTimes && spinInfo.FGTotalTimes > 0) {
        console.log('🎁 中獎免費遊戲！FGTotalTimes:', spinInfo.FGTotalTimes, 'FGRemainTimes:', spinInfo.FGRemainTimes);
        // 切換場景並啟動自動開始
        this.TitansView.getMainGame().startFreeGame();
      } else {
        console.log('❌ 未中獎免費遊戲，FGTotalTimes:', spinInfo.FGTotalTimes, 'FGRemainTimes:', spinInfo.FGRemainTimes);
      }
    };

    // 監聽 Controller 的動畫完成（通過 processWinAndCascade 完成）
    // 如果沒有獲勝，需要監聽 dropComplete；如果有獲勝，需要監聽 removeWinComplete
    const hasWin = result.winLineInfos && result.winLineInfos.length > 0;

    // 臨時設置 isFreeGameMode 為 true，防止全局的 setOnSpinAnimationComplete 發送 11010
    const wasFreeGameMode = this.isFreeGameMode;
    this.isFreeGameMode = true;

    if (hasWin) {
      // 有獲勝，等待 removeWinSymbols 完成
      this.TitansView.getMainGame().wheel.setOnRemoveWinComplete(() => {
        // 恢復原來的狀態
        this.isFreeGameMode = wasFreeGameMode;
        checkFreeGameWin();
      });
    } else {
      // 沒有獲勝，等待 dropComplete（通過 setOnSpinAnimationComplete）
      // 由於 isFreeGameMode 已設置為 true，不會發送 11010
      this.TitansView.setOnSpinAnimationComplete(() => {
        // 恢復原來的狀態
        this.isFreeGameMode = wasFreeGameMode;
        checkFreeGameWin();
      });
    }
  }

  /**
   * 結束免費遊戲模式
   */
  private endFreeGameMode(): void {
    console.log('🎁 結束免費遊戲模式');
    this.isFreeGameMode = false;
    this.freeGameRemainingSpins = 0;
    this.lastFreeGameWinType = 0; // 重置上一盤的 WinType
    this.freeTotalWin = 0;
    // 切換回主遊戲模式畫面
    this.TitansView.getMainGame().endFreeGame();
    this.TitansView.autoButtonEnabled(false);
  }

  /**
   * 處理免費遊戲旋轉結果 (Code 11015)
   */
  private handleFreeGameSpinResult(data: any): void {
    // 處理邏輯與 11003 類似，但不需要扣除投注金額
    if (!data.SpinInfo) {
      console.warn('⚠️  免費遊戲旋轉結果缺少 SpinInfo');
      return;
    }

    const spinInfo = data.SpinInfo;
    const serverReels: number[][] | null = spinInfo.SymbolResult;

    if (!serverReels || !Array.isArray(serverReels)) {
      console.warn('⚠️  無效的免費遊戲牌面結果:', serverReels);
      return;
    }

    const reels: number[][] = SymbolMapper.serverToClientArray(serverReels);
    const totalWin = this.convertMoneyServerToClient(spinInfo.Win || 0);
    const multiplier = spinInfo.Multiplier || 1;

    const winLineInfos = (spinInfo.WinLineInfos || []).map((info: any) => ({
      ...info,
      SymbolID: SymbolMapper.serverToClient(info.SymbolID || info.SymbolId || 0),
      Win: this.convertMoneyServerToClient(info.Win || 0),
      WinOrg: this.convertMoneyServerToClient(info.WinOrg || 0),
    }));

    const winLines: number[] = [];
    if (spinInfo.WinLineInfos && Array.isArray(spinInfo.WinLineInfos)) {
      winLines.push(...spinInfo.WinLineInfos.map((info: any) => info.LineNo || info.LineIndex || 0));
    }

    const result: TitansSlotResult = {
      reels,
      winLines,
      totalWin,
      multiplier,
      bonusTriggered: false,
      winLineInfos,
      serverSpinInfo: spinInfo as any,
      gameStateType: spinInfo.GameStateType,
      gameState: spinInfo.GameState,
      winType: spinInfo.WinType,
      screenOrg: spinInfo.ScreenOrg,
      screenOutput: spinInfo.ScreenOutput,
      fgTotalTimes: spinInfo.FGTotalTimes,
      fgCurrentTimes: spinInfo.FGCurrentTimes,
      fgRemainTimes: spinInfo.FGRemainTimes,
      fgMaxFlag: spinInfo.FGMaxFlag,
      rndNum: spinInfo.RndNum,
      extraData: spinInfo.ExtraData,
      stage: spinInfo.Stage,
      collection: spinInfo.Collection,
      demoModeRound: spinInfo.DemoModeRound
    };

    // 更新免費遊戲剩餘次數
    this.freeGameRemainingSpins = spinInfo.FGRemainTimes || 0;
    this.TitansView.updateFreeSpins(this.freeGameRemainingSpins);

    // 檢查上一盤的 WinType，如果上一盤 WinType == 1，則走 respin 流程（不清空牌面）
    const winType = spinInfo.WinType;
    const shouldRespin = this.lastFreeGameWinType === 1;

    if (shouldRespin) {
      console.log('🔄 上一盤 WinType == 1，免費遊戲走 respin 流程（不清空牌面）');

      // 先更新餘額（但不觸發 spinCompleted 事件）
      if (result.totalWin > 0) {
        this.TitansModel['setBalance'](this.TitansModel.getBalance() + result.totalWin);
      }

      // 更新 Model 狀態（但不觸發 spinCompleted 事件）
      this.TitansModel['stateData'].lastResult = result;
      this.TitansModel['stateData'].isSpinning = false;

      // 使用 fillNewSymbols 補空白（會觸發掉落動畫）
      const fastDrop = this.TitansController?.getTurboEnabled() || false;
      this.TitansView.getMainGame().wheel.fillNewSymbols(reels, async () => {
        console.log('🔄 免費遊戲 fillNewSymbols 完成，處理 respin 獲勝檢查（不清空盤面）');

        // 構建完整的 result 對象（與 handleSpinResult 中的處理一致）
        const respinSpinInfo = data.SpinInfo;
        const respinServerReels: number[][] | null = respinSpinInfo.SymbolResult;

        if (!respinServerReels || !Array.isArray(respinServerReels)) {
          console.warn('⚠️  免費遊戲 respin 無效的牌面結果:', respinServerReels);
          return;
        }

        const respinReels: number[][] = SymbolMapper.serverToClientArray(respinServerReels);

        // 提取獲勝線編號
        const respinWinLines: number[] = [];
        if (respinSpinInfo.WinLineInfos && Array.isArray(respinSpinInfo.WinLineInfos)) {
          respinWinLines.push(...respinSpinInfo.WinLineInfos.map((info: any) => info.LineNo || info.LineIndex || 0));
        }

        // 累計 totalWin（與 handleSpinResult 一致）
        // 累積未乘以倍數的原始 Win（服務器返回的 Win 可能已經包含倍數，需要除以當前倍數）
        const respinMultiplier = respinSpinInfo.Multiplier || 1;
        const respinBaseWin = respinMultiplier > 1 ? (respinSpinInfo.Win / respinMultiplier) : respinSpinInfo.Win;
        this.totalWin += respinBaseWin;
        // 更新總倍數（累積所有倍數球的乘積）
        this.totalMultiplier *= respinMultiplier;
        const respinTotalWin = this.convertMoneyServerToClient(this.totalWin || 0);

        // 提取詳細的獲勝連線信息並轉換符號 ID 和金額
        const respinWinLineInfos = (respinSpinInfo.WinLineInfos || []).map((info: any) => ({
          ...info,
          SymbolID: SymbolMapper.serverToClient(info.SymbolID || info.SymbolId || 0),
          Win: this.convertMoneyServerToClient(info.Win || 0),
          WinOrg: this.convertMoneyServerToClient(info.WinOrg || 0),
        }));

        const respinResult: TitansSlotResult = {
          reels: respinReels,
          winLines: respinWinLines,
          totalWin: respinTotalWin,
          multiplier: respinSpinInfo.Multiplier || 1,
          bonusTriggered: false,
          winLineInfos: respinWinLineInfos,
          serverSpinInfo: respinSpinInfo as any,
          gameStateType: respinSpinInfo.GameStateType,
          gameState: respinSpinInfo.GameState,
          winType: respinSpinInfo.WinType,
          screenOrg: respinSpinInfo.ScreenOrg,
          screenOutput: respinSpinInfo.ScreenOutput,
          fgTotalTimes: respinSpinInfo.FGTotalTimes,
          fgCurrentTimes: respinSpinInfo.FGCurrentTimes,
          fgRemainTimes: respinSpinInfo.FGRemainTimes,
          fgMaxFlag: respinSpinInfo.FGMaxFlag,
          rndNum: respinSpinInfo.RndNum,
          extraData: respinSpinInfo.ExtraData,
          stage: respinSpinInfo.Stage,
          collection: respinSpinInfo.Collection,
          demoModeRound: respinSpinInfo.DemoModeRound,
          WaitNGRespin: data.WaitNGRespin
        };

        // 檢查是否有獲勝符號（使用 respinResult 的 winLineInfos）
        const respinHasWin = respinResult.winLineInfos && respinResult.winLineInfos.length > 0;

        // 如果 WaitNGRespin=true，設置 removeWinSymbols 完成後的回調，用於發送下一次 11008
        // 注意：必須在 handleRespinResult 之前設置，因為 handleRespinResult 會調用 removeWinSymbolsAndWait
        if (data.WaitNGRespin === true) {
          console.log('🔄 免費遊戲 WaitNGRespin=true，設置 removeWinSymbols 完成後的回調');
          this.TitansView.getMainGame().wheel.setOnRemoveWinComplete(() => {
            console.log('🔄 免費遊戲 removeWinSymbols 完成，自動發送 respin 請求（11008）');
            // 記錄當前盤的 WinType，供下一盤使用
            this.lastFreeGameWinType = respinSpinInfo.WinType;
            // 根據 FGRemainTimes 決定下一步
            if (this.freeGameRemainingSpins === 0 && data.WaitNGRespin === false) {
              // 免費遊戲結束，發送 11010
              console.log('📤11010 免費遊戲結束，發送 11010 1');
              this.sendWebSocketMessage({
                code: 11010
              });
              // this.endFreeGameMode();
            } else {
              // 還在免費遊戲中，自動發送下一次 11008
              console.log(`🔄 免費遊戲繼續（剩餘 ${this.freeGameRemainingSpins} 次），自動發送下一次 11008`);
              const betMultiple = this.TitansModel.getCurrentBet();
              console.log('🔄 免費遊戲 removeWinSymbols 完成3，自動發送下一次 11008');
              this.sendWebSocketMessage({
                code: 11008,
                BetMultiple: this.convertBetClientToServer(betMultiple)
              });
            }
          });
        }

        // 直接調用 Controller 的 respin 處理方法，不觸發 spinCompleted 事件
        await this.TitansController.handleRespinResult({ ...data, result: respinResult });

        // 如果 WaitNGRespin=false，等待所有動畫完成後再決定下一步
        if (data.WaitNGRespin !== true) {
          if (respinHasWin) {
            // 有獲勝符號，等待 removeWinSymbols 完成後再決定下一步
            await new Promise<void>((resolve) => {
              this.TitansView.getMainGame().wheel.setOnRemoveWinComplete(() => {
                resolve();
              });
            });
          }

          // 記錄當前盤的 WinType，供下一盤使用
          this.lastFreeGameWinType = respinSpinInfo.WinType;

          // 所有動畫完成後，根據 FGRemainTimes 決定下一步
          if (this.freeGameRemainingSpins === 0) {
            // 免費遊戲結束，發送 11010
            console.log('📤11010🎁 免費遊戲結束，發送 11010 2');
            this.sendWebSocketMessage({
              code: 11010
            });
            // this.endFreeGameMode();
          } else {
            // // 還在免費遊戲中，自動發送下一次 11008
            // console.log(`🔄 免費遊戲繼續（剩餘 ${this.freeGameRemainingSpins} 次），自動發送下一次 11008`);
            // const betMultiple = this.TitansModel.getCurrentBet();
            // console.log('🔄 免費遊戲 removeWinSymbols 完成4，自動發送下一次 11008');
            // this.sendWebSocketMessage({
            //   code: 11008,
            //   BetMultiple: this.convertBetClientToServer(betMultiple)
            // });
          }
        }
      }, fastDrop);

      return; // respin 時直接返回
    }

    // 設置結果到 Model（會自動更新餘額，會觸發清空牌面）
    this.TitansModel.setSpinResult(result);

    // 記錄當前盤的 WinType，供下一盤使用
    this.lastFreeGameWinType = winType;

    // 檢查免費遊戲是否結束
    if (this.freeGameRemainingSpins <= 0) {
      console.log('🎁 免費遊戲次數已用完，結束免費遊戲模式');
      // 免費遊戲結束，切換回主遊戲模式
      // this.endFreeGameMode();
    this.TitansController.setAutoSpin(false);
    } else {
      // 還有剩餘次數，等待動畫完成後自動發送下一次 11008（參數與 11002 相同）
      this.TitansView.getMainGame().wheel.setOnRemoveWinComplete(() => {
        console.log('🔄 免費遊戲 removeWinSymbols 完成1，自動發送下一次 11008');
        const betMultiple = this.TitansModel.getCurrentBet();
        this.sendWebSocketMessage({
          code: 11008,
          BetMultiple: this.convertBetClientToServer(betMultiple)
        });
      });
    }
  }

  /**
   * 處理旋轉結果 (Code 11003)
   */
  private handleSpinResult(data: any): void {
    if (!data.SpinInfo) {
      console.warn('⚠️  旋轉結果缺少 SpinInfo');
      return;
    }

    const spinInfo = data.SpinInfo;

    // 提取牌面結果 (SymbolResult) 並轉換符號 ID
    const serverReels: number[][] | null = spinInfo.SymbolResult;

    // 檢查 SymbolResult 是否為 null 或 undefined
    if (!serverReels || !Array.isArray(serverReels)) {
      console.warn('⚠️  無效的牌面結果:', serverReels, 'SpinInfo:', spinInfo);
      return;
    }

    const reels: number[][] = SymbolMapper.serverToClientArray(serverReels);

    // 提取獲勝線編號
    const winLines: number[] = [];
    if (spinInfo.WinLineInfos && Array.isArray(spinInfo.WinLineInfos)) {
      winLines.push(...spinInfo.WinLineInfos.map((info: any) => info.LineNo || info.LineIndex || 0));
    }

    // 累積未乘以倍數的原始 Win（服務器返回的 Win 可能已經包含倍數，需要除以當前倍數）
    const currentMultiplier = spinInfo.Multiplier || 1;
    const baseWin = currentMultiplier > 1 ? (spinInfo.Win / currentMultiplier) : spinInfo.Win;
    this.totalWin += baseWin;
    this.multiplier = currentMultiplier;
    // 更新總倍數（累積所有倍數球的乘積）
    this.totalMultiplier *= currentMultiplier;
    // 提取獲勝金額並轉換為客戶端金額（只除以 MoneyFractionMultiple）
    const totalWin = this.convertMoneyServerToClient(this.totalWin || 0);

    // 提取倍數
    const multiplier = spinInfo.Multiplier || 1;

    // 提取詳細的獲勝連線信息並轉換符號 ID 和金額
    const winLineInfos = (spinInfo.WinLineInfos || []).map((info: any) => ({
      ...info,
      SymbolID: SymbolMapper.serverToClient(info.SymbolID || info.SymbolId || 0),
      // 轉換金額字段為客戶端金額（只除以 MoneyFractionMultiple）
      Win: this.convertMoneyServerToClient(info.Win || 0),
      WinOrg: this.convertMoneyServerToClient(info.WinOrg || 0),
      // WinPosition 中的符號 ID 如果需要轉換，可以在這裡處理
    }));

    // 判斷是否觸發 Bonus
    let bonusFeature: string | undefined;
    let freeSpins: number | undefined;
    let jackpotWon = false;

    // 根據 GameState 或其他字段判斷 Bonus
    if (spinInfo.GameState === 1 || spinInfo.GameStateType === 1) {
      // 可能需要根據實際業務邏輯調整
      if (spinInfo.FGRemainTimes > 0) {
        bonusFeature = 'freeSpins';
        freeSpins = spinInfo.FGRemainTimes;
      }
    }

    // 構建結果對象
    const result: TitansSlotResult = {
      reels,
      winLines,
      totalWin,
      multiplier,
      bonusTriggered: bonusFeature !== undefined,
      bonusFeature,
      freeSpins,
      jackpotWon,
      winLineInfos, // 包含詳細的獲勝連線信息
      // 服務器原始數據
      serverSpinInfo: spinInfo as any, // 完整的服務器 SpinInfo 數據
      gameStateType: spinInfo.GameStateType,
      gameState: spinInfo.GameState,
      winType: spinInfo.WinType,
      screenOrg: spinInfo.ScreenOrg,
      screenOutput: spinInfo.ScreenOutput,
      fgTotalTimes: spinInfo.FGTotalTimes,
      fgCurrentTimes: spinInfo.FGCurrentTimes,
      fgRemainTimes: spinInfo.FGRemainTimes,
      fgMaxFlag: spinInfo.FGMaxFlag,
      rndNum: spinInfo.RndNum,
      extraData: spinInfo.ExtraData,
      stage: spinInfo.Stage,
      collection: spinInfo.Collection,
      demoModeRound: spinInfo.DemoModeRound
    };

    // 檢查是否正在等待 respin，如果是則用新資料補空白（不清空牌面）
    if (this.isWaitingRespin) {
      console.log('🔄 收到 respin 資料，補空白處（不清空牌面）');

      // // 先更新餘額（但不觸發 spinCompleted 事件）
      // if (result.totalWin > 0) {
      //   this.TitansModel['setBalance'](this.TitansModel.getBalance() + result.totalWin);
      // }

      // 更新 Model 狀態（但不觸發 spinCompleted 事件）
      this.TitansModel['stateData'].lastResult = result;
      this.TitansModel['stateData'].isSpinning = false;

      // 使用 fillNewSymbols 補空白（會觸發掉落動畫）
      // 等待掉落動畫完成後，直接調用 Controller 的 respin 處理方法（不清空盤面）
      const fastDrop = this.TitansController?.getTurboEnabled() || false;
      this.TitansView.getMainGame().wheel.fillNewSymbols(reels, async () => {
        console.log('🔄 fillNewSymbols 完成，處理 respin 獲勝檢查（不清空盤面）');

        // 如果 WaitNGRespin=true，設置 removeWinSymbols 完成後的回調，用於發送下一次 11002
        // 注意：必須在 handleRespinResult 之前設置，因為 handleRespinResult 會調用 removeWinSymbolsAndWait
        if (data.WaitNGRespin === true) {
          console.log('🔄 WaitNGRespin=true，設置 removeWinSymbols 完成後的回調');
          this.TitansView.getMainGame().wheel.setOnRemoveWinComplete(() => {
            console.log('🔄 removeWinSymbols 完成，自動發送 respin 請求（不清空牌面）');
            // 自動發送 spin 請求（使用相同的投注金額）
            const betMultiple = this.TitansModel.getCurrentBet();
            this.sendWebSocketMessage({
              code: 11002,
              BetMultiple: this.convertBetClientToServer(betMultiple)
            });
          });
        }

        // 構建完整的 result 對象（與 handleSpinResult 中的處理一致）
        const respinSpinInfo = data.SpinInfo;
        const respinServerReels: number[][] | null = respinSpinInfo.SymbolResult;

        if (!respinServerReels || !Array.isArray(respinServerReels)) {
          console.warn('⚠️  respin 無效的牌面結果:', respinServerReels);
          return;
        }

        const respinReels: number[][] = SymbolMapper.serverToClientArray(respinServerReels);
        const respinTotalWin = this.convertMoneyServerToClient(this.totalWin || 0);
        const respinWinLineInfos = (respinSpinInfo.WinLineInfos || []).map((info: any) => ({
          ...info,
          SymbolID: SymbolMapper.serverToClient(info.SymbolID || info.SymbolId || 0),
          Win: this.convertMoneyServerToClient(info.Win || 0),
          WinOrg: this.convertMoneyServerToClient(info.WinOrg || 0),
        }));

        const respinResult: TitansSlotResult = {
          reels: respinReels,
          winLines: respinWinLineInfos.map((info: any) => info.LineNo || 0),
          totalWin: respinTotalWin,
          multiplier: respinSpinInfo.Multiplier || 1,
          bonusTriggered: false,
          winLineInfos: respinWinLineInfos,
          serverSpinInfo: respinSpinInfo as any,
          gameStateType: respinSpinInfo.GameStateType,
          gameState: respinSpinInfo.GameState,
          winType: respinSpinInfo.WinType,
          screenOrg: respinSpinInfo.ScreenOrg,
          screenOutput: respinSpinInfo.ScreenOutput,
          fgTotalTimes: respinSpinInfo.FGTotalTimes,
          fgCurrentTimes: respinSpinInfo.FGCurrentTimes,
          fgRemainTimes: respinSpinInfo.FGRemainTimes,
          fgMaxFlag: respinSpinInfo.FGMaxFlag,
          rndNum: respinSpinInfo.RndNum,
          extraData: respinSpinInfo.ExtraData,
          stage: respinSpinInfo.Stage,
          collection: respinSpinInfo.Collection,
          demoModeRound: respinSpinInfo.DemoModeRound,
          WaitNGRespin: data.WaitNGRespin
        };

        // 直接調用 Controller 的 respin 處理方法，不觸發 spinCompleted 事件
        // 這樣可以避免 stopSpinAnimation 清空盤面的問題
        await this.TitansController.handleRespinResult({ ...data, result: respinResult });


        // 根據 WaitNGRespin 狀態決定是否保持 isWaitingRespin
        if (data.WaitNGRespin === true) {
          console.log('🔄 WaitNGRespin=true，保持 isWaitingRespin=true，等待收到 11011 後再發送下一次 11002');
          // 保持 isWaitingRespin = true，等待收到 11011 後再發送 11002
          this.isWaitingRespin = true;
        } else {
          console.log('✅ WaitNGRespin=false，respin 流程結束，重置 isWaitingRespin=false');
          this.isWaitingRespin = false;
          // 動畫表演完畢後，發送 11010
          console.log('📤11010 respin 動畫表演完畢1，發送 11010',this.convertMoneyServerToClient(this.totalWin)*this.totalMultiplier, this.TitansModel.getCurrentBet());
          this.sendWebSocketMessage({
            code: 11010
          });
        }
      }, fastDrop);

      return; // respin 時直接返回，不執行後續的 WaitNGRespin 檢查
    }

    // 設置結果到 Model（Model 會自動處理餘額更新）
    this.TitansModel.setSpinResult(result);

    // 檢查 WaitNGRespin 參數
    if (data.WaitNGRespin === true) {
      console.log('🔄 WaitNGRespin 為 true，等待 removeWinSymbols 完成後自動 spin');
      this.isWaitingRespin = true;

      // 設置回調，當 removeWinSymbols 完成後自動發送 spin 請求
      this.TitansView.getMainGame().wheel.setOnRemoveWinComplete(() => {
        console.log('🔄 removeWinSymbols 完成，自動發送 respin 請求（不清空牌面）');
        // 自動發送 spin 請求（使用相同的投注金額）
        const betMultiple = this.TitansModel.getCurrentBet();
        this.sendWebSocketMessage({ 
          code: 11002,
          BetMultiple: this.convertBetClientToServer(betMultiple)
        });
      });
    } else {
      // 重置狀態
      this.isWaitingRespin = false;
    }
  }

  /**
   * 處理 WebSocket 斷開連接
   * @param event CloseEvent 關閉事件
   */
  private handleWebSocketDisconnect(event: CloseEvent): void {
    // 禁用自動重連（確保不會重連）
    if (this.wsManager) {
      this.wsManager.disconnect();
    }

    // 根據關閉原因判斷錯誤類型
    let errorType = 'ConnectClose'; // 預設錯誤類型
    
    // 檢查關閉原因（reason）是否包含錯誤類型
    if (event.reason) {
      const reason = event.reason.trim();
      if (reason === 'IdleForceClose' || reason.includes('IdleForceClose')) {
        errorType = 'IdleForceClose';
      } else if (reason === 'TokenInvalid' || reason.includes('TokenInvalid')) {
        errorType = 'TokenInvalid';
      } else if (reason === 'ConnectClose' || reason.includes('ConnectClose')) {
        errorType = 'ConnectClose';
      }
    }

    // 顯示錯誤訊息
    this.showError(errorType);
  }

  /**
   * 顯示錯誤訊息
   * @param errorType 錯誤類型
   */
  private showError(errorType: string): void {
    const message = this.errorMessages[errorType] || this.errorMessages['ConnectClose'];
    console.error(`❌ WebSocket 錯誤: ${errorType} - ${message}`);
    this.TitansView.showErrorOverlay(message, this.exitUrl);
  }

  /**
   * 處理 WebSocket 消息
   */
  private async handleWebSocketMessage(data: any): Promise<void> {
    // 檢查是否有錯誤代碼（負數或特定的錯誤代碼）
    if (typeof data === 'object' && typeof data.Code === 'number') {
      // 檢查是否為錯誤消息（根據實際協議調整）
      if (data.Code < 0 && data.Code !== -2) { // -2 是心跳回應
        // 根據錯誤代碼判斷錯誤類型
        if (data.ErrorType) {
          this.showError(data.ErrorType);
          return;
        }
      }
    }
    // 根據 Code 處理不同的消息類型
    if (typeof data === 'object' && typeof data.Code === 'number') {
      switch (data.Code) {
        case 1005:
          if (data.Balance !== undefined && data.Balance > 0) {
            this.pendingServerBalance = data.Balance;
          }
          break;
        case 11001:
          console.log('🔐 收到投注設定:', data);
          if (data.BetPurchaseCost !== undefined) {
            this.betPurchaseCost = data.BetPurchaseCost;
          }
          // this.jpOn = data.JPOn;
          // 設置 BetMultiples 到 betList
          if (data.BetMultiples && Array.isArray(data.BetMultiples) && data.BetMultiples.length > 0) {
            // 獲取換算參數
            const BetUnit = data.BetUnit || 1;
            const Line = data.Line || 1;
            const MoneyFractionMultiple = data.MoneyFractionMultiple || 1;

            // 設置轉換倍數
            this.moneyFractionMultiple = MoneyFractionMultiple; // 用於 Balance/Win 轉換
            this.betMultiple = BetUnit * Line / MoneyFractionMultiple; // 用於 BetMultiples/BetMultiple 轉換

            // 如果有暫存的 Balance，現在轉換並設置（只除以 MoneyFractionMultiple）
            if (this.pendingServerBalance !== null) {
              const clientBalance = this.convertMoneyServerToClient(this.pendingServerBalance);
              this.TitansModel.setBalance(clientBalance);
              console.log('💰 設置客戶端餘額:', clientBalance, '(服務器餘額:', this.pendingServerBalance, ')');
              this.pendingServerBalance = null; // 清除暫存
            }

            // 對 BetMultiples 進行換算：BetMultiples * betMultiple (BetUnit * Line / MoneyFractionMultiple)
            const convertedBetMultiples = data.BetMultiples.map((betMultiple: number) => {
              return this.convertBetServerToClient(betMultiple);
            });

            this.TitansModel.setBetList(convertedBetMultiples);
            // 預設下注金額為陣列第一個元素（換算後）
            const defaultBet = convertedBetMultiples[0];
            this.TitansModel.setBet(defaultBet);
            // 呼叫 MainGame.createBetPanel，並傳入回調函數以更新 Model 的 currentBet
            this.TitansView.getMainGame().createBetPanel(
              convertedBetMultiples,
              (betAmount: number) => {
                // 當用戶選擇投注金額時，更新 Model
                this.TitansModel.setBet(betAmount);
              }
            );
          }
          break;

        case 11003:
          console.log('🎰 收到旋轉結果:', data);

          // 假資料測試（按 F12 控制台輸入：window.TitansSlotApp.setUseMockData(true) 啟用）
          if (this.useMockData) {
            const mockData = this.getMockData();
            if (mockData) {
              console.log('🧪 使用假資料測試:', mockData);
              data = mockData;
            }
          }

          // 更新局號
          if (data.RoundCode) {
            this.TitansView.getMainGame().updateRoundCode(data.RoundCode);
          }

          // 免費遊戲的判斷 to do 測試
          if(data.SpinInfo.FGRemainTimes>0){
            console.log('中免費遊戲啦啦啦:', data);
            this.handleBuyFreeGameSpinResult(data);
          }else{
            this.handleSpinResult(data);
          }
          break;
        case 11009:
          console.log('🎰 收到免費遊戲旋轉結果:', data);
          data.WaitNGRespin = data.SpinInfo.WinType === 1;
          this.handleFreeGameSpinResult(data);
          this.freeTotalWin += this.convertMoneyServerToClient(data.SpinInfo.Win)*this.multiplier;
          break;

        case 11015:
          console.log('🎰 收到購買免費遊戲結果 (11015):', data);
          // 處理 11015 結果，展示盤面，動畫完成後檢查是否中獎免費遊戲
          this.handleBuyFreeGameSpinResult(data);
          break;

        case 11011:
          this.TitansView.getMainGame().showBGWinBar(false);
          this.TitansView.setSpinButtonEnabled(true);

          // 使用累積的總倍數（所有倍數球的乘積）乘以累積的總 Win
          const totalWinAmount = this.convertMoneyServerToClient(this.totalWin) * this.totalMultiplier;
          const isBigWin = totalWinAmount / this.TitansModel.getCurrentBet() > 20;
          if (isBigWin && this.isFreeGameMode == false) {
            // 显示 BigWin 动画，等待动画完成后再执行后续代码
            await this.TitansView.showBigWinAsync(totalWinAmount, this.TitansModel.getCurrentBet());
          }
          else if (this.isFreeGameMode == true) {
            // 免费游戏模式：显示 FreeEnd 动画，等待动画完成后再执行后续代码
            await this.TitansView.showFreeEndAsync(this.freeTotalWin);
            this.endFreeGameMode();
          }

          // BigWin 动画完成后（或不是 BigWin）执行后续代码
          this.totalWin = 0;
          this.totalMultiplier = 1; // 重置總倍數
          if (data.Balance !== null && data.Balance !== undefined) {
            const clientBalance = this.convertMoneyServerToClient(data.Balance);
            this.TitansModel.setBalance(clientBalance);
            this.TitansView.updateWinAmount(0);
          }

          // 自動模式且非免費遊戲模式：收到 11011 後觸發下一次 spin
          if (this.TitansController.getAutoSpinEnabled() && !this.isFreeGameMode) {
            console.log('🔄 自動模式（非免費遊戲）：收到 11011，觸發下一次 spin');
            // 稍微延遲後自動旋轉，確保動畫完全結束
            setTimeout(() => {
              this.TitansModel.startSpin();
            }, 0);
          }
          break;

        case -2:
          // 心跳回應（已在 WebSocketManager 中處理，不會到達這裡）
          break;
        
        case 1013:
          if (this.jpOn == true) {
            const convertedJPViews = (data.JPViews || []).map((jpView: any) => ({
              ...jpView,
              Value: this.convertMoneyServerToClient(jpView.Value || 0)
            }));
            this.TitansView.updateJpInfo(convertedJPViews);
          }
          break;
        default:
          console.log('📨 收到其他消息 Code:', data.Code, data);
      }
    }
  }

  // 重寫更新方法
  protected update(deltaTime: number): void {
    super.update(deltaTime);
    this.TitansController.update(deltaTime);
  }

  // 重寫開始方法
  override start(): void {
    super.start();
    console.log('🎮 Titans 拉霸遊戲開始！');
  }

  // 重寫停止方法
  override stop(): void {
    super.stop();
    console.log('⏸️  Titans 拉霸遊戲暫停');
  }

  // 重寫銷毀方法
  override destroy(): void {
    console.log('🗑️  銷毀 Titans 拉霸組件...');

    // 移除 Model 事件監聽器
    if (this.spinStartedHandler) {
      this.TitansModel.off('spinStarted', this.spinStartedHandler);
      this.spinStartedHandler = undefined;
    }

    if (this.wsManager) {
      this.wsManager.removeAllListeners();
      // 不調用 disconnect() - 讓後端決定何時關閉連接
      this.wsManager = undefined;
    }

    this.TitansController.destroy();
    super.destroy();
    console.log('✅ Titans 拉霸應用程式已銷毀');
  }

  // ==================== 公開 API ====================

  // 重寫旋轉方法
  override spin(): void {
    this.TitansController.spin();
  }

  // 重寫設置投注方法
  override setBet(amount: number): void {
    this.TitansController.setBet(amount);
  }

  // 重寫獲取餘額方法
  override getBalance(): number {
    return this.TitansController.getBalance();
  }

  // ==================== Titans 拉霸特定方法 ====================

  // 觸發 Bonus 功能
  public triggerBonus(bonusType: string): void {
    this.TitansModel.triggerBonusFeature(bonusType);
  }

  // 獲取免費旋轉次數
  public getFreeSpinsRemaining(): number {
    return this.TitansModel.getFreeSpinsRemaining();
  }

  // 檢查是否在免費旋轉模式
  public isInFreeSpinsMode(): boolean {
    return this.TitansModel.isInFreeSpinsMode();
  }

  // 增加餘額（測試用）
  public addBalance(amount: number): void {
    this.TitansController.addBalance(amount);
  }

  // 獲取 Titans 配置
  public getTitansConfig(): TitansSlotConfig {
    return this.TitansModel.getTitansConfig();
  }

  // 重設遊戲
  public resetGame(): void {
    this.TitansModel.reset();
    this.totalWin = 0;
    this.totalMultiplier = 1; // 重置總倍數
    console.log('🔄 遊戲已重設');
  }

  // ==================== 獲取器方法 ====================

  public getTitansModel(): TitansSlotModel {
    return this.TitansModel;
  }

  public getTitansView(): TitansSlotView {
    return this.TitansView;
  }

  public getTitansController(): TitansSlotController {
    return this.TitansController;
  }

  /**
   * 獲取 WebSocket 管理器
   */
  public getWebSocketManager(): WebSocketManager | undefined {
    return this.wsManager;
  }

  /**
   * 發送 WebSocket 消息
   */
  public sendWebSocketMessage(data: any): boolean {
    if (this.wsManager && this.wsManager.isConnected()) {
      return this.wsManager.send(data);
    } else {
      console.warn('⚠️  WebSocket 未連接，無法發送消息');
      return false;
    }
  }

  /**
   * 獲取假資料（用於測試）
   */
  private getMockData(): any | null {
    //有錯誤的資料 但是有倍數球也有大ㄐㄧㄤˇ
    const mockDataList1 =[{
      "Code": 11003,
      "Result": 0,
      "RoundCode": "round_1804",
      "SpinInfo": {
          "GameStateType": 0,
          "GameState": 2,
          "WinType": 1,
          "Multiplier": 12,
          "ScreenOrg": [
              [
                  14,
                  14,
                  15,
                  3,
                  3
              ],
              [
                  13,
                  2,
                  14,
                  14,
                  12
              ],
              [
                  14,
                  14,
                  155,
                  4,
                  14
              ],
              [
                  12,
                  13,
                  13,
                  12,
                  12
              ],
              [
                  15,
                  31,
                  13,
                  13,
                  13
              ],
              [
                  3,
                  14,
                  4,
                  4,
                  14
              ]
          ],
          "SymbolResult": [
              [
                  14,
                  14,
                  15,
                  3,
                  3
              ],
              [
                  13,
                  2,
                  14,
                  14,
                  12
              ],
              [
                  14,
                  14,
                  155,
                  4,
                  14
              ],
              [
                  12,
                  13,
                  13,
                  12,
                  12
              ],
              [
                  15,
                  31,
                  13,
                  13,
                  13
              ],
              [
                  3,
                  14,
                  4,
                  4,
                  14
              ]
          ],
          "ScreenOutput": [
              [
                  15,
                  3,
                  3
              ],
              [
                  13,
                  2,
                  12
              ],
              [
                  155,
                  4
              ],
              [
                  12,
                  13,
                  13,
                  12,
                  12
              ],
              [
                  15,
                  31,
                  13,
                  13,
                  13
              ],
              [
                  3,
                  4,
                  4
              ]
          ],
          "WinLineInfos": [
              {
                  "LineNo": 1,
                  "SymbolID": 14,
                  "SymbolType": 1,
                  "SymbolCount": 9,
                  "WayCount": 0,
                  "WinPosition": [
                      [
                          0,
                          0
                      ],
                      [
                          0,
                          1
                      ],
                      [
                          1,
                          2
                      ],
                      [
                          1,
                          3
                      ],
                      [
                          2,
                          0
                      ],
                      [
                          2,
                          1
                      ],
                      [
                          2,
                          4
                      ],
                      [
                          5,
                          1
                      ],
                      [
                          5,
                          4
                      ]
                  ],
                  "Multiplier": 1,
                  "WinOrg": 80,
                  "Win": 80,
                  "WinType": 1,
                  "Odds": 8
              }
          ],
          "FGTotalTimes": 0,
          "FGCurrentTimes": 0,
          "FGRemainTimes": 0,
          "FGMaxFlag": false,
          "RndNum": [
              19,
              9,
              38,
              49,
              31,
              9
          ],
          "Win": 960,
          "ExtraData": "",
          "Stage": 0,
          "Collection": 0,
          "DemoModeRound": 0
      },
      "LDOption": [],
      "WaitNGRespin": true,
      "WinJPInfo": {
          "JPLevel": 0,
          "Value": 0
      }
  },{
    "Code": 11003,
    "Result": 0,
    "RoundCode": "round_1804",
    "SpinInfo": {
        "GameStateType": 0,
        "GameState": 2,
        "WinType": 1,
        "Multiplier": 12,
        "ScreenOrg": [],
        "SymbolResult": [
            [
                1,
                1,
                15,
                3,
                3
            ],
            [
                14,
                13,
                13,
                2,
                12
            ],
            [
                4,
                11,
                15,
                156,
                4
            ],
            [
                12,
                13,
                13,
                12,
                12
            ],
            [
                15,
                31,
                13,
                13,
                13
            ],
            [
                13,
                3,
                3,
                4,
                4
            ]
        ],
        "ScreenOutput": [
            [
                1,
                1,
                15,
                3,
                3
            ],
            [
                14,
                2,
                12
            ],
            [
                4,
                11,
                15,
                156,
                4
            ],
            [
                12,
                12,
                12
            ],
            [
                15,
                31
            ],
            [
                3,
                3,
                4,
                4
            ]
        ],
        "WinLineInfos": [
            {
                "LineNo": 1,
                "SymbolID": 13,
                "SymbolType": 1,
                "SymbolCount": 8,
                "WayCount": 0,
                "WinPosition": [
                    [
                        1,
                        1
                    ],
                    [
                        1,
                        2
                    ],
                    [
                        3,
                        1
                    ],
                    [
                        3,
                        2
                    ],
                    [
                        4,
                        2
                    ],
                    [
                        4,
                        3
                    ],
                    [
                        4,
                        4
                    ],
                    [
                        5,
                        0
                    ]
                ],
                "Multiplier": 1,
                "WinOrg": 100,
                "Win": 100,
                "WinType": 1,
                "Odds": 10
            }
        ],
        "FGTotalTimes": 0,
        "FGCurrentTimes": 0,
        "FGRemainTimes": 0,
        "FGMaxFlag": false,
        "RndNum": [
            17,
            7,
            35,
            49,
            31,
            7
        ],
        "Win": 1200,
        "ExtraData": "",
        "Stage": 1,
        "Collection": 0,
        "DemoModeRound": 0
    },
    "LDOption": [],
    "WaitNGRespin": true,
    "WinJPInfo": {
        "JPLevel": 0,
        "Value": 0
    }
},{
  "Code": 11003,
  "Result": 0,
  "RoundCode": "round_1804",
  "SpinInfo": {
      "GameStateType": 0,
      "GameState": 2,
      "WinType": 0,
      "Multiplier": 12,
      "ScreenOrg": [],
      "SymbolResult": [
          [
              1,
              1,
              15,
              3,
              3
          ],
          [
              1,
              14,
              14,
              2,
              12
          ],
          [
              4,
              11,
              15,
              157,
              4
          ],
          [
              4,
              12,
              12,
              12,
              12
          ],
          [
              12,
              13,
              15,
              15,
              31
          ],
          [
              13,
              3,
              3,
              4,
              4
          ]
      ],
      "ScreenOutput": [],
      "WinLineInfos": [],
      "FGTotalTimes": 0,
      "FGCurrentTimes": 0,
      "FGRemainTimes": 0,
      "FGMaxFlag": false,
      "RndNum": [
          17,
          5,
          35,
          47,
          28,
          6
      ],
      "Win": 0,
      "ExtraData": "",
      "Stage": 2,
      "Collection": 0,
      "DemoModeRound": 0
  },
  "LDOption": [],
  "WaitNGRespin": false,
  "WinJPInfo": {
      "JPLevel": 0,
      "Value": 0
  }
}]
    //big win
    // const mockDataList3 = []

    if (this.mockDataIndex >= mockDataList1.length) {
      console.log('🧪 假資料測試完成，重置索引');
      this.mockDataIndex = 0;
      return null;
    }

    const mockData = mockDataList1[this.mockDataIndex];
    this.mockDataIndex++;
    return mockData;
  }

  /**
   * 設置是否使用假資料測試
   * 使用方法：在瀏覽器控制台輸入 window.TitansSlotApp.setUseMockData(true)
   */
  public setUseMockData(useMock: boolean): void {
    this.useMockData = useMock;
    this.mockDataIndex = 0;
    console.log(`🧪 假資料測試模式: ${useMock ? '啟用' : '停用'}`);
  }
}

