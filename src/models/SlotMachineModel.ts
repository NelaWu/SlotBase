import { BaseModel } from './BaseModel';
import { SlotStateData, SlotMachineConfig } from '@core/SlotMachineStates';

// 拉霸機結果介面
export interface SpinResult {
  reels: number[][];
  winLines: number[];
  totalWin: number;
  multiplier?: number;
  bonusTriggered?: boolean;
}

// 拉霸機 Model
export class SlotMachineModel extends BaseModel {
  private config: SlotMachineConfig;
  private stateData: SlotStateData;

  constructor(config: SlotMachineConfig = {}) {
    super();
    this.config = {
      autoSpinDelay: 2000,
      spinDuration: 3000,
      celebrationDuration: 2000,
      errorRetryDelay: 3000,
      ...config
    };
    
    this.stateData = {
      isSpinning: false,
      currentBet: 10,
      balance: 1000,
      loadingProgress: 0
    };
  }

  async initialize(): Promise<void> {
    // 初始化拉霸機資料
    this.emit('modelInitialized');
  }

  destroy(): void {
    this.removeAllListeners();
  }

  // 設置玩家餘額
  setBalance(balance: number): void {
    this.stateData.balance = balance;
    this.emit('balanceChanged', balance);
  }

  // 獲取玩家餘額
  getBalance(): number {
    return this.stateData.balance || 0;
  }

  // 設置當前投注
  setBet(bet: number): void {
    if (bet <= this.getBalance()) {
      this.stateData.currentBet = bet;
      this.emit('betChanged', bet);
    } else {
      this.emit('error', '投注金額超過餘額');
    }
  }

  // 獲取當前投注
  getCurrentBet(): number {
    return this.stateData.currentBet || 0;
  }

  // 檢查是否能夠開始轉動
  canSpin(): boolean {
    return !this.stateData.isSpinning && 
           this.getBalance() >= this.getCurrentBet();
  }

  // 開始轉動
  startSpin(): void {
    if (this.canSpin()) {
      this.stateData.isSpinning = true;
      this.setBalance(this.getBalance() - this.getCurrentBet());
      this.emit('spinStarted');
    } else {
      this.emit('error', '無法開始轉動');
    }
  }

  // 設置轉動結果
  setSpinResult(result: SpinResult): void {
    this.stateData.lastResult = result;
    this.stateData.isSpinning = false;
    
    if (result.totalWin > 0) {
      this.setBalance(this.getBalance() + result.totalWin);
    }
    
    this.emit('spinCompleted', result);
  }

  // 獲取最後的轉動結果
  getLastResult(): SpinResult | undefined {
    return this.stateData.lastResult;
  }

  // 設置載入進度
  setLoadingProgress(progress: number): void {
    this.stateData.loadingProgress = Math.max(0, Math.min(100, progress));
    this.emit('loadingProgress', this.stateData.loadingProgress);
  }

  // 獲取載入進度
  getLoadingProgress(): number {
    return this.stateData.loadingProgress || 0;
  }

  // 設置錯誤
  setError(error: string): void {
    this.stateData.error = error;
    this.emit('error', error);
  }

  // 清除錯誤
  clearError(): void {
    this.stateData.error = undefined;
    this.emit('errorCleared');
  }

  // 獲取當前錯誤
  getError(): string | undefined {
    return this.stateData.error;
  }

  // 獲取配置
  getConfig(): SlotMachineConfig {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(newConfig: Partial<SlotMachineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  // 獲取完整狀態資料
  getStateData(): SlotStateData {
    return { ...this.stateData };
  }

  // 重設遊戲狀態
  reset(): void {
    this.stateData = {
      isSpinning: false,
      currentBet: 10,
      balance: 1000,
      loadingProgress: 0
    };
    this.emit('gameReset');
  }
} 