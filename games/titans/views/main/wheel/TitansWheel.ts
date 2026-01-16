import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { TitansSymbol } from '../symbol/TitansSymbol';

/**
 * 掉落動畫配置
 */
export interface DropAnimationConfig {
  /** 掉落速度(像素/秒) */
  dropSpeed: number;
  /** 重力加速度(像素/秒²) */
  gravity: number;
  /** 彈跳係數 (0-1) */
  bounce: number;
  /** 每列符號掉落的延遲(毫秒) */
  columnDelay: number;
  /** 每行符號掉落的延遲(毫秒) */
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
  isShowingWin: boolean;
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
  private clearCompleteCallback?: () => void;
  private removeWinCompleteCallback?: () => void;
  private fillEmptySlotsCompleteCallback?: () => void;
  private allWinAnimationsCompleteCallback?: () => void; // 【新增】所有獲勝動畫完成回調
  private isRemovingWin: boolean = false;
  private isFillingEmptySlots: boolean = false;
  private isClearing: boolean = false;
  private clearStartTime: number = 0;
  private originalColumnDelay: number = 100;

  constructor(config: TitansWheelConfig) {
    super();

    this.config = {
      numberOfReels: 6,
      symbolsPerReel: 5,
      ...config
    } as Required<TitansWheelConfig>;

    this.animationConfig = {
      dropSpeed: 3000,
      gravity: 2000,
      bounce: 0.1,
      columnDelay: this.originalColumnDelay,
      rowDelay: 0,
      ...config.animation
    };

    this.symbolWidth = config.reelWidth;
    this.symbolHeight = config.reelHeight / this.config.symbolsPerReel;

    this.createMask();
    this.createIdleSymbols();
  }

  private createMask(): void {
    const maskGraphics = new PIXI.Graphics();
    maskGraphics.beginFill(0x000000);
    maskGraphics.drawRect(
      0,
      0,
      this.symbolWidth * this.config.numberOfReels+10,
      this.config.reelHeight
    );
    maskGraphics.endFill();
    this.mask = maskGraphics;
    this.addChild(maskGraphics);
  }

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
          hasTriggeredNext: false,
          isShowingWin: false
        };
      }
    }
  }

  public hasVisibleSymbols(): boolean {
    if (!this.symbolStates || this.symbolStates.length === 0) {
      return false;
    }
    
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

  private clearSymbols(): void {
    if (!this.hasVisibleSymbols()) {
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
    
    this.isClearing = true;
    this.clearStartTime = performance.now();
    
    const lastCol = this.symbolStates.length - 1;
    const lastRow = this.symbolStates[lastCol]?.length - 1 || 0;
    const maxDuration = 0.17 * (this.config.symbolsPerReel - lastRow);
    const maxDelay = 0.1 * lastCol;
    const clearAnimationTime = (maxDelay + maxDuration) * 1000 + 100;
    
    this.symbolStates.forEach(col => {
      col.forEach(state => {
        if (state.symbol && !state.symbol.destroyed) {
        gsap.to(state.symbol, {
          y: this.config.reelHeight + this.symbolHeight,
          duration: 0.17*(this.config.symbolsPerReel - state.row),
            delay: 0.1*this.animationConfig.columnDelay/100*state.col,
          ease: 'power2.inOut',
          onComplete: () => {
            state.symbol.destroy();
          }
        });
        }
      });
    });
    this.symbolStates = [];
    
    setTimeout(() => {
      this.isClearing = false;
    }, clearAnimationTime);
  }

  public startSpin(fastDrop?: boolean): void {
    if (this.isAnimating) {
      console.warn('Animation is already running');
      return;
    }

    if (fastDrop) {
      this.animationConfig.columnDelay = 0;
    } else {
      this.animationConfig.columnDelay = this.originalColumnDelay;
    }

    this.clearSymbols();
  }

  public stopSpin(result: { 
    symbolIds: number[][], 
    onComplete?: () => void, 
    onClearComplete?: () => void, 
    fastDrop?: boolean 
  }): void {
    console.log('wheel::stopSpin', result);
    const { symbolIds, onComplete, onClearComplete, fastDrop } = result;
    
    if (fastDrop) {
      this.animationConfig.columnDelay = 0;
    } else {
      this.animationConfig.columnDelay = this.originalColumnDelay;
    }

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
    
    const hasVisible = this.hasVisibleSymbols();
    
    if (this.isClearing) {
      const elapsed = performance.now() - this.clearStartTime;
      const lastCol = this.symbolStates.length - 1;
      const lastRow = this.symbolStates[lastCol]?.length - 1 || 0;
      const maxDuration = 0.17 * (this.config.symbolsPerReel - lastRow);
      const maxDelay = 0.1 * lastCol;
      const totalClearTime = (maxDelay + maxDuration) * 1000 + 100;
      const remainingTime = Math.max(0, totalClearTime - elapsed);
      
      setTimeout(() => {
        if (this.clearCompleteCallback) {
          this.clearCompleteCallback();
          this.clearCompleteCallback = undefined;
        }
        this.createNewSymbols(symbolIds);
      }, remainingTime);
      return;
    }
    
    if (!hasVisible) {
      this.symbolStates.forEach(col => {
        col.forEach(state => {
          if (state.symbol && !state.symbol.destroyed) {
            state.symbol.destroy();
          }
        });
      });
      this.symbolStates = [];
      
      if (this.clearCompleteCallback) {
        this.clearCompleteCallback();
        this.clearCompleteCallback = undefined;
      }
      
      this.createNewSymbols(symbolIds);
    } else {
      const lastCol = this.symbolStates.length - 1;
      const lastRow = this.symbolStates[lastCol]?.length - 1 || 0;
      const maxDuration = 0.17 * (this.config.symbolsPerReel - lastRow);
      const maxDelay = 0.1 * lastCol;
      const clearAnimationTime = (maxDelay + maxDuration) * 1000 + 100;
      
      this.clearSymbols();
      
      setTimeout(() => {
        if (this.clearCompleteCallback) {
          this.clearCompleteCallback();
          this.clearCompleteCallback = undefined;
        }
        this.createNewSymbols(symbolIds);
      }, clearAnimationTime);
    }
  }

  private createNewSymbols(symbolIds: number[][]): void {
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
          hasTriggeredNext: false,
          isShowingWin: false
        };
      }
    }

    this.startDropAnimation();
  }

  private startDropAnimation(): void {
    this.isAnimating = true;
    this.lastTime = performance.now();

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

  private animate = (currentTime: number = performance.now()): void => {
    if (!this.isAnimating) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    const deltaSeconds = deltaTime / 1000;

    let allSettled = true;

    this.symbolStates.forEach(col => {
      col.forEach(state => {
        if (!state.dropStarted) {
          allSettled = false;
          return;
        }

        const symbol = state.symbol;
        const currentY = symbol.y;
        const targetY = state.targetY;
        const isAtTarget = Math.abs(currentY - targetY) < 0.1; // 允許小誤差
        
        // 如果符號已經在目標位置，且速度為 0，則跳過（不需要彈跳動畫）
        // 這種情況下，符號已經穩定，不影響 allSettled 的判斷
        if (isAtTarget && state.velocityY === 0) {
          return; // 位置不變的符號，不需要任何動畫，已經穩定
        }
        
        // 如果執行到這裡，說明符號需要移動或還有速度，標記為未穩定
        allSettled = false;

        const needsToMoveDown = currentY > targetY;
        const needsToMoveUp = currentY < targetY;

        if (needsToMoveDown) {
          const distance = currentY - targetY;
          const speed = this.animationConfig.dropSpeed * deltaSeconds;
          
          if (distance > speed) {
            symbol.y -= speed;
            allSettled = false;
          } else {
            symbol.y = targetY;
            state.velocityY = 0;
            this.handleSymbolSettled(state);
          }
        } else if (needsToMoveUp) {
          if (state.row > 0 && !state.hasTriggeredNext) {
            if (symbol.y >= this.config.reelHeight/this.config.symbolsPerReel) {
              state.hasTriggeredNext = true;
              this.startSymbolDrop(state.col, state.row - 1);
            }
          }

          state.velocityY += this.animationConfig.gravity * deltaSeconds;
          symbol.y += state.velocityY * deltaSeconds;

          if (symbol.y >= targetY) {
            symbol.y = targetY;
            state.velocityY = -state.velocityY * this.animationConfig.bounce;

            if (Math.abs(state.velocityY) < 50) {
              state.velocityY = 0;
              symbol.y = targetY;
              this.handleSymbolSettled(state);
            }
          }

          allSettled = false;
        } else if (state.velocityY !== 0) {
          // 符號在目標位置但還有速度（彈跳中）
          if (state.row > 0 && !state.hasTriggeredNext) {
            const nextState = this.symbolStates[state.col][state.row - 1];
            if (nextState && symbol.y >= nextState.targetY) {
              state.hasTriggeredNext = true;
              this.startSymbolDrop(state.col, state.row - 1);
            }
          }

          state.velocityY += this.animationConfig.gravity * deltaSeconds;
          symbol.y += state.velocityY * deltaSeconds;

          if (symbol.y >= targetY) {
            symbol.y = targetY;
            state.velocityY = -state.velocityY * this.animationConfig.bounce;

            if (Math.abs(state.velocityY) < 50) {
              state.velocityY = 0;
              symbol.y = targetY;
              this.handleSymbolSettled(state);
            }
          }

          allSettled = false;
        }
      });
    });

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

    const nextRowIndex = state.row - 1;
    if (nextRowIndex >= 0) {
      this.startSymbolDrop(state.col, nextRowIndex);
    }
  }

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
    console.log('[Wheel] ✅ 觸發所有動畫完成回調',this.isRemovingWin,this.removeWinCompleteCallback);
    if (this.isRemovingWin && this.removeWinCompleteCallback) {
      this.isRemovingWin = false;
      this.removeWinCompleteCallback();
      // this.removeWinCompleteCallback = undefined;
    }
    
    if (this.isFillingEmptySlots && this.fillEmptySlotsCompleteCallback) {
      this.isFillingEmptySlots = false;
      this.fillEmptySlotsCompleteCallback();
      this.fillEmptySlotsCompleteCallback = undefined;
    }
  }

  public setOnRemoveWinComplete(callback: () => void): void {
    this.removeWinCompleteCallback = callback;
  }

  /**
   * 【新增】設置所有獲勝動畫完成回調
   */
  public setOnAllWinAnimationsComplete(callback: () => void): void {
    this.allWinAnimationsCompleteCallback = callback;
  }

  private getRandomSymbolId(): number {
    return Math.floor(Math.random() * 11) + 1;
  }

  public getCurrentSymbols(): number[][] {
    return this.symbolStates.map(col => 
      col.map(state => state.symbol.getSymbolId())
    );
  }

  public forceStop(): void {
    this.stopAnimation();
    
    this.symbolStates.forEach(col => {
      col.forEach(state => {
        state.symbol.y = state.targetY;
        state.velocityY = 0;
        state.isDropping = false;
      });
    });
  }

  public updateAnimationConfig(config: Partial<DropAnimationConfig>): void {
    this.animationConfig = { ...this.animationConfig, ...config };
  }

  public getIsAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * 根據位置獲取符號（pos 格式：'reel-row'，從1開始）
   * @param reel 列索引（從1開始）
   * @param row 行索引（從1開始）
   * @returns 符號實例，如果不存在則返回 undefined
   */
  public getSymbolAt(reel: number, row: number): TitansSymbol | undefined {
    // 轉換為陣列索引（從0開始）
    const colIndex = reel - 1;
    const rowIndex = row - 1;
    
    if (colIndex < 0 || colIndex >= this.symbolStates.length) {
      return undefined;
    }
    
    const col = this.symbolStates[colIndex];
    if (!col || rowIndex < 0 || rowIndex >= col.length) {
      return undefined;
    }
    
    return col[rowIndex]?.symbol;
  }

  public getClearAnimationTime(): number {
    if (!this.hasVisibleSymbols() || !this.symbolStates || this.symbolStates.length === 0) {
      return 0;
    }
    
    const lastCol = this.symbolStates.length - 1;
    const lastRow = this.symbolStates[lastCol]?.length - 1 || 0;
    const maxDuration = 0.17 * (this.config.symbolsPerReel - lastRow);
    const maxDelay = 0.1 * lastCol;
    return (maxDelay + maxDuration) * 1000 + 100;
  }

  /**
   * 【修改】播放獲勝動畫 - 追蹤所有動畫完成
   */
  public playWinAnimations(winLineInfos: Array<{ WinPosition: number[][] }>): void {
    if (!winLineInfos || winLineInfos.length === 0) {
      return;
    }

    const winSymbols: SymbolState[] = [];

    winLineInfos.forEach((winLineInfo) => {
      if (!winLineInfo.WinPosition || !Array.isArray(winLineInfo.WinPosition)) {
        return;
      }

      winLineInfo.WinPosition.forEach((position) => {
        if (!Array.isArray(position) || position.length < 2) {
          return;
        }

        const reelIndex = position[0];
        const symbolIndex = position[1];

        if (
          reelIndex >= 0 &&
          reelIndex < this.symbolStates.length &&
          symbolIndex >= 0 &&
          symbolIndex < this.symbolStates[reelIndex]?.length
        ) {
          const state = this.symbolStates[reelIndex][symbolIndex];
          if (state && state.symbol) {
            state.isShowingWin = true;
            winSymbols.push(state);
          }
        }
      });
    });

    if (winSymbols.length === 0) {
      return;
    }

    let completedCount = 0;
    const totalAnimations = winSymbols.length;

    winSymbols.forEach((state) => {
      state.symbol.showWin(() => {
        completedCount++;
        
        // 【修改】當所有符號動畫都完成時
        if (completedCount >= totalAnimations) {
          console.log('[Wheel] ✅ 所有獲勝動畫播放完成');
          
          // 觸發所有動畫完成回調
          if (this.allWinAnimationsCompleteCallback) {
            this.allWinAnimationsCompleteCallback();
          }
          
          // 然後自動消除得獎符號
          this.removeWinSymbols();
        }
      });
    });
  }

  public hideAllWinAnimations(): void {
    this.symbolStates.forEach((col) => {
      col.forEach((state) => {
        if (state && state.symbol) {
          state.symbol.hideWin();
          state.isShowingWin = false;
        }
      });
    });
  }

  public removeWinSymbols(): void {
    this.isRemovingWin = true;
    
    const symbolsToRemove: Array<{ col: number; row: number }> = [];
    
    this.symbolStates.forEach((col, colIndex) => {
      col.forEach((state, rowIndex) => {
        if (state && state.isShowingWin) {
          symbolsToRemove.push({ col: colIndex, row: rowIndex });
        }
      });
    });

    if (symbolsToRemove.length === 0) {
      this.isRemovingWin = false;
      if (this.removeWinCompleteCallback) {
        this.removeWinCompleteCallback();
        this.removeWinCompleteCallback = undefined;
      }
      return;
    }

    const removeByCol: Record<number, Set<number>> = {};
    symbolsToRemove.forEach(({ col, row }) => {
      if (!removeByCol[col]) {
        removeByCol[col] = new Set();
      }
      removeByCol[col].add(row);
    });

    for (let col = 0; col < this.config.numberOfReels; col++) {
      const colStates = this.symbolStates[col] || [];
      const rowsToRemove = removeByCol[col] || new Set<number>();
      
      if (rowsToRemove.size === 0) {
        continue;
      }

      const keptStates: SymbolState[] = [];
      
      for (let oldRow = 0; oldRow < colStates.length; oldRow++) {
        if (!rowsToRemove.has(oldRow)) {
          keptStates.push(colStates[oldRow]);
        } else {
          const state = colStates[oldRow];
          if (state && state.symbol && !state.symbol.destroyed) {
            state.symbol.destroy();
          }
        }
      }

      const currentLength = keptStates.length;
      const targetLength = this.config.symbolsPerReel;
      const needToFill = targetLength - currentLength;

      // 記錄每個符號的舊 row，用於判斷位置是否改變
      const oldRowMap = new Map<SymbolState, number>();
      keptStates.forEach((state) => {
        oldRowMap.set(state, state.row);
      });

      keptStates.forEach((state, index) => {
        const oldRow = oldRowMap.get(state) ?? state.row;
        const newRow = index + needToFill;
        const newTargetY = newRow * this.symbolHeight + this.symbolHeight / 2;
        
        state.row = newRow;
        state.targetY = newTargetY;
        
        // 判斷位置是否改變：比較 oldRow 和 newRow
        const rowChanged = oldRow !== newRow;
        const isAtNewTarget = Math.abs(state.symbol.y - newTargetY) < 0.1;
        
        if (!rowChanged && isAtNewTarget) {
          // 位置完全不變（row 沒變且已經在目標位置），保持不動，不需要掉落動畫
          state.dropStarted = true;
          state.hasTriggeredNext = false;
          state.isDropping = false;
          state.velocityY = 0;
          state.symbol.y = newTargetY; // 確保位置精確
        } else {
          // 位置改變（row 改變或不在目標位置），需要掉落動畫
          state.dropStarted = false;
          state.hasTriggeredNext = false;
          state.isDropping = false;
          state.velocityY = 0;
        }
      });

      const newStates: SymbolState[] = [];
      for (let i = 0; i < needToFill; i++) {
        const symbol = new TitansSymbol();
        symbol.setSymbol(0); // setSymbol(0) 會自動處理空白符號的顯示
        
        const x = col * this.symbolWidth + this.symbolWidth / 2;
        const startY = i * this.symbolHeight + this.symbolHeight / 2;
        const targetY = i * this.symbolHeight + this.symbolHeight / 2;

        symbol.position.set(x, startY);
        this.addChild(symbol);

        newStates.push({
          symbol,
          targetY,
          velocityY: 0,
          isDropping: false,
          row: i,
          col,
          dropStarted: false,
          hasTriggeredNext: false,
          isShowingWin: false
        });
      }

      this.symbolStates[col] = [...newStates, ...keptStates];
    }

    // 檢查是否所有符號都已經在目標位置（沒有需要掉落的符號）
    let hasSymbolsToDrop = false;
    this.symbolStates.forEach(col => {
      col.forEach(state => {
        if (!state.dropStarted) {
          hasSymbolsToDrop = true;
        } else {
          const isAtTarget = Math.abs(state.symbol.y - state.targetY) < 0.1;
          if (!isAtTarget || state.velocityY !== 0) {
            hasSymbolsToDrop = true;
          }
        }
      });
    });

    if (!hasSymbolsToDrop && this.isRemovingWin && this.removeWinCompleteCallback) {
      // 所有符號都已經在目標位置，直接觸發回調
      console.log('[Wheel] 所有符號都已在目標位置，直接觸發 removeWinCompleteCallback');
      const callback = this.removeWinCompleteCallback;
      this.isRemovingWin = false;
      this.removeWinCompleteCallback = undefined;
      // 使用 setTimeout 確保回調在下一幀執行，避免阻塞
      setTimeout(() => {
        callback();
      }, 0);
    } else {
      // 有符號需要掉落，啟動動畫
      this.startCascadeAnimation();
    }
  }

  private startCascadeAnimation(): void {
    this.isAnimating = true;
    this.lastTime = performance.now();

    // 只重置需要掉落的符號，位置不變的符號保持 dropStarted = true
    this.symbolStates.forEach((col) => {
      col.forEach((state) => {
        const isAtTarget = Math.abs(state.symbol.y - state.targetY) < 0.1;
        
        // 如果符號已經在目標位置，且 dropStarted = true，保持不動
        // 但如果是空白符號（ID 0），還是需要重置，因為它可能需要被新符號替換
        if (isAtTarget && state.dropStarted && state.symbol.getSymbolId() !== 0) {
          // 位置不變的非空白符號，不需要重置
          return;
        }
        
        // 需要掉落的符號（包括：不在目標位置、dropStarted = false、空白符號），重置狀態
        state.dropStarted = false;
        state.hasTriggeredNext = false;
        state.isDropping = false;
        state.velocityY = 0;
      });
    });

    this.symbolStates.forEach((col, colIndex) => {
      if (col.length === 0) return;
      
      // 找到需要掉落的最底部符號（dropStarted = false）
      let bottomIndexToDrop = -1;
      for (let rowIndex = col.length - 1; rowIndex >= 0; rowIndex--) {
        const state = col[rowIndex];
        if (state && !state.dropStarted) {
          bottomIndexToDrop = rowIndex;
          break;
        }
      }
      
      if (bottomIndexToDrop >= 0) {
        const delay = colIndex * this.animationConfig.columnDelay;
        setTimeout(() => {
          this.startSymbolDrop(colIndex, bottomIndexToDrop);
        }, delay);
      }
    });

    this.animate();
  }

  public fillNewSymbols(symbolIds: number[][], onComplete?: () => void, fastDrop?: boolean): void {
    this.isFillingEmptySlots = true;
    this.fillEmptySlotsCompleteCallback = onComplete;

    if (fastDrop) {
      this.animationConfig.columnDelay = 0;
    } else {
      this.animationConfig.columnDelay = this.originalColumnDelay;
    }

    if (!symbolIds || !Array.isArray(symbolIds)) {
      console.error('Invalid symbolIds:', symbolIds);
      this.isFillingEmptySlots = false;
      return;
    }

    for (let col = 0; col < this.config.numberOfReels; col++) {
      const colStates = this.symbolStates[col] || [];
      const colSymbolIds = symbolIds[col] || [];
      
      const emptyIndices: number[] = [];
      colStates.forEach((state, rowIndex) => {
        if (!state.symbol.visible || state.symbol.getSymbolId() === 0) {
          emptyIndices.push(rowIndex);
        }
      });

      if (emptyIndices.length === 0) continue;

      emptyIndices.forEach((rowIndex, i) => {
        const state = colStates[rowIndex];
        const newSymbolId = colSymbolIds[i];

        if (newSymbolId !== null && newSymbolId !== undefined && newSymbolId !== 0) {
          state.symbol.setSymbol(newSymbolId);
          state.symbol.visible = true;

          const x = col * this.symbolWidth + this.symbolWidth / 2;
          const startY = -this.config.reelHeight / this.config.symbolsPerReel * (emptyIndices.length - i);
          state.symbol.position.set(x, startY);

          state.velocityY = 0;
          state.dropStarted = false;
          state.hasTriggeredNext = false;
          state.isDropping = false;
        }
      });
    }

    this.startCascadeAnimation();
  }

  public destroy(options?: any): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearSymbols();
    super.destroy(options);
  }
}