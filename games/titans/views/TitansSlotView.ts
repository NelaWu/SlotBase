import { ResourceManager } from '@/core/ResourceManager';
import { BaseView } from '@views/BaseView';
import { BaseButton } from '@views/components/BaseButton';
import * as PIXI from 'pixi.js';
import { TitansWheel } from './wheel/TitansWheel';
import { StopResult } from '@/views/components/Wheel';

export class TitansSlotView extends BaseView {
  private wheel!: TitansWheel;
  private spinButton!: BaseButton;
  private settingsButton!: BaseButton;
  private turboButton!: BaseButton;
  private autoButton!: BaseButton;
  private plusButton!: BaseButton;
  private minusButton!: BaseButton;
  private winAmountText!: PIXI.Text;
  private balanceText!: PIXI.Text;
  private betText!: PIXI.Text;
  private freeSpinsText!: PIXI.Text;

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
    this.createControlButtons();

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
    this.wheel = new TitansWheel({
      reelWidth: 168,
      reelHeight: 147 * 5,
      numberOfReels: 6,
      symbolsPerReel: 5,
      reelSpacing: 0,
      spinSpeed: 30,
      stopDeceleration: 2,
      stopDelay: 150
    });
    
    // 設置輪盤位置
    this.wheel.x = 36;
    this.wheel.y = 715;
    
    this.addChild(this.wheel);
  }


  // 創建旋轉按鈕
  private createSpinButton(): void {
    const resourceManager = ResourceManager.getInstance();
    const btnResource = resourceManager.getResource('spin_btn');
    let btnTexture: PIXI.Texture | undefined;
    
    if (btnResource) {
      btnTexture = PIXI.Texture.from(btnResource);
    }
    
    this.spinButton = new BaseButton({
      texture: btnTexture,
      anchor: 0.5
    });
    
    this.addChild(this.spinButton);
  }

  // 創建控制按鈕
  private createControlButtons(): void {
    const resourceManager = ResourceManager.getInstance();

    // 設定按鈕
    const settingsResource = resourceManager.getResource('option_btn');
    this.settingsButton = new BaseButton({
      texture: settingsResource ? PIXI.Texture.from(settingsResource) : undefined,
      anchor: 0.5
    });
    this.settingsButton.zIndex = 15;
    this.addChild(this.settingsButton);

    // 快速按鈕
    const turboResource = resourceManager.getResource('turbo_btn');
    this.turboButton = new BaseButton({
      texture: turboResource ? PIXI.Texture.from(turboResource) : undefined,
      anchor: 0.5
    });
    this.turboButton.zIndex = 15;
    this.addChild(this.turboButton);

    // 自動旋轉按鈕
    const autoResource = resourceManager.getResource('auto_btn');
    this.autoButton = new BaseButton({
      texture: autoResource ? PIXI.Texture.from(autoResource) : undefined,
      anchor: 0.5
    });
    this.autoButton.zIndex = 15;
    this.addChild(this.autoButton);

    // 加注按鈕
    const plusResource = resourceManager.getResource('plus_btn');
    this.plusButton = new BaseButton({
      texture: plusResource ? PIXI.Texture.from(plusResource) : undefined,
      anchor: 0.5
    });
    this.plusButton.zIndex = 15;
    this.addChild(this.plusButton);

    // 減注按鈕
    const minusResource = resourceManager.getResource('sub_btn');
    this.minusButton = new BaseButton({
      texture: minusResource ? PIXI.Texture.from(minusResource) : undefined,
      anchor: 0.5
    });
    this.minusButton.zIndex = 15;
    this.addChild(this.minusButton);
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
    // 主旋轉按鈕位置
    this.spinButton.x = 544;
    this.spinButton.y = 1726;

    // 控制按鈕位置
    this.settingsButton.x = 75;
    this.settingsButton.y = 1653;

    this.turboButton.x = 918;
    this.turboButton.y = 1774;

    this.autoButton.x = 174;
    this.autoButton.y = 1774;

    this.plusButton.x = 750;
    this.plusButton.y = 1774;

    this.minusButton.x = 341;
    this.minusButton.y = 1774;
  }

  // 綁定事件
  protected bindEvents(): void {
    this.spinButton.on('buttonClicked', this.onSpinButtonClick.bind(this));
    this.settingsButton.on('buttonClicked', this.onSettingsButtonClick.bind(this));
    this.turboButton.on('buttonClicked', this.onTurboButtonClick.bind(this));
    this.autoButton.on('buttonClicked', this.onAutoButtonClick.bind(this));
    this.plusButton.on('buttonClicked', this.onPlusButtonClick.bind(this));
    this.minusButton.on('buttonClicked', this.onMinusButtonClick.bind(this));
  }

  // 解綁事件
  protected unbindEvents(): void {
    this.spinButton.off('buttonClicked', this.onSpinButtonClick.bind(this));
    this.settingsButton.off('buttonClicked', this.onSettingsButtonClick.bind(this));
    this.turboButton.off('buttonClicked', this.onTurboButtonClick.bind(this));
    this.autoButton.off('buttonClicked', this.onAutoButtonClick.bind(this));
    this.plusButton.off('buttonClicked', this.onPlusButtonClick.bind(this));
    this.minusButton.off('buttonClicked', this.onMinusButtonClick.bind(this));
  }

  // 按鈕點擊事件
  private onSpinButtonClick(): void {
    this.emit('spinButtonClicked');
  }

  private onSettingsButtonClick(): void {
    this.emit('settingsButtonClicked');
  }

  private onTurboButtonClick(): void {
    this.emit('turboButtonClicked');
  }

  private onAutoButtonClick(): void {
    this.emit('autoButtonClicked');
  }

  private onPlusButtonClick(): void {
    this.emit('plusButtonClicked');
  }

  private onMinusButtonClick(): void {
    this.emit('minusButtonClicked');
  }

  // 公開方法 - 開始旋轉動畫
  public startSpinAnimation(): void {
    this.setSpinButtonEnabled(false);
    this.hideWinAmount();
    this.wheel.startSpin();
  }

  // 公開方法 - 停止旋轉動畫
  public stopSpinAnimation(results: number[][]): void {
    this.wheel.stopSpin({
      symbolIds: results,  // 直接傳入陣列
      onComplete: () => {
        // 所有捲軸停止後，啟用按鈕
        setTimeout(() => {
          this.setSpinButtonEnabled(true);
        }, 300);
      }
    });
  }

  // 公開方法 - 播放獲勝動畫
  public playWinAnimation(winAmount: number): void {
    // this.winAmountText.text = `贏得 $${winAmount}`;
    // this.winAmountText.visible = true;
    // this.winAmountText.scale.set(0);

    // // 放大動畫
    // const startTime = Date.now();
    // const duration = 500;
    
    // const animate = () => {
    //   const elapsed = Date.now() - startTime;
    //   const progress = Math.min(elapsed / duration, 1);
      
    //   // 彈性效果
    //   const scale = this.easeOutElastic(progress);
    //   this.winAmountText.scale.set(scale);
      
    //   if (progress < 1) {
    //     requestAnimationFrame(animate);
    //   }
    // };
    
    // animate();

    // // 3 秒後隱藏
    // setTimeout(() => {
    //   this.hideWinAmount();
    // }, 3000);
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
    this.spinButton.setEnabled(enabled);
  }

  // 設置所有按鈕啟用狀態
  public setAllButtonsEnabled(enabled: boolean): void {
    this.spinButton.setEnabled(enabled);
    this.settingsButton.setEnabled(enabled);
    this.turboButton.setEnabled(enabled);
    this.autoButton.setEnabled(enabled);
    this.plusButton.setEnabled(enabled);
    this.minusButton.setEnabled(enabled);
  }

  // 設置特定按鈕啟用狀態
  public setButtonEnabled(buttonType: 'settings' | 'turbo' | 'auto' | 'plus' | 'minus', enabled: boolean): void {
    switch (buttonType) {
      case 'settings':
        this.settingsButton.setEnabled(enabled);
        break;
      case 'turbo':
        this.turboButton.setEnabled(enabled);
        break;
      case 'auto':
        this.autoButton.setEnabled(enabled);
        break;
      case 'plus':
        this.plusButton.setEnabled(enabled);
        break;
      case 'minus':
        this.minusButton.setEnabled(enabled);
        break;
    }
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

