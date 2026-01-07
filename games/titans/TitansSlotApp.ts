import { SlotMachineApp, SlotMachineAppConfig } from '@/SlotMachineApp';
import { TitansSlotModel, TitansSlotConfig, TitansSlotResult } from './models/TitansSlotModel';
import { TitansSlotView } from './views/TitansSlotView';
import { TitansSlotController } from './controllers/TitansSlotController';
import { WebSocketManager, WebSocketEvent } from '@/core/WebSocketManager';
import { SymbolMapper } from './constants/SymbolMapper';

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
      
      // 設置旋轉動畫完成回調，用於發送 WebSocket 11010
      // 無論 WaitNGRespin 狀態如何，只要 11003 盤面表演完都要 call 11010
      this.TitansView.setOnSpinAnimationComplete(() => {
        console.log('📤 動畫表演完畢，發送 11010');
        this.sendWebSocketMessage({
          code: 11010
        });
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
        url: 'wss://gsvr1.wkgm88.net/gameserver',
        reconnectInterval: 3000,        // 3秒重連間隔
        maxReconnectAttempts: -1,      // 無限重連
        heartbeatInterval: 5000,      // 30秒心跳（確保 > 0 才會發送心跳）
        autoReconnect: true,
        initMessage: {
          GameToken: 'BN80',
          GameID: 7,
          DemoOn: false,
          Lang: language.toLowerCase() // 轉換為小寫，如 'zh-cn'
        }
      });
      // 監聽連接事件
      this.wsManager.on(WebSocketEvent.CONNECT, (data) => {
        console.log('✅ WebSocket 連接成功',data);
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
      this.sendWebSocketMessage({
        code: 11002,
        BetMultiple: betMultiple
      });
    };
    this.TitansModel.on('spinStarted', this.spinStartedHandler);
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
    
    // 提取獲勝金額
    const totalWin = spinInfo.Win || 0;
    
    // 提取倍數
    const multiplier = spinInfo.Multiplier || 1;
    
    // 提取詳細的獲勝連線信息並轉換符號 ID
    const winLineInfos = (spinInfo.WinLineInfos || []).map((info: any) => ({
      ...info,
      SymbolID: SymbolMapper.serverToClient(info.SymbolID || info.SymbolId || 0),
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
    
    // 檢查是否中大獎
    if (data.WinJPInfo && data.WinJPInfo.Value > 0) {
      jackpotWon = true;
      bonusFeature = 'jackpot';
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
        if (result.WaitNGRespin === true) {
          console.log('🔄 WaitNGRespin=true，設置 removeWinSymbols 完成後的回調');
          this.TitansView.getMainGame().wheel.setOnRemoveWinComplete(() => {
            console.log('🔄 removeWinSymbols 完成，自動發送 respin 請求（不清空牌面）');
            // 自動發送 spin 請求（使用相同的投注金額）
            const betMultiple = this.TitansModel.getCurrentBet();
            this.sendWebSocketMessage({
              code: 11002,
              BetMultiple: betMultiple
            });
          });
        }
        
        // 直接調用 Controller 的 respin 處理方法，不觸發 spinCompleted 事件
        // 這樣可以避免 stopSpinAnimation 清空盤面的問題
        await this.TitansController.handleRespinResult(result);
        
        // 動畫表演完畢後，發送 11010（無論 WaitNGRespin 狀態如何）
        console.log('📤 respin 動畫表演完畢，發送 11010');
        this.sendWebSocketMessage({
          code: 11010
        });
        
        // 根據 WaitNGRespin 狀態決定是否保持 isWaitingRespin
        if (result.WaitNGRespin === true) {
          console.log('🔄 WaitNGRespin=true，保持 isWaitingRespin=true，等待收到 11011 後再發送下一次 11002');
          // 保持 isWaitingRespin = true，等待收到 11011 後再發送 11002
          this.isWaitingRespin = true;
        } else {
          console.log('✅ WaitNGRespin=false，respin 流程結束，重置 isWaitingRespin=false');
          this.isWaitingRespin = false;
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
          BetMultiple: betMultiple
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
          // 初始化
          if (data.Balance !== undefined && data.Balance > 0) {
            this.TitansModel.setBalance(data.Balance);
          }
          break;
        case 11001:
          console.log('🔐 收到投注設定:', data);
          // 設置 BetMultiples 到 betList
          if (data.BetMultiples && Array.isArray(data.BetMultiples) && data.BetMultiples.length > 0) {
            this.TitansModel.setBetList(data.BetMultiples);
            // 預設下注金額為陣列第一個元素
            const defaultBet = data.BetMultiples[0];
            this.TitansModel.setBet(defaultBet);
            // 呼叫 MainGame.createBetPanel，並傳入回調函數以更新 Model 的 currentBet
            this.TitansView.getMainGame().createBetPanel(
              data.BetMultiples,
              (betAmount: number) => {
                // 當用戶選擇投注金額時，更新 Model
                this.TitansModel.setBet(betAmount);
              }
            );
          }
          break;
        
        case 11003:
          console.log('🎰 收到旋轉結果:', data);
        //   data = {
        //     "Code": 11003,
        //     "Result": 0,
        //     "RoundCode": "round_2415",
        //     "SpinInfo": {
        //         "GameStateType": 0,
        //         "GameState": 2,
        //         "WinType": 0,
        //         "Multiplier": 1,
        //         "ScreenOrg": [
        //             [
        //                 11,
        //                 11,
        //                 2,
        //                 2,
        //                 2
        //             ],
        //             [
        //                 12,
        //                 13,
        //                 156,
        //                 2,
        //                 2
        //             ],
        //             [
        //                 13,
        //                 14,
        //                 15,
        //                 15,
        //                 13
        //             ],
        //             [
        //                 15,
        //                 13,
        //                 13,
        //                 31,
        //                 11
        //             ],
        //             [
        //                 51,
        //                 12,
        //                 12,
        //                 14,
        //                 14
        //             ],
        //             [
        //                 31,
        //                 3,
        //                 14,
        //                 14,
        //                 4
        //             ]
        //         ],
        //         "SymbolResult": [
        //             [
        //                 11,
        //                 11,
        //                 2,
        //                 2,
        //                 2
        //             ],
        //             [
        //                 12,
        //                 13,
        //                 156,
        //                 2,
        //                 2
        //             ],
        //             [
        //                 13,
        //                 14,
        //                 15,
        //                 15,
        //                 13
        //             ],
        //             [
        //                 15,
        //                 13,
        //                 13,
        //                 31,
        //                 11
        //             ],
        //             [
        //                 51,
        //                 12,
        //                 12,
        //                 14,
        //                 14
        //             ],
        //             [
        //                 31,
        //                 3,
        //                 14,
        //                 14,
        //                 4
        //             ]
        //         ],
        //         "ScreenOutput": [],
        //         "WinLineInfos": [],
        //         "FGTotalTimes": 0,
        //         "FGCurrentTimes": 0,
        //         "FGRemainTimes": 0,
        //         "FGMaxFlag": false,
        //         "RndNum": [
        //             0,
        //             14,
        //             4,
        //             12,
        //             21,
        //             32
        //         ],
        //         "Win": 0,
        //         "ExtraData": "",
        //         "Stage": 0,
        //         "Collection": 0,
        //         "DemoModeRound": 0
        //     },
        //     "LDOption": [],
        //     "WaitNGRespin": false,
        //     "WinJPInfo": {
        //         "JPLevel": 0,
        //         "Value": 0
        //     }
        // }
          // 處理旋轉結果
          this.handleSpinResult(data);
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
}

