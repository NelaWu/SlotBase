import * as PIXI from 'pixi.js';

export interface ButtonOptions {
  texture?: PIXI.Texture;
  width?: number;
  height?: number;
  anchor?: number;
  disabledTexture?: PIXI.Texture;
  hoverScale?: number;
  clickScale?: number;
}

/**
 * 基礎按鈕組件
 * 提供統一的按鈕行為和狀態管理
 */
export class BaseButton extends PIXI.Container {
  private normalSprite!: PIXI.Sprite;
  private disabledSprite?: PIXI.Sprite;
  private isEnabled: boolean = true;
  private hoverScale: number;
  private clickScale: number;
  private originalScale: number = 1;

  constructor(options: ButtonOptions = {}) {
    super();
    
    this.hoverScale = options.hoverScale || 1.05;
    this.clickScale = options.clickScale || 0.95;
    
    this.eventMode = 'static';
    this.cursor = 'pointer';
    
    this.createButton(options);
    this.bindEvents();
  }

  private createButton(options: ButtonOptions): void {
    // 創建正常狀態的精靈
    if (options.texture) {
      this.normalSprite = new PIXI.Sprite(options.texture);
    } else {
      // 創建默認按鈕樣式
      const graphics = new PIXI.Graphics();
      graphics.beginFill(0x4CAF50);
      graphics.drawRoundedRect(0, 0, options.width || 200, options.height || 60, 10);
      graphics.endFill();
      this.normalSprite = new PIXI.Sprite(graphics.texture);
    }

    this.normalSprite.anchor.set(options.anchor || 0.5);
    this.addChild(this.normalSprite);

    // 創建禁用狀態的精靈（如果提供）
    if (options.disabledTexture) {
      this.disabledSprite = new PIXI.Sprite(options.disabledTexture);
      this.disabledSprite.anchor.set(options.anchor || 0.5);
      this.disabledSprite.visible = false;
      this.addChild(this.disabledSprite);
    }

    // 設置大小
    if (options.width && options.height) {
      this.normalSprite.width = options.width;
      this.normalSprite.height = options.height;
      if (this.disabledSprite) {
        this.disabledSprite.width = options.width;
        this.disabledSprite.height = options.height;
      }
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
    
    this.scale.set(this.clickScale);
  }

  private onPointerUp(): void {
    if (!this.isEnabled) return;
    
    this.scale.set(this.originalScale);
    this.emit('buttonClicked');
  }

  private onPointerOver(): void {
    if (!this.isEnabled) return;
    
    this.scale.set(this.hoverScale);
  }

  private onPointerOut(): void {
    if (!this.isEnabled) return;
    
    this.scale.set(this.originalScale);
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
      
      // 顯示正常狀態，隱藏禁用狀態
      if (this.normalSprite) this.normalSprite.visible = true;
      if (this.disabledSprite) this.disabledSprite.visible = false;
    } else {
      this.eventMode = 'none';
      this.cursor = 'default';
      this.alpha = 0.5;
      this.scale.set(this.originalScale);
      
      // 顯示禁用狀態，隱藏正常狀態
      if (this.normalSprite) this.normalSprite.visible = false;
      if (this.disabledSprite) this.disabledSprite.visible = true;
    }
  }

  /**
   * 獲取按鈕啟用狀態
   */
  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 設置按鈕紋理
   */
  public setTexture(texture: PIXI.Texture): void {
    this.normalSprite.texture = texture;
  }

  /**
   * 設置禁用狀態紋理
   */
  public setDisabledTexture(texture: PIXI.Texture): void {
    if (!this.disabledSprite) {
      this.disabledSprite = new PIXI.Sprite(texture);
      this.disabledSprite.anchor.copyFrom(this.normalSprite.anchor);
      this.disabledSprite.width = this.normalSprite.width;
      this.disabledSprite.height = this.normalSprite.height;
      this.disabledSprite.visible = false;
      this.addChild(this.disabledSprite);
    } else {
      this.disabledSprite.texture = texture;
    }
  }

  /**
   * 銷毀按鈕
   */
  public destroy(): void {
    this.removeAllListeners();
    super.destroy();
  }
}
