import * as PIXI from 'pixi.js';
import { ResourceManager } from '@/core/ResourceManager';
import { BaseButton } from '@views/components/BaseButton';
import { ButtonEvent } from '@/views/components/ButtonEvents';
import { SoundManager } from '../../../core/SoundManager';

export class ManualPage extends PIXI.Container {
  private currentPage: number = 1;
  private totalPages: number = 7;
  private pageContainer: PIXI.Container;
  private backgroundSprite!: PIXI.Sprite;
  private closeButton!: BaseButton;
  private prevButton!: BaseButton;
  private nextButton!: BaseButton;
  private pageSprites: Map<number, PIXI.Sprite[]> = new Map();

  constructor() {
    super();
    this.pageContainer = new PIXI.Container();
    this.addChild(this.pageContainer);
    this.init();
  }

  private init(): void {
    const resourceManager = ResourceManager.getInstance();

    // 创建背景遮罩
    const backgroundMask = new PIXI.Graphics();
    backgroundMask.beginFill(0x000000, 0.9);
    backgroundMask.drawRect(0, 0, 1080, 1920);
    backgroundMask.endFill();
    this.addChildAt(backgroundMask, 0);

    // 加载背景
    const bgTexture = resourceManager.getTexture('manual_page_basic');
    if (bgTexture) {
      this.backgroundSprite = new PIXI.Sprite(bgTexture);
      this.backgroundSprite.position.set(31, 365);
      this.pageContainer.addChild(this.backgroundSprite);
    }

    // 加载所有页面的资源
    this.loadAllPages();

    // 创建关闭按钮
    this.closeButton = new BaseButton({
      baseName: 'option_back_btn',
      anchor: 0.5
    });
    this.closeButton.position.set(935, 290);
    this.addChild(this.closeButton);
    this.closeButton.on(ButtonEvent.BUTTON_CLICKED, () => {
      SoundManager.playSound('btm_butt');
      this.hide();
    });

    // 创建上一页按钮
    this.prevButton = new BaseButton({
      baseName: 'option_back_btn',
      anchor: 0.5
    });
    this.prevButton.position.set(200, 1600);
    this.addChild(this.prevButton);
    this.prevButton.on(ButtonEvent.BUTTON_CLICKED, () => {
      SoundManager.playSound('btm_butt');
      this.prevPage();
    });

    // 创建下一页按钮
    this.nextButton = new BaseButton({
      baseName: 'option_back_btn',
      anchor: 0.5
    });
    this.nextButton.scale.set(-1, 1);
    this.nextButton.position.set(800, 1600);
    this.addChild(this.nextButton);
    this.nextButton.on(ButtonEvent.BUTTON_CLICKED, () => {
      SoundManager.playSound('btm_butt');
      this.nextPage();
    });

    // 初始显示第一页
    this.showPage(1);
  }

  private loadAllPages(): void {
    const resourceManager = ResourceManager.getInstance();

    // Page 1
    const page1Sprites: PIXI.Sprite[] = [];
    this.addTextSprite(page1Sprites, 'manual_page_01', { x: 58, y: 557 });
    this.addTextSprite(page1Sprites, 'manual_page_01_title', { x: 315, y: 415 });
    this.addTextSprite(page1Sprites, 'manual_page_01_text01', { x: 437, y: 734 });
    this.addTextSprite(page1Sprites, 'manual_page_01_text02', { x: 186, y: 1430 });
    this.pageSprites.set(1, page1Sprites);

    // Page 2
    const page2Sprites: PIXI.Sprite[] = [];
    this.addTextSprite(page2Sprites, 'manual_page_02', { x: 254, y: 598 });
    this.addTextSprite(page2Sprites, 'manual_page_02_title', { x: 315, y: 415 });
    this.addTextSprite(page2Sprites, 'manual_page_02_text01', { x: 115, y: 995 });
    this.pageSprites.set(2, page2Sprites);

    // Page 3
    const page3Sprites: PIXI.Sprite[] = [];
    this.addTextSprite(page3Sprites, 'manual_page_03_1', { x: 141, y: 538 });
    this.addTextSprite(page3Sprites, 'manual_page_03_2', { x: 75, y: 1284 });
    this.addTextSprite(page3Sprites, 'manual_page_03_title', { x: 387, y: 415 });
    this.addTextSprite(page3Sprites, 'manual_page_03_text01', { x: 120, y: 847 });
    this.pageSprites.set(3, page3Sprites);

    // Page 4
    const page4Sprites: PIXI.Sprite[] = [];
    this.addTextSprite(page4Sprites, 'manual_page_04', { x: 180, y: 509 });
    this.addTextSprite(page4Sprites, 'manual_page_04_title', { x: 387, y: 415 });
    this.addTextSprite(page4Sprites, 'manual_page_04_text01', { x: 107, y: 772 });
    this.pageSprites.set(4, page4Sprites);

    // Page 5
    const page5Sprites: PIXI.Sprite[] = [];
    this.addTextSprite(page5Sprites, 'manual_page_05_title', { x: 313, y: 415 });
    this.addTextSprite(page5Sprites, 'manual_page_05_text01', { x: 113, y: 663 });
    this.pageSprites.set(5, page5Sprites);

    // Page 6
    const page6Sprites: PIXI.Sprite[] = [];
    this.addTextSprite(page6Sprites, 'manual_page_06', { x: 157, y: 584 });
    this.addTextSprite(page6Sprites, 'manual_page_06_title', { x: 387, y: 415 });
    this.addTextSprite(page6Sprites, 'manual_page_06_text01', { x: 182, y: 1256 });
    this.pageSprites.set(6, page6Sprites);

    // Page 7
    const page7Sprites: PIXI.Sprite[] = [];
    this.addTextSprite(page7Sprites, 'manual_page_07_title', { x: 387, y: 415 } );
    this.addTextSprite(page7Sprites, 'manual_page_07_text01', { x: 159, y: 635 });
    this.pageSprites.set(7, page7Sprites);
  }

  private addTextSprite(sprites: PIXI.Sprite[], resourceId: string, position?: { x: number, y: number }): void {
    const resourceManager = ResourceManager.getInstance();
    const texture = resourceManager.getTexture(resourceId);
    if (texture) {
      const sprite = new PIXI.Sprite(texture);
      if (position) {
        // 如果传入了位置，使用左上角 anchor，这样坐标 (x, y) 就是左上角位置
        sprite.anchor.set(0, 0);
        sprite.position.set(position.x, position.y);
        // 标记这个 sprite 已经设置了自定义位置
        (sprite as any).hasCustomPosition = true;
      }
      sprites.push(sprite);
    }
  }

  private showPage(page: number): void {
    // 清除当前页面内容
    this.pageContainer.removeChildren();
    
    // 重新添加背景
    if (this.backgroundSprite) {
      this.pageContainer.addChild(this.backgroundSprite);
    }

    // 显示当前页面的所有资源
    const sprites = this.pageSprites.get(page);
    if (sprites) {
      sprites.forEach((sprite, index) => {
        this.pageContainer.addChild(sprite);
      });
    }

    // 更新按钮状态
    this.prevButton.visible = page > 1;
    this.nextButton.visible = page < this.totalPages;
  }

  private prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.showPage(this.currentPage);
    }
  }

  private nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.showPage(this.currentPage);
    }
  }

  public show(): void {
    this.visible = true;
    this.currentPage = 1;
    this.showPage(1);
  }

  public hide(): void {
    this.visible = false;
  }
}
