import { SlotMachineApp, SlotMachineAppConfig } from '@/SlotMachineApp';
import { TitansSlotModel, TitansSlotConfig, TitansSlotResult } from './models/TitansSlotModel';
import { TitansSlotView } from './views/TitansSlotView';
import { TitansSlotController } from './controllers/TitansSlotController';
import { WebSocketManager, WebSocketEvent } from '@/core/WebSocketManager';
import { SymbolMapper } from './constants/SymbolMapper';
import { MathUtil } from '@/core/MathUtil';

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
  private betMultiple: number = 1; // 用於 BetMultiples/BetMultiple 轉換：BetUnit * Line / MoneyFractionMultiple
  private moneyFractionMultiple: number = 1; // 用於 Balance/Win 轉換
  private pendingServerBalance: number | null = null; // 暫存 1005 的 Balance（服務器金額）
  private betPurchaseCost: number = 0; // 購買免費遊戲的費用（從 11001 消息獲取）
  private totalWin: number = 0; // 總獲勝金額(11011才重置)
  private useMockData: boolean = false; // 是否使用假資料測試
  private mockDataIndex: number = 0; // 假資料索引

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

      // 監聽免費遊戲開始事件
      this.TitansView.getMainGame().on('freeGameStarted', () => {
        this.startFreeGameMode();
      });

      // 監聽免費遊戲結束事件
      this.TitansView.on('freeGameEnded', () => {
        this.endFreeGameMode();
      });

      this.TitansView.setOnSpinAnimationComplete(() => {
        if (this.isWaitingRespin == false && this.isFreeGameMode == false) {
          console.log('📤 動畫表演完畢2，發送 11010');
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
   * 初始化 WebSocket 連接
   */
  private async initializeWebSocket(): Promise<void> {
    try {
      // 獲取語言參數
      const urlParams = new URLSearchParams(window.location.search);
      const language = urlParams.get('lang') || 'zh-cn';
      
      // 創建 WebSocket 管理器實例
      this.wsManager = WebSocketManager.getInstance({
        // url: 'wss://gsvr1.wkgm88.net/gameserver',
        url: 'wss://7c88ea38ff35.ngrok-free.app/gameserver',
        reconnectInterval: 3000,        // 3秒重連間隔
        maxReconnectAttempts: -1,      // 無限重連
        heartbeatInterval: 5000,      // 30秒心跳（確保 > 0 才會發送心跳）
        autoReconnect: true,
        initMessage: {
          GameToken: 'BN80',
          GameID: 7,
          DemoOn: true,
          Lang: language.toLowerCase() // 轉換為小寫，如 'zh-cn'
        }
      });
      // 監聽連接事件
      this.wsManager.on(WebSocketEvent.CONNECT, (data) => {
        console.log('✅ WebSocket 連接成功', data);
      });

      // 監聽斷開事件
      this.wsManager.on(WebSocketEvent.DISCONNECT, (event) => {
        console.warn('⚠️  WebSocket 連接斷開:', event);
      });

      // 監聽消息事件
      this.wsManager.on(WebSocketEvent.MESSAGE, (data) => {
        this.handleWebSocketMessage(data);
      });

      // 監聽錯誤事件
      this.wsManager.on(WebSocketEvent.ERROR, (error) => {
        console.error('❌ WebSocket 錯誤:', error);
      });

      // 監聽重連事件
      this.wsManager.on(WebSocketEvent.RECONNECT, (attempts) => {
        console.log(`🔄 WebSocket 重連中 (第 ${attempts} 次)...`);
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
    // 自動發送第一次免費遊戲 spin（參數與 11002 相同）
    const betMultiple = this.TitansModel.getCurrentBet();
    this.sendWebSocketMessage({
      code: 11014,
      BetMultiple: this.convertBetClientToServer(betMultiple)
    });
  }

  /**
   * 結束免費遊戲模式
   */
  private endFreeGameMode(): void {
    console.log('🎁 結束免費遊戲模式');
    this.isFreeGameMode = false;
    this.freeGameRemainingSpins = 0;
    this.TitansController.setAutoSpin(false);
    // 切換回主遊戲模式畫面
    this.TitansView.getMainGame().endFreeGame();
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


    // 設置結果到 Model（會自動更新餘額）
    this.TitansModel.setSpinResult(result);

    // 檢查免費遊戲是否結束
    if (this.freeGameRemainingSpins <= 0) {
      console.log('🎁 免費遊戲次數已用完，結束免費遊戲模式');
      // 免費遊戲結束，切換回主遊戲模式
      // this.endFreeGameMode();
    } else {
      // 還有剩餘次數，等待動畫完成後自動發送下一次 11008（參數與 11002 相同）
      this.TitansView.getMainGame().wheel.setOnRemoveWinComplete(() => {
        console.log('🔄 免費遊戲 removeWinSymbols 完成，自動發送下一次 11008');
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
    
    this.totalWin += spinInfo.Win;
    console.log('handleSpinResult',spinInfo.Win);
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

      // 先更新餘額（但不觸發 spinCompleted 事件）
      if (result.totalWin > 0) {
        this.TitansModel['setBalance'](this.TitansModel.getBalance() + result.totalWin);
      }

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
          console.log('📤 respin 動畫表演完畢1，發送 11010');
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
   * 處理 WebSocket 消息
   */
  private handleWebSocketMessage(data: any): void {
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
          
          // 處理旋轉結果
          this.handleSpinResult(data);
          break;
        case 11009:
          console.log('🎰 收到免費遊戲旋轉結果:', data);
          data.WaitNGRespin = data.SpinInfo.WinType === 1;
          this.handleFreeGameSpinResult(data);
          break;

        case 11015:
          console.log('🎰 收到免費遊戲旋轉結果:', data);
          this.TitansController.setAutoSpin(true)
          break;

        case 11011:
          this.TitansView.getMainGame().showBGWinBar(false);
          this.totalWin = 0;
          if (data.Balance !== null && data.Balance !== undefined) {
            const clientBalance = this.convertMoneyServerToClient(data.Balance);
            this.TitansModel.setBalance(clientBalance);
            this.TitansView.updateWinAmount(0);
          }
          break;
        
        case -2:
          // 心跳回應（已在 WebSocketManager 中處理，不會到達這裡）
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
    const mockDataList1 = [
      // 第一筆：有獲勝，WaitNGRespin=true
      {
        "Code": 11003,
        "Result": 0,
        "RoundCode": "round_233",
        "SpinInfo": {
            "GameStateType": 0,
            "GameState": 2,
            "WinType": 1,
            "Multiplier": 12,
            "ScreenOrg": [
                [
                    14,
                    14,
                    12,
                    3,
                    3
                ],
                [
                    13,
                    13,
                    4,
                    4,
                    15
                ],
                [
                    52,
                    3,
                    13,
                    13,
                    151
                ],
                [
                    13,
                    14,
                    13,
                    13,
                    13
                ],
                [
                    14,
                    13,
                    3,
                    13,
                    13
                ],
                [
                    3,
                    11,
                    4,
                    14,
                    14
                ]
            ],
            "SymbolResult": [
                [
                    14,
                    14,
                    12,
                    3,
                    3
                ],
                [
                    13,
                    13,
                    4,
                    4,
                    15
                ],
                [
                    52,
                    3,
                    13,
                    13,
                    151
                ],
                [
                    13,
                    14,
                    13,
                    13,
                    13
                ],
                [
                    14,
                    13,
                    3,
                    13,
                    13
                ],
                [
                    3,
                    11,
                    4,
                    14,
                    14
                ]
            ],
            "ScreenOutput": [
                [
                    14,
                    14,
                    12,
                    3,
                    3
                ],
                [
                    4,
                    4,
                    15
                ],
                [
                    52,
                    3,
                    151
                ],
                [
                    14
                ],
                [
                    14,
                    3
                ],
                [
                    3,
                    11,
                    4,
                    14,
                    14
                ]
            ],
            "WinLineInfos": [
                {
                    "LineNo": 1,
                    "SymbolID": 13,
                    "SymbolType": 1,
                    "SymbolCount": 11,
                    "WayCount": 0,
                    "WinPosition": [
                        [
                            1,
                            0
                        ],
                        [
                            1,
                            1
                        ],
                        [
                            2,
                            2
                        ],
                        [
                            2,
                            3
                        ],
                        [
                            3,
                            0
                        ],
                        [
                            3,
                            2
                        ],
                        [
                            3,
                            3
                        ],
                        [
                            3,
                            4
                        ],
                        [
                            4,
                            1
                        ],
                        [
                            4,
                            3
                        ],
                        [
                            4,
                            4
                        ]
                    ],
                    "Multiplier": 1,
                    "WinOrg": 200,
                    "Win": 200,
                    "WinType": 1,
                    "Odds": 20
                }
            ],
            "FGTotalTimes": 0,
            "FGCurrentTimes": 0,
            "FGRemainTimes": 0,
            "FGMaxFlag": false,
            "RndNum": [
                19,
                42,
                27,
                14,
                3,
                31
            ],
            "Win": 2400,
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
    },
      // 第二筆：沒有獲勝，WaitNGRespin=false
      {
        "Code": 11003,
        "Result": 0,
        "RoundCode": "round_233",
        "SpinInfo": {
            "GameStateType": 0,
            "GameState": 2,
            "WinType": 1,
            "Multiplier": 12,
            "ScreenOrg": [],
            "SymbolResult": [
                [
                    14,
                    14,
                    12,
                    3,
                    3
                ],
                [
                    11,
                    2,
                    4,
                    4,
                    15
                ],
                [
                    14,
                    14,
                    52,
                    3,
                    152
                ],
                [
                    14,
                    15,
                    15,
                    13,
                    14
                ],
                [
                    11,
                    3,
                    11,
                    14,
                    3
                ],
                [
                    3,
                    11,
                    4,
                    14,
                    14
                ]
            ],
            "ScreenOutput": [
                [
                    12,
                    3,
                    3
                ],
                [
                    11,
                    2,
                    4,
                    4,
                    15
                ],
                [
                    52,
                    3,
                    152
                ],
                [
                    15,
                    15,
                    13
                ],
                [
                    11,
                    3,
                    11,
                    3
                ],
                [
                    3,
                    11,
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
                            2,
                            0
                        ],
                        [
                            2,
                            1
                        ],
                        [
                            3,
                            0
                        ],
                        [
                            3,
                            4
                        ],
                        [
                            4,
                            3
                        ],
                        [
                            5,
                            3
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
                40,
                25,
                10,
                0,
                31
            ],
            "Win": 960,
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
    },
    // 第三筆：
    {
      "Code": 11003,
      "Result": 0,
      "RoundCode": "round_233",
      "SpinInfo": {
          "GameStateType": 0,
          "GameState": 2,
          "WinType": 0,
          "Multiplier": 12,
          "ScreenOrg": [],
          "SymbolResult": [
              [
                  11,
                  152,
                  1,
                  1,
                  12
              ],
              [
                  11,
                  2,
                  4,
                  4,
                  15
              ],
              [
                  14,
                  15,
                  15,
                  52,
                  154
              ],
              [
                  4,
                  4,
                  15,
                  15,
                  13
              ],
              [
                  12,
                  15,
                  2,
                  11,
                  11
              ],
              [
                  12,
                  4,
                  31,
                  11,
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
              15,
              40,
              20,
              8,
              47,
              27
          ],
          "Win": 0,
          "ExtraData": "",
          "Stage": 3,
          "Collection": 0,
          "DemoModeRound": 0
      },
      "LDOption": [],
      "WaitNGRespin": false,
      "WinJPInfo": {
          "JPLevel": 0,
          "Value": 0
      }
  }
    ];
    //大獎和小蔣一起得
    const mockDataList2 = [
      {
        "Code": 11003,
        "Result": 0,
        "RoundCode": "round_2564",
        "SpinInfo": {
            "GameStateType": 0,
            "GameState": 1,
            "WinType": 1,
            "Multiplier": 1,
            "ScreenOrg": [
                [
                    14,
                    3,
                    3,
                    3,
                    4
                ],
                [
                    13,
                    13,
                    4,
                    4,
                    15
                ],
                [
                    3,
                    3,
                    14,
                    14,
                    12
                ],
                [
                    14,
                    15,
                    14,
                    3,
                    3
                ],
                [
                    12,
                    31,
                    13,
                    13,
                    15
                ],
                [
                    3,
                    15,
                    14,
                    14,
                    14
                ]
            ],
            "SymbolResult": [
                [
                    14,
                    3,
                    3,
                    3,
                    4
                ],
                [
                    13,
                    13,
                    4,
                    4,
                    15
                ],
                [
                    3,
                    3,
                    14,
                    14,
                    12
                ],
                [
                    14,
                    15,
                    14,
                    3,
                    3
                ],
                [
                    12,
                    31,
                    13,
                    13,
                    15
                ],
                [
                    3,
                    15,
                    14,
                    14,
                    14
                ]
            ],
            "ScreenOutput": [
                [
                    4
                ],
                [
                    13,
                    13,
                    4,
                    4,
                    15
                ],
                [
                    12
                ],
                [
                    15
                ],
                [
                    12,
                    31,
                    13,
                    13,
                    15
                ],
                [
                    15
                ]
            ],
            "WinLineInfos": [
                {
                    "LineNo": 1,
                    "SymbolID": 14,
                    "SymbolType": 1,
                    "SymbolCount": 8,
                    "WayCount": 0,
                    "WinPosition": [
                        [
                            0,
                            0
                        ],
                        [
                            2,
                            2
                        ],
                        [
                            2,
                            3
                        ],
                        [
                            3,
                            0
                        ],
                        [
                            3,
                            2
                        ],
                        [
                            5,
                            2
                        ],
                        [
                            5,
                            3
                        ],
                        [
                            5,
                            4
                        ]
                    ],
                    "Multiplier": 1,
                    "WinOrg": 800000,
                    "Win": 800000,
                    "WinType": 1,
                    "Odds": 8
                },
                {
                    "LineNo": 2,
                    "SymbolID": 3,
                    "SymbolType": 1,
                    "SymbolCount": 8,
                    "WayCount": 0,
                    "WinPosition": [
                        [
                            0,
                            1
                        ],
                        [
                            0,
                            2
                        ],
                        [
                            0,
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
                            3,
                            3
                        ],
                        [
                            3,
                            4
                        ],
                        [
                            5,
                            0
                        ]
                    ],
                    "Multiplier": 1,
                    "WinOrg": 4000000,
                    "Win": 4000000,
                    "WinType": 1,
                    "Odds": 40
                }
            ],
            "FGTotalTimes": 0,
            "FGCurrentTimes": 0,
            "FGRemainTimes": 0,
            "FGMaxFlag": false,
            "RndNum": [
                20,
                42,
                24,
                39,
                32,
                31
            ],
            "Win": 4800000,
            "ExtraData": "",
            "Stage": 0,
            "Collection": 0,
            "DemoModeRound": 0
        },
        "LDOption": [],
        "WaitNGRespin": true,
        "WinJPInfo": {
            "JPLevel": 3,
            "Value": 11800
        }
    },{
      "Code": 11003,
      "Result": 0,
      "RoundCode": "round_2564",
      "SpinInfo": {
          "GameStateType": 0,
          "GameState": 1,
          "WinType": 0,
          "Multiplier": 1,
          "ScreenOrg": [],
          "SymbolResult": [
              [
                  13,
                  1,
                  1,
                  14,
                  4
              ],
              [
                  13,
                  13,
                  4,
                  4,
                  15
              ],
              [
                  4,
                  3,
                  15,
                  15,
                  12
              ],
              [
                  11,
                  11,
                  14,
                  14,
                  15
              ],
              [
                  12,
                  31,
                  13,
                  13,
                  15
              ],
              [
                  12,
                  2,
                  13,
                  3,
                  15
              ]
          ],
          "ScreenOutput": [],
          "WinLineInfos": [],
          "FGTotalTimes": 0,
          "FGCurrentTimes": 0,
          "FGRemainTimes": 0,
          "FGMaxFlag": false,
          "RndNum": [
              16,
              42,
              20,
              35,
              32,
              27
          ],
          "Win": 0,
          "ExtraData": "",
          "Stage": 1,
          "Collection": 0,
          "DemoModeRound": 0
      },
      "LDOption": [],
      "WaitNGRespin": false,
      "WinJPInfo": {
          "JPLevel": 0,
          "Value": 0
      }
  }
    ]

    if (this.mockDataIndex >= mockDataList2.length) {
      console.log('🧪 假資料測試完成，重置索引');
      this.mockDataIndex = 0;
      return null;
    }

    const mockData = mockDataList2[this.mockDataIndex];
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

