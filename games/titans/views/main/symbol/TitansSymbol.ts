import { ResourceManager } from '@/core/ResourceManager';
import { BaseSymbol } from '@/views/components/BaseSymbol';
import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { BaseNumber } from '@/views/components/BaseNumber';
import gsap from 'gsap';
import { getMultiplierFromSymbolId } from '../../../constants/MultiplierMap';

/**
 * Titans 遊戲的符號類別
 */
export class TitansSymbol extends BaseSymbol {
  private spine?: Spine;
  private explosionSpine?: Spine;
  private isSpecialSymbol:boolean = false;
  private multiText?: BaseNumber; // 倍數文字
  
  /**
   * 根據符號 ID 獲取對應的倍數值
   */
  private getMultiplierValue(id: number): number | null {
    return getMultiplierFromSymbolId(id);
  }
  public setSymbol(id: number): void {
    this.sprite.visible = false;
    // 處理空白符號（ID 0）
    if (id === 0) {
      if (this.spine) {
        this.spine.visible = false;
        this.spine.renderable = false;
      }
      this.isSpecialSymbol = false;
      return;
    }
    
    if(id >= 41) console.log('11003] 收到消息:show multi win',id);
    
    this.symbolId = id;
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
      this.sprite.visible = true;
    }
    const symbolResource = ResourceManager.getInstance().getResource(symbolName);
    
    if (symbolResource) {
      const symbolTexture = PIXI.Texture.from(symbolResource);
      this.sprite.texture = symbolTexture;
    }

    if(!this.isSpecialSymbol){
      this.spine = Spine.from({
        atlas: `symbol_${id.toString().padStart(2, '0')}_atlas`,
        skeleton: `symbol_${id.toString().padStart(2, '0')}_skel`,
      });
      this.spine.scale.set(0.5, 0.5);
      this.addChild(this.spine); 

      this.explosionSpine = Spine.from({
        atlas: `Symbol_Explosion_atlas`,
        skeleton: `Symbol_Explosion_skel`,
      });
      this.explosionSpine.scale.set(0.5, 0.5);
      this.addChild(this.explosionSpine);
      
      this.hideWin();
    }
    else{
      //倍數球的spine
      this.spine = Spine.from({
        atlas: `Symbol_Multi_atlas`,
        skeleton: `Symbol_Multi_skel`,
      });
      console.log('iddddd',this.spine);
      
      this.spine.scale.set(0.5, 0.5);
      // this.addChild(this.spine);
      if(id >= 51 && id <= 55){
        this.spine.skeleton.setSkinByName('Lv1');
      }else if(id >= 56 && id <= 60){
        this.spine.skeleton.setSkinByName('Lv2');
      }else if(id >= 61 && id <= 65){
        this.spine.skeleton.setSkinByName('Lv3');
      }else if(id >= 66 && id <= 70){
        this.spine.skeleton.setSkinByName('Lv4');
      }
      else{
        this.spine.skeleton.setSkinByName('Lv4');
      }
      // 顯示倍數文字
      const multiplierValue = this.getMultiplierValue(id);
      console.log('11003] 收到消息:show multi win',multiplierValue);
      if (multiplierValue !== null) {
        // 如果已經存在 multiText，先移除
        if (this.multiText && this.multiText.parent) {
          this.removeChild(this.multiText);
        }
        
        this.multiText = new BaseNumber({
          baseName: 'fg_total_multi_number',
          anchor: 0.5,
          align: 'center',
          useThousandSeparator: true
        });
        this.multiText.showText(multiplierValue.toString()+'x');
        this.multiText.scale.set(0, 0);
        setTimeout(() => {
          const a:{scale:number} = {scale:2};
          gsap.to(a, {
            scale:1,
            duration: 0.5,
            delay: 0.5,
            onStart: () => {
              if(this.spine){
                this.addChild(this.spine);
                this.spine!.visible = true;
                this.spine!.renderable = true;
                this.spine!.state?.setAnimation(0, "Hit", false);
              }
              if (this.multiText) {
                this.addChild(this.multiText);
              }
            },
            onUpdate: () => {
              if (this.multiText) {
                this.multiText.scale.set(a.scale, a.scale);
              }
            }
          });
          this.spine?.state?.setAnimation(0, "Hit", false);
        }, 400);
        
      }
    }
  }
  
  public showWin(onComplete?: () => void): void {
    if (this.spine) {
      this.spine.visible = true;
      this.spine.renderable = true; // 啟用渲染
      this.sprite.visible = false;
      
      const trackEntry = this.spine.state.setAnimation(0, "Win", false);
      trackEntry.listener = {
        complete: () => {
          // Win 動畫完成後，播放 Explosion 動畫
          if (this.explosionSpine) {
            // 隱藏 spine
            if (this.spine) {
              this.spine.visible = false;
              this.spine.renderable = false;
            }
            
            // 顯示並播放 Explosion 動畫
            this.explosionSpine.visible = true;
            this.explosionSpine.renderable = true;
            const explosionTrackEntry = this.explosionSpine.state.setAnimation(0, "Explosion", false);
            
            explosionTrackEntry.listener = {
              complete: () => {
                // Explosion 動畫完成後，隱藏 explosionSpine 並顯示 sprite
                if (this.explosionSpine) {
                  this.explosionSpine.visible = false;
                  this.explosionSpine.renderable = false;
                }
                this.sprite.visible = true;
                
                // 調用完成回調
                if (onComplete) {
                  onComplete();
                }
              }
            };
          } else {
            // 如果沒有 explosionSpine，直接完成
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

  /**
   * 播放 Collect 動畫
   */
  public playCollect(): void {
    if (this.spine) {
      this.spine.visible = true;
      this.spine.renderable = true;
      this.sprite.visible = false;
      if (this.multiText) {
        this.multiText.visible = false;
      }
      
      // 播放 Collect 動畫（不循環）
      this.spine.state.setAnimation(0, "Collect", false);
    }
  }
}