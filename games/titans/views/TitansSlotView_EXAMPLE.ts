// 這是一個範例檔案，展示如何在 TitansSlotView.ts 中使用載入的圖片
// 您可以參考這個範例來修改您的 TitansSlotView.ts

import { BaseView } from '@views/BaseView';
import { ResourceManager } from '@core/ResourceManager';
import * as PIXI from 'pixi.js';

interface ReelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class TitansSlotView extends BaseView {
  private reels: PIXI.Container[] = [];
  private spinButton!: PIXI.Container;
  private backgroundSprite!: PIXI.Sprite;
  private frameSprite!: PIXI.Sprite;
  private winAmountText!: PIXI.Text;
  private balanceText!: PIXI.Text;
  private betText!: PIXI.Text;
  private freeSpinsText!: PIXI.Text;
  
  private reelConfig: ReelConfig = {
    x: 50,
    y: 150,
    width: 90,
    height: 300
  };

  constructor(app: PIXI.Application) {
    super(app);
  }

  // 創建 UI 組件
  protected async createComponents(): Promise<void> {
    // 創建背景（使用圖片）
    this.createBackground();

    // 創建捲軸
    this.createReels();

    // 創建按鈕（使用圖片）
    this.createSpinButton();

    // 創建文字顯示
    this.createTexts();
  }

  // 創建背景 - 使用載入的圖片
  private createBackground(): void {
    const resourceManager = ResourceManager.getInstance();
    
    // 1. 載入主背景圖片
    const bgTexture = resourceManager.getResource('bg_main');
    if (bgTexture) {
      this.backgroundSprite = new PIXI.Sprite(bgTexture);
      this.backgroundSprite.width = 540;
      this.backgroundSprite.height = 786;
      this.addChild(this.backgroundSprite);
    } else {
      // 備案：如果圖片載入失敗，使用純色背景
      console.warn('背景圖片載入失敗，使用預設背景');
      const fallbackBg = new PIXI.Graphics();
      fallbackBg.beginFill(0x1a1a2e);
      fallbackBg.drawRect(0, 0, 540, 786);
      fallbackBg.endFill();
      this.addChild(fallbackBg);
    }
    
    // 2. 載入框架圖片（疊加在背景上）
    const frameTexture = resourceManager.getResource('frame');
    if (frameTexture) {
      this.frameSprite = new PIXI.Sprite(frameTexture);
      this.frameSprite.width = 540;
      this.frameSprite.height = 786;
      this.addChild(this.frameSprite);
    }
  }

  // 創建捲軸
  private createReels(): void {
    const numberOfReels = 5;
    const spacing = 10;

    for (let i = 0; i < numberOfReels; i++) {
      const reel = new PIXI.Container();
      
      // 捲軸背景（可以使用圖片或簡單的圖形）
      const reelBg = new PIXI.Graphics();
      reelBg.beginFill(0x0f3460, 0.3); // 半透明
      reelBg.drawRoundedRect(0, 0, this.reelConfig.width, this.reelConfig.height, 10);
      reelBg.endFill();
      reel.addChild(reelBg);
      
      // 在捲軸中添加符號範例
      this.addSymbolsToReel(reel, i);

      // 設置捲軸位置
      reel.x = this.reelConfig.x + i * (this.reelConfig.width + spacing);
      reel.y = this.reelConfig.y;

      this.reels.push(reel);
      this.addChild(reel);
    }
  }

  // 在捲軸中添加符號
  private addSymbolsToReel(reel: PIXI.Container, reelIndex: number): void {
    const resourceManager = ResourceManager.getInstance();
    const symbolsPerReel = 3;
    
    for (let i = 0; i < symbolsPerReel; i++) {
      // 隨機選擇一個符號（1-11）
      const symbolNumber = Math.floor(Math.random() * 11) + 1;
      const symbolId = `symbol_${symbolNumber.toString().padStart(2, '0')}`;
      
      const symbolTexture = resourceManager.getResource(symbolId);
      if (symbolTexture) {
        const symbol = new PIXI.Sprite(symbolTexture);
        
        // 設置符號大小和位置
        symbol.width = this.reelConfig.width - 10;
        symbol.height = 90;
        symbol.x = 5;
        symbol.y = i * 100 + 5;
        
        reel.addChild(symbol);
      }
    }
  }

  // 創建旋轉按鈕 - 使用載入的圖片
  private createSpinButton(): void {
    const resourceManager = ResourceManager.getInstance();
    
    this.spinButton = new PIXI.Container();
    
    // 嘗試載入按鈕圖片
    const btnTexture = resourceManager.getResource('spin_btn');
    if (btnTexture) {
      // 使用圖片按鈕
      const btnSprite = new PIXI.Sprite(btnTexture);
      btnSprite.anchor.set(0.5);
      
      // 調整按鈕大小（如果需要）
      btnSprite.width = 120;
      btnSprite.height = 120;
      
      this.spinButton.addChild(btnSprite);
      
      console.log('✅ 使用圖片按鈕');
    } else {
      // 備案：使用 Graphics 繪製按鈕
      console.warn('按鈕圖片載入失敗，使用預設按鈕');
      const buttonBg = new PIXI.Graphics();
      buttonBg.beginFill(0xe94560);
      buttonBg.drawCircle(0, 0, 60);
      buttonBg.endFill();
      this.spinButton.addChild(buttonBg);
      
      // 添加文字
      const buttonText = new PIXI.Text('旋轉', {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold'
      });
      buttonText.anchor.set(0.5);
      this.spinButton.addChild(buttonText);
    }

    this.spinButton.eventMode = 'static';
    this.spinButton.cursor = 'pointer';
    this.addChild(this.spinButton);
  }

  // 創建文字顯示
  private createTexts(): void {
    const textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 20,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 2
    });

    // 餘額顯示
    this.balanceText = new PIXI.Text('餘額: $0', textStyle);
    this.balanceText.x = 20;
    this.balanceText.y = 20;
    this.addChild(this.balanceText);

    // 投注顯示
    this.betText = new PIXI.Text('投注: $0', textStyle);
    this.betText.x = 20;
    this.betText.y = 50;
    this.addChild(this.betText);

    // 獲勝金額顯示
    this.winAmountText = new PIXI.Text('', {
      ...textStyle,
      fontSize: 36,
      fill: 0xffff00
    });
    this.winAmountText.anchor.set(0.5);
    this.winAmountText.x = 270;
    this.winAmountText.y = 400;
    this.winAmountText.visible = false;
    this.addChild(this.winAmountText);

    // 免費旋轉顯示
    this.freeSpinsText = new PIXI.Text('', {
      ...textStyle,
      fontSize: 24,
      fill: 0xff00ff
    });
    this.freeSpinsText.x = 20;
    this.freeSpinsText.y = 80;
    this.freeSpinsText.visible = false;
    this.addChild(this.freeSpinsText);
  }

  // 設置佈局
  protected setupLayout(): void {
    // 調整旋轉按鈕位置
    this.spinButton.x = 270;
    this.spinButton.y = 700;
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
    this.spinButton.scale.set(1.1);
  }

  // 按鈕離開事件
  private onSpinButtonOut(): void {
    this.spinButton.scale.set(1);
  }

  // === 以下是其他公開方法（保持不變）===

  public startSpinAnimation(): void {
    console.log('開始旋轉動畫');
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

  public stopSpinAnimation(results: number[][]): void {
    console.log('停止旋轉動畫', results);
    
    this.reels.forEach((reel) => {
      if ((reel as any).animateFunc) {
        clearInterval((reel as any).animateFunc);
        (reel as any).animateFunc = null;
      }
      reel.y = this.reelConfig.y;
    });

    setTimeout(() => {
      this.setSpinButtonEnabled(true);
    }, 1000);
  }

  public playWinAnimation(winAmount: number): void {
    this.winAmountText.text = `贏得 $${winAmount}`;
    this.winAmountText.visible = true;
    this.winAmountText.scale.set(0);

    const startTime = Date.now();
    const duration = 500;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const scale = this.easeOutElastic(progress);
      this.winAmountText.scale.set(scale);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();

    setTimeout(() => {
      this.hideWinAmount();
    }, 3000);
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  private hideWinAmount(): void {
    this.winAmountText.visible = false;
  }

  public updateBalance(balance: number): void {
    this.balanceText.text = `餘額: $${balance}`;
  }

  public updateBet(bet: number): void {
    this.betText.text = `投注: $${bet}`;
  }

  public updateFreeSpins(remaining: number): void {
    if (remaining > 0) {
      this.freeSpinsText.text = `免費旋轉: ${remaining}`;
      this.freeSpinsText.visible = true;
    } else {
      this.freeSpinsText.visible = false;
    }
  }

  public setSpinButtonEnabled(enabled: boolean): void {
    this.spinButton.eventMode = enabled ? 'static' : 'none';
    this.spinButton.alpha = enabled ? 1 : 0.5;
  }

  public showBonusMessage(message: string): void {
    const bonusText = new PIXI.Text(message, {
      fontFamily: 'Arial',
      fontSize: 48,
      fill: 0xff00ff,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 4
    });
    
    bonusText.anchor.set(0.5);
    bonusText.x = 270;
    bonusText.y = 393;
    bonusText.scale.set(0);
    this.addChild(bonusText);

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

  override resize(width: number, height: number): void {
    const scaleX = width / 540;
    const scaleY = height / 786;
    const scale = Math.min(scaleX, scaleY);
    
    this.scale.set(scale);
  }
}

