import { ResourceManager } from '@/core/ResourceManager';
import * as PIXI from 'pixi.js';

export class GameScene extends PIXI.Container {
  private bgSprites: PIXI.Sprite[] = [];
  private roofSprite1?: PIXI.Sprite;
  private roofSprite2?: PIXI.Sprite;
  private frameSprite1?: PIXI.Sprite;
  private frameSprite2?: PIXI.Sprite;
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
    
        // 2. 載入屋頂圖片
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
        // 3. 載入LOGO
        const logoResource = resourceManager.getResource('game_logo_cnt');
        if (logoResource) {
          const frameTexture = PIXI.Texture.from(logoResource);
          const frameSprite = new PIXI.Sprite(frameTexture);
          frameSprite.position.set(426, 582);
          this.addChild(frameSprite);
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
        // 5. 載入資訊背景圖片
        const infoBgResource = resourceManager.getResource('fg_info_bg');
        if (infoBgResource) {
          const infoBgTexture = PIXI.Texture.from(infoBgResource);
          const infoBgSprite = new PIXI.Sprite(infoBgTexture);
          infoBgSprite.position.set(0, 1606);
          this.addChild(infoBgSprite);
        }
    }
    setFG(): void {
        const resourceManager = ResourceManager.getInstance();
        const freeBgResource = resourceManager.getResource('fg_bg');
        this.bgSprites[0].texture = PIXI.Texture.from(freeBgResource);
        let roofTexture = resourceManager.getResource('fg_frame_roof');
        let frameTexture = resourceManager.getResource('fg_frame');
        this.roofSprite1!.texture = PIXI.Texture.from(roofTexture);
        this.roofSprite2!.texture = PIXI.Texture.from(roofTexture);
        this.frameSprite1!.texture = PIXI.Texture.from(frameTexture);
        this.frameSprite2!.texture = PIXI.Texture.from(frameTexture);
    }

    setMG(): void {
        const resourceManager = ResourceManager.getInstance();
        const freeBgResource = resourceManager.getResource('mg_bg_00');
        this.bgSprites[0].texture = PIXI.Texture.from(freeBgResource);
        let roofTexture = resourceManager.getResource('mg_frame_roof');
        let frameTexture = resourceManager.getResource('mg_frame');
        this.roofSprite1!.texture = PIXI.Texture.from(roofTexture);
        this.roofSprite2!.texture = PIXI.Texture.from(roofTexture);
        this.frameSprite1!.texture = PIXI.Texture.from(frameTexture);
        this.frameSprite2!.texture = PIXI.Texture.from(frameTexture);
    }
}