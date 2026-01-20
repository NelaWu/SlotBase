import { ResourceManager } from '@/core/ResourceManager';
import { BaseButton } from '@views/components/BaseButton';
import * as PIXI from 'pixi.js';
import { TitansWheel } from './wheel/TitansWheel';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { GameScene } from './GameScene';
import { BigAnimationManager } from './bigAnimation/BigAnimationManager';
import { BetPanel } from './BetPanel';
import { ButtonEvent } from '@/views/components/ButtonEvents';
import { getMultiplierFromSymbolId } from '../../constants/MultiplierMap';
import { GameEventEnum } from '../../enum/gameEnum';
import { BaseNumber } from '@/views/components/BaseNumber';

export class MainGame extends PIXI.Container {
  public gameScene!: GameScene;
  public wheel!: TitansWheel;
  public spinButton!: BaseButton;
  public settingsButton!: BaseButton;
  public settingsBackButton!: BaseButton;
  public turboButton!: BaseButton;
  public autoButton!: BaseButton;
  public plusButton!: BaseButton;
  public minusButton!: BaseButton;
  public buyFreeSpinsButton!: BaseButton;
  public logoutButton!: BaseButton;
  public recordButton!: BaseButton;
  public infoButton!: BaseButton;
  public winAmountText!: PIXI.Text;
  public balanceText!: PIXI.Text;
  public betText!: PIXI.Text;
  public freeSpinsText!: PIXI.Text;
  public winText!: PIXI.Text; // 獲勝金額顯示（底部）
  public betButtonContainer!: PIXI.Container;
  public freeTimes!:BaseNumber;
  public freeTimesText!: PIXI.Sprite;
  public settingsButtonContainer!: PIXI.Container;
  public bigAnimationManager!: BigAnimationManager;
  public betPanel!: BetPanel;
  public multiBallSpine!: Spine;
  private multiBallAnimationQueue: Array<{ symbolId: number; pos: string }> = []; // 倍數球動畫隊列
  private isPlayingMultiBallAnimation: boolean = false; // 是否正在播放倍數球動畫
  private multiBallAnimationResolve?: () => void; // 動畫完成時的 resolve 回調
  private getBetAmount?: () => number; // 獲取投注金額的函數（返回客戶端金額）

  constructor() {
    super();
    this.sortableChildren = true; // 啟用 z-index 排序
  }

  /**
   * 設置獲取投注金額的函數
   * @param getBet 函數：返回當前的投注金額（客戶端金額）
   */
  public setGetBetAmount(getBet: () => number): void {
    this.getBetAmount = getBet;
  }

  // 初始化所有組件
  async initialize(): Promise<void> {
    // 創建背景
    this.createBackground();

    // 創建捲軸
    this.createReels();

    // 創建按鈕
    this.createSpinButton();
    this.createControlButtons();
    this.createSettingsButton();

    // 創建文字顯示
    this.createTexts();

    // 設置佈局
    this.setupLayout();

    // 創建倍數球動畫
    this.createMultiBallAnimation();

    // 創建大動畫管理器
    this.createBigAnimation();

  }

  public playSymbol10Animation(): void {
    const spin = this.getChildByLabel?.('symbol10Spine');
    if (spin && 'state' in spin && typeof (spin as any).state.setAnimation === 'function') {
      const spineState = (spin as any).state;
      spineState.setAnimation(0, "Win", true);
    }
  }

  public playSpinAnimation(): void {
    const spinSpine = this.spinButton.getChildByLabel?.('spinSpine');
    if (spinSpine && 'state' in spinSpine && typeof (spinSpine as any).state.setAnimation === 'function') {
      const spineState = (spinSpine as any).state;
      spineState.setAnimation(0, "Spin", false);
      const onComplete = () => {
        spineState.setAnimation(0, "Idle", true);
      };
      spineState.addListener({
        complete: onComplete
      });

    }
  }

  // 創建背景
  private createBackground(): void {
    //遊戲背景，main/free
    this.gameScene = new GameScene();
    this.addChild(this.gameScene);
    //下方按鈕
    this.settingsButtonContainer = new PIXI.Container();
    this.settingsButtonContainer.name = 'settingsButtonContainer';
    this.betButtonContainer = new PIXI.Container();
    this.betButtonContainer.name = 'betButtonContainer';
    this.addChild(this.settingsButtonContainer);
    this.addChild(this.betButtonContainer);
    this.settingsButtonContainer.visible = false;
  }

  // 創建捲軸
  private createReels(): void {
    this.wheel = new TitansWheel({
      reelWidth: 168,
      reelHeight: 147 * 5,
      numberOfReels: 6,
      symbolsPerReel: 5
    });

    // 設置輪盤位置
    this.wheel.x = 36;
    this.wheel.y = 715;

    this.addChild(this.wheel);
  }

  // 創建旋轉按鈕
  private createSpinButton(): void {
    const resourceManager = ResourceManager.getInstance();
    this.spinButton = new BaseButton({
      baseName: 'spin_btn',
      anchor: 0.5
    });

    const spinSpine = Spine.from({
      atlas: 'Spin_Btn_atlas',
      skeleton: 'Spin_Btn_skel',
    });
    spinSpine.label = 'spinSpine';
    this.spinButton.addChildAt(spinSpine, 1);
    spinSpine.state.setAnimation(0, "Idle", true);

    const spineLogo: PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('spin_btn_logo') as string));
    spineLogo.anchor.set(0.5);
    this.spinButton.addChild(spineLogo);
    const spineShadow: PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('spin_btn_shadow') as string));
    spineShadow.anchor.set(0.5);
    this.spinButton.addChildAt(spineShadow, 0);
    this.betButtonContainer.addChild(this.spinButton);
  }

  // 創建控制按鈕
  private createControlButtons(): void {
    // 設定按鈕
    this.settingsButton = new BaseButton({
      baseName: 'option_btn',
      anchor: 0.5
    });
    this.addChild(this.settingsButton);

    // 設定返回按鈕
    this.settingsBackButton = new BaseButton({
      baseName: 'option_back_btn',
      anchor: 0.5
    });
    this.addChild(this.settingsBackButton);
    this.settingsBackButton.visible = false;

    // 快速按鈕
    this.turboButton = new BaseButton({
      baseName: 'turbo_btn',
      anchor: 0.5,
      isToggle: true,
    });
    this.betButtonContainer.addChild(this.turboButton);

    // 自動旋轉按鈕
    this.autoButton = new BaseButton({
      baseName: 'auto_btn',
      anchor: 0.5,
      isToggle: true,
    });
    this.betButtonContainer.addChild(this.autoButton);

    // 加注按鈕
    this.plusButton = new BaseButton({
      baseName: 'plus_btn',
      anchor: 0.5
    });
    this.betButtonContainer.addChild(this.plusButton);

    // 減注按鈕
    this.minusButton = new BaseButton({
      baseName: 'sub_btn',
      anchor: 0.5
    });
    this.betButtonContainer.addChild(this.minusButton);

    const resourceManager = ResourceManager.getInstance();
    this.freeTimes = new BaseNumber({
      baseName: 'fg_info_number',
      anchor: 0.5
    });
    this.freeTimes.visible = false;
    this.betButtonContainer.addChild(this.freeTimes);
    this.freeTimes.position.set(300, 1750);
    this.freeTimes.showText('0');
    this.freeTimesText = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('fg_info_text') as string));
    this.freeTimesText.position.set(650, 1750);
    this.freeTimesText.anchor.set(0.5);
    this.freeTimesText.visible = false;
    this.addChild(this.freeTimesText);

    // 購買免費旋轉按鈕
    this.buyFreeSpinsButton = new BaseButton({
      baseName: 'fg_btn_cnt',
      anchor: 0
    });
    this.addChild(this.buyFreeSpinsButton);
    this.buyFreeSpinsButton.on(ButtonEvent.BUTTON_CLICKED, () => {
      // 獲取當前投注金額（客戶端金額）
      const betAmount = this.getBetAmount ? this.getBetAmount() : 0;
      const fessSpin = this.bigAnimationManager.showFreeSpin(betAmount);
      
      // 監聽開始免費遊戲事件
      fessSpin.once('bigAnimationFreeSpinStart', () => {
        this.startFreeGame();
      });
    });
  }

  private createSettingsButton(): void {
    this.logoutButton = new BaseButton({
      baseName: 'logout_btn',
      anchor: 0.5
    });
    this.settingsButtonContainer.addChild(this.logoutButton);
    this.recordButton = new BaseButton({
      baseName: 'record_btn',
      anchor: 0.5
    });
    this.settingsButtonContainer.addChild(this.recordButton);
    this.infoButton = new BaseButton({
      baseName: 'info_btn',
      anchor: 0.5
    });
    this.settingsButtonContainer.addChild(this.infoButton);
  }

  // 創建金額相關
  private createTexts(): void {
    const resourceManager = ResourceManager.getInstance();
    const textStyle = {
      fontFamily: 'Arial',
      fontSize: 36, // 原本 18px * 2
      fill: 0xffffff,
      fontWeight: 'bold' as const,
      stroke: { color: 0x000000, width: 6 } // 原本 3px * 2
    };

    // 餘額顯示
    const balanceIcon: PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('wallet_ui') as string));
    balanceIcon.position.set(15, 1536);
    this.addChild(balanceIcon);
    this.balanceText = new PIXI.Text({
      text: '0',
      style: textStyle
    });
    this.balanceText.x = 75;
    this.balanceText.y = 1540;
    this.addChild(this.balanceText);

    // 投注顯示
    const betIcon: PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('multiple_ui') as string));
    betIcon.position.set(376, 1539);
    this.addChild(betIcon);
    this.betText = new PIXI.Text({
      text: '0',
      style: textStyle
    });
    this.betText.x = 432;
    this.betText.y = 1540;
    this.addChild(this.betText);

    // 點擊betBackground開啟betPanel
    const betBackground = new PIXI.Graphics();
    betBackground.beginFill(0x000000, 0);
    betBackground.drawRect(0, 0, 350, 50);
    betBackground.endFill();
    betBackground.position.set(365, 1535);
    betBackground.eventMode = 'static';
    betBackground.cursor = 'pointer';
    betBackground.hitArea = new PIXI.Rectangle(0, 0, 350, 50);
    betBackground.on('pointerdown', () => {
      if (this.betPanel) {
        this.betPanel.show();
      }
    });

    this.addChild(betBackground);

    // 獲勝金額顯示（底部）
    const winIcon: PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('trophy_ui') as string));
    winIcon.position.set(723, 1539);
    this.addChild(winIcon);
    this.winText = new PIXI.Text({
      text: '0',
      style: textStyle
    });
    this.winText.x = 784;
    this.winText.y = 1540;
    this.addChild(this.winText);

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
  private setupLayout(): void {
    // 主旋轉按鈕位置
    this.spinButton.x = 544;
    this.spinButton.y = 1726;

    // 控制按鈕位置
    this.settingsButton.x = 75;
    this.settingsButton.y = 1653;
    this.settingsBackButton.x = 75;
    this.settingsBackButton.y = 1653;

    this.turboButton.x = 918;
    this.turboButton.y = 1774;

    this.autoButton.x = 174;
    this.autoButton.y = 1774;

    this.plusButton.x = 750;
    this.plusButton.y = 1774;

    this.minusButton.x = 341;
    this.minusButton.y = 1774;

    this.buyFreeSpinsButton.x = 961;
    this.buyFreeSpinsButton.y = 1492;

    //settings_btn位置
    this.logoutButton.x = 309;
    this.logoutButton.y = 1775;
    this.recordButton.x = 550;
    this.recordButton.y = 1775;
    this.infoButton.x = 792;
    this.infoButton.y = 1775;
  }

  private createBigAnimation(): void {
    this.bigAnimationManager = new BigAnimationManager();
    this.bigAnimationManager.zIndex = 9999;
    this.addChild(this.bigAnimationManager);
  }

  private createMultiBallAnimation(): void {
    this.multiBallSpine = Spine.from({
      atlas: 'BG_Multi_Ball_atlas',
      skeleton: 'BG_Multi_Ball_skel',
    });
    this.multiBallSpine.label = 'multiBallSpine';
    this.addChild(this.multiBallSpine);
    this.multiBallSpine.position.set(550, 950);
    console.log('multiBallSpine', this.multiBallSpine);
    // 使用 symbolId 51 來顯示 Lv1（符合 51-55 或 151-155 範圍）
    // this.playMultiBallBigAnimation(51, '1-4');
  }

  public createBetPanel(betlist: number[], onBetSelected?: (betAmount: number) => void): void {
    // 如果已經存在 betPanel，先移除
    if (this.betPanel) {
      this.removeChild(this.betPanel);
      this.betPanel.destroy();
    }
    this.betPanel = new BetPanel(betlist, onBetSelected);
    this.betPanel.visible = false; // 初始狀態為隱藏
    this.addChild(this.betPanel);
  }

  private setBetButtonType(type: 'main' | 'free'): void {
    const isMain:boolean = type === 'main';
    this.freeTimes.visible = !isMain;
    this.freeTimesText.visible = !isMain;
    this.spinButton.visible = isMain;
    this.turboButton.visible = isMain;
    this.autoButton.visible = isMain;
    this.plusButton.visible = isMain;
    this.minusButton.visible = isMain;
  }


  public showBigWin(money: string, bet?: number): void {
    this.bigAnimationManager.showBigWin(money, bet);
  }

  /**
   * 開始免費遊戲流程
   */
  public startFreeGame(): void {
    // 播放 Transition 動畫
    const transition = this.bigAnimationManager.showTransition();
    this.gameScene.setFG();
    this.setBetButtonType('free');
    // Transition 結束後切換到免費模式並自動 spin
    transition.once(GameEventEnum.BIG_ANIMATION_TRANSITION_COMPLETE, () => {
      // 自動 spin（會發送 11014）
      this.emit('freeGameStarted');
    });
  }

  public playMultiBallAnimation(): void {
    this.gameScene.playMultiBallAnimation();
  }

  public showBGWinBar(visible: boolean): void {
    this.gameScene.showBGWinBar(visible);
  }
  public playBGWinMoney(money: number): void {
    this.gameScene.playBGWinMoney(money);
  }

  /**
   * 根據 symbolId 映射到等級
   * @param symbolId 符號 ID
   * @returns 等級字串 (Lv1, Lv2, Lv3, Lv4)
   */
  private getLevelFromSymbolId(symbolId: number): string {
    // 處理 151-170 範圍（減去 100 後與 51-70 範圍相同）
    const normalizedId = symbolId >= 151 ? symbolId - 100 : symbolId;
    
    if (normalizedId >= 51 && normalizedId <= 55) {
      return 'Lv1';
    } else if (normalizedId >= 56 && normalizedId <= 60) {
      return 'Lv2';
    } else if (normalizedId >= 61 && normalizedId <= 65) {
      return 'Lv3';
    } else if (normalizedId >= 66 && normalizedId <= 70) {
      return 'Lv4';
    }
    // 預設返回 Lv1（如果不在範圍內）
    return 'Lv1';
  }

  /**
   * 播放倍數球動畫（支持陣列，會依序播放）
   * @param animations 動畫陣列，每個元素包含 symbolId 和 pos
   * @returns Promise，當所有動畫播放完成時 resolve
   */
  public playMultiBallBigAnimation(animations: Array<{ symbolId: number; pos: string }> | { symbolId: number; pos: string }): Promise<void> {
    return new Promise((resolve) => {
      // 如果傳入的是單個對象，轉換為陣列
      const animationArray = Array.isArray(animations) ? animations : [animations];
      
      if (animationArray.length === 0) {
        console.warn('⚠️  倍數球動畫陣列為空');
        resolve();
        return;
      }

      // 將動畫添加到隊列
      this.multiBallAnimationQueue.push(...animationArray);

      // 保存 resolve 回調（如果已經有動畫在播放，會覆蓋之前的 resolve，因為我們要等待所有動畫完成）
      this.multiBallAnimationResolve = resolve;

      // 如果當前沒有在播放動畫，開始播放
      if (!this.isPlayingMultiBallAnimation) {
        this.playNextMultiBallAnimation();
      }
    });
  }

  /**
   * 播放下一個倍數球動畫
   */
  private async playNextMultiBallAnimation(): Promise<void> {
    // 如果隊列為空，停止播放並 resolve Promise
    if (this.multiBallAnimationQueue.length === 0) {
      this.isPlayingMultiBallAnimation = false;
      await this.gameScene.playBGWinTotal((money) => {
        // 同時更新 winText
        this.winText.text = money.toFixed(2);
      });
      // 如果有等待的 resolve 回調，調用它
      if (this.multiBallAnimationResolve) {
        const resolve = this.multiBallAnimationResolve;
        this.multiBallAnimationResolve = undefined;
        resolve();
      }
      return;
    }

    // 從隊列中取出第一個動畫
    const animation = this.multiBallAnimationQueue.shift()!;
    this.isPlayingMultiBallAnimation = true;

    const lv = this.getLevelFromSymbolId(animation.symbolId);
    this.multiBallSpine.skeleton.setSkinByName(lv);
    
    // 解析 pos 格式（'reel-row'，例如 '3-1'）
    const [reelStr, rowStr] = animation.pos.split('-');
    const reel = parseInt(reelStr, 10);
    const row = parseInt(rowStr, 10);    
    // 獲取對應的符號並播放 Collect 動畫
    if (reel && row) {
      const symbol = this.wheel.getSymbolAt(reel, row);
      if (symbol) {
        console.log('🎉 播放Collect',reel, row,symbol);
        symbol.playCollect();
        this.gameScene.playBGWinMultiplier(getMultiplierFromSymbolId(animation.symbolId) || 0);
      }
    }
    
    // 設置動畫完成監聽器
    const listener = {
      complete: () => {
        // 移除監聽器
        this.multiBallSpine.state.removeListener(listener);
        
        // 播放下一個動畫
        this.playNextMultiBallAnimation();
      }
    };
    
    this.multiBallSpine.state.addListener(listener);

    // 播放動畫（不循環）
    this.multiBallSpine.state.setAnimation(0, animation.pos, false);
    
  }
}

