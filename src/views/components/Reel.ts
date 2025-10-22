import * as PIXI from 'pixi.js';
import { BaseSymbol } from './BaseSymbol';

/**
 * 捲軸配置
 */
export interface ReelConfig {
  width: number;
  height: number;
  symbolsPerReel: number;
  spinSpeed?: number;
  stopDeceleration?: number;
}

/**
 * 基礎捲軸類別
 * 泛型 T 是 Symbol 類型，必須繼承 BaseSymbol
 */
export class Reel<T extends BaseSymbol> extends PIXI.Container {
  protected symbols: T[] = [];
  protected symbolHeight: number;
  protected animationId: number | null = null; // 改用 requestAnimationFrame ID
  protected isSpinning: boolean = false;
  protected config: ReelConfig;
  protected resultSymbols: number[] = []; // 存儲結果符號
  protected lastTime: number = 0; // 記錄上次動畫時間
  protected isStopping: boolean = false; // 是否正在停止
  protected stopProgress: number = 0; // 停止進度 (0-1)
  
  constructor(
    config: ReelConfig,
    private symbolFactory: () => T,
    private getRandomSymbolId: () => number
  ) {
    super();
    this.config = {
      spinSpeed: 30,
      stopDeceleration: 2,
      ...config
    };
    this.symbolHeight = config.height / config.symbolsPerReel;
    this.createSymbols();
  }

  /**
   * 創建符號
   */
  protected createSymbols(): void {
    const totalSymbols = this.config.symbolsPerReel + 2; // 5個可見 + 2個緩衝
    
    for (let i = 0; i < totalSymbols; i++) {
      const symbol = this.symbolFactory();
      const symbolId = this.getRandomSymbolId();
      symbol.setSymbol(symbolId);
      
      // ✅ 確保符號位置不重疊
      // 第0個符號在 -symbolHeight（頂部緩衝）
      // 第1-5個符號在 0, symbolHeight, 2*symbolHeight, 3*symbolHeight, 4*symbolHeight（可見區域）
      // 第6個符號在 5*symbolHeight（底部緩衝）
      symbol.y = (i - 1) * this.symbolHeight;
      
      this.symbols.push(symbol);
      this.addChild(symbol);
    }
  }

  /**
   * 開始旋轉
   */
  public startSpin(): void {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    this.lastTime = performance.now(); // 記錄開始時間
    
    // ✅ 使用 requestAnimationFrame 實現平滑動畫
    this.animate();
  }

  /**
   * 動畫循環（使用 requestAnimationFrame）
   */
  private animate = (currentTime: number = performance.now()): void => {
    if (!this.isSpinning) return;
    
    // 計算時間差（毫秒）
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // 將時間差轉換為幀數（假設 60 FPS）
    const frameTime = deltaTime / (1000 / 60);
    const spinSpeed = (this.config.spinSpeed || 30) * frameTime;
    
    // 移動所有符號
    this.symbols.forEach((symbol) => {
      symbol.y += spinSpeed;
      
      if (symbol.y >= this.config.height) {
        // 計算符號應該移動到的正確位置
        const totalSymbols = this.config.symbolsPerReel + 2; // 總符號數
        const cycleHeight = totalSymbols * this.symbolHeight; // 一個完整循環的高度
        
        // 將符號移動到頂部（負值區域）
        symbol.y -= cycleHeight;
        
        // ✅ 如果正在停止，根據停止進度決定是否替換符號
        if (this.isStopping && this.resultSymbols.length > 0) {
          this.checkAndReplaceSymbol(symbol);
        } else {
          // 隨機更換符號
          const randomSymbolId = this.getRandomSymbolId();
          symbol.setSymbol(randomSymbolId);
        }
      }
    });
    
    // 繼續下一幀
    this.animationId = requestAnimationFrame(this.animate);
  }

  /**
   * 停止旋轉
   */
  public stopSpin(resultSymbols: number[], callback?: () => void): void {
    if (!this.isSpinning) return;
    
    // 存儲結果符號
    this.resultSymbols = [...resultSymbols];
    this.isStopping = true;
    this.stopProgress = 0;
    
    // 停止動畫
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // ✅ 開始漸進式停止：逐個符號替換
    this.startProgressiveStop(callback);
  }

  /**
   * 開始漸進式停止
   */
  private startProgressiveStop(callback?: () => void): void {
    let currentSpeed = 20;
    const deceleration = this.config.stopDeceleration || 2;
    let lastStopTime = performance.now();
    let replacedSymbols = 0; // 已替換的符號數量
    
    const slowDown = (currentTime: number = performance.now()): void => {
      if (currentSpeed > 0) {
        // 計算時間差
        const deltaTime = currentTime - lastStopTime;
        lastStopTime = currentTime;
        
        // 基於時間的減速
        const frameTime = deltaTime / (1000 / 60);
        currentSpeed = Math.max(0, currentSpeed - deceleration * frameTime);
        
        // ✅ 根據停止進度決定是否替換下一個符號
        const totalVisibleSymbols = this.config.symbolsPerReel; // 5個可見符號
        const shouldReplaceNext = replacedSymbols < totalVisibleSymbols && 
                                 currentSpeed < (20 - (replacedSymbols * 3)); // 漸進式替換
        
        this.symbols.forEach((symbol) => {
          symbol.y += currentSpeed * frameTime;
          
          // 循環滾動邏輯
          if (symbol.y >= this.config.height) {
            const totalSymbols = this.config.symbolsPerReel + 2;
            const cycleHeight = totalSymbols * this.symbolHeight;
            
            symbol.y -= cycleHeight;
            
            // ✅ 漸進式替換：從最後一個結果符號開始
            if (shouldReplaceNext && this.resultSymbols.length > 0) {
              const resultIndex = totalVisibleSymbols - 1 - replacedSymbols; // 從最後一個開始
              if (resultIndex >= 0 && resultIndex < this.resultSymbols.length) {
                symbol.setSymbol(this.resultSymbols[resultIndex]);
                replacedSymbols++;
                console.log(`替換符號 ${replacedSymbols}/${totalVisibleSymbols}: 結果 ${this.resultSymbols[resultIndex]}`);
              }
            } else {
              // 使用隨機符號
              const randomSymbolId = this.getRandomSymbolId();
              symbol.setSymbol(randomSymbolId);
            }
          }
        });
        
        requestAnimationFrame(slowDown);
      } else {
        // 對齊到整數位置
        this.alignSymbols();
        this.isSpinning = false;
        this.isStopping = false;
        callback?.();
      }
    };
    
    slowDown();
  }

  /**
   * 設置所有符號為結果（包括不可見區域）
   */
  private setAllSymbolsToResult(resultSymbols: number[]): void {
    this.symbols.forEach((symbol) => {
      const symbolY = symbol.y;
      
      // 計算這個符號在結果陣列中的對應位置
      let resultIndex = -1;
      
      if (symbolY >= 0 && symbolY < this.config.height) {
        // 可見區域的符號
        resultIndex = Math.floor(symbolY / this.symbolHeight);
      } else if (symbolY < 0) {
        // 頂部準備區域的符號
        resultIndex = Math.floor((symbolY + this.config.height) / this.symbolHeight);
      } else if (symbolY >= this.config.height) {
        // 底部緩衝區域的符號
        const totalSymbols = this.config.symbolsPerReel + 2;
        const cycleHeight = totalSymbols * this.symbolHeight;
        resultIndex = Math.floor((symbolY - cycleHeight) / this.symbolHeight);
      }
      
      // 設置對應的結果符號
      if (resultIndex >= 0 && resultIndex < resultSymbols.length) {
        symbol.setSymbol(resultSymbols[resultIndex]);
      } else {
        // 如果計算出的位置超出範圍，使用循環
        const safeIndex = resultIndex % resultSymbols.length;
        if (safeIndex >= 0) {
          symbol.setSymbol(resultSymbols[safeIndex]);
        }
      }
    });
  }


  /**
   * 平滑停止
   */
  protected smoothStop(callback?: () => void): void {
    let currentSpeed = 20;
    const deceleration = this.config.stopDeceleration || 2;
    let lastStopTime = performance.now();
    
    const slowDown = (currentTime: number = performance.now()): void => {
      if (currentSpeed > 0) {
        // 計算時間差
        const deltaTime = currentTime - lastStopTime;
        lastStopTime = currentTime;
        
        // 基於時間的減速
        const frameTime = deltaTime / (1000 / 60);
        currentSpeed = Math.max(0, currentSpeed - deceleration * frameTime);
        
        this.symbols.forEach((symbol) => {
          symbol.y += currentSpeed * frameTime;
          
          // ✅ 修復循環滾動邏輯，與 startSpin 保持一致
          if (symbol.y >= this.config.height) {
            const totalSymbols = this.config.symbolsPerReel + 2;
            const cycleHeight = totalSymbols * this.symbolHeight;
            
            symbol.y -= cycleHeight;
            
            // ✅ 提前替換符號：在符號滾到頂部時立即設置正確結果
            this.setSymbolForPosition(symbol);
          }
        });
        
        // ✅ 額外檢查：為即將進入可見區域的符號提前設置結果
        this.preSetUpcomingSymbols();
        
        requestAnimationFrame(slowDown);
      } else {
        // 對齊到整數位置
        this.alignSymbols();
        this.isSpinning = false;
        callback?.();
      }
    };
    
    slowDown();
  }

  /**
   * 為即將進入可見區域的符號提前設置結果
   */
  private preSetUpcomingSymbols(): void {
    this.symbols.forEach((symbol) => {
      const symbolY = symbol.y;
      
      // 如果符號在頂部準備區域（y < 0），提前設置結果
      if (symbolY < 0) {
        // 計算這個符號滾下來後會在哪個可見位置
        const futureVisiblePosition = Math.floor((symbolY + this.config.height) / this.symbolHeight);
        if (futureVisiblePosition >= 0 && futureVisiblePosition < this.resultSymbols.length) {
          symbol.setSymbol(this.resultSymbols[futureVisiblePosition]);
        }
      }
      // 如果符號在底部緩衝區域（y >= height），提前設置結果
      else if (symbolY >= this.config.height) {
        // 計算這個符號滾到頂部後會在哪個可見位置
        const totalSymbols = this.config.symbolsPerReel + 2;
        const cycleHeight = totalSymbols * this.symbolHeight;
        const futureVisiblePosition = Math.floor((symbolY - cycleHeight) / this.symbolHeight);
        if (futureVisiblePosition >= 0 && futureVisiblePosition < this.resultSymbols.length) {
          symbol.setSymbol(this.resultSymbols[futureVisiblePosition]);
        }
      }
    });
  }

  /**
   * 檢查並替換符號（在動畫過程中）
   */
  private checkAndReplaceSymbol(symbol: T): void {
    // 在動畫過程中，根據停止進度決定是否替換
    // 這裡可以添加更複雜的邏輯
    const randomSymbolId = this.getRandomSymbolId();
    symbol.setSymbol(randomSymbolId);
  }

  /**
   * 為指定位置的符號設置正確的圖案
   */
  private setSymbolForPosition(symbol: T): void {
    // 計算符號應該在哪個位置
    const targetY = symbol.y;
    const positionIndex = Math.floor(targetY / this.symbolHeight);
    
    // 根據位置設置對應的符號
    if (positionIndex >= 0 && positionIndex < this.resultSymbols.length) {
      symbol.setSymbol(this.resultSymbols[positionIndex]);
    } else {
      // 如果沒有結果數據，使用隨機符號
      const randomSymbolId = this.getRandomSymbolId();
      symbol.setSymbol(randomSymbolId);
    }
  }

  /**
   * 對齊符號到正確位置
   */
  protected alignSymbols(): void {
    this.symbols.forEach((symbol, i) => {
      const targetY = (i - 1) * this.symbolHeight;
      symbol.y = targetY;
    });
  }


  /**
   * 獲取當前符號
   */
  public getCurrentSymbols(): number[] {
    return this.symbols.map(symbol => symbol.getSymbolId());
  }

  /**
   * 銷毀
   */
  public destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    super.destroy();
  }
}

