import { ResourceManager } from '@/core/ResourceManager';
import * as PIXI from 'pixi.js';

export class FessSpin extends PIXI.Container  {
  constructor() {
    super();
    this.init();
  }

  init(): void {
    const resourceManager = ResourceManager.getInstance();
    const fessSpinResource = resourceManager.getResource('fg_summary_alart_bg');
    const fessSpinTexture = PIXI.Texture.from(fessSpinResource);
    const fessSpinSprite = new PIXI.Sprite(fessSpinTexture);
    this.addChild(fessSpinSprite);
  }
}