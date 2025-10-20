import * as PIXI from 'pixi.js';
import { StateMachine, IState, ITransition } from '@core/StateMachine';
import { SLOT_STATES, SlotMachineConfig } from '@core/SlotMachineStates';
import { SlotMachineModel } from '@models/SlotMachineModel';
import { GameLoader, LoaderConfig, GameLoadProgress, LoadingPhase } from '@core/GameLoader';
import { ResourceManager, ResourceDefinition } from '@core/ResourceManager';
import { ApiManager, ApiConfig } from '@core/ApiManager';

// 應用程式配置
export interface SlotMachineAppConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  backgroundColor?: number;
  resolution?: number;
  apiConfig: ApiConfig;
  gameConfig?: SlotMachineConfig;
  resources: ResourceDefinition[];
  enableOfflineMode?: boolean;
}

// 拉霸機應用程式主類別
export class SlotMachineApp {
  private app: PIXI.Application;
  private stateMachine: StateMachine;
  private model: SlotMachineModel;
  private loader: GameLoader;
  private resourceManager: ResourceManager;
  private apiManager?: ApiManager;
  private updateCallback?: (ticker: PIXI.Ticker) => void;
  
  private config: SlotMachineAppConfig;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  constructor(config: SlotMachineAppConfig) {
    this.config = {
      width: 1024,
      height: 768,
      backgroundColor: 0x1099bb,
      resolution: window.devicePixelRatio || 1,
      enableOfflineMode: false,
      ...config
    };

    // 初始化 PIXI 應用程式
    this.app = new PIXI.Application();
    // 添加 PixiJS DevTools 支持
    (globalThis as any).__PIXI_APP__ = this.app;
    
    // 初始化組件
    this.stateMachine = new StateMachine();
    this.model = new SlotMachineModel(this.config.gameConfig);
    this.resourceManager = ResourceManager.getInstance();
    
    // 初始化載入器
    const loaderConfig: LoaderConfig = {
      apiConfig: this.config.apiConfig,
      resources: this.config.resources,
      enableOfflineMode: this.config.enableOfflineMode,
      maxLoadTime: 30000 // 30 秒超時
    };
    this.loader = new GameLoader(loaderConfig);
  }

  // 初始化應用程式
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('應用程式已經初始化');
    }

    try {
      // 初始化 PIXI
      await this.initializePixi();
      
      // 設置狀態機
      this.setupStateMachine();
      
      // 設置載入器回調
      this.setupLoader();
      
      // 開始載入
      await this.loader.load();
      
      // 初始化 Model
      await this.model.initialize();
      
      // 設置 API 管理器（如果不是離線模式）
      if (!this.config.enableOfflineMode) {
        this.apiManager = ApiManager.getInstance();
      }
      
      // 設置狀態機初始狀態
      this.stateMachine.setInitialState(SLOT_STATES.IDLE);
      
      this.isInitialized = true;
      console.log('拉霸機應用程式初始化完成');
      
    } catch (error) {
      console.error('初始化失敗:', error);
      throw error;
    }
  }

  // 初始化 PIXI
  private async initializePixi(): Promise<void> {
    await this.app.init({
      width: this.config.width,
      height: this.config.height,
      backgroundColor: this.config.backgroundColor,
      resolution: this.config.resolution,
      autoDensity: true
    });

    // 將 PIXI canvas 添加到容器
    this.config.container.appendChild(this.app.canvas);
    
    // 設置響應式
    this.setupResize();
  }

  // 設置狀態機
  private setupStateMachine(): void {
    // 定義狀態
    const states: IState[] = [
      {
        name: SLOT_STATES.LOADING,
        onEnter: () => console.log('進入載入狀態'),
        onExit: () => console.log('離開載入狀態')
      },
      {
        name: SLOT_STATES.IDLE,
        onEnter: () => {
          console.log('進入待機狀態');
          this.onIdleState();
        },
        onUpdate: (deltaTime: number) => this.onIdleUpdate(deltaTime)
      },
      {
        name: SLOT_STATES.SPINNING,
        onEnter: () => {
          console.log('進入轉動狀態');
          this.onSpinningState();
        },
        onUpdate: (deltaTime: number) => this.onSpinningUpdate(deltaTime)
      },
      {
        name: SLOT_STATES.STOPPING,
        onEnter: () => {
          console.log('進入停止狀態');
          this.onStoppingState();
        }
      },
      {
        name: SLOT_STATES.RESULT,
        onEnter: () => {
          console.log('進入結果狀態');
          this.onResultState();
        }
      },
      {
        name: SLOT_STATES.CELEBRATE,
        onEnter: () => {
          console.log('進入慶祝狀態');
          this.onCelebrateState();
        }
      },
      {
        name: SLOT_STATES.ERROR,
        onEnter: () => {
          console.log('進入錯誤狀態');
          this.onErrorState();
        }
      }
    ];

    // 添加狀態
    states.forEach(state => this.stateMachine.addState(state));

    // 定義狀態轉換
    const transitions: ITransition[] = [
      { from: SLOT_STATES.LOADING, to: SLOT_STATES.IDLE },
      { from: SLOT_STATES.IDLE, to: SLOT_STATES.SPINNING, condition: () => this.model.canSpin() },
      { from: SLOT_STATES.SPINNING, to: SLOT_STATES.STOPPING },
      { from: SLOT_STATES.STOPPING, to: SLOT_STATES.RESULT },
      { from: SLOT_STATES.RESULT, to: SLOT_STATES.CELEBRATE, condition: () => this.hasWin() },
      { from: SLOT_STATES.RESULT, to: SLOT_STATES.IDLE, condition: () => !this.hasWin() },
      { from: SLOT_STATES.CELEBRATE, to: SLOT_STATES.IDLE },
      { from: '*', to: SLOT_STATES.ERROR } // 任何狀態都可以轉到錯誤狀態
    ];

    // 添加轉換
    transitions.forEach(transition => this.stateMachine.addTransition(transition));

    // 監聽狀態變更
    this.stateMachine.onStateChange((from, to) => {
      console.log(`狀態轉換: ${from} → ${to}`);
    });
  }

  // 設置載入器
  private setupLoader(): void {
    this.loader.setCallbacks(
      (progress: GameLoadProgress) => this.onLoadProgress(progress),
      () => this.onLoadComplete(),
      (error: string, phase: LoadingPhase) => this.onLoadError(error, phase)
    );
  }

  // 設置響應式
  private setupResize(): void {
    const resize = () => {
      const container = this.config.container;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // 計算縮放比例
      const scaleX = containerWidth / this.config.width!;
      const scaleY = containerHeight / this.config.height!;
      const scale = Math.min(scaleX, scaleY);
      
      // 設置 canvas 樣式
      this.app.canvas.style.width = `${this.config.width! * scale}px`;
      this.app.canvas.style.height = `${this.config.height! * scale}px`;
    };

    window.addEventListener('resize', resize);
    resize(); // 初始調整
  }

  // 開始運行應用程式
  start(): void {
    if (!this.isInitialized) {
      throw new Error('應用程式尚未初始化');
    }

    if (this.isRunning) {
      return;
    }

    // 啟動遊戲循環
    this.updateCallback = (ticker) => this.update(ticker.deltaTime);
    this.app.ticker.add(this.updateCallback);
    this.isRunning = true;
    
    console.log('拉霸機應用程式開始運行');
  }

  // 停止應用程式
  stop(): void {
    if (this.isRunning && this.updateCallback) {
      this.app.ticker.remove(this.updateCallback);
      this.isRunning = false;
      console.log('拉霸機應用程式已停止');
    }
  }

  // 更新循環
  private update(deltaTime: number): void {
    this.stateMachine.update(deltaTime);
  }

  // 狀態處理方法
  private onIdleState(): void {
    // 待機狀態邏輯
  }

  private onIdleUpdate(_deltaTime: number): void {
    // 待機狀態更新邏輯
  }

  private onSpinningState(): void {
    // 開始轉動
    this.model.startSpin();
  }

  private onSpinningUpdate(_deltaTime: number): void {
    // 轉動狀態更新邏輯
  }

  private onStoppingState(): void {
    // 停止邏輯
  }

  private onResultState(): void {
    // 結果處理邏輯
  }

  private onCelebrateState(): void {
    // 慶祝動畫邏輯
  }

  private onErrorState(): void {
    // 錯誤處理邏輯
  }

  // 載入回調
  private onLoadProgress(progress: GameLoadProgress): void {
    console.log(`載入進度: ${progress.percentage.toFixed(1)}% - ${progress.message}`);
  }

  private onLoadComplete(): void {
    console.log('載入完成');
  }

  private onLoadError(error: string, phase: LoadingPhase): void {
    console.error(`載入錯誤 (${phase}): ${error}`);
    this.stateMachine.transitionTo(SLOT_STATES.ERROR);
  }

  // 公共 API 方法

  // 開始轉動
  public spin(): void {
    if (this.stateMachine.canTransitionTo(SLOT_STATES.SPINNING)) {
      this.stateMachine.transitionTo(SLOT_STATES.SPINNING);
    }
  }

  // 設置投注金額
  public setBet(amount: number): void {
    this.model.setBet(amount);
  }

  // 獲取玩家餘額
  public getBalance(): number {
    return this.model.getBalance();
  }

  // 獲取當前狀態
  public getCurrentState(): string | null {
    return this.stateMachine.getCurrentState();
  }

  // 檢查是否有贏錢
  private hasWin(): boolean {
    const result = this.model.getLastResult();
    return result ? result.totalWin > 0 : false;
  }

  // 銷毀應用程式
  destroy(): void {
    this.stop();
    this.model.destroy();
    this.app.destroy(true);
    this.isInitialized = false;
    console.log('拉霸機應用程式已銷毀');
  }

  // 獲取 PIXI 應用程式實例
  getPixiApp(): PIXI.Application {
    return this.app;
  }

  // 獲取 Model 實例
  getModel(): SlotMachineModel {
    return this.model;
  }

  // 獲取狀態機實例
  getStateMachine(): StateMachine {
    return this.stateMachine;
  }

  // 獲取資源管理器實例
  getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  // 獲取 API 管理器實例
  getApiManager(): ApiManager | undefined {
    return this.apiManager;
  }
} 