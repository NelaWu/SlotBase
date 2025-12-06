import * as PIXI from 'pixi.js';
import { ResourceManager } from '@/core/ResourceManager';

export interface ButtonOptions {
  baseName?: string; // 基礎名稱，會自動載入 baseName_normal, baseName_hover, baseName_pressed, baseName_disable
  width?: number;
  height?: number;
  anchor?: number;
  hoverScale?: number;
  clickScale?: number;
}

/**
 * 基礎按鈕組件
 * 提供統一的按鈕行為和狀態管理
 */
export class BaseButton extends PIXI.Container {
  private normalSprite!: PIXI.Sprite;
  private hoverSprite?: PIXI.Sprite;
  private pressedSprite?: PIXI.Sprite;
  private disabledSprite?: PIXI.Sprite;
  private currentState: 'normal' | 'hover' | 'pressed' | 'disabled' = 'normal';
  private isEnabled: boolean = true;
  private hoverScale: number;
  private clickScale: number;
  private originalScale: number = 1;

  constructor(options: ButtonOptions = {}) {
    super();
    this.name = options.baseName || '';
    this.hoverScale = options.hoverScale || 1;
    this.clickScale = options.clickScale || 1;
    
    this.eventMode = 'static';
    this.cursor = 'pointer';
    
    this.createButton(options);
    this.bindEvents();
  }

  private createButton(options: ButtonOptions): void {
    const anchor = options.anchor || 0.5;
    const resourceManager = ResourceManager.getInstance();

    // 如果提供了 baseName，嘗試載入多種狀態的圖片
    if (options.baseName) {
      this.loadStateSprites(options.baseName, anchor, options.width, options.height, resourceManager);
    } else {
      // 創建默認按鈕樣式
      const graphics = new PIXI.Graphics();
      graphics.beginFill(0x4CAF50);
      graphics.drawRoundedRect(0, 0, options.width || 200, options.height || 60, 10);
      graphics.endFill();
      this.normalSprite = new PIXI.Sprite(graphics.texture as unknown as PIXI.Texture);
      this.normalSprite.anchor.set(anchor);
      this.addChild(this.normalSprite);
    }

    // 設置大小
    if (options.width && options.height) {
      this.normalSprite.width = options.width;
      this.normalSprite.height = options.height;
      if (this.hoverSprite) {
        this.hoverSprite.width = options.width;
        this.hoverSprite.height = options.height;
      }
      if (this.pressedSprite) {
        this.pressedSprite.width = options.width;
        this.pressedSprite.height = options.height;
      }
      if (this.disabledSprite) {
        this.disabledSprite.width = options.width;
        this.disabledSprite.height = options.height;
      }
    }
  }

  /**
   * 載入按鈕各狀態的精靈
   */
  private loadStateSprites(
    baseName: string,
    anchor: number,
    width: number | undefined,
    height: number | undefined,
    resourceManager: ResourceManager
  ): void {
    const states = ['normal', 'hover', 'pressed', 'disable'] as const;

    states.forEach((state) => {
      const resourceId = `${baseName}_${state}`;
      const resource = resourceManager.getResource(resourceId);

      if (resource) {
        const texture = PIXI.Texture.from(resource);
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(anchor);
        sprite.visible = state === 'normal'; // 只有 normal 狀態預設可見

        if (width && height) {
          sprite.width = width;
          sprite.height = height;
        }

        this.addChild(sprite);

        // 根據狀態存儲到對應的屬性
        switch (state) {
          case 'normal':
            this.normalSprite = sprite;
            break;
          case 'hover':
            this.hoverSprite = sprite;
            break;
          case 'pressed':
            this.pressedSprite = sprite;
            break;
          case 'disable':
            this.disabledSprite = sprite;
            break;
        }
      } else {
        console.warn(`[BaseButton] 找不到資源: ${resourceId}`);
      }
    });

    // 如果沒有載入到 normal 狀態的圖片，創建一個默認的
    if (!this.normalSprite) {
      const graphics = new PIXI.Graphics();
      graphics.beginFill(0x4CAF50);
      graphics.drawRoundedRect(0, 0, width || 200, height || 60, 10);
      graphics.endFill();
      this.normalSprite = new PIXI.Sprite(graphics.texture as unknown as PIXI.Texture);
      this.normalSprite.anchor.set(anchor);
      this.addChild(this.normalSprite);
    }
  }

  private bindEvents(): void {
    this.on('pointerdown', this.onPointerDown.bind(this));
    this.on('pointerup', this.onPointerUp.bind(this));
    this.on('pointerover', this.onPointerOver.bind(this));
    this.on('pointerout', this.onPointerOut.bind(this));
  }

  private onPointerDown(): void {
    if (!this.isEnabled) return;
    
    this.setState('pressed');
    this.scale.set(this.clickScale);
  }

  private onPointerUp(): void {
    if (!this.isEnabled) return;
    
    this.setState('hover');
    this.scale.set(this.originalScale);
    this.emit('buttonClicked');
  }

  private onPointerOver(): void {
    if (!this.isEnabled) return;
    
    this.setState('hover');
    this.scale.set(this.hoverScale);
  }

  private onPointerOut(): void {
    if (!this.isEnabled) return;
    
    this.setState('normal');
    this.scale.set(this.originalScale);
  }

  /**
   * 切換按鈕狀態
   */
  private setState(state: 'normal' | 'hover' | 'pressed' | 'disabled'): void {
    if (this.currentState === state) return;

    // 隱藏所有狀態的精靈
    this.normalSprite.visible = false;
    if (this.hoverSprite) this.hoverSprite.visible = false;
    if (this.pressedSprite) this.pressedSprite.visible = false;
    if (this.disabledSprite) this.disabledSprite.visible = false;

    // 顯示對應狀態的精靈
    switch (state) {
      case 'normal':
        this.normalSprite.visible = true;
        break;
      case 'hover':
        if (this.hoverSprite) {
          this.hoverSprite.visible = true;
        } else {
          this.normalSprite.visible = true;
        }
        break;
      case 'pressed':
        if (this.pressedSprite) {
          this.pressedSprite.visible = true;
        } else {
          this.normalSprite.visible = true;
        }
        break;
      case 'disabled':
        if (this.disabledSprite) {
          this.disabledSprite.visible = true;
        } else {
          this.normalSprite.visible = true;
        }
        break;
    }

    this.currentState = state;
  }

  /**
   * 設置按鈕啟用狀態
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.eventMode = 'static';
      this.cursor = 'pointer';
      this.alpha = 1;
      this.scale.set(this.originalScale);
      this.setState('normal');
    } else {
      this.eventMode = 'none';
      this.cursor = 'default';
      this.alpha = 0.5;
      this.scale.set(this.originalScale);
      this.setState('disabled');
    }
  }

  /**
   * 獲取按鈕啟用狀態
   */
  public getEnabled(): boolean {
    return this.isEnabled;
  }


  /**
   * 銷毀按鈕
   */
  public destroy(): void {
    this.removeAllListeners();
    super.destroy();
  }
}
