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
  protected animateFunc: number | null = null;
  protected isSpinning: boolean = false;
  protected config: ReelConfig;
  
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
    for (let i = 0; i < this.config.symbolsPerReel + 2; i++) {
      const symbol = this.symbolFactory();
      const symbolId = this.getRandomSymbolId();
      symbol.setSymbol(symbolId);      
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
    const spinSpeed = this.config.spinSpeed || 30;
    
    const animate = () => {
      if (!this.isSpinning) return;
      
      // 移動所有符號
      this.symbols.forEach((symbol) => {
        symbol.y += spinSpeed;
        
        // 如果符號滾出底部，將它移到頂部並替換成隨機符號
        if (symbol.y >= this.config.height) {
          symbol.y -= this.config.height + this.symbolHeight;
          
          // 隨機更換符號
          const randomSymbolId = this.getRandomSymbolId();
          symbol.setSymbol(randomSymbolId);
        }
      });
    };
    
    this.animateFunc = setInterval(animate, 1000 / 60) as unknown as number;
  }

  /**
   * 停止旋轉
   */
  public stopSpin(resultSymbols: number[], callback?: () => void): void {
    if (!this.isSpinning) return;
    
    // 停止動畫
    if (this.animateFunc !== null) {
      clearInterval(this.animateFunc);
      this.animateFunc = null;
    }
    
    // 更新符號為結果符號
    resultSymbols.forEach((symbolId, i) => {
      if (this.symbols[i+1]) {
        this.symbols[i+1].setSymbol(symbolId);//因為最上方和最下方是空白的，所以需要+1
      }
    });
    
    // 平滑停止並對齊
    this.smoothStop(callback);
  }

  /**
   * 平滑停止
   */
  protected smoothStop(callback?: () => void): void {
    let currentSpeed = 20;
    const deceleration = this.config.stopDeceleration || 2;
    
    const slowDown = () => {
      if (currentSpeed > 0) {
        currentSpeed = Math.max(0, currentSpeed - deceleration);
        
        this.symbols.forEach((symbol) => {
          symbol.y += currentSpeed;
          
          // 循環滾動
          if (symbol.y >= this.config.height) {
            symbol.y -= this.config.height + this.symbolHeight;
          }
        });
        
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
    if (this.animateFunc !== null) {
      clearInterval(this.animateFunc);
    }
    super.destroy();
  }
}

