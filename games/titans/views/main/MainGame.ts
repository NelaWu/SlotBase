import { ResourceManager } from '@/core/ResourceManager';
import { BaseButton } from '@views/components/BaseButton';
import * as PIXI from 'pixi.js';
import { TitansWheel } from './wheel/TitansWheel';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { GameScene } from './GameScene';
import { BigAnimationManager } from './bigAnimation/BigAnimationManager';
import { BetPanel } from './BetPanel';
import { ButtonEvent } from '@/views/components/ButtonEvents';

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
  public settingsButtonContainer!: PIXI.Container;
  public bigAnimationManager!: BigAnimationManager;
  public betPanel!: BetPanel;
  public multiBallSpine!: Spine;

  constructor() {
    super();
    this.sortableChildren = true; // 啟用 z-index 排序
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
    this.betButtonContainer = new PIXI.Container();
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

    const spineLogo:PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('spin_btn_logo') as string));
    spineLogo.anchor.set(0.5);
    this.spinButton.addChild(spineLogo);
    const spineShadow:PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('spin_btn_shadow') as string));
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

    // 購買免費旋轉按鈕
    this.buyFreeSpinsButton = new BaseButton({
      baseName: 'fg_btn_cnt',
      anchor: 0
    });
    this.addChild(this.buyFreeSpinsButton);
    this.buyFreeSpinsButton.on(ButtonEvent.BUTTON_CLICKED, () => {
      this.bigAnimationManager.showFreeSpin();
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
    const balanceIcon:PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('wallet_ui') as string));
    balanceIcon.position.set(15,1536);
    this.addChild(balanceIcon);
    this.balanceText = new PIXI.Text({
      text: '0',
      style: textStyle
    });
    this.balanceText.x = 75;  
    this.balanceText.y = 1540;
    this.addChild(this.balanceText);

    // 投注顯示
    const betIcon:PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('multiple_ui') as string));
    betIcon.position.set(376,1539);
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
    betBackground.position.set(365,1535);
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
    const winIcon:PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('trophy_ui') as string));
    winIcon.position.set(723,1539);
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
    console.log('multiBallSpine',this.multiBallSpine);
    // this.multiBallSpine.skeleton.setSkinByName("Lv2");
    // this.multiBallSpine.state.setAnimation(0, "1-4", true);
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

  public showBigWin(money:string, bet?:number):void{
    this.bigAnimationManager.showBigWin(money,bet);
  }

  public playMultiBallAnimation():void{
    this.gameScene.playMultiBallAnimation();
  }
}

