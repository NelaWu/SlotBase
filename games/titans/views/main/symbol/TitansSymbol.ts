import { ResourceManager } from '@/core/ResourceManager';
import { BaseSymbol } from '@/views/components/BaseSymbol';
import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { BaseNumber } from '@/views/components/BaseNumber';

/**
 * 倍數 ID 映射表
 */
const MULTIPLIER_MAP: Record<number, number> = {
  51: 2,
  52: 3,
  53: 4,
  54: 6,
  55: 8,
  56: 10,
  57: 12,
  58: 15,
  59: 18,
  60: 25,
  61: 50,
  62: 55,
  63: 60,
  64: 65,
  65: 80,
  66: 100,
  67: 150,
  68: 200,
  69: 250,
  70: 500,
};

/**
 * Titans 遊戲的符號類別
 */
export class TitansSymbol extends BaseSymbol {
  private spine?: Spine;
  private isSpecialSymbol:boolean = false;
  
  /**
   * 根據符號 ID 獲取對應的倍數值
   */
  private getMultiplierValue(id: number): number | null {
    return MULTIPLIER_MAP[id] || null;
  }
  public setSymbol(id: number): void {
    // 處理空白符號（ID 0）
    if (id === 0) {
      this.symbolId = 0;
      this.sprite.visible = false;
      if (this.spine) {
        this.spine.visible = false;
        this.spine.renderable = false;
      }
      this.isSpecialSymbol = false;
      return;
    }
    
    if(id >= 41) console.log('11003] 收到消息:show multi win',id);
    
    this.symbolId = id;
    this.sprite.visible = true; // 確保非空白符號可見
    let symbolName:string = '';
    this.isSpecialSymbol = true;
    if(id >= 51 && id <= 55){
      symbolName = 'symbol_multi_01';
    }else if(id >= 56 && id <= 60){
      symbolName = 'symbol_multi_02';
    }else if(id >= 61 && id <= 65){
      symbolName = 'symbol_multi_03';
    }else if(id >= 66 && id <= 70){
      symbolName = 'symbol_multi_04';
    }else if(id >= 151 && id <= 155){
      symbolName = 'symbol_multi_up_01';
    }else if(id >= 156 && id <= 160){
      symbolName = 'symbol_multi_up_02';
    }else if(id >= 161 && id <= 165){
      symbolName = 'symbol_multi_up_03';
    }else if(id >= 166 && id <= 170){
      symbolName = 'symbol_multi_up_04';
    }else{
      symbolName = `symbol_${id.toString().padStart(2, '0')}`;
      this.isSpecialSymbol = false;
    }
    const symbolResource = ResourceManager.getInstance().getResource(symbolName);
    
    if (symbolResource) {
      const symbolTexture = PIXI.Texture.from(symbolResource);
      this.sprite.texture = symbolTexture;
    }
    if(id <= 11){
      this.spine = Spine.from({
        atlas: `symbol_${id.toString().padStart(2, '0')}_atlas`,
        skeleton: `symbol_${id.toString().padStart(2, '0')}_skel`,
      });
      this.spine.scale.set(0.5, 0.5);
      this.addChild(this.spine); 
    }
    else{
      //倍數球的spine
      this.spine = Spine.from({
        atlas: `Symbol_Multi_atlas`,
        skeleton: `Symbol_Multi_skel`,
      });
      this.spine.scale.set(0.5, 0.5);
      this.addChild(this.spine);
      this.spine.skeleton.setSkinByName('Lv2');
      if(id >= 51 && id <= 55){
        this.spine.skeleton.setSkinByName('Lv1');
      }else if(id >= 56 && id <= 60){
        this.spine.skeleton.setSkinByName('Lv2');
      }else if(id >= 61 && id <= 65){
        this.spine.skeleton.setSkinByName('Lv3');
      }else if(id >= 66 && id <= 70){
        this.spine.skeleton.setSkinByName('Lv4');
      }
      this.spine.state.setAnimation(0, "Collect", true);
      
      // 顯示倍數文字
      const multiplierValue = this.getMultiplierValue(id);
      if (multiplierValue !== null) {
        const multiText = new BaseNumber({
          baseName: 'fg_total_multi_number',
          anchor: 0.5,
          align: 'center',
          useThousandSeparator: true
        });
        this.addChild(multiText);
        multiText.showText(multiplierValue.toString()+'x');
      }
    }
    this.hideWin();
  }
  
  public showWin(onComplete?: () => void): void {
    if (this.spine) {
      this.spine.visible = true;
      this.spine.renderable = true; // 啟用渲染
      this.sprite.visible = false;
      
      const trackEntry = this.spine.state.setAnimation(0, "Win", false);
      trackEntry.listener = {
        complete: () => {
          if (this.spine) {
            this.spine.visible = false;
            this.spine.renderable = false;
          }
          this.sprite.visible = true;
          // 調用完成回調
          if (onComplete) {
            onComplete();
          }
        }
      };
    }
  }
  
  public hideWin(): void {
    if (this.spine) {
      // 停止所有動畫播放
      this.spine.state.clearTracks();
      // 隱藏並禁用渲染以節省效能
      this.spine.visible = false;
      this.spine.renderable = false; // 禁用渲染，跳過渲染管線
      this.sprite.visible = true;
    }
  }
  
  public pushWin(): void {
    // 使用 hideWin 來統一處理隱藏邏輯
    this.hideWin();
  }
}