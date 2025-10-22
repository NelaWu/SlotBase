import * as PIXI from 'pixi.js';

/**
 * 基礎符號類別
 * 所有遊戲的符號都應該繼承此類別
 */
export abstract class BaseSymbol extends PIXI.Container {
  protected sprite: PIXI.Sprite;
  protected symbolId: number = 0;

  constructor() {
    super();
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);
  }

  /**
   * 設置符號
   * 子類需要實現此方法來載入對應的資源
   */
  public abstract setSymbol(id: number): void;

  /**
   * 獲取當前符號 ID
   */
  public getSymbolId(): number {
    return this.symbolId;
  }

  /**
   * 設置符號大小
   */
  public setSize(width: number, height: number): void {
    this.sprite.width = width;
    this.sprite.height = height;
  }
}

