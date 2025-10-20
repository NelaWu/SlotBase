import { ResourceManager } from '@/core/ResourceManager';
import * as PIXI from 'pixi.js';

export class TitansSymbol extends PIXI.Container{
    private symbol: PIXI.Sprite;
    constructor(){
        super();
        this.symbol = new PIXI.Sprite();
        this.symbol.anchor.set(0.5);
        this.addChild(this.symbol);
    }
    public setSymbol(id: number): void {
        const symbolName = `symbol_${id.toString().padStart(2, '0')}`;
        const symbolResource = ResourceManager.getInstance().getResource(symbolName);
        
        if (symbolResource) {
          const symbolTexture = PIXI.Texture.from(symbolResource);
          this.symbol.texture = symbolTexture;
        }
    }
}