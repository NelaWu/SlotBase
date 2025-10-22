import { Wheel, WheelConfig } from '@/views/components/Wheel';
import { TitansSymbol } from '../symbol/TitansSymbol';
import * as PIXI from 'pixi.js';
/**
 * Titans 遊戲的輪盤配置
 */
export interface TitansWheelConfig extends Partial<WheelConfig> {
  reelWidth: number;
  reelHeight: number;
}

/**
 * Titans 遊戲的輪盤類別
 */
export class TitansWheel extends Wheel<TitansSymbol> {
  constructor(config: TitansWheelConfig) {
    // 設置 Titans 遊戲的默認配置
    const defaultConfig: WheelConfig = {
      numberOfReels: 6,
      symbolsPerReel: 5,
      reelSpacing: 0,
      spinSpeed: 30,
      stopDeceleration: 2,
      stopDelay: 150,
      ...config
    };
    
    super(defaultConfig);
    console.log('config', config);
    const maskGraphics = new PIXI.Graphics();
    maskGraphics.beginFill(0x000000);
    maskGraphics.drawRect(0, 0, config.reelWidth*defaultConfig.numberOfReels, config.reelHeight);
    maskGraphics.endFill();
    this.mask = maskGraphics;
    this.addChild(maskGraphics);
  }

  /**
   * 創建 TitansSymbol
   */
  protected createSymbol(): TitansSymbol {
    return new TitansSymbol();
  }

  /**
   * 獲取隨機符號 ID (1-11)
   */
  protected getRandomSymbolId(): number {
    return Math.floor(Math.random() * 11) + 1;
  }
}

