import * as PIXI from 'pixi.js';
import { BaseSymbol } from './BaseSymbol';

/**
 * 捲軸配置
 */
export interface ReelConfig {
  width: number;
  height: number;
  symbolsPerReel: number;
  startSpeed?: number;
  maxSpeed?: number;
  endSpeed?: number;
  acceleration?: number;
  deceleration?: number;
}

/**
 * Reel 狀態
 */
enum ReelState {
  IDLE = 'idle',//閒置
  ACCELERATING = 'accelerating',//加速
  SPINNING = 'spinning',//高速轉動
  DECELERATING = 'decelerating',//減速
  ALIGNING = 'aligning'//對齊
}

/**
 * 基礎捲軸類別
 */
export class Reel<T extends BaseSymbol> extends PIXI.Container {
  protected symbols: T[] = [];
  protected symbolHeight: number;
  protected config: ReelConfig;
  protected state: ReelState = ReelState.IDLE;
  
  // 動畫相關
  protected animationId: number | null = null;
  protected lastTime: number = 0;
  protected currentSpeed: number = 0;
  
  // 停止相關
  protected targetSymbols: number[] = [];
  protected stopCallback?: () => void;
  protected symbolsSetup: boolean = false;
  // 符號到目標符號的映射（用於追蹤每個符號在最終停止時應該顯示哪個目標符號）
  protected symbolTargetMap: Map<T, number> = new Map();

  constructor(
    config: ReelConfig,
    private symbolFactory: () => T,
    private getRandomSymbolId: () => number
  ) {
    super();
    
    this.config = {
      startSpeed: 5,
      maxSpeed: 30,
      endSpeed: 3,
      acceleration: 40,
      deceleration: 25,
      ...config
    };
    
    this.symbolHeight = config.height / config.symbolsPerReel;
    this.createSymbols();
  }

  /**
   * 創建符號
   */
  protected createSymbols(): void {
    // 創建 symbolsPerReel + 2 個符號（上下各一個緩衝）
    const totalSymbols = this.config.symbolsPerReel + 2;
    
    for (let i = 0; i < totalSymbols; i++) {
      const symbol = this.symbolFactory();
      symbol.setSymbol(this.getRandomSymbolId());
      symbol.y = (i - 1) * this.symbolHeight;
      
      this.symbols.push(symbol);
      this.addChild(symbol);
    }
  }

  /**
   * 開始旋轉
   */
  public startSpin(): void {
    if (this.state !== ReelState.IDLE) return;
    
    this.state = ReelState.ACCELERATING;
    this.currentSpeed = this.config.startSpeed!;
    this.lastTime = performance.now();
    this.symbolsSetup = false;
    
    this.animate();
  }

  /**
   * 主動畫循環
   */
  protected animate = (currentTime: number = performance.now()): void => {
    if (this.state === ReelState.IDLE) return;
    
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    const deltaSeconds = deltaTime / 1000;
    
    // 根據狀態更新速度
    this.updateSpeed(deltaSeconds);
    // 移動符號
    this.moveSymbols(deltaSeconds);
    
    // 繼續動畫
    this.animationId = requestAnimationFrame(this.animate);
  }

  /**
   * 更新速度
   */
  protected updateSpeed(deltaSeconds: number): void {
    switch (this.state) {
      case ReelState.ACCELERATING:
        this.currentSpeed += this.config.acceleration! * deltaSeconds;
        if (this.currentSpeed >= this.config.maxSpeed!) {
          this.currentSpeed = this.config.maxSpeed!;
          this.state = ReelState.SPINNING;
        }
        break;
        
      case ReelState.DECELERATING:
        this.currentSpeed -= this.config.deceleration! * deltaSeconds;
        if (this.currentSpeed <= this.config.endSpeed!) {
          this.currentSpeed = this.config.endSpeed!;
          this.state = ReelState.ALIGNING;
          // 進入對齊狀態時，預先計算每個符號在最終停止時應該顯示的目標符號
          this.prepareTargetSymbols();
        }
        break;
        
      case ReelState.ALIGNING:
        // 對齊階段保持低速
        this.currentSpeed = this.config.endSpeed!;
        break;
    }
  }

  /**
   * 移動符號
   */
  protected moveSymbols(deltaSeconds: number): void {
    const moveDistance = this.currentSpeed * this.symbolHeight * deltaSeconds;
    
    this.symbols.forEach((symbol) => {
      symbol.y += moveDistance;
      
      // 符號超出底部，循環到頂部
      if (symbol.y >= this.config.height + this.symbolHeight) {
        const totalSymbols = this.config.symbolsPerReel + 2;
        symbol.y -= totalSymbols * this.symbolHeight;
        
        // 根據狀態設置符號
        if (this.state === ReelState.ALIGNING && !this.symbolsSetup) {
          // 在對齊階段，設置目標符號
          this.setupTargetSymbol(symbol);
        } else {
          // 其他階段使用隨機符號
          symbol.setSymbol(this.getRandomSymbolId());
        }
      }
    });
    
    
    // 檢查是否對齊完成
    if (this.state === ReelState.ALIGNING) {
      this.checkAlignment();
    }
  }

  /**
   * 設置所有符號為目標符號（在對齊階段使用）
   */
  protected setupAllTargetSymbolsOnAlign(): void {
    if (this.targetSymbols.length === 0) return;
    
    const sortedSymbols = [...this.symbols].sort((a, b) => a.y - b.y);
    
    // 設置可見區域的符號（跳過頂部緩衝符號）
    for (let i = 1; i <= this.config.symbolsPerReel; i++) {
      const symbol = sortedSymbols[i];
      const targetIndex = i - 1;
      if (targetIndex < this.targetSymbols.length) {
        symbol.setSymbol(this.targetSymbols[targetIndex]);
      }
    }
  }

  /**
   * 設置所有符號為目標符號（立即設置，用於進入對齊狀態時）
   */
  protected setupAllTargetSymbols(): void {
    if (this.targetSymbols.length === 0) return;
    
    const sortedSymbols = [...this.symbols].sort((a, b) => a.y - b.y);
    
    // 設置可見區域的符號（跳過頂部緩衝符號）
    for (let i = 1; i <= this.config.symbolsPerReel; i++) {
      const symbol = sortedSymbols[i];
      const targetIndex = i - 1;
      if (targetIndex < this.targetSymbols.length) {
        symbol.setSymbol(this.targetSymbols[targetIndex]);
      }
    }
  }

  /**
   * 預先準備目標符號映射
   * 計算每個符號在最終停止時應該顯示哪個目標符號
   */
  protected prepareTargetSymbols(): void {
    if (this.targetSymbols.length === 0) return;
    
    this.symbolTargetMap.clear();
    
    // 計算所有符號的當前位置
    const sortedSymbols = [...this.symbols].sort((a, b) => a.y - b.y);
    
    // 為每個符號計算它在最終停止時會在哪個可見位置
    // 符號從當前位置往下滾動，最終停止時：
    // - 頂部緩衝符號（index 0）最終會移動到最後一個可見位置 -> targetSymbols[最後一個]
    // - 第一個可見符號（index 1）最終會保持在第一個可見位置 -> targetSymbols[0]
    // - 第二個可見符號（index 2）最終會保持在第二個可見位置 -> targetSymbols[1]
    // - 以此類推
    
    sortedSymbols.forEach((symbol, index) => {
      if (index === 0) {
        // 頂部緩衝符號，最終會移動到最後一個可見位置
        this.symbolTargetMap.set(symbol, this.targetSymbols[this.targetSymbols.length - 1]);
      } else if (index <= this.config.symbolsPerReel) {
        // 可見區域的符號，最終會保持在對應的可見位置
        const targetIndex = index - 1;
        if (targetIndex < this.targetSymbols.length) {
          this.symbolTargetMap.set(symbol, this.targetSymbols[targetIndex]);
        }
      }
      // 底部緩衝符號不需要設置，因為它們不會進入可見區域
    });
  }

  /**
   * 設置目標符號（當符號循環到頂部時）
   * 根據預先計算的映射來設置對應的目標符號
   */
  protected setupTargetSymbol(symbol: T): void {
    if (this.targetSymbols.length === 0) {
      symbol.setSymbol(this.getRandomSymbolId());
      return;
    }
    
    // 從映射中獲取這個符號應該顯示的目標符號
    const targetId = this.symbolTargetMap.get(symbol);
    if (targetId !== undefined) {
      symbol.setSymbol(targetId);
    } else {
      // 如果映射中沒有，說明這個符號是新循環到頂部的
      // 當符號循環到頂部時，它會成為新的頂部緩衝符號
      // 隨著滾動，它會往下移動，最終會移動到最下面的可見位置
      // 所以它應該設置為目標的最後一個符號
      symbol.setSymbol(this.targetSymbols[this.targetSymbols.length - 1]);
      // 同時更新映射
      this.symbolTargetMap.set(symbol, this.targetSymbols[this.targetSymbols.length - 1]);
    }
  }

  /**
   * 檢查對齊
   */
  protected checkAlignment(): void {
    // 檢查所有符號是否都設置了目標圖案
    if (!this.symbolsSetup) {
      const sortedSymbols = [...this.symbols].sort((a, b) => a.y - b.y);
      let allSetup = true;
      
      for (let i = 1; i <= this.config.symbolsPerReel; i++) {
        const symbol = sortedSymbols[i];
        const expectedId = this.targetSymbols[i - 1];
        if (symbol.getSymbolId() !== expectedId) {
          allSetup = false;
          break;
        }
      }
      
      if (allSetup) {
        this.symbolsSetup = true;
      }
      return;
    }
    
    // 檢查位置是否對齊
    let allAligned = true;
    const tolerance = 5; // 容差（增加到 5 像素，加快停止速度）
    
    // 先按 y 座標排序符號
    const sortedSymbols = [...this.symbols].sort((a, b) => a.y - b.y);
    
    sortedSymbols.forEach((symbol, i) => {
      const targetY = (i - 1) * this.symbolHeight;
      const distance = Math.abs(symbol.y - targetY);
      
      if (distance > tolerance) {
        // 微調位置（加快對齊速度）
        if (symbol.y < targetY) {
          allAligned = false;
          // 增加移動速度，加快對齊
          symbol.y = Math.min(symbol.y + this.currentSpeed * this.symbolHeight * 5, targetY);
        } else {
          // 如果超過目標位置，直接設置到目標位置
          symbol.y = targetY;
        }
      } else {
        // 在容差範圍內，直接對齊
        symbol.y = targetY;
      }
    });
    
    // 對齊完成
    if (allAligned) {
      this.stopAnimation();
    }
  }

  /**
   * 停止動畫
   */
  protected stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.state = ReelState.IDLE;
    this.currentSpeed = 0;
    
    if (this.stopCallback) {
      this.stopCallback();
      this.stopCallback = undefined;
    }
  }

  /**
   * 停止旋轉
   */
  public stopSpin(targetSymbols: number[], callback?: () => void): void {
    if (this.state === ReelState.IDLE) {
      console.warn('Reel is not spinning');
      return;
    }
    
    // 驗證符號數量
    if (targetSymbols.length !== this.config.symbolsPerReel) {
      console.error(`Expected ${this.config.symbolsPerReel} symbols, got ${targetSymbols.length}`);
      return;
    }
    
    this.targetSymbols = [...targetSymbols];
    this.stopCallback = callback;
    this.symbolsSetup = false;
    this.symbolTargetMap.clear(); // 清空映射，準備重新計算
    
    // 進入減速狀態
    if (this.state === ReelState.ACCELERATING || this.state === ReelState.SPINNING) {
      this.state = ReelState.DECELERATING;
    }
  }

  /**
   * 立即停止
   */
  public forceStop(): void {
    this.stopAnimation();
    
    // 對齊符號位置
    this.symbols.forEach((symbol, i) => {
      symbol.y = (i - 1) * this.symbolHeight;
    });
  }

  /**
   * 獲取當前符號
   */
  public getCurrentSymbols(): number[] {
    // 返回可見區域的符號（按順序）
    const sortedSymbols = [...this.symbols].sort((a, b) => a.y - b.y);
    return sortedSymbols
      .slice(1, this.config.symbolsPerReel + 1)
      .map(symbol => symbol.getSymbolId());
  }

  /**
   * 獲取當前狀態
   */
  public getState(): string {
    return this.state;
  }

  /**
   * 獲取當前速度
   */
  public getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  /**
   * 銷毀
   */
  public destroy(options?: any): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    super.destroy(options);
  }
}