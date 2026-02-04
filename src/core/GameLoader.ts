import { ResourceManager, ResourceDefinition, LoadProgress } from './ResourceManager';
import { ApiManager, ApiConfig } from './ApiManager';

// 載入階段枚舉
export enum LoadingPhase {
  INITIALIZING = 'initializing',
  LOADING_CONFIG = 'loading_config',
  LOADING_RESOURCES = 'loading_resources',
  CONNECTING_API = 'connecting_api',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// 載入進度介面
export interface GameLoadProgress {
  phase: LoadingPhase;
  percentage: number;
  message: string;
  details?: string;
}

// 載入器配置
export interface LoaderConfig {
  apiConfig: ApiConfig;
  resources: ResourceDefinition[];
  enableOfflineMode?: boolean;
  maxLoadTime?: number;
  skipResourceValidation?: boolean;
}

// 載入完成回調
export type LoadProgressCallback = (progress: GameLoadProgress) => void;
export type LoadCompleteCallback = () => void;
export type LoadErrorCallback = (error: string, phase: LoadingPhase) => void;

// 遊戲載入器
export class GameLoader {
  private resourceManager: ResourceManager;
  private apiManager?: ApiManager;
  private config: LoaderConfig;
  
  private onProgress?: LoadProgressCallback;
  private onComplete?: LoadCompleteCallback;
  private onError?: LoadErrorCallback;
  
  private currentPhase: LoadingPhase = LoadingPhase.INITIALIZING;
  private startTime: number = 0;
  private isLoading: boolean = false;

  constructor(config: LoaderConfig) {
    this.config = config;
    this.resourceManager = ResourceManager.getInstance();
  }

  // 設置回調函數
  setCallbacks(
    onProgress?: LoadProgressCallback,
    onComplete?: LoadCompleteCallback,
    onError?: LoadErrorCallback
  ): void {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  // 開始載入
  async load(): Promise<void> {
    if (this.isLoading) {
      throw new Error('載入器已在運行中');
    }

    this.isLoading = true;
    this.startTime = Date.now();

    try {
      await this.performLoad();
      this.updateProgress(LoadingPhase.COMPLETED, 100, '載入完成！');
      this.onComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      this.updateProgress(LoadingPhase.ERROR, 0, '載入失敗', errorMessage);
      this.onError?.(errorMessage, this.currentPhase);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // 執行載入流程
  private async performLoad(): Promise<void> {
    // 檢查載入超時
    const timeoutPromise = this.config.maxLoadTime 
      ? this.createTimeoutPromise(this.config.maxLoadTime)
      : null;

    const loadPromise = this.executeLoadingPhases();

    if (timeoutPromise) {
      await Promise.race([loadPromise, timeoutPromise]);
    } else {
      await loadPromise;
    }
  }

  // 執行各個載入階段
  private async executeLoadingPhases(): Promise<void> {
    // 階段 1: 初始化
    this.updateProgress(LoadingPhase.INITIALIZING, 0, '正在初始化...');
    await this.delay(100); // 讓 UI 有時間更新

    // 階段 2: 載入遊戲配置
    this.updateProgress(LoadingPhase.LOADING_CONFIG, 10, '正在載入遊戲配置...');
    await this.loadGameConfig();

    // 階段 3: 載入資源
    this.updateProgress(LoadingPhase.LOADING_RESOURCES, 20, '正在載入遊戲資源...');
    await this.loadResources();

    // 階段 4: 連接 API
    this.updateProgress(LoadingPhase.CONNECTING_API, 80, '正在連接伺服器...');
    await this.connectApi();

    // 階段 5: 最終處理
    this.updateProgress(LoadingPhase.FINALIZING, 95, '正在完成初始化...');
    await this.finalize();
  }

  // 載入遊戲配置
  private async loadGameConfig(): Promise<void> {
    try {
      // 嘗試從 API 載入配置
      if (!this.config.enableOfflineMode) {
        this.apiManager = ApiManager.getInstance(this.config.apiConfig);
        const gameConfig = await this.apiManager.getGameConfig();
        console.log('遊戲配置載入成功:', gameConfig);
      }
    } catch (error) {
      if (!this.config.enableOfflineMode) {
        throw new Error(`載入遊戲配置失敗: ${error}`);
      }
      console.warn('API 配置載入失敗，使用離線模式');
    }
  }

  // 載入資源
  private async loadResources(): Promise<void> {
    if (this.config.resources.length === 0) {
      return;
    }

    // 設置資源載入進度回調
    this.resourceManager.setCallbacks(
      (progress: LoadProgress) => {
        const phaseProgress = 20 + (progress.percentage * 0.6); // 20-80% 的進度
        const detailMessage = progress.currentResource 
          ? `${progress.currentResource} (${progress.loaded}/${progress.total})`
          : `(${progress.loaded}/${progress.total})`;
        this.updateProgress(
          LoadingPhase.LOADING_RESOURCES,
          phaseProgress,
          `正在載入資源... (${progress.loaded}/${progress.total})`,
          detailMessage
        );
      },
      () => {
        console.log('所有資源載入完成');
      },
      (error: string) => {
        console.error('資源載入錯誤:', error);
      }
    );

    try {
      await this.resourceManager.loadResources(this.config.resources);
      
      // 驗證資源 (可選)
      if (!this.config.skipResourceValidation) {
        await this.validateResources();
      }
    } catch (error) {
      throw new Error(`資源載入失敗: ${error}`);
    }
  }

  // 連接 API
  private async connectApi(): Promise<void> {
    if (this.config.enableOfflineMode || !this.apiManager) {
      return;
    }

    try {
      const isConnected = await this.apiManager.ping();
      if (!isConnected) {
        throw new Error('無法連接到伺服器');
      }
      console.log('API 連接成功');
    } catch (error) {
      throw new Error(`API 連接失敗: ${error}`);
    }
  }

  // 最終處理
  private async finalize(): Promise<void> {
    // 執行任何最終的初始化工作
    await this.delay(200); // 模擬處理時間
    console.log('遊戲載入完成');
  }

  // 驗證資源
  private async validateResources(): Promise<void> {
    const requiredResources = this.config.resources.filter(r => r.preload !== false);
    
    for (const resource of requiredResources) {
      if (!this.resourceManager.isLoaded(resource.id)) {
        throw new Error(`必要資源載入失敗: ${resource.id}`);
      }
    }
  }

  // 創建超時 Promise
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`載入超時 (${timeout}ms)`));
      }, timeout);
    });
  }

  // 更新進度
  private updateProgress(
    phase: LoadingPhase,
    percentage: number,
    message: string,
    details?: string
  ): void {
    this.currentPhase = phase;
    const progress: GameLoadProgress = {
      phase,
      percentage: Math.min(100, Math.max(0, percentage)),
      message,
      details
    };
    
    this.onProgress?.(progress);
  }

  // 延遲輔助方法
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 獲取載入狀態
  getIsLoading(): boolean {
    return this.isLoading;
  }

  // 獲取當前階段
  getCurrentPhase(): LoadingPhase {
    return this.currentPhase;
  }

  // 獲取載入時間
  getLoadTime(): number {
    return this.startTime > 0 ? Date.now() - this.startTime : 0;
  }

  // 取消載入（如果可能）
  cancel(): void {
    if (this.isLoading) {
      this.isLoading = false;
      this.updateProgress(LoadingPhase.ERROR, 0, '載入已取消');
      this.onError?.('載入已取消', this.currentPhase);
    }
  }
} 