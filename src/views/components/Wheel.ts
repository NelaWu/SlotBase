import * as PIXI from 'pixi.js';
import { BaseSymbol } from './BaseSymbol';
import { Reel, ReelConfig } from './Reel';

/**
 * 輪盤配置
 */
export interface WheelConfig {
  reelWidth: number;
  reelHeight: number;
  numberOfReels: number;
  symbolsPerReel: number;
  reelSpacing?: number;
  spinSpeed?: number;
  stopDeceleration?: number;
  startDelay?: number; // 每個 reel 開始旋轉的延遲時間（毫秒）
  stopDelay?: number; // 每個 reel 停止的延遲時間（毫秒）
}

/**
 * 基礎輪盤類別
 * 管理多個 Reel
 */
export abstract class Wheel<T extends BaseSymbol> extends PIXI.Container {
  protected reels: Reel<T>[] = [];
  protected config: WheelConfig;

  constructor(config: WheelConfig) {
    super();
    this.config = {
      reelSpacing: 0,
      spinSpeed: 30,
      stopDeceleration: 2,
      startDelay: 150,
      stopDelay: 150,
      ...config
    };
    this.createReels();
  }

  /**
   * 創建 Symbol 的工廠方法
   * 子類必須實現此方法
   */
  protected abstract createSymbol(): T;

  /**
   * 獲取隨機符號 ID
   * 子類必須實現此方法
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
      spinSpeed: this.config.spinSpeed,
      stopDeceleration: this.config.stopDeceleration
    };

    for (let i = 0; i < this.config.numberOfReels; i++) {
      const reel = new Reel<T>(
        reelConfig,
        () => this.createSymbol(),
        () => this.getRandomSymbolId()
      );

      reel.x = i * (this.config.reelWidth + (this.config.reelSpacing || 0))+this.config.reelWidth/2;
      reel.y = this.config.reelHeight/this.config.numberOfReels/2;

      this.reels.push(reel);
      this.addChild(reel);
    }
  }

  /**
   * 開始旋轉所有捲軸
   */
  public startSpin(): void {
    this.reels.forEach((reel,reelIndex) => {
      setTimeout(() => {
        reel.startSpin();
      }, reelIndex * this.config.startDelay!);
    });
  }

  /**
   * 停止旋轉所有捲軸
   * @param results 每個捲軸的結果符號 ID 陣列
   * @param callback 所有捲軸停止後的回調
   */
  public stopSpin(results: number[][], callback?: () => void): void {
    let stoppedCount = 0;

    // 逐個停止捲軸（從左到右，延遲停止）
    this.reels.forEach((reel, reelIndex) => {
      setTimeout(() => {
        reel.stopSpin(results[reelIndex] || [], () => {
          stoppedCount++;
          
          // 最後一個捲軸停止後，執行回調
          if (stoppedCount === this.reels.length) {
            callback?.();
          }
        });
      }, reelIndex * (this.config.stopDelay || 150));
    });
  }

  /**
   * 獲取所有捲軸的當前符號
   */
  public getCurrentSymbols(): number[][] {
    return this.reels.map(reel => reel.getCurrentSymbols());
  }

  /**
   * 獲取捲軸陣列（供子類使用）
   */
  protected getReels(): Reel<T>[] {
    return this.reels;
  }

  /**
   * 銷毀
   */
  public destroy(): void {
    this.reels.forEach(reel => reel.destroy());
    super.destroy();
  }
}

