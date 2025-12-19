import { SlotMachineApp, SlotMachineAppConfig } from '@/SlotMachineApp';
import { TitansSlotModel, TitansSlotConfig } from './models/TitansSlotModel';
import { TitansSlotView } from './views/TitansSlotView';
import { TitansSlotController } from './controllers/TitansSlotController';
import { WebSocketManager, WebSocketEvent } from '@/core/WebSocketManager';

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

