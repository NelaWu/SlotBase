import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { TitansSymbol } from '../symbol/TitansSymbol';

/**
 * 掉落動畫配置
 */
export interface DropAnimationConfig {
  /** 掉落速度（像素/秒） */
  dropSpeed: number;
  /** 重力加速度（像素/秒²） */
  gravity: number;
  /** 彈跳係數 (0-1) */
  bounce: number;
  /** 每列符號掉落的延遲（毫秒） */
  columnDelay: number;
  /** 每行符號掉落的延遲（毫秒） */
  rowDelay: number;
}

/**
 * Titans 遊戲的輪盤配置
 */
export interface TitansWheelConfig {
  reelWidth: number;
  reelHeight: number;
  numberOfReels?: number;
  symbolsPerReel?: number;
  animation?: Partial<DropAnimationConfig>;
}

/**
 * 符號狀態
 */
interface SymbolState {
  symbol: TitansSymbol;
  targetY: number;
  velocityY: number;
  isDropping: boolean;
  row: number;
  col: number;
  dropStarted: boolean;
  hasTriggeredNext: boolean;
}

/**
 * Titans 遊戲的輪盤類別 - 掉落式動畫
 */
export class TitansWheel extends PIXI.Container {
  private symbolStates: SymbolState[][] = []; // [col][row]
  private config: Required<TitansWheelConfig>;
  private animationConfig: DropAnimationConfig;
  private symbolWidth: number;
  private symbolHeight: number;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private isAnimating: boolean = false;
  private dropCompleteCallback?: () => void;

  constructor(config: TitansWheelConfig) {
    super();

    // 預設配置
    this.config = {
      numberOfReels: 6,
      symbolsPerReel: 5,
      ...config
    } as Required<TitansWheelConfig>;

    // 預設動畫配置
    this.animationConfig = {
      dropSpeed: 3000,      // 初始掉落速度
      gravity: 2000,       // 重力加速度
      bounce: 0.1,         // 彈跳係數
      columnDelay: 100,     // 每列延遲 50ms
      rowDelay: 0,        // 每行延遲 50ms
      ...config.animation
    };

    this.symbolWidth = config.reelWidth;
    this.symbolHeight = config.reelHeight / this.config.symbolsPerReel;

    // 創建遮罩
    this.createMask();

    // 初始化：顯示隨機待機牌面
    this.createIdleSymbols();
  }

  /**
   * 創建遮罩
   */
  private createMask(): void {
    const maskGraphics = new PIXI.Graphics();
    maskGraphics.beginFill(0x000000);
    maskGraphics.drawRect(
      0,
      0,
      this.symbolWidth * this.config.numberOfReels,
      this.config.reelHeight
    );
    maskGraphics.endFill();
    this.mask = maskGraphics;
    this.addChild(maskGraphics);
  }

  /**
   * 創建待機狀態的隨機符號
   */
  private createIdleSymbols(): void {
    for (let col = 0; col < this.config.numberOfReels; col++) {
      this.symbolStates[col] = [];
      
      for (let row = 0; row < this.config.symbolsPerReel; row++) {
        const symbol = new TitansSymbol();
        symbol.setSymbol(this.getRandomSymbolId());
        
        const x = col * this.symbolWidth + this.symbolWidth / 2;
        const y = row * this.symbolHeight + this.symbolHeight / 2;
        symbol.position.set(x, y);
        
        this.addChild(symbol);
        
        this.symbolStates[col][row] = {
          symbol,
          targetY: y,
          velocityY: 0,
          isDropping: false,
          row,
          col,
          dropStarted: false,
          hasTriggeredNext: false
        };
      }
    }
  }

  /**
   * 清空所有符號
   */
  private clearSymbols(): void {
    
    this.symbolStates.forEach(col => {
      col.forEach(state => {
        console.log('clear symbol', state);
        gsap.to(state.symbol, {
          y: this.config.reelHeight + this.symbolHeight,
          duration: 0.17*(this.config.symbolsPerReel - state.row),
          delay: 0.1*state.col,
          ease: 'power2.inOut',
          onComplete: () => {
            state.symbol.destroy();
          }
        });
      });
    });
    // this.symbolStates = [];
  }

  /**
   * 開始旋轉（清空 + 掉落新符號）
   */
  public startSpin(): void {
    if (this.isAnimating) {
      console.warn('Animation is already running');
      return;
    }

    // 清空現有符號
    this.clearSymbols();
  }

  /**
   * 停止旋轉（掉落指定的結果符號）
   */
  public stopSpin(result: { symbolIds: number[][], onComplete?: () => void }): void {
    const { symbolIds, onComplete } = result;
    // 驗證結果數量
    if (symbolIds.length !== this.config.numberOfReels) {
      console.error(`Expected ${this.config.numberOfReels} reels, got ${symbolIds.length}`);
      return;
    }

    this.dropCompleteCallback = onComplete;
    // 創建新符號並準備掉落
    for (let col = 0; col < this.config.numberOfReels; col++) {
      this.symbolStates[col] = [];
      const colSymbols = symbolIds[col];

      if (colSymbols.length !== this.config.symbolsPerReel) {
        console.error(`Column ${col}: Expected ${this.config.symbolsPerReel} symbols, got ${colSymbols.length}`);
      }

      for (let row = 0; row < this.config.symbolsPerReel; row++) {
        const symbol = new TitansSymbol();
        const symbolId = colSymbols[row] || this.getRandomSymbolId();
        symbol.setSymbol(symbolId);

        // 設置起始位置（在畫面上方）
        const x = col * this.symbolWidth + this.symbolWidth / 2;
        const startY = -this.config.reelHeight/this.config.symbolsPerReel;
        const targetY = row * this.symbolHeight + this.symbolHeight / 2;

        symbol.position.set(x, startY);
        this.addChild(symbol);

        this.symbolStates[col][row] = {
          symbol,
          targetY,
          velocityY: 0,
          isDropping: false,
          row,
          col,
          dropStarted: false,
          hasTriggeredNext: false
        };
      }
    }

    // 開始掉落動畫（延遲啟動每個符號）
    this.startDropAnimation();
  }

  /**
   * 開始掉落動畫
   */
  private startDropAnimation(): void {
    this.isAnimating = true;
    this.lastTime = performance.now();

    // 依照列延遲啟動每一列的掉落（同一列的符號一起掉落）
    this.symbolStates.forEach((col, colIndex) => {
      const delay = colIndex * this.animationConfig.columnDelay;

      setTimeout(() => {
        const bottomIndex = col.length - 1;
        if (bottomIndex >= 0) {
          this.startSymbolDrop(colIndex, bottomIndex);
        }
      }, delay);
    });

    this.animate();
  }

  /**
   * 動畫循環
   */
  private animate = (currentTime: number = performance.now()): void => {
    if (!this.isAnimating) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    const deltaSeconds = deltaTime / 1000;

    let allSettled = true;

    // 更新每個符號的位置
    this.symbolStates.forEach(col => {
      col.forEach(state => {
        if (!state.dropStarted) {
          allSettled = false;
          return;
        }

        const symbol = state.symbol;

        // 如果還沒到達目標位置
        if (symbol.y < state.targetY) {
          // 當符號下落到上一個符號的目標位置時，啟動上一個符號
          if (state.row > 0 && !state.hasTriggeredNext) {
            const nextState = this.symbolStates[state.col][state.row - 1];
            if (symbol.y >= this.config.reelHeight/this.config.symbolsPerReel) {
              state.hasTriggeredNext = true;
              this.startSymbolDrop(state.col, state.row - 1);
            }
          }

          // 應用重力
          state.velocityY += this.animationConfig.gravity * deltaSeconds;
          symbol.y += state.velocityY * deltaSeconds;

          // 檢查是否超過目標位置
          if (symbol.y >= state.targetY) {
            symbol.y = state.targetY;
            state.velocityY = -state.velocityY * this.animationConfig.bounce;

            // 彈跳速度太小時停止
            if (Math.abs(state.velocityY) < 50) {
              state.velocityY = 0;
              symbol.y = state.targetY;
              this.handleSymbolSettled(state);
            }
          }

          allSettled = false;
        } 
        // 彈跳中
        else if (state.velocityY !== 0) {
          if (state.row > 0 && !state.hasTriggeredNext) {
            const nextState = this.symbolStates[state.col][state.row - 1];
            if (symbol.y >= nextState.targetY) {
              state.hasTriggeredNext = true;
              this.startSymbolDrop(state.col, state.row - 1);
            }
          }

          // 應用重力
          state.velocityY += this.animationConfig.gravity * deltaSeconds;
          symbol.y += state.velocityY * deltaSeconds;

          // 檢查是否再次碰到地面
          if (symbol.y >= state.targetY) {
            symbol.y = state.targetY;
            state.velocityY = -state.velocityY * this.animationConfig.bounce;

            // 彈跳速度太小時停止
            if (Math.abs(state.velocityY) < 50) {
              state.velocityY = 0;
              symbol.y = state.targetY;
              this.handleSymbolSettled(state);
            }
          }

          allSettled = false;
        }
      });
    });

    // 所有符號都已停止
    if (allSettled) {
      this.stopAnimation();
    } else {
      this.animationId = requestAnimationFrame(this.animate);
    }
  }

  private startSymbolDrop(colIndex: number, rowIndex: number): void {
    const state = this.symbolStates[colIndex]?.[rowIndex];
    if (!state || state.dropStarted) return;

    state.dropStarted = true;
    state.isDropping = true;
    state.velocityY = this.animationConfig.dropSpeed;
  }

  private handleSymbolSettled(state: SymbolState): void {
    state.isDropping = false;

    // 觸發上一個符號開始掉落
    const nextRowIndex = state.row - 1;
    if (nextRowIndex >= 0) {
      this.startSymbolDrop(state.col, nextRowIndex);
    }
  }

  /**
   * 停止動畫
   */
  private stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.isAnimating = false;

    if (this.dropCompleteCallback) {
      this.dropCompleteCallback();
      this.dropCompleteCallback = undefined;
    }
  }

  /**
   * 獲取隨機符號 ID (1-11)
   */
  private getRandomSymbolId(): number {
    return Math.floor(Math.random() * 11) + 1;
  }

  /**
   * 獲取當前符號
   */
  public getCurrentSymbols(): number[][] {
    return this.symbolStates.map(col => 
      col.map(state => state.symbol.getSymbolId())
    );
  }

  /**
   * 立即停止
   */
  public forceStop(): void {
    this.stopAnimation();
    
    // 將所有符號設置到目標位置
    this.symbolStates.forEach(col => {
      col.forEach(state => {
        state.symbol.y = state.targetY;
        state.velocityY = 0;
        state.isDropping = false;
      });
    });
  }

  /**
   * 更新動畫配置
   */
  public updateAnimationConfig(config: Partial<DropAnimationConfig>): void {
    this.animationConfig = { ...this.animationConfig, ...config };
  }

  /**
   * 獲取是否正在動畫
   */
  public getIsAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * 銷毀
   */
  public destroy(options?: any): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearSymbols();
    super.destroy(options);
  }
}