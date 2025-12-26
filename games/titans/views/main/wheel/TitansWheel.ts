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
  private clearCompleteCallback?: () => void; // 清空完成回調
  private isClearing: boolean = false; // 是否正在清空符號
  private clearStartTime: number = 0; // 清空開始時間

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
   * 檢查畫面上是否有符號顯示（公開方法）
   */
  public hasVisibleSymbols(): boolean {
    // 檢查 symbolStates 是否有符號且符號存在
    if (!this.symbolStates || this.symbolStates.length === 0) {
      return false;
    }
    
    // 檢查是否有任何符號存在且可見
    for (const col of this.symbolStates) {
      if (col && col.length > 0) {
        for (const state of col) {
          if (state && state.symbol && state.symbol.visible && !state.symbol.destroyed) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * 清空所有符號
   */
  private clearSymbols(): void {
    if (!this.hasVisibleSymbols()) {
      // 如果沒有可見符號，直接清空狀態
      this.symbolStates.forEach(col => {
        col.forEach(state => {
          if (state.symbol && !state.symbol.destroyed) {
            state.symbol.destroy();
          }
        });
      });
      this.symbolStates = [];
      this.isClearing = false;
      return;
    }
    
    // 標記開始清空
    this.isClearing = true;
    this.clearStartTime = performance.now();
    
    // 計算清空動畫的最長時間
    const lastCol = this.symbolStates.length - 1;
    const lastRow = this.symbolStates[lastCol]?.length - 1 || 0;
    const maxDuration = 0.17 * (this.config.symbolsPerReel - lastRow);
    const maxDelay = 0.1 * lastCol;
    const clearAnimationTime = (maxDelay + maxDuration) * 1000 + 100; // 額外 100ms 緩衝
    
    this.symbolStates.forEach(col => {
      col.forEach(state => {
        if (state.symbol && !state.symbol.destroyed) {
          gsap.to(state.symbol, {
            y: this.config.reelHeight + this.symbolHeight,
            duration: 0.17*(this.config.symbolsPerReel - state.row),
            delay: 0.1*state.col,
            ease: 'power2.inOut',
            onComplete: () => {
              state.symbol.destroy();
            }
          });
        }
      });
    });
    this.symbolStates = [];
    
    // 設置清空完成標記
    setTimeout(() => {
      this.isClearing = false;
    }, clearAnimationTime);
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
  public stopSpin(result: { symbolIds: number[][], onComplete?: () => void, onClearComplete?: () => void }): void {
    const { symbolIds, onComplete, onClearComplete } = result;
    // 驗證結果數量
    if (!symbolIds || !Array.isArray(symbolIds) || symbolIds.length === 0) {
      console.error(`Invalid symbolIds:`, symbolIds);
      return;
    }
    
    if (symbolIds.length !== this.config.numberOfReels) {
      console.error(`Expected ${this.config.numberOfReels} reels, got ${symbolIds.length}`, symbolIds);
      return;
    }

    this.dropCompleteCallback = onComplete;
    this.clearCompleteCallback = onClearComplete;
    
    // 檢查是否需要清空舊符號（如果畫面上沒有符號顯示，則清空）
    const hasVisible = this.hasVisibleSymbols();
    // 如果正在清空，需要等待清空完成
    if (this.isClearing) {
      // 計算剩餘清空時間
      const elapsed = performance.now() - this.clearStartTime;
      const lastCol = this.symbolStates.length - 1;
      const lastRow = this.symbolStates[lastCol]?.length - 1 || 0;
      const maxDuration = 0.17 * (this.config.symbolsPerReel - lastRow);
      const maxDelay = 0.1 * lastCol;
      const totalClearTime = (maxDelay + maxDuration) * 1000 + 100;
      const remainingTime = Math.max(0, totalClearTime - elapsed);
      
      console.log('⏳ 正在清空中，等待剩餘時間:', remainingTime, 'ms');
      
      // 等待清空完成後觸發回調，然後創建新符號
      setTimeout(() => {
        console.log('✅ 清空動畫完成，觸發清空完成回調');
        // 觸發清空完成回調
        if (this.clearCompleteCallback) {
          this.clearCompleteCallback();
          this.clearCompleteCallback = undefined;
        }
        
        // 創建新符號
        this.createNewSymbols(symbolIds);
      }, remainingTime);
      return;
    }
    
    if (!hasVisible) {
      // 如果沒有可見符號且沒有在清空，直接清空狀態（不需要動畫）
      this.symbolStates.forEach(col => {
        col.forEach(state => {
          if (state.symbol && !state.symbol.destroyed) {
            state.symbol.destroy();
          }
        });
      });
      this.symbolStates = [];
      
      // 觸發清空完成回調（沒有可見符號時立即觸發）
      console.log('✅ 沒有可見符號，立即觸發清空完成回調');
      if (this.clearCompleteCallback) {
        this.clearCompleteCallback();
        this.clearCompleteCallback = undefined;
      }
      
      // 直接創建新符號
      this.createNewSymbols(symbolIds);
    } else {
      // 如果有可見符號，先計算清空動畫時間（在清空前保存狀態）
      const lastCol = this.symbolStates.length - 1;
      const lastRow = this.symbolStates[lastCol]?.length - 1 || 0;
      const maxDuration = 0.17 * (this.config.symbolsPerReel - lastRow);
      const maxDelay = 0.1 * lastCol;
      const clearAnimationTime = (maxDelay + maxDuration) * 1000 + 100; // 額外 100ms 緩衝
      
      console.log('⏳ 有可見符號，等待清空動畫完成，時間:', clearAnimationTime, 'ms');
      
      // 清空舊符號（帶動畫）
      this.clearSymbols();
      
      // 等待清空動畫完成後觸發回調，然後創建新符號
      setTimeout(() => {
        console.log('✅ 清空動畫完成，觸發清空完成回調');
        // 觸發清空完成回調
        if (this.clearCompleteCallback) {
          this.clearCompleteCallback();
          this.clearCompleteCallback = undefined;
        }
        
        // 創建新符號
        this.createNewSymbols(symbolIds);
      }, clearAnimationTime);
    }
  }

  /**
   * 創建新符號並開始掉落動畫
   */
  private createNewSymbols(symbolIds: number[][]): void {
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
   * 獲取清空動畫的預計時間（毫秒）
   */
  public getClearAnimationTime(): number {
    if (!this.hasVisibleSymbols() || !this.symbolStates || this.symbolStates.length === 0) {
      return 0; // 沒有可見符號，不需要清空動畫
    }
    
    const lastCol = this.symbolStates.length - 1;
    const lastRow = this.symbolStates[lastCol]?.length - 1 || 0;
    const maxDuration = 0.17 * (this.config.symbolsPerReel - lastRow);
    const maxDelay = 0.1 * lastCol;
    return (maxDelay + maxDuration) * 1000 + 100; // 額外 100ms 緩衝
  }

  /**
   * 根據 WinPosition 播放獲勝動畫
   * @param winLineInfos 獲勝連線信息數組，包含 WinPosition 數據
   */
  public playWinAnimations(winLineInfos: Array<{ WinPosition: number[][] }>): void {
    if (!winLineInfos || winLineInfos.length === 0) {
      return;
    }

    // 遍歷所有獲勝連線
    winLineInfos.forEach((winLineInfo) => {
      if (!winLineInfo.WinPosition || !Array.isArray(winLineInfo.WinPosition)) {
        return;
      }

      // 遍歷每個獲勝位置 [reelIndex, symbolIndex]
      winLineInfo.WinPosition.forEach((position) => {
        if (!Array.isArray(position) || position.length < 2) {
          return;
        }

        const reelIndex = position[0]; // 列索引 (col)
        const symbolIndex = position[1]; // 行索引 (row)

        // 驗證索引範圍
        if (
          reelIndex >= 0 &&
          reelIndex < this.symbolStates.length &&
          symbolIndex >= 0 &&
          symbolIndex < this.symbolStates[reelIndex]?.length
        ) {
          const state = this.symbolStates[reelIndex][symbolIndex];
          if (state && state.symbol) {
            // 執行獲勝動畫
            state.symbol.showWin();
          }
        }
      });
    });
  }

  /**
   * 隱藏所有獲勝動畫
   */
  public hideAllWinAnimations(): void {
    this.symbolStates.forEach((col) => {
      col.forEach((state) => {
        if (state && state.symbol) {
          state.symbol.hideWin();
        }
      });
    });
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