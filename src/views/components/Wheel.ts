import * as PIXI from 'pixi.js';
import { BaseSymbol } from './BaseSymbol';
import { Reel, ReelConfig } from './Reel';

/**
 * 滾輪動畫速度配置
 */
export interface SpeedConfig {
  /** 起步速度（符號/秒） */
  startSpeed: number;
  /** 滾動最大速度（符號/秒） */
  maxSpeed: number;
  /** 結束速度（符號/秒），到達此速度後開始對齊停止 */
  endSpeed: number;
  /** 加速度（符號/秒²） */
  acceleration: number;
  /** 減速度（符號/秒²） */
  deceleration: number;
}

/**
 * 滾輪時間配置
 */
export interface TimingConfig {
  /** 每個 reel 開始旋轉的間隔（毫秒） */
  startInterval: number;
  /** 每個 reel 停止的間隔（毫秒） */
  stopInterval: number;
  /** 最小旋轉時間（毫秒） */
  minSpinDuration: number;
}

/**
 * 輪盤配置
 */
export interface WheelConfig {
  /** reel 寬度 */
  reelWidth: number;
  /** reel 高度 */
  reelHeight: number;
  /** reel 數量（列數） */
  numberOfReels: number;
  /** 每個 reel 顯示的符號數量（行數） */
  symbolsPerReel: number;
  /** reel 之間的間距 */
  reelSpacing?: number;
  /** 速度配置 */
  speed?: Partial<SpeedConfig>;
  /** 時間配置 */
  timing?: Partial<TimingConfig>;
}

/**
 * 停止結果
 */
export interface StopResult {
  /** 結束牌面：每個 reel 的符號 ID 陣列 [reel][row] */
  symbolIds: number[][];
  /** 停止完成回調 */
  onComplete?: () => void;
}

/**
 * 基礎輪盤類別
 */
export abstract class Wheel<T extends BaseSymbol> extends PIXI.Container {
  protected reels: Reel<T>[] = [];
  protected config: WheelConfig;
  protected speedConfig: SpeedConfig;
  protected timingConfig: TimingConfig;
  protected isSpinning: boolean = false;
  protected spinStartTime: number = 0;

  constructor(config: WheelConfig) {
    super();
    
    this.config = {
      reelSpacing: 0,
      ...config
    };

    // 預設速度配置
    this.speedConfig = {
      startSpeed: 5,
      maxSpeed: 30,
      endSpeed: 3,
      acceleration: 40,
      deceleration: 25,
      ...config.speed
    };

    // 預設時間配置
    this.timingConfig = {
      startInterval: 150,
      stopInterval: 200,
      minSpinDuration: 2000,
      ...config.timing
    };

    this.createReels();
  }

  /**
   * 創建 Symbol 的工廠方法（子類實現）
   */
  protected abstract createSymbol(): T;

  /**
   * 獲取隨機符號 ID（子類實現）
   */
  protected abstract getRandomSymbolId(): number;

  /**
   * 創建所有捲軸
   */
  protected createReels(): void {
    const reelConfig: ReelConfig = {
      width: this.config.reelWidth,
      height: this.config.reelHeight,
      symbolsPerReel: this.config.symbolsPerReel,
      startSpeed: this.speedConfig.startSpeed,
      maxSpeed: this.speedConfig.maxSpeed,
      endSpeed: this.speedConfig.endSpeed,
      acceleration: this.speedConfig.acceleration,
      deceleration: this.speedConfig.deceleration
    };

    for (let i = 0; i < this.config.numberOfReels; i++) {
      const reel = new Reel<T>(
        reelConfig,
        () => this.createSymbol(),
        () => this.getRandomSymbolId()
      );

      // 設置位置
      reel.x = i * (this.config.reelWidth + (this.config.reelSpacing || 0)) + this.config.reelWidth / 2;
      reel.y = this.config.reelHeight / this.config.symbolsPerReel / 2;

      this.reels.push(reel);
      this.addChild(reel);
    }
  }

  /**
   * 開始旋轉
   */
  public startSpin(): void {
    if (this.isSpinning) {
      console.warn('Wheel is already spinning');
      return;
    }

    this.isSpinning = true;
    this.spinStartTime = Date.now();

    // 依序啟動每個 reel
    this.reels.forEach((reel, index) => {
      setTimeout(() => {
        reel.startSpin();
      }, index * this.timingConfig.startInterval);
    });
  }

  /**
   * 停止旋轉
   */
  public stopSpin(result: StopResult): void {
    if (!this.isSpinning) {
      console.warn('Wheel is not spinning');
      return;
    }

    const { symbolIds, onComplete } = result;

    // 驗證結果數量
    if (symbolIds.length !== this.config.numberOfReels) {
      console.error(`Expected ${this.config.numberOfReels} reels, got ${symbolIds.length}`);
      return;
    }

    // 計算已經旋轉的時間
    const elapsedTime = Date.now() - this.spinStartTime;
    const remainingTime = Math.max(0, this.timingConfig.minSpinDuration - elapsedTime);

    let stoppedCount = 0;

    // 依序停止每個 reel
    this.reels.forEach((reel, index) => {
      const stopDelay = remainingTime + (index * this.timingConfig.stopInterval);
      console.log('wheel::stopSpin', stopDelay);
      setTimeout(() => {
        // 確保傳入的符號數量正確
        const reelSymbols = symbolIds[index] || [];
        if (reelSymbols.length !== this.config.symbolsPerReel) {
          console.error(`Reel ${index}: Expected ${this.config.symbolsPerReel} symbols, got ${reelSymbols.length}`);
        }

        reel.stopSpin(reelSymbols, () => {
          stoppedCount++;
          
          // 所有 reel 都停止後執行回調
          if (stoppedCount === this.reels.length) {
            this.isSpinning = false;
            onComplete?.();
          }
        });
      }, stopDelay);
    });
  }

  /**
   * 立即停止（無動畫）
   */
  public forceStop(): void {
    this.reels.forEach(reel => reel.forceStop());
    this.isSpinning = false;
  }

  /**
   * 獲取當前符號
   */
  public getCurrentSymbols(): number[][] {
    return this.reels.map(reel => reel.getCurrentSymbols());
  }

  /**
   * 獲取是否正在旋轉
   */
  public getIsSpinning(): boolean {
    return this.isSpinning;
  }

  /**
   * 更新速度配置
   */
  public updateSpeedConfig(config: Partial<SpeedConfig>): void {
    this.speedConfig = { ...this.speedConfig, ...config };
  }

  /**
   * 更新時間配置
   */
  public updateTimingConfig(config: Partial<TimingConfig>): void {
    this.timingConfig = { ...this.timingConfig, ...config };
  }

  /**
   * 獲取速度配置
   */
  public getSpeedConfig(): SpeedConfig {
    return { ...this.speedConfig };
  }

  /**
   * 獲取時間配置
   */
  public getTimingConfig(): TimingConfig {
    return { ...this.timingConfig };
  }

  /**
   * 獲取捲軸陣列
   */
  protected getReels(): Reel<T>[] {
    return this.reels;
  }

  /**
   * 銷毀
   */
  public destroy(options?: any): void {
    this.reels.forEach(reel => reel.destroy(options));
    this.reels = [];
    super.destroy(options);
  }
}