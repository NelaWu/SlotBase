import { ResourceManager } from '@/core/ResourceManager';
import { BaseNumber } from '@/views/components/BaseNumber';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { SoundManager } from '../../core/SoundManager';

export class GameScene extends PIXI.Container {
  private bgSprites: PIXI.Sprite[] = [];
  private mainSpine?: Spine;
  private freeSpine?: Spine;
  private roofSprite1?: PIXI.Sprite;
  private roofSprite2?: PIXI.Sprite;
  private frameSprite1?: PIXI.Sprite;
  private frameSprite2?: PIXI.Sprite;
  private logoSprite?: PIXI.Sprite;
  private characterSpine?: Spine;
  private multiBallBigSpine?: Spine;
  private multiBallBigText?: BaseNumber;
  private bgWinBarContainer?: PIXI.Container;
  private bgWinBarSpine?: Spine;
  private bgWinBarMoneyText?: BaseNumber;
  private bgWinBarMultiplierText?: BaseNumber;
  private totalMultiplier: number = 0;
  private winMoney: number = 0;
  private infoBarContainer?: PIXI.Container;
  private infoBarSprite?: PIXI.Sprite;
  private infoBarIndex: number = 0;
  private infoBarTimer?: NodeJS.Timeout;
  constructor() {
    super();
    this.init();
  }

  init(): void {
    const resourceManager = ResourceManager.getInstance();

    // 1. 載入主背景
    const bgResources: { textureName: string, position: { x: number, y: number } }[] = [
      { textureName: 'mg_bg_00', position: { x: 0, y: -230 } },
      { textureName: 'mg_bg_01', position: { x: 0, y: 58 } },
      { textureName: 'mg_bg_02', position: { x: 0, y: 222 } },
    ];

    bgResources.forEach(bgResource => {
      const bgTexture = PIXI.Texture.from(resourceManager.getResource(bgResource.textureName) as string);
      if (bgTexture) {
        this.bgSprites.push(new PIXI.Sprite(bgTexture));
        this.bgSprites[this.bgSprites.length - 1].position.set(bgResource.position.x, bgResource.position.y);
        this.addChild(this.bgSprites[this.bgSprites.length - 1]);
      }
    });
    this.mainSpine = Spine.from({
      atlas: 'Main_Game_BG_atlas',
      skeleton: 'Main_Game_BG_skel',
    });
    this.mainSpine.label = 'mainSpine';
    this.addChildAt(this.mainSpine, 2);
    this.mainSpine.position.set(540, 960);
    this.mainSpine.alpha = 0.5;
    this.mainSpine.state.setAnimation(0, "Idle", true);
    this.freeSpine = Spine.from({
      atlas: 'Free_Game_BG_atlas',
      skeleton: 'Free_Game_BG_skel',
    });
    this.freeSpine.label = 'freeSpine';
    this.addChildAt(this.freeSpine, 2);
    this.freeSpine.position.set(540, 960);
    this.freeSpine.alpha = 0.5;
    this.freeSpine.state.setAnimation(0, "Idle", true);

    // 2. 載入角色動畫
    this.characterSpine = Spine.from({
      atlas: 'Character_atlas',
      skeleton: 'Character_skel',
    });
    this.characterSpine.label = 'characterSpine';
    this.addChild(this.characterSpine);
    this.characterSpine.position.set(610, 450);
    this.characterSpine.scale.set(1.1);
    this.characterSpine.state.setAnimation(0, "Idle", true);
    this.characterSpine.skeleton.setSkinByName("Mg");

    // 3. 載入屋頂圖片
    const roofTexture = PIXI.Texture.from(resourceManager.getResource('mg_frame_roof') as string);
    if (roofTexture) {
      this.roofSprite1 = new PIXI.Sprite(roofTexture);
      this.roofSprite1.position.set(0, 585);
      this.addChild(this.roofSprite1);
      this.roofSprite2 = new PIXI.Sprite(roofTexture);
      this.roofSprite2.position.set(1080, 585);
      this.roofSprite2.scale.x = -1;
      this.addChild(this.roofSprite2);
    }
    // 4. 載入框架圖片（疊加在背景上）
    const frameResource = resourceManager.getResource('mg_frame');
    if (frameResource) {
      const frameTexture = PIXI.Texture.from(frameResource);
      this.frameSprite1 = new PIXI.Sprite(frameTexture);
      this.frameSprite1.position.set(0, 692);
      this.addChild(this.frameSprite1);
      this.frameSprite2 = new PIXI.Sprite(frameTexture);
      this.frameSprite2.position.set(1080, 692);
      this.frameSprite2.scale.x = -1;
      this.addChild(this.frameSprite2);
    }
    // 5. 載入LOGO
    const logoResource = resourceManager.getResource('game_logo_cnt');
    if (logoResource) {
      const frameTexture = PIXI.Texture.from(logoResource);
      this.logoSprite = new PIXI.Sprite(frameTexture);
      this.logoSprite.position.set(426, 582);
      this.addChild(this.logoSprite);
    }
    this.bgWinBarContainer = new PIXI.Container();
    this.bgWinBarContainer.position.set(540, 960);
    this.addChild(this.bgWinBarContainer);
    this.bgWinBarSpine = Spine.from({
      atlas: 'BG_Win_Bar_atlas',
      skeleton: 'BG_Win_Bar_skel',
    });
    this.bgWinBarSpine.label = 'bgWinBarSpine';
    this.bgWinBarContainer.addChild(this.bgWinBarSpine);
    this.bgWinBarMoneyText = new BaseNumber({
      baseName: 'fg_total_multi_number',
      anchor: 0.5,
      align: 'center',
      useThousandSeparator: true
    });
    this.bgWinBarMoneyText.position.set(0, -300);
    // this.bgWinBarMoneyText.showText('222');
    this.bgWinBarContainer.addChild(this.bgWinBarMoneyText);
    this.bgWinBarMultiplierText= new BaseNumber({
      baseName: 'fg_total_multi_number',
      anchor: 0.5,
      align: 'center',
      useThousandSeparator: true
    });
    this.bgWinBarMultiplierText.position.set(this.bgWinBarMoneyText.width+this.bgWinBarMultiplierText.width/2, -300);
    this.bgWinBarContainer.addChild(this.bgWinBarMultiplierText);

    // 6. 載入資訊背景圖片
    const infoBgResource = resourceManager.getResource('fg_info_bg');
    if (infoBgResource) {
      const infoBgTexture = PIXI.Texture.from(infoBgResource);
      const infoBgSprite = new PIXI.Sprite(infoBgTexture);
      infoBgSprite.position.set(0, 1606);
      infoBgSprite.label = 'infoBgSprite';
      this.addChild(infoBgSprite);
    }

    this.multiBallBigSpine = Spine.from({
      atlas: 'BG_Multi_Ball_Big_atlas',
      skeleton: 'BG_Multi_Ball_Big_skel',
    });
    this.multiBallBigSpine.label = 'multiBallBigSpine';
    this.addChild(this.multiBallBigSpine);
    this.multiBallBigSpine.position.set(540, 960);
    this.multiBallBigSpine.skeleton.setSkinByName("Lv1");
    this.multiBallBigText = new BaseNumber({
      baseName: 'fg_total_multi_number',
      anchor: 0.5,
      align: 'center',
      useThousandSeparator: true
    });
    this.multiBallBigText.position.set(270, 290);
    this.addChild(this.multiBallBigText);
    this.multiBallBigText.showText('0x');

    // 7. info bar - 輪流顯示圖片
    this.infoBarContainer = new PIXI.Container();
    this.infoBarContainer.position.set(0,1387);
    this.addChild(this.infoBarContainer);
    this.startInfoBarRotation();

    this.setMG();
    
    // 初始化時播放主遊戲背景音樂
    SoundManager.playBGM('mg_bgm', 0.5);
  }
  setFG(): void {
    const resourceManager = ResourceManager.getInstance();
    const freeBgResource = resourceManager.getResource('fg_bg');
    this.bgSprites[0].texture = PIXI.Texture.from(freeBgResource);
    this.bgSprites[1].visible = false;
    this.bgSprites[2].visible = false;
    this.mainSpine!.visible = false;
    this.freeSpine!.visible = true;
    let roofTexture = resourceManager.getResource('fg_frame_roof');
    let frameTexture = resourceManager.getResource('fg_frame');
    this.roofSprite1!.texture = PIXI.Texture.from(roofTexture);
    this.roofSprite2!.texture = PIXI.Texture.from(roofTexture);
    this.frameSprite1!.texture = PIXI.Texture.from(frameTexture);
    this.frameSprite2!.texture = PIXI.Texture.from(frameTexture);
    this.characterSpine!.skeleton.setSkinByName("Fg");
    this.bgWinBarSpine!.visible = true;
    this.multiBallBigText!.visible = true;
    this.multiBallBigSpine!.visible = true;
    
    // 切換到免費遊戲背景音樂
    SoundManager.playBGM('fg_bgm', 0.5);
  }

  setMG(): void {
    const resourceManager = ResourceManager.getInstance();
    const freeBgResource = resourceManager.getResource('mg_bg_00');
    this.bgSprites[0].texture = PIXI.Texture.from(freeBgResource);
    this.bgSprites[1].visible = true;
    this.bgSprites[2].visible = true;
    this.mainSpine!.visible = true;
    this.freeSpine!.visible = false;
    let roofTexture = resourceManager.getResource('mg_frame_roof');
    let frameTexture = resourceManager.getResource('mg_frame');
    this.roofSprite1!.texture = PIXI.Texture.from(roofTexture);
    this.roofSprite2!.texture = PIXI.Texture.from(roofTexture);
    this.frameSprite1!.texture = PIXI.Texture.from(frameTexture);
    this.frameSprite2!.texture = PIXI.Texture.from(frameTexture);
    this.characterSpine!.skeleton.setSkinByName("Mg");
    this.bgWinBarContainer!.visible = false;
    this.multiBallBigText!.visible = false;
    this.multiBallBigSpine!.visible = false;
    
    // 切換回主遊戲背景音樂
    SoundManager.playBGM('mg_bgm', 0.5);
  }

  public playMultiBallAnimation(): void {
    SoundManager.playSound('gaint_angry');
    this.characterSpine!.state.setAnimation(0, "Multiplier_Low", false);
    this.characterSpine!.state.addAnimation(0, "Idle", true, 0);
  }

  public showBGWinBar(visible: boolean): void {
    this.bgWinBarContainer!.visible = visible;
    this.logoSprite!.visible = !visible;
    this.bgWinBarMoneyText!.showText('0.00');
    this.multiBallBigText!.showText('0x');
    this.totalMultiplier = 0;
    this.bgWinBarMultiplierText!.showText('');
  }

  public playBGWinMoney(money: number ): void {
    this.winMoney = money;
    this.bgWinBarMoneyText!.showText(money.toFixed(2));
  }

  public playBGWinMultiplier(multiplier: number): void {
    console.log('🎉 播放BGWinMultiplier', multiplier);
    
    if (multiplier == 0 )return;
    this.totalMultiplier += multiplier;
    this.bgWinBarMultiplierText!.visible = true;
    this.bgWinBarMultiplierText!.alpha = 1;
    this.bgWinBarMultiplierText!.showText('x'+this.totalMultiplier);
    this.multiBallBigText!.showText(this.totalMultiplier.toString()+'x');
    this.bgWinBarMultiplierText!.position.set(this.bgWinBarMoneyText!.width+this.bgWinBarMultiplierText!.width/2, -300);
    const m:{scale:number} = {scale:2};
    gsap.to(m, {scale:1, duration: 0.5, onUpdate: () => {
      this.bgWinBarMultiplierText!.scale.set(m.scale, m.scale);
    }});
  }

  /**
   * 計分面板的的倍數球乘動畫
   * @param money 
   * @returns 
   */
  public async playBGWinTotal(onMoneyUpdate?: (money: number) => void): Promise<void> {
    const money:number = this.winMoney*this.totalMultiplier;
    const startX = this.bgWinBarMultiplierText!.position.x;
    const startAlpha = this.bgWinBarMultiplierText!.alpha;
    const m: { x: number; alpha: number } = { x: startX, alpha: startAlpha };
    const scaleObj: { scale: number } = { scale: 1 };
    
    return new Promise<void>((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          resolve();
        }
      });
      
      tl.to(m, {
        x: 0,
        alpha: 0,
        duration: 0.5,
        onUpdate: () => {
          this.bgWinBarMultiplierText!.position.set(m.x, -300);
          this.bgWinBarMultiplierText!.alpha = m.alpha;
        }
      });
      tl.call(() => {
        const moneyValue = money.toFixed(2);
        this.bgWinBarMoneyText!.showText(moneyValue);
        // 同時更新 winText（如果提供了回調函數）
        if (onMoneyUpdate) {
          onMoneyUpdate(money);
        }
      });
      tl.to(scaleObj, {
        scale: 1.5,
        duration: 0.2,
        repeat: 1, 
        yoyo: true, 
        onUpdate: () => {
          this.bgWinBarMoneyText!.scale.set(scaleObj.scale, scaleObj.scale);
        }
      });
      tl.to({}, { duration: 0.5 });
    });
  }

  /**
   * 開始輪流顯示 info bar 圖片
   */
  private startInfoBarRotation(): void {
    // 初始化索引
    this.infoBarIndex = 1;
    
    // 顯示第一張圖片
    this.showInfoBar(1);
    
    // 設置定時器，每 3 秒切換一次
    this.infoBarTimer = setInterval(() => {
      this.infoBarIndex = (this.infoBarIndex % 5) + 1;
      this.showInfoBar(this.infoBarIndex);
    }, 3000);
  }

  /**
   * 顯示指定的 info bar 圖片
   */
  private showInfoBar(index: number): void {
    const resourceManager = ResourceManager.getInstance();
    const resourceId = `info_bar_${index}`;
    const resource = resourceManager.getResource(resourceId);
    
    if (!resource) {
      console.warn(`[GameScene] 找不到資源: ${resourceId}`);
      return;
    }

    // 移除舊的 sprite
    if (this.infoBarSprite) {
      this.infoBarContainer!.removeChild(this.infoBarSprite);
      this.infoBarSprite.destroy();
    }

    // 創建新的 sprite
    this.infoBarSprite = new PIXI.Sprite(PIXI.Texture.from(resource));
    this.infoBarSprite.anchor.set(0.5);
    // 設置位置（可以根據需要調整）
    this.infoBarSprite.position.set(540, 100);
    this.infoBarContainer!.addChild(this.infoBarSprite);
  }

  /**
   * 停止輪流顯示（清理時調用）
   */
  public stopInfoBarRotation(): void {
    if (this.infoBarTimer) {
      clearInterval(this.infoBarTimer);
      this.infoBarTimer = undefined;
    }
  }

  /**
   * 銷毀時清理資源
   */
  public destroy(): void {
    this.stopInfoBarRotation();
    super.destroy();
  }
}