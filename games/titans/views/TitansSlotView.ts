import { BaseView } from '@views/BaseView';
import * as PIXI from 'pixi.js';
import { MainGame } from './main/MainGame';
import { ButtonEvent } from '@/views/components/ButtonEvents';
import { WinLineInfo } from '../models/TitansSlotModel';

export class TitansSlotView extends BaseView {
  private mainGame!: MainGame;
  private onSpinAnimationCompleteCallback?: () => void; // 旋轉動畫完成回調

  constructor(app: PIXI.Application) {
    super(app);
  }

  /**
   * 設置旋轉動畫完成回調
   */
  public setOnSpinAnimationComplete(callback: () => void): void {
    this.onSpinAnimationCompleteCallback = callback;
  }

  // 創建 UI 組件
  protected async createComponents(): Promise<void> {
    // 創建 MainGame 實例
    this.mainGame = new MainGame();
    await this.mainGame.initialize();
    
    // 將 MainGame 添加到視圖
    this.addChild(this.mainGame);
  }

  // 設置佈局（不需要，已在 MainGame 中設置）
  protected setupLayout(): void {
    // 佈局已在 MainGame.setupLayout() 中設置
  }

  // 綁定事件
  protected bindEvents(): void {
    this.mainGame.spinButton.on(ButtonEvent.BUTTON_CLICKED, this.onSpinButtonClick.bind(this));
    this.mainGame.settingsButton.on(ButtonEvent.BUTTON_CLICKED, this.onSettingsButtonClick.bind(this));
    this.mainGame.settingsBackButton.on(ButtonEvent.BUTTON_CLICKED, this.onSettingsButtonClick.bind(this));
    this.mainGame.turboButton.on(ButtonEvent.BUTTON_CLICKED, this.onTurboButtonClick.bind(this));
    this.mainGame.autoButton.on(ButtonEvent.BUTTON_CLICKED, this.onAutoButtonClick.bind(this));
    this.mainGame.plusButton.on(ButtonEvent.BUTTON_CLICKED, this.onPlusButtonClick.bind(this));
    this.mainGame.minusButton.on(ButtonEvent.BUTTON_CLICKED, this.onMinusButtonClick.bind(this));
  }

  // 解綁事件
  protected unbindEvents(): void {
    this.mainGame.spinButton.off(ButtonEvent.BUTTON_CLICKED, this.onSpinButtonClick.bind(this));
    this.mainGame.settingsButton.off(ButtonEvent.BUTTON_CLICKED, this.onSettingsButtonClick.bind(this));
    this.mainGame.settingsBackButton.off(ButtonEvent.BUTTON_CLICKED, this.onSettingsButtonClick.bind(this));
    this.mainGame.turboButton.off(ButtonEvent.BUTTON_CLICKED, this.onTurboButtonClick.bind(this));
    this.mainGame.autoButton.off(ButtonEvent.BUTTON_CLICKED, this.onAutoButtonClick.bind(this));
    this.mainGame.plusButton.off(ButtonEvent.BUTTON_CLICKED, this.onPlusButtonClick.bind(this));
    this.mainGame.minusButton.off(ButtonEvent.BUTTON_CLICKED, this.onMinusButtonClick.bind(this));
  }

  // 按鈕點擊事件
  private onSpinButtonClick(): void {
    this.mainGame.playSpinAnimation();
    this.emit('spinButtonClicked');
  }

  private onSettingsButtonClick(): void {
    if (this.mainGame.settingsButton.visible == true) {
      this.mainGame.settingsButton.visible = false;
      this.mainGame.settingsBackButton.visible = true;
      this.mainGame.settingsButtonContainer.visible = true;
      this.mainGame.betButtonContainer.visible = false;
    } else {
      this.mainGame.settingsButton.visible = true;
      this.mainGame.settingsBackButton.visible = false;
      this.mainGame.settingsButtonContainer.visible = false;
      this.mainGame.betButtonContainer.visible = true;
    }
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

  // ==================== 公開方法 - 供 Controller 調用 ====================

  // 公開方法 - 開始旋轉動畫
  public startSpinAnimation(): void {
    this.setSpinButtonEnabled(false);
    this.hideWinAmount();
    this.updateWinAmount(0);
    this.mainGame.wheel.startSpin();
  }

  // 公開方法 - 停止旋轉動畫
  public stopSpinAnimation(results: number[][], onClearComplete?: () => void, onDropComplete?: () => void): void {
    this.mainGame.wheel.stopSpin({
      symbolIds: results,  // 直接傳入陣列
      onClearComplete: onClearComplete, // 清空完成回調
      onComplete: () => {
        // 符號掉落完成後的回調（用於自動旋轉）
        if (onDropComplete) {
          onDropComplete();
        }
        
        // 所有捲軸停止後，啟用按鈕
        setTimeout(() => {
          this.setSpinButtonEnabled(true);
        }, 300);
        
        // 牌面顯示完成後，觸發回調（用於發送 WebSocket 11010）
        if (this.onSpinAnimationCompleteCallback) {
          this.onSpinAnimationCompleteCallback();
        }
      }
    });
  }

  // 公開方法 - 播放獲勝動畫
  public playWinAnimation(winLineInfos: WinLineInfo[]): void {
    if (!winLineInfos || winLineInfos.length === 0) {
      return;
    }
    // 調用 Wheel 的共用方法來播放獲勝動畫
    this.mainGame.wheel.playWinAnimations(winLineInfos);
  }

  // 公開方法 - 隱藏所有獲勝動畫
  public hideWinAnimations(): void {
    this.mainGame.wheel.hideAllWinAnimations();
  }

  // 隱藏獲勝金額
  private hideWinAmount(): void {
    this.mainGame.winAmountText.visible = false;
  }

  // 更新餘額顯示
  public updateBalance(balance: number): void {
    this.mainGame.balanceText.text = `${balance}`;
  }

  // 更新投注顯示
  public updateBet(bet: number): void {
    this.mainGame.betText.text = `${bet}`;
  }

  // 更新獲勝金額顯示（底部）
  public updateWinAmount(winAmount: number): void {
    if (winAmount > 0) {
      this.mainGame.winText.text = `${winAmount}`;
    } else {
      this.mainGame.winText.text = '0';
    }
  }

  // 更新免費旋轉顯示
  public updateFreeSpins(remaining: number): void {
    if (remaining > 0) {
      this.mainGame.freeSpinsText.text = `免費旋轉: ${remaining}`;
      this.mainGame.freeSpinsText.visible = true;
    } else {
      this.mainGame.freeSpinsText.visible = false;
    }
  }

  // 設置旋轉按鈕啟用狀態
  public setSpinButtonEnabled(enabled: boolean): void {
    this.mainGame.spinButton.setEnabled(enabled);
  }

  // 設置所有按鈕啟用狀態
  public setAllButtonsEnabled(enabled: boolean): void {
    this.mainGame.spinButton.setEnabled(enabled);
    this.mainGame.settingsButton.setEnabled(enabled);
    this.mainGame.turboButton.setEnabled(enabled);
    this.mainGame.autoButton.setEnabled(enabled);
    this.mainGame.plusButton.setEnabled(enabled);
    this.mainGame.minusButton.setEnabled(enabled);
  }

  // 設置特定按鈕啟用狀態
  public setButtonEnabled(buttonType: 'settings' | 'turbo' | 'auto' | 'plus' | 'minus', enabled: boolean): void {
    switch (buttonType) {
      case 'settings':
        this.mainGame.settingsButton.setEnabled(enabled);
        break;
      case 'turbo':
        this.mainGame.turboButton.setEnabled(enabled);
        break;
      case 'auto':
        this.mainGame.autoButton.setEnabled(enabled);
        break;
      case 'plus':
        this.mainGame.plusButton.setEnabled(enabled);
        break;
      case 'minus':
        this.mainGame.minusButton.setEnabled(enabled);
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

  // 獲取 MainGame 實例
  public getMainGame(): MainGame {
    return this.mainGame;
  }

  // 檢查畫面上是否有可見符號
  public hasVisibleSymbols(): boolean {
    return this.mainGame.wheel.hasVisibleSymbols();
  }
}
