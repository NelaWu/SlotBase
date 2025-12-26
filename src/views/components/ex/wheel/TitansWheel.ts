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
      numberOfReels: 6,      // 6 列
      symbolsPerReel: 5,     // 5 行
      reelSpacing: 0,
      speed: {
        startSpeed: 3,       // 起步速度
        maxSpeed: 25,        // 滾動速度
        endSpeed: 15,         // 結束速度
        acceleration: 40,    // 加速度
        deceleration: 20     // 減速度（控制減速快慢）
      },
      timing: {
        startInterval: 200,  // 起步間隔
        stopInterval: 200,    // 停止間隔（每個 reel 之間的停止延遲）
        minSpinDuration: 1000 // 最少轉 1 秒
      },
      ...config
    }
    
    super(defaultConfig);
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

