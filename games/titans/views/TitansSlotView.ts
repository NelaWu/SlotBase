import { ResourceManager } from '@/core/ResourceManager';
import { BaseView } from '@views/BaseView';
import * as PIXI from 'pixi.js';

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
    x: 36,
    y: 715,
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
    const resourceManager = ResourceManager.getInstance();
    const numberOfReels = 6;
    const spacing = 0;

    for (let i = 0; i < numberOfReels; i++) {
      const reel = new PIXI.Container();
      this.addSymbolsToReel(reel, resourceManager);

      // 設置捲軸位置
      reel.x = this.reelConfig.x + i * (this.reelConfig.width + spacing);
      reel.y = this.reelConfig.y;
      this.reels.push(reel);
      
      this.addChild(reel);
    }
  }

  // 在捲軸中添加符號
  private addSymbolsToReel(reel: PIXI.Container, resourceManager: ResourceManager): void {
    const symbolsPerReel = 5;
    const symbolHeight = this.reelConfig.height / symbolsPerReel;
    
    for (let i = 0; i < symbolsPerReel; i++) {
      // 隨機選擇一個符號（1-11）
      const symbolNumber = Math.floor(Math.random() * 11) + 1;
      const symbolId = `symbol_${symbolNumber.toString().padStart(2, '0')}`;
      
      const symbolResource = resourceManager.getResource(symbolId);
      if (symbolResource) {
        const symbolTexture = PIXI.Texture.from(symbolResource);
        const symbolSprite = new PIXI.Sprite(symbolTexture);
        
        // // 設置符號大小和位置
        // symbolSprite.width = this.reelConfig.width - 20;
        // symbolSprite.height = symbolHeight - 20;
        // symbolSprite.x = 10;
        symbolSprite.y = i * symbolHeight ;
        
        reel.addChild(symbolSprite);
      }
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
      const animate = () => {
        reel.y -= 20;
        if (reel.y < this.reelConfig.y - 100) {
          reel.y = this.reelConfig.y;
        }
      };
      (reel as any).animateFunc = setInterval(animate, 50);
    });
  }

  // 公開方法 - 停止旋轉動畫
  public stopSpinAnimation(results: number[][]): void {
    // 停止所有捲軸動畫
    this.reels.forEach((reel, index) => {
      if ((reel as any).animateFunc) {
        clearInterval((reel as any).animateFunc);
        (reel as any).animateFunc = null;
      }
      reel.y = this.reelConfig.y;
      
      // 更新捲軸顯示結果
      setTimeout(() => {
        this.updateReelSymbols(reel, results[index] || []);
      }, index * 200);
    });

    setTimeout(() => {
      this.setSpinButtonEnabled(true);
    }, 1000);
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

