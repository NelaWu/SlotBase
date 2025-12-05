import { ResourceManager } from '@/core/ResourceManager';
import { BaseSymbol } from '@/views/components/BaseSymbol';
import * as PIXI from 'pixi.js';

/**
 * Titans 遊戲的符號類別
 */
export class TitansSymbol extends BaseSymbol {
  public setSymbol(id: number): void {
    this.symbolId = id;
    const symbolName = `symbol_${id.toString().padStart(2, '0')}`;
    const symbolResource = ResourceManager.getInstance().getResource(symbolName);
    
    if (symbolResource) {
      const symbolTexture = PIXI.Texture.from(symbolResource);
      this.sprite.texture = symbolTexture;
    }
  }
}