import { ResourceManager } from '@/core/ResourceManager';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import * as PIXI from 'pixi.js';

export class GameScene extends PIXI.Container {
  private bgSprites: PIXI.Sprite[] = [];
  private mainSpine?: Spine;
  private freeSpine?: Spine;
  private roofSprite1?: PIXI.Sprite;
  private roofSprite2?: PIXI.Sprite;
  private frameSprite1?: PIXI.Sprite;
  private frameSprite2?: PIXI.Sprite;
  private characterSpine?: Spine;
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
        this.characterSpine.position.set(630, 400);
        this.characterSpine.state.setAnimation(0, "Idle", true);
        this.characterSpine.skeleton.setSkinByName("Mg");
        console.log('characterSpine',this.characterSpine);
        
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
        // 4. 載入LOGO
        const logoResource = resourceManager.getResource('game_logo_cnt');
        if (logoResource) {
          const frameTexture = PIXI.Texture.from(logoResource);
          const frameSprite = new PIXI.Sprite(frameTexture);
          frameSprite.position.set(426, 582);
          this.addChild(frameSprite);
        }
        // 5. 載入框架圖片（疊加在背景上）
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
        // 6. 載入資訊背景圖片
        const infoBgResource = resourceManager.getResource('fg_info_bg');
        if (infoBgResource) {
          const infoBgTexture = PIXI.Texture.from(infoBgResource);
          const infoBgSprite = new PIXI.Sprite(infoBgTexture);
          infoBgSprite.position.set(0, 1606);
          infoBgSprite.label = 'infoBgSprite';
          this.addChild(infoBgSprite);
        }
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
    }

    public playMultiBallAnimation(): void {
      // 播放 Multiplier_Low 動畫，完成後自動播放 Idle 動畫
      this.characterSpine!.state.setAnimation(0, "Multiplier_Low", false);
      this.characterSpine!.state.addAnimation(0, "Idle", true, 0);
    }
}