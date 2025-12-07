import * as PIXI from 'pixi.js';
import { ResourceManager } from '@/core/ResourceManager';

export type TextAlign = 'left' | 'center' | 'right';

export interface BaseNumberOptions {
  baseName: string; // 圖片基礎名稱，例如 'number' 會載入 number_0, number_1, ..., number_.
  anchor?: number; // 錨點，預設 0.5 (置中)
  align?: TextAlign; // 對齊方式，預設 'center'
  useThousandSeparator?: boolean; // 是否使用千分位，預設 false
}

/**
 * 基礎數字顯示組件
 * 使用圖片組合顯示數字文字
 */
export class BaseNumber extends PIXI.Container {
  private baseName: string;
  private anchor: number;
  private align: TextAlign;
  private useThousandSeparator: boolean;
  private resourceManager: ResourceManager;
  private digitSprites: PIXI.Sprite[] = [];
  private digitTextures: Map<string, PIXI.Texture> = new Map();
  private currentText: string = ''; // 保存當前顯示的文字（未格式化）
  private formattedText: string = ''; // 保存格式化後的字串（用於布局）

  constructor(options: BaseNumberOptions) {
    super();
    this.baseName = options.baseName;
    this.anchor = options.anchor ?? 0.5;
    this.align = options.align ?? 'center';
    this.useThousandSeparator = options.useThousandSeparator ?? false;
    this.resourceManager = ResourceManager.getInstance();

    // 預載入所有數字和小數點的 texture
    this.preloadTextures();
  }

  /**
   * 預載入所有數字和小數點的 texture
   */
  private preloadTextures(): void {
    // 載入數字 0-9
    for (let i = 0; i <= 9; i++) {
      const resourceId = `${this.baseName}_${i}`;
      const resource = this.resourceManager.getResource(resourceId);
      if (resource) {
        this.digitTextures.set(String(i), PIXI.Texture.from(resource));
      } else {
        console.warn(`[BaseNumber] 找不到資源: ${resourceId}`);
      }
    }

    // 載入小數點
    const dotResourceId = `${this.baseName}_.`;
    const dotResource = this.resourceManager.getResource(dotResourceId);
    if (dotResource) {
      this.digitTextures.set('.', PIXI.Texture.from(dotResource));
    } else {
      console.warn(`[BaseNumber] 找不到資源: ${dotResourceId}`);
    }

    // 載入千分位符號（逗號）
    const commaResourceId = `${this.baseName}_,`;
    const commaResource = this.resourceManager.getResource(commaResourceId);
    if (commaResource) {
      this.digitTextures.set(',', PIXI.Texture.from(commaResource));
    }
    // 千分位符號是可選的，找不到也不報錯
  }

  /**
   * 顯示文字
   * @param text 要顯示的文字（數字字串，例如 '123', '123.45'）
   * @param options 可選參數
   * @param options.align 對齊方式（'left' | 'center' | 'right'）
   * @param options.useThousandSeparator 是否使用千分位
   */
  public showText(
    text: string | number,
    options?: {
      align?: TextAlign;
      useThousandSeparator?: boolean;
    }
  ): void {
    // 更新對齊方式（如果提供）
    if (options?.align !== undefined && this.align !== options.align) {
      this.align = options.align;
    }

    // 更新千分位設置（如果提供）
    if (options?.useThousandSeparator !== undefined && this.useThousandSeparator !== options.useThousandSeparator) {
      this.useThousandSeparator = options.useThousandSeparator;
    }

    // 保存原始文字（未格式化）
    this.currentText = String(text);

    // 清除現有的 sprite
    this.clearSprites();

    // 轉換為字串
    let textStr = this.currentText;

    // 處理千分位
    if (this.useThousandSeparator && this.isNumeric(textStr)) {
      textStr = this.formatWithThousandSeparator(textStr);
    }

    // 保存格式化後的字串（用於布局時判斷字符類型）
    this.formattedText = textStr;

    // 解析字串，創建對應的 sprite
    const chars = textStr.split('');
    const sprites: PIXI.Sprite[] = [];

    for (const char of chars) {
      const texture = this.digitTextures.get(char);
      if (texture) {
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(this.anchor);
        sprites.push(sprite);
        this.addChild(sprite);
      } else {
        console.warn(`[BaseNumber] 找不到字符 '${char}' 的 texture`);
      }
    }

    this.digitSprites = sprites;

    // 計算位置
    this.updateLayout();
  }

  /**
   * 更新布局
   */
  private updateLayout(): void {
    if (this.digitSprites.length === 0) {
      return;
    }

    // 使用格式化後的字串來判斷字符類型
    const chars = this.formattedText.split('');

    // 計算總寬度和找出數字的最大高度
    let totalWidth = 0;
    const widths: number[] = [];
    const heights: number[] = [];
    let maxDigitHeight = 0;

    for (let i = 0; i < this.digitSprites.length; i++) {
      const sprite = this.digitSprites[i];
      const width = sprite.width;
      const height = sprite.height;
      widths.push(width);
      heights.push(height);
      totalWidth += width;

      // 只計算數字字符的最大高度（不包括小數點和逗號）
      const char = chars[i];
      if (char && /[0-9]/.test(char)) {
        maxDigitHeight = Math.max(maxDigitHeight, height);
      }
    }

    // 如果沒有數字字符，使用所有字符的最大高度
    if (maxDigitHeight === 0) {
      maxDigitHeight = Math.max(...heights);
    }

    // 根據對齊方式設置位置
    let currentX = 0;

    if (this.align === 'center') {
      // 置中：從負的一半總寬度開始
      currentX = -totalWidth / 2;
    } else if (this.align === 'right') {
      // 靠右：從負的總寬度開始
      currentX = -totalWidth;
    }
    // 靠左：從 0 開始（currentX 已經是 0）

    // 設置每個 sprite 的位置
    for (let i = 0; i < this.digitSprites.length; i++) {
      const sprite = this.digitSprites[i];
      const width = widths[i];
      const height = heights[i];
      const char = chars[i];

      // X 位置
      sprite.x = currentX + width / 2;
      currentX += width;

      // Y 位置：如果是小數點或逗號，需要底部對齊到數字底部
      if (char === '.' || char === ',') {
        // 計算需要向下偏移多少才能底部對齊
        // 數字底部位置 = maxDigitHeight / 2 (因為 anchor 是 0.5，數字中心在 y=0)
        // 符號底部位置 = height / 2 (符號中心也在 y=0)
        // 需要偏移 = (maxDigitHeight - height) / 2
        const offsetY = (maxDigitHeight - height) / 2;
        sprite.y = offsetY;
      } else {
        // 數字保持在 y=0 (中心對齊)
        sprite.y = 0;
      }
    }
  }

  /**
   * 清除所有 sprite
   */
  private clearSprites(): void {
    for (const sprite of this.digitSprites) {
      this.removeChild(sprite);
      sprite.destroy();
    }
    this.digitSprites = [];
  }

  /**
   * 檢查是否為數字字串（包含小數點）
   */
  private isNumeric(str: string): boolean {
    return /^-?\d*\.?\d+$/.test(str);
  }

  /**
   * 格式化數字，添加千分位
   */
  private formatWithThousandSeparator(str: string): string {
    // 分離整數部分和小數部分
    const parts = str.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // 處理負號
    const isNegative = integerPart.startsWith('-');
    const absInteger = isNegative ? integerPart.slice(1) : integerPart;

    // 添加千分位
    const formattedInteger = absInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // 組合結果
    let result = (isNegative ? '-' : '') + formattedInteger;
    if (decimalPart !== undefined) {
      result += '.' + decimalPart;
    }

    return result;
  }

  /**
   * 設置對齊方式（便捷方法）
   * @deprecated 建議直接在 showText 中傳入 align 參數
   */
  public setAlign(align: TextAlign): void {
    if (this.currentText) {
      this.showText(this.currentText, { align });
    } else {
      this.align = align;
    }
  }

  /**
   * 設置是否使用千分位（便捷方法）
   * @deprecated 建議直接在 showText 中傳入 useThousandSeparator 參數
   */
  public setUseThousandSeparator(use: boolean): void {
    if (this.currentText) {
      this.showText(this.currentText, { useThousandSeparator: use });
    } else {
      this.useThousandSeparator = use;
    }
  }

  /**
   * 銷毀組件
   */
  public destroy(): void {
    this.clearSprites();
    this.digitTextures.clear();
    super.destroy();
  }
}

