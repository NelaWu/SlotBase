import { BaseView } from '@views/BaseView';
import * as PIXI from 'pixi.js';
import { MainGame } from './main/MainGame';
import { ButtonEvent } from '@/views/components/ButtonEvents';
import { WinLineInfo } from '../models/TitansSlotModel';
import { gsap } from 'gsap';
import { JpData } from './main/JpInfo';
import { SoundManager } from '../core/SoundManager';

export class TitansSlotView extends BaseView {
  private mainGame!: MainGame;
  private onSpinAnimationCompleteCallback?: () => void; // 旋轉動畫完成回調
  private errorOverlay?: PIXI.Container; // 錯誤覆蓋層
  private lastSpinClickTime: number = 0; // 上次點擊時間（用於雙擊檢測）
  private readonly DOUBLE_CLICK_THRESHOLD = 200; // 雙擊時間閾值（毫秒）
  private spinClickTimeout?: NodeJS.Timeout; // 單擊延遲執行的定時器
  private pendingFastDrop: boolean = false; // 待執行的快速模式標誌（雙擊時設置，僅對當前 Spin 有效）
  private currentSpinFastDrop: boolean = false; // 當前 Spin 的快速模式標誌（用於 stopSpin）

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
    // 清除可能存在的延遲執行定時器
    if (this.spinClickTimeout) {
      clearTimeout(this.spinClickTimeout);
      this.spinClickTimeout = undefined;
    }
    
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
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - this.lastSpinClickTime;
    
    // 檢測雙擊：如果距離上次點擊時間小於閾值，且上次點擊的延遲執行還沒觸發
    if (this.lastSpinClickTime > 0 && timeSinceLastClick < this.DOUBLE_CLICK_THRESHOLD) {
      // 取消上次點擊的延遲執行
      if (this.spinClickTimeout) {
        clearTimeout(this.spinClickTimeout);
        this.spinClickTimeout = undefined;
      }
      
      // 雙擊：設置快速模式標誌，執行 Spin（僅對當前 Spin 有效）
      this.pendingFastDrop = true;
      console.log('🔄 雙擊 Spin 按鈕，當前 Spin 使用快速掉落模式');
      
      // 執行 Spin（使用快速模式）
      SoundManager.playSound('btm_spin');
      this.mainGame.playSpinAnimation();
      this.emit('spinButtonClicked');
      
      // 重置點擊時間，避免連續觸發
      this.lastSpinClickTime = 0;
      return;
    }
    
    // 單擊：延遲執行，給用戶時間進行第二次點擊（雙擊檢測）
    this.lastSpinClickTime = currentTime;
    this.pendingFastDrop = false; // 單擊時使用正常模式
    
    // 清除之前的延遲執行（如果有的話）
    if (this.spinClickTimeout) {
      clearTimeout(this.spinClickTimeout);
    }
    
    // 設置延遲執行單擊操作
    this.spinClickTimeout = setTimeout(() => {
      // 延遲時間到了，執行單擊操作（正常模式）
      SoundManager.playSound('btm_spin');
      this.mainGame.playSpinAnimation();
      this.emit('spinButtonClicked');
      
      // 重置狀態
      this.lastSpinClickTime = 0;
      this.spinClickTimeout = undefined;
    }, this.DOUBLE_CLICK_THRESHOLD);
  }

  private onSettingsButtonClick(): void {
    SoundManager.playSound('btm_butt');
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
    SoundManager.playSound('btm_butt');
    this.emit('turboButtonClicked');
  }

  private onAutoButtonClick(): void {
    SoundManager.playSound('btm_butt');
    this.emit('autoButtonClicked');
  }

  private onPlusButtonClick(): void { 
    SoundManager.playSound('btm_butt');
    this.emit('plusButtonClicked');
  }

  private onMinusButtonClick(): void {
    SoundManager.playSound('btm_butt');
    this.emit('minusButtonClicked');
  }

  // ==================== 公開方法 - 供 Controller 調用 ====================

  // 公開方法 - 開始旋轉動畫
  public startSpinAnimation(fastDrop?: boolean): void {
    this.setSpinButtonEnabled(false);
    this.updateWinAmount(0);
    
    // 優先使用雙擊快速模式（pendingFastDrop），如果沒有則使用傳入的參數（通常是 Turbo 模式）
    const shouldFastDrop = this.pendingFastDrop || (fastDrop || false);
    
    // 保存當前 Spin 的快速模式標誌（用於 stopSpin）
    this.currentSpinFastDrop = shouldFastDrop;
    
    // 清除待執行的快速模式標誌（已經使用）
    this.pendingFastDrop = false;
    
    this.mainGame.wheel.startSpin(shouldFastDrop);
  }

  // 公開方法 - 停止旋轉動畫
  public stopSpinAnimation(results: number[][], onClearComplete?: () => void, onDropComplete?: () => void, fastDrop?: boolean): void {
    // 優先使用當前 Spin 的快速模式標誌（雙擊時設置），如果沒有則使用傳入的參數
    const shouldFastDrop = this.currentSpinFastDrop || (fastDrop || false);
    
    // 清除當前 Spin 的快速模式標誌（已經使用）
    this.currentSpinFastDrop = false;
    
    this.mainGame.wheel.stopSpin({
      symbolIds: results,  // 直接傳入陣列
      onClearComplete: onClearComplete, // 清空完成回調
      fastDrop: shouldFastDrop, // 快速掉落（使用當前 Spin 的快速模式標誌）
      onComplete: () => {
        // 符號掉落完成後的回調（用於自動旋轉）
        if (onDropComplete) {
          onDropComplete();
        }
        
        // // 所有捲軸停止後，啟用按鈕
        // setTimeout(() => {
        //   this.setSpinButtonEnabled(true);
        // }, 300);
        
        // 牌面顯示完成後，觸發回調（用於發送 WebSocket 11011）
        if (this.onSpinAnimationCompleteCallback) {
          this.onSpinAnimationCompleteCallback();
        }
      }
    });
    this.mainGame.showBGWinBar(true);
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

  public playMultiBallAnimation():void{
    this.mainGame.playMultiBallAnimation();
  }

  /**
   * 格式化金額顯示，處理浮點數精度問題
   * @param amount 金額
   * @returns 格式化後的字串
   */
  private formatAmount(amount: number): string {
    // 處理 NaN 和 Infinity
    if (!isFinite(amount)) {
      return '0';
    }
    
    // 使用 toFixed(2) 處理精度問題，然後移除多餘的尾隨零
    const fixed = amount.toFixed(2);
    // 移除尾隨零和小數點（如果小數部分為 0）
    return parseFloat(fixed).toString();
  }

  // 更新餘額顯示
  public updateBalance(balance: number): void {
    this.mainGame.balanceText.text = this.formatAmount(balance);
  }

  // 更新投注顯示
  public updateBet(bet: number): void {
    this.mainGame.betText.text = this.formatAmount(bet);
  }

  // 更新獲勝金額顯示（底部）；免費遊戲時 winText 顯示 freeTotalWin，playBGWinMoney 仍用 winAmount
  public updateWinAmount(winAmount: number): void {
    const isFreeGame = this.mainGame.getIsFreeGame();
    const displayTarget = isFreeGame ? this.mainGame.getFreeTotalWinForDisplay()+winAmount : winAmount;
    if (winAmount > 0) {
      const m: { money: number } = { money: Number(this.mainGame.winText.text) || 0 };
      const mBar: { money: number } = { money: Number(this.mainGame.winText.text) || 0 };
      gsap.to(m, { money: displayTarget, duration: 1, onUpdate: () => {
        this.mainGame.winText.text = m.money.toFixed(2);
      } });
      gsap.to(mBar, { money: winAmount, duration: 1, onUpdate: () => {
        this.mainGame.gameScene.playBGWinMoney(mBar.money);
      } });
    } else {
      this.mainGame.winText.text = displayTarget > 0 ? displayTarget.toFixed(2) : '0';
      this.mainGame.gameScene.playBGWinMoney(winAmount);
    }
  }

  public async updateWinAmountAnimation(multiplierBallPositions: { symbolId: number; pos: string }[]): Promise<void> {
    await this.mainGame.playMultiBallBigAnimation(multiplierBallPositions);
  }

  // 更新免費旋轉顯示
  public updateFreeSpins(remaining: number): void {
    this.mainGame.freeTimes.showText(remaining.toString());
  }

  public autoButtonEnabled(enabled: boolean): void {
    this.mainGame.autoButton.setToggleState(enabled);
  }

  // 設置旋轉按鈕啟用狀態
  public setSpinButtonEnabled(enabled: boolean): void {
    this.mainGame.spinButton.setEnabled(enabled);
    this.mainGame.buyFreeSpinsButton.setEnabled(enabled);
    this.mainGame.plusButton.setEnabled(enabled);
    this.mainGame.minusButton.setEnabled(enabled);
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


  // 重寫調整大小方法
  override resize(width: number, height: number): void {
    // 根據新尺寸調整佈局
    const scaleX = width / 1080;
    const scaleY = height / 1920;
    const scale = Math.min(scaleX, scaleY);
    
    this.scale.set(scale);

    // 如果錯誤覆蓋層存在，更新其大小
    if (this.errorOverlay) {
      const bg = this.errorOverlay.children[0] as PIXI.Graphics;
      if (bg) {
        bg.clear();
        bg.beginFill(0x000000, 1);
        bg.drawRect(0, 0, width, height);
        bg.endFill();
      }
      
      const errorText = this.errorOverlay.children[1] as PIXI.Text;
      if (errorText) {
        errorText.x = width / 2;
        errorText.y = height / 2 - 100;
        errorText.style.wordWrapWidth = width - 100;
      }

      // 如果有按鈕，更新按鈕位置
      const buttonBg = this.errorOverlay.children.find(child => child instanceof PIXI.Graphics && child !== bg) as PIXI.Graphics | undefined;
      const buttonText = this.errorOverlay.children.find(child => child instanceof PIXI.Text && child !== errorText) as PIXI.Text | undefined;
      
      if (buttonBg && buttonText) {
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = width / 2;
        const buttonY = height / 2 + 100;

        buttonBg.x = buttonX;
        buttonBg.y = buttonY;
        buttonText.x = buttonX;
        buttonText.y = buttonY;
      }
    }
  }

  // 獲取 MainGame 實例
  public getMainGame(): MainGame {
    return this.mainGame;
  }

  /**
   * 設置獲取投注金額的函數到 MainGame
   * @param getBet 函數：返回當前的投注金額（客戶端金額）
   */
  public setGetBetAmount(getBet: () => number): void {
    this.mainGame.setGetBetAmount(getBet);
  }

  // 檢查畫面上是否有可見符號
  public hasVisibleSymbols(): boolean {
    return this.mainGame.wheel.hasVisibleSymbols();
  }

  public showBigWin( money:number, bet:number){
    this.mainGame.showBigWin(money.toString(),bet);
  }

  public async showBigWinAsync(money: number, bet: number): Promise<void> {
    return this.mainGame.showBigWinAsync(money.toString(), bet);
  }

  public showJpWin(money: number, jpLevel: number): void {
    this.mainGame.showJpWin(money.toString(), jpLevel);
  }

  public async showFreeEndAsync(winAmount: number): Promise<void> {
    return this.mainGame.showFreeEndAsync(winAmount.toString());
  }

  /**
   * 開始免費遊戲流程
   */
  public startFreeGame(): void {
    this.mainGame.startFreeGame();
  }
  public updateJpInfo(jpDataArray: JpData[]): void {  
    this.mainGame.updateJpInfo(jpDataArray);
  }

  /**
   * 顯示錯誤訊息（全屏黑色背景）
   * @param message 錯誤訊息
   * @param exitUrl 退出 URL（可選）
   */
  public showErrorOverlay(message: string, exitUrl?: string): void {
    // 如果已經有錯誤覆蓋層，先移除
    if (this.errorOverlay) {
      this.removeChild(this.errorOverlay);
      this.errorOverlay.destroy({ children: true });
    }

    // 創建錯誤覆蓋層
    this.errorOverlay = new PIXI.Container();
    
    // 獲取實際畫布尺寸
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    
    // 創建黑色背景（全屏）
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 1);
    bg.drawRect(0, 0, width, height);
    bg.endFill();
    this.errorOverlay.addChild(bg);

    // 創建文字樣式
    const textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 48,
      fill: 0xffffff,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width - 100,
    });

    // 創建錯誤訊息文字
    const errorText = new PIXI.Text(message, textStyle);
    errorText.anchor.set(0.5);
    errorText.x = width / 2;
    errorText.y = height / 2 - 100; // 向上移動一點，為按鈕留出空間
    this.errorOverlay.addChild(errorText);

    // 始終創建確認按鈕
    // 按鈕尺寸
    const buttonWidth = 300;
    const buttonHeight = 100;
    const buttonX = width / 2;
    const buttonY = height / 2 + 100; // 中間下方

    // 創建按鈕背景（橘色）
    const buttonBg = new PIXI.Graphics();
    buttonBg.beginFill(0xFF6600, 1); // 橘色
    buttonBg.drawRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
    buttonBg.endFill();
    buttonBg.x = buttonX;
    buttonBg.y = buttonY;
    buttonBg.eventMode = 'static';
    buttonBg.cursor = 'pointer';
    // 設置點擊區域
    buttonBg.hitArea = new PIXI.RoundedRectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);

    // 按鈕文字樣式
    const buttonTextStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 50,
      fill: 0xffffff,
      align: 'center',
      fontWeight: 'bold',
    });

    // 創建按鈕文字
    const buttonText = new PIXI.Text('confirm', buttonTextStyle);
    buttonText.anchor.set(0.5);
    buttonText.x = buttonX;
    buttonText.y = buttonY;
    buttonText.zIndex = 1; // 確保文字在按鈕上方

    // 按鈕點擊事件
    const onButtonClick = () => {
      if (exitUrl && exitUrl.trim() !== '') {
        console.log('🔗 導向退出 URL:', exitUrl);
        window.location.href = exitUrl;
      } else {
        console.log('🔒 exitUrl 為空，關閉視窗');
        window.close();
      }
    };

      // 按鈕懸停效果
      buttonBg.on('pointerover', () => {
        buttonBg.clear();
        buttonBg.beginFill(0xFF8800, 1); // 稍亮的橘色
        buttonBg.drawRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
        buttonBg.endFill();
      });

      buttonBg.on('pointerout', () => {
        buttonBg.clear();
        buttonBg.beginFill(0xFF6600, 1); // 恢復原色
        buttonBg.drawRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
        buttonBg.endFill();
      });

      buttonBg.on('pointerdown', () => {
        buttonBg.clear();
        buttonBg.beginFill(0xFF4400, 1); // 按下時更深的橘色
        buttonBg.drawRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
        buttonBg.endFill();
      });

      buttonBg.on('pointerup', () => {
        buttonBg.clear();
        buttonBg.beginFill(0xFF6600, 1); // 恢復原色
        buttonBg.drawRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
        buttonBg.endFill();
        onButtonClick();
      });

    buttonBg.on('pointerupoutside', () => {
      buttonBg.clear();
      buttonBg.beginFill(0xFF6600, 1); // 恢復原色
      buttonBg.drawRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
      buttonBg.endFill();
    });

    // 先添加按鈕背景，再添加文字（確保文字在按鈕上方）
    this.errorOverlay.addChild(buttonBg);
    this.errorOverlay.addChild(buttonText);

    // 將錯誤覆蓋層添加到舞台最上層
    this.addChild(this.errorOverlay);
    
    // 設置 z-index（確保在最上層）
    this.errorOverlay.zIndex = 9999;
  }

  /**
   * 隱藏錯誤訊息
   */
  public hideErrorOverlay(): void {
    if (this.errorOverlay) {
      this.removeChild(this.errorOverlay);
      this.errorOverlay.destroy({ children: true });
      this.errorOverlay = undefined;
    }
  }
}
