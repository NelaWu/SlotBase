import * as PIXI from 'pixi.js';
import { ResourceManager } from '@/core/ResourceManager';
import { ButtonEvent, ButtonState } from './ButtonEvents';

export interface ButtonOptions {
  baseName?: string; // 基礎名稱，會自動載入 baseName_normal, baseName_hover, baseName_pressed, baseName_disable
  width?: number;
  height?: number;
  anchor?: number;
  hoverScale?: number;
  clickScale?: number;
  textTexture?: string; // 文字 texture 的資源 ID，如果有的話就顯示
  textPressTexture?: string; // 按下狀態的文字 texture 資源 ID，如果有且按下時會替換 textTexture
  textPosition?: { x: number, y: number }; // 文字位置
  isToggle?: boolean; // 是否為開關按鈕，預設為 false
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
  private textSprite?: PIXI.Sprite; // 文字 texture sprite
  private textPressSprite?: PIXI.Sprite; // 按下狀態的文字 texture sprite
  private currentState: ButtonState = ButtonState.NORMAL;
  private isEnabled: boolean = true;
  private hoverScale: number;
  private clickScale: number;
  private originalScale: number = 1;
  private isToggle: boolean = false; // 是否為開關按鈕
  private isOn: boolean = false; // 開關狀態（僅在 isToggle 為 true 時有效）

  constructor(options: ButtonOptions = {}) {
    super();
    this.name = options.baseName || '';
    this.hoverScale = options.hoverScale || 1;
    this.clickScale = options.clickScale || 1;
    this.isToggle = options.isToggle || false;
    
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

    // 如果有提供文字 texture，載入並顯示
    if (options.textTexture) {
      this.loadTextTexture(options.textTexture, anchor, resourceManager, options.textPosition);
    }

    // 如果有提供按下狀態的文字 texture，載入但不顯示
    if (options.textPressTexture) {
      this.loadTextPressTexture(options.textPressTexture, anchor, resourceManager, options.textPosition);
    }
  }

  /**
   * 載入文字 texture
   */
  private loadTextTexture(textureId: string, anchor: number, resourceManager: ResourceManager, textPosition?: { x: number, y: number }): void {
    const resource = resourceManager.getResource(textureId);
    
    if (resource) {
      const texture = PIXI.Texture.from(resource);
      this.textSprite = new PIXI.Sprite(texture);
      this.textSprite.anchor.set(anchor);
      this.textSprite.label = 'text';
      if (textPosition) {
        this.textSprite.position.set(textPosition.x, textPosition.y);
      }
      this.addChild(this.textSprite);
    } else {
      console.warn(`[BaseButton] 找不到文字 texture 資源: ${textureId}`);
    }
  }

  /**
   * 載入按下狀態的文字 texture
   */
  private loadTextPressTexture(textureId: string, anchor: number, resourceManager: ResourceManager, textPosition?: { x: number, y: number }): void {
    const resource = resourceManager.getResource(textureId);
    
    if (resource) {
      const texture = PIXI.Texture.from(resource);
      this.textPressSprite = new PIXI.Sprite(texture);
      this.textPressSprite.anchor.set(anchor);
      this.textPressSprite.label = 'textPress';
      this.textPressSprite.visible = false; // 預設隱藏
      if (textPosition) {
        this.textPressSprite.position.set(textPosition.x, textPosition.y);
      }
      this.addChild(this.textPressSprite);
    } else {
      console.warn(`[BaseButton] 找不到按下狀態文字 texture 資源: ${textureId}`);
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
        // 將字符串狀態轉換為 ButtonState enum
        const buttonState = state === 'normal' ? ButtonState.NORMAL :
                          state === 'hover' ? ButtonState.HOVER :
                          state === 'pressed' ? ButtonState.PRESSED :
                          ButtonState.DISABLED;
        sprite.visible = buttonState === ButtonState.NORMAL; // 只有 normal 狀態預設可見

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
    
    // 如果是開關按鈕，按下時不改變狀態（保持當前開關狀態）
    if (!this.isToggle) {
      this.setState(ButtonState.PRESSED);
      this.scale.set(this.clickScale);
    }
    this.emit(ButtonEvent.BUTTON_DOWN);
  }

  private onPointerUp(): void {
    if (!this.isEnabled) return;
    
    // 如果是開關按鈕，點擊時切換開關狀態
    if (this.isToggle) {
      this.toggle();
    } else {
      this.setState(ButtonState.HOVER);
      this.scale.set(this.originalScale);
    }
    this.emit(ButtonEvent.BUTTON_CLICKED);
  }

  private onPointerOver(): void {
    if (!this.isEnabled) return;
    
    // 如果是開關按鈕且處於 on 狀態，不顯示 hover（保持 pressed 狀態）
    if (this.isToggle && this.isOn) {
      // 開關 on 狀態時，hover 時保持 pressed 外觀
      this.scale.set(this.hoverScale);
    } else {
      this.setState(ButtonState.HOVER);
      this.scale.set(this.hoverScale);
    }
    this.emit(ButtonEvent.BUTTON_OVER);
  }

  private onPointerOut(): void {
    if (!this.isEnabled) return;
    
    // 如果是開關按鈕，根據 on/off 狀態顯示對應的圖片
    if (this.isToggle) {
      this.updateToggleState();
    } else {
      this.setState(ButtonState.NORMAL);
    }
    this.scale.set(this.originalScale);
    this.emit(ButtonEvent.BUTTON_OUT);
  }

  /**
   * 切換按鈕狀態
   */
  private setState(state: ButtonState): void {
    // 如果是開關按鈕，根據 on/off 狀態來決定顯示
    if (this.isToggle) {
      this.updateToggleState();
      return;
    }

    if (this.currentState === state) return;

    // 隱藏所有狀態的精靈
    this.normalSprite.visible = false;
    if (this.hoverSprite) this.hoverSprite.visible = false;
    if (this.pressedSprite) this.pressedSprite.visible = false;
    if (this.disabledSprite) this.disabledSprite.visible = false;

    // 處理文字 sprite 的顯示/隱藏
    if (state === ButtonState.PRESSED && this.textPressSprite) {
      // 按下狀態：如果有 textPressSprite，顯示它並隱藏原文字
      if (this.textSprite) this.textSprite.visible = false;
      this.textPressSprite.visible = true;
    } else {
      // 其他狀態：顯示原文字，隱藏按下狀態文字
      if (this.textSprite) this.textSprite.visible = true;
      if (this.textPressSprite) this.textPressSprite.visible = false;
    }

    // 顯示對應狀態的精靈
    switch (state) {
      case ButtonState.NORMAL:
        this.normalSprite.visible = true;
        break;
      case ButtonState.HOVER:
        if (this.hoverSprite) {
          this.hoverSprite.visible = true;
        } else {
          this.normalSprite.visible = true;
        }
        break;
      case ButtonState.PRESSED:
        if (this.pressedSprite) {
          this.pressedSprite.visible = true;
        } else {
          this.normalSprite.visible = true;
        }
        break;
      case ButtonState.DISABLED:
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
   * 更新開關按鈕的顯示狀態
   */
  private updateToggleState(): void {
    // 隱藏所有狀態的精靈
    this.normalSprite.visible = false;
    if (this.hoverSprite) this.hoverSprite.visible = false;
    if (this.pressedSprite) this.pressedSprite.visible = false;
    if (this.disabledSprite) this.disabledSprite.visible = false;

    // 處理文字 sprite 的顯示/隱藏
    if (this.isOn && this.textPressSprite) {
      // on 狀態：如果有 textPressSprite，顯示它並隱藏原文字
      if (this.textSprite) this.textSprite.visible = false;
      this.textPressSprite.visible = true;
    } else {
      // off 狀態：顯示原文字，隱藏按下狀態文字
      if (this.textSprite) this.textSprite.visible = true;
      if (this.textPressSprite) this.textPressSprite.visible = false;
    }

    // 根據開關狀態顯示對應的精靈
    if (this.isOn) {
      // on 狀態：顯示 pressed 圖片
      if (this.pressedSprite) {
        this.pressedSprite.visible = true;
        this.currentState = ButtonState.PRESSED;
      } else {
        this.normalSprite.visible = true;
        this.currentState = ButtonState.NORMAL;
      }
    } else {
      // off 狀態：顯示 normal 圖片
      this.normalSprite.visible = true;
      this.currentState = ButtonState.NORMAL;
    }
  }

  /**
   * 切換開關狀態（僅在 isToggle 為 true 時有效）
   */
  private toggle(): void {
    if (!this.isToggle) return;
    
    this.isOn = !this.isOn;
    this.updateToggleState();
    this.scale.set(this.originalScale);
    
    // 發出開關狀態改變事件
    this.emit(ButtonEvent.TOGGLE_CHANGED, this.isOn);
  }

  /**
   * 設置按鈕啟用狀態
   */
  public setEnabled(enabled: boolean): void {
    const wasEnabled = this.isEnabled;
    this.isEnabled = enabled;
    
    if (enabled) {
      this.eventMode = 'static';
      this.cursor = 'pointer';
      this.alpha = 1;
      this.scale.set(this.originalScale);
      // 如果是開關按鈕，根據 on/off 狀態顯示
      if (this.isToggle) {
        this.updateToggleState();
      } else {
        this.setState(ButtonState.NORMAL);
      }
    } else {
      this.eventMode = 'none';
      this.cursor = 'default';
      this.alpha = 0.5;
      this.scale.set(this.originalScale);
      this.setState(ButtonState.DISABLED);
    }
    
    // 如果啟用狀態改變，發出事件
    if (wasEnabled !== enabled) {
      this.emit(ButtonEvent.ENABLED_CHANGED, enabled);
    }
  }

  /**
   * 獲取按鈕啟用狀態
   */
  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 設置開關狀態（僅在 isToggle 為 true 時有效）
   */
  public setToggleState(isOn: boolean): void {
    if (!this.isToggle) {
      console.warn('[BaseButton] 此按鈕不是開關按鈕，無法設置開關狀態');
      return;
    }
    
    if (this.isOn !== isOn) {
      this.isOn = isOn;
      this.updateToggleState();
      this.emit(ButtonEvent.TOGGLE_CHANGED, this.isOn);
    }
  }

  /**
   * 獲取開關狀態（僅在 isToggle 為 true 時有效）
   */
  public getToggleState(): boolean {
    if (!this.isToggle) {
      console.warn('[BaseButton] 此按鈕不是開關按鈕，無法獲取開關狀態');
      return false;
    }
    return this.isOn;
  }

  /**
   * 檢查是否為開關按鈕
   */
  public getIsToggle(): boolean {
    return this.isToggle;
  }

  /**
   * 銷毀按鈕
   */
  public destroy(): void {
    this.removeAllListeners();
    super.destroy();
  }
}
