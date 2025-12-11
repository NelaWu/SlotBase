import { ResourceManager } from '@/core/ResourceManager';
import { BaseSymbol } from '@/views/components/BaseSymbol';
import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';

/**
 * Titans 遊戲的符號類別
 */
export class TitansSymbol extends BaseSymbol {
  private spine?: Spine;
  public setSymbol(id: number): void {
    this.symbolId = id;
    const symbolName = `symbol_${id.toString().padStart(2, '0')}`;
    const symbolResource = ResourceManager.getInstance().getResource(symbolName);
    
    if (symbolResource) {
      const symbolTexture = PIXI.Texture.from(symbolResource);
      this.sprite.texture = symbolTexture;
    }
    //to do 確認好美術檔
    if(id == 1 || id == 2 || id ==4 || id == 10 || id == 11){
      this.spine = Spine.from({
        atlas: `symbol_${id.toString().padStart(2, '0')}_atlas`,
        skeleton: `symbol_${id.toString().padStart(2, '0')}_skel`,
      });
      this.spine.scale.set(0.5, 0.5);
      this.addChild(this.spine);
    }
  }
  public showWin(): void {
    if (this.spine) {
      this.spine.visible = true;
      this.spine.renderable = true; // 啟用渲染
      this.spine.state.setAnimation(0, "Win", true);
    }
  }
  
  public hideWin(): void {
    if (this.spine) {
      // 停止所有動畫播放
      this.spine.state.clearTracks();
      // 隱藏並禁用渲染以節省效能
      this.spine.visible = false;
      this.spine.renderable = false; // 禁用渲染，跳過渲染管線
    }
  }
  
  public pushWin(): void {
    // 使用 hideWin 來統一處理隱藏邏輯
    this.hideWin();
  }
}