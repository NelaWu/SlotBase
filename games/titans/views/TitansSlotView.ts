import { ResourceManager } from '@/core/ResourceManager';
import { BaseView } from '@views/BaseView';
import * as PIXI from 'pixi.js';
import { TitansSymbol } from './symbol/TitansSymbol';

// 捲軸配置
interface ReelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class TitansSlotView extends BaseView {
  private reels: PIXI.Container[] = [];
  private spinButton!: PIXI.Container;
  private background!: PIXI.Graphics;
  private winAmountText!: PIXI.Text;
  private balanceText!: PIXI.Text;
  private betText!: PIXI.Text;
  private freeSpinsText!: PIXI.Text;
  
  private reelConfig: ReelConfig = {
    x: 120,
    y: 788,
    width: 168,
    height: 147*5
  };

  constructor(app: PIXI.Application) {
    super(app);
    this.sortableChildren = true; // 啟用 z-index 排序
  }

  // 創建 UI 組件
  protected async createComponents(): Promise<void> {
    // 創建背景
    this.createBackground();

    // 創建捲軸
    this.createReels();

    // 創建按鈕
    this.createSpinButton();

    // 創建文字顯示
    this.createTexts();
  }

  // 創建背景
  private createBackground(): void {
    const resourceManager = ResourceManager.getInstance();
    
    // 1. 載入主背景
    const bgResource = resourceManager.getResource('bg_main');
    if (bgResource) {
      const bgTexture = PIXI.Texture.from(bgResource);
      const bgSprite = new PIXI.Sprite(bgTexture);
      bgSprite.width = 1080;
      bgSprite.height = 1920;
      bgSprite.zIndex = 0;
      this.addChild(bgSprite);
    }
    
    // 2. 載入框架圖片（疊加在背景上）
    const frameResource = resourceManager.getResource('frame');
    if (frameResource) {
      const frameTexture = PIXI.Texture.from(frameResource);
      const frameSprite = new PIXI.Sprite(frameTexture);
      frameSprite.position.set(0, 692);
      this.addChild(frameSprite);
      const frameSpriteRight = new PIXI.Sprite(frameTexture);
      frameSpriteRight.position.set(1080, 692);
      frameSpriteRight.scale.x = -1;
      this.addChild(frameSpriteRight);
    }
  }

  // 創建捲軸
  private createReels(): void {
    const numberOfReels = 6;
    const spacing = 0;

    for (let i = 0; i < numberOfReels; i++) {
      const reel = new PIXI.Container();
      this.addSymbolsToReel(reel);

      // 設置捲軸位置
      reel.x = this.reelConfig.x + i * (this.reelConfig.width + spacing);
      reel.y = this.reelConfig.y;
      
      // // 添加遮罩，讓符號只在捲軸區域內可見（創造無縫滾動效果）
      // const mask = new PIXI.Graphics();
      // mask.rect(-this.reelConfig.width/2, -this.reelConfig.height/2/5, this.reelConfig.width, this.reelConfig.height);
      // mask.fill(0xffffff);
      // reel.addChild(mask);
      // reel.mask = mask;
      
      this.reels.push(reel);
      this.addChild(reel);
    }
  }

  // 在捲軸中添加符號
  private addSymbolsToReel(reel: PIXI.Container): void {
    const symbolsPerReel = 5;
    const symbolHeight = this.reelConfig.height / symbolsPerReel;
    
    for (let i = 0; i < symbolsPerReel; i++) {
      const symbolNumber = Math.floor(Math.random() * 11) + 1;
      const symbolSprite = new TitansSymbol();
      symbolSprite.setSymbol(symbolNumber);
      
      // 最後一個符號放在頂部外面，用於循環
      if (i < symbolsPerReel) {
        symbolSprite.y = i * symbolHeight;
      } else {
        symbolSprite.y = -symbolHeight;
      }
      
      reel.addChild(symbolSprite);
    }
  }

  // 創建旋轉按鈕
  private createSpinButton(): void {
    const resourceManager = ResourceManager.getInstance();
    this.spinButton = new PIXI.Container();
    this.spinButton.zIndex = 15; // 確保在最上層
    
    // 嘗試使用按鈕圖片
    const btnResource = resourceManager.getResource('spin_btn');
    if (btnResource) {
      const btnTexture = PIXI.Texture.from(btnResource);
      const btnSprite = new PIXI.Sprite(btnTexture);
      btnSprite.anchor.set(0.5);
      this.spinButton.addChild(btnSprite);
    }

    this.spinButton.eventMode = 'static';
    this.spinButton.cursor = 'pointer';
    this.addChild(this.spinButton);
  }

  // 創建文字顯示
  private createTexts(): void {
    const textStyle = {
      fontFamily: 'Arial',
      fontSize: 36, // 原本 18px * 2
      fill: 0xffffff,
      fontWeight: 'bold' as const,
      stroke: { color: 0x000000, width: 6 } // 原本 3px * 2
    };

    // 餘額顯示
    this.balanceText = new PIXI.Text({
      text: '餘額: $0',
      style: textStyle
    });
    this.balanceText.x = 40;  // 原本 20px * 2
    this.balanceText.y = 40;  // 原本 20px * 2
    this.balanceText.zIndex = 20;
    this.addChild(this.balanceText);

    // 投注顯示
    this.betText = new PIXI.Text({
      text: '投注: $0',
      style: textStyle
    });
    this.betText.x = 40;   // 原本 20px * 2
    this.betText.y = 100;  // 原本 50px * 2
    this.betText.zIndex = 20;
    this.addChild(this.betText);

    // 獲勝金額顯示
    this.winAmountText = new PIXI.Text({
      text: '',
      style: {
        ...textStyle,
        fontSize: 72, // 原本 36px * 2
        fill: 0xffff00
      }
    });
    this.winAmountText.anchor.set(0.5);
    this.winAmountText.x = 540;  // 原本 270px * 2
    this.winAmountText.y = 800;  // 原本 400px * 2
    this.winAmountText.visible = false;
    this.winAmountText.zIndex = 20;
    this.addChild(this.winAmountText);

    // 免費旋轉顯示
    this.freeSpinsText = new PIXI.Text({
      text: '',
      style: {
        ...textStyle,
        fontSize: 44, // 原本 22px * 2
        fill: 0xff00ff
      }
    });
    this.freeSpinsText.x = 40;   // 原本 20px * 2
    this.freeSpinsText.y = 160;  // 原本 80px * 2
    this.freeSpinsText.visible = false;
    this.freeSpinsText.zIndex = 20;
    this.addChild(this.freeSpinsText);
  }

  // 設置佈局
  protected setupLayout(): void {
    this.spinButton.x = 544;
    this.spinButton.y = 1726;
  }

  // 綁定事件
  protected bindEvents(): void {
    this.spinButton.on('pointerdown', this.onSpinButtonClick.bind(this));
    this.spinButton.on('pointerover', this.onSpinButtonHover.bind(this));
    this.spinButton.on('pointerout', this.onSpinButtonOut.bind(this));
  }

  // 解綁事件
  protected unbindEvents(): void {
    this.spinButton.off('pointerdown', this.onSpinButtonClick.bind(this));
    this.spinButton.off('pointerover', this.onSpinButtonHover.bind(this));
    this.spinButton.off('pointerout', this.onSpinButtonOut.bind(this));
  }

  // 按鈕點擊事件
  private onSpinButtonClick(): void {
    this.emit('spinButtonClicked');
  }

  // 按鈕懸停事件
  private onSpinButtonHover(): void {
    this.spinButton.scale.set(1.05);
  }

  // 按鈕離開事件
  private onSpinButtonOut(): void {
    this.spinButton.scale.set(1);
  }

  // 公開方法 - 開始旋轉動畫
  public startSpinAnimation(): void {
    this.setSpinButtonEnabled(false);
    this.hideWinAmount();
    
    this.reels.forEach((reel) => {
      // 為每個捲軸創建滾動動畫
      const symbolHeight = this.reelConfig.height / 5;
      const spinSpeed = 30; // 滾動速度（每幀移動的像素）
      
      const animate = () => {
        // 移動所有符號
        reel.children.forEach((symbol) => {
          symbol.y += spinSpeed;
          
          // 如果符號滾出底部，將它移到頂部並替換成隨機符號
          if (symbol.y >= this.reelConfig.height) {
            symbol.y -= this.reelConfig.height + symbolHeight;
            
            // 隨機更換符號（使用 TitansSymbol 的 setSymbol 方法）
            if (symbol instanceof TitansSymbol) {
              const randomSymbolNum = Math.floor(Math.random() * 11) + 1;
              symbol.setSymbol(randomSymbolNum);
            }
          }
        });
      };
      
      (reel as any).animateFunc = setInterval(animate, 1000 / 60); // 60 FPS
    });
  }

  // 公開方法 - 停止旋轉動畫
  public stopSpinAnimation(results: number[][]): void {
    console.log('stopSpinAnimation', results);
    // 逐個停止捲軸（從左到右，延遲停止）
    this.reels.forEach((reel, reelIndex) => {
      setTimeout(() => {
        // 停止動畫
        if ((reel as any).animateFunc) {
          clearInterval((reel as any).animateFunc);
          (reel as any).animateFunc = null;
        }
        
        // 平滑停止並對齊到結果位置
        this.smoothStopReel(reel, results[reelIndex] || [], () => {
          // 最後一個捲軸停止後，啟用按鈕
          if (reelIndex === this.reels.length - 1) {
            setTimeout(() => {
              this.setSpinButtonEnabled(true);
            }, 300);
          }
        });
      }, reelIndex * 150); // 每個捲軸延遲 150ms 停止
    });
  }

  // 平滑停止捲軸並對齊符號
  private smoothStopReel(reel: PIXI.Container, symbolNumbers: number[], callback: () => void): void {
    const symbolHeight = this.reelConfig.height / 5;
    
    // 更新符號內容為結果符號（使用 TitansSymbol）
    symbolNumbers.forEach((symbolNum, i) => {
      if (reel.children[i] instanceof TitansSymbol) {
        (reel.children[i] as TitansSymbol).setSymbol(symbolNum);
      }
    });
    
    // 減速動畫
    let currentSpeed = 20;
    const deceleration = 2;
    
    const slowDown = () => {
      if (currentSpeed > 0) {
        currentSpeed = Math.max(0, currentSpeed - deceleration);
        
        reel.children.forEach((symbol) => {
          symbol.y += currentSpeed;
          
          // 循環滾動
          if (symbol.y >= this.reelConfig.height) {
            symbol.y -= this.reelConfig.height + symbolHeight;
          }
        });
        
        requestAnimationFrame(slowDown);
      } else {
        // 對齊到整數位置
        this.alignSymbols(reel);
        callback();
      }
    };
    
    slowDown();
  }

  // 對齊符號到正確位置
  private alignSymbols(reel: PIXI.Container): void {
    const symbolHeight = this.reelConfig.height / 5;
    
    reel.children.forEach((symbol, i) => {
      // 將符號對齊到標準位置
      const targetY = i * symbolHeight;
      symbol.y = targetY;
    });
  }

  // 更新捲軸符號
  private updateReelSymbols(reel: PIXI.Container, symbolNumbers: number[]): void {
    const resourceManager = ResourceManager.getInstance();
    
    // 清除舊符號
    while (reel.children.length > 0) {
      reel.removeChildAt(0);
    }
    
    // 添加新符號
    const symbolHeight = this.reelConfig.height / 3;
    symbolNumbers.forEach((symbolNum, i) => {
      const symbolId = `symbol_${symbolNum.toString().padStart(2, '0')}`;
      const symbolResource = resourceManager.getResource(symbolId);
      
      if (symbolResource) {
        const symbolTexture = PIXI.Texture.from(symbolResource);
        const symbolSprite = new PIXI.Sprite(symbolTexture);
        symbolSprite.width = this.reelConfig.width - 20;
        symbolSprite.height = symbolHeight - 20;
        symbolSprite.x = 10;
        symbolSprite.y = i * symbolHeight + 10;
        reel.addChild(symbolSprite);
      }
    });
  }

  // 公開方法 - 播放獲勝動畫
  public playWinAnimation(winAmount: number): void {
    this.winAmountText.text = `贏得 $${winAmount}`;
    this.winAmountText.visible = true;
    this.winAmountText.scale.set(0);

    // 放大動畫
    const startTime = Date.now();
    const duration = 500;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 彈性效果
      const scale = this.easeOutElastic(progress);
      this.winAmountText.scale.set(scale);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();

    // 3 秒後隱藏
    setTimeout(() => {
      this.hideWinAmount();
    }, 3000);
  }

  // 彈性緩動函數
  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  // 隱藏獲勝金額
  private hideWinAmount(): void {
    this.winAmountText.visible = false;
  }

  // 更新餘額顯示
  public updateBalance(balance: number): void {
    this.balanceText.text = `餘額: $${balance}`;
  }

  // 更新投注顯示
  public updateBet(bet: number): void {
    this.betText.text = `投注: $${bet}`;
  }

  // 更新免費旋轉顯示
  public updateFreeSpins(remaining: number): void {
    if (remaining > 0) {
      this.freeSpinsText.text = `免費旋轉: ${remaining}`;
      this.freeSpinsText.visible = true;
    } else {
      this.freeSpinsText.visible = false;
    }
  }

  // 設置旋轉按鈕啟用狀態
  public setSpinButtonEnabled(enabled: boolean): void {
    this.spinButton.eventMode = enabled ? 'static' : 'none';
    this.spinButton.alpha = enabled ? 1 : 0.5;
  }

  // 顯示 Bonus 提示
  public showBonusMessage(message: string): void {
    const bonusText = new PIXI.Text({
      text: message,
      style: {
        fontFamily: 'Arial',
        fontSize: 96,  // 原本 48px * 2
        fill: 0xff00ff,
        fontWeight: 'bold' as const,
        stroke: { color: 0x000000, width: 8 } // 原本 4px * 2
      }
    });
    
    bonusText.anchor.set(0.5);
    bonusText.x = 540;  // 原本 270px * 2
    bonusText.y = 786;  // 原本 393px * 2
    bonusText.scale.set(0);
    this.addChild(bonusText);

    // 動畫
    const startTime = Date.now();
    const duration = 1000;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      bonusText.scale.set(progress);
      bonusText.rotation = progress * Math.PI * 2;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          bonusText.destroy();
        }, 2000);
      }
    };
    
    animate();
  }

  // 重寫調整大小方法
  override resize(width: number, height: number): void {
    // 根據新尺寸調整佈局
    const scaleX = width / 1080;
    const scaleY = height / 1920;
    const scale = Math.min(scaleX, scaleY);
    
    this.scale.set(scale);
  }
}

