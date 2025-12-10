import * as PIXI from 'pixi.js';
import { FessSpin } from './FessSpin';
import { FreeEnd } from './FreeEnd';
import { GameEventEnum } from '../../../enum/gameEnum';

export class BigAnimationManager extends PIXI.Container {
  private bigAnimationContainer: PIXI.Container;
  private backgroundMask: PIXI.Graphics;

  constructor() {
    super();
    this.sortableChildren = true;
    
    // 創建動畫容器
    this.bigAnimationContainer = new PIXI.Container();
    this.bigAnimationContainer.zIndex = 9999;
    this.addChild(this.bigAnimationContainer);
    
    // 創建遮罩
    this.backgroundMask = new PIXI.Graphics();
    this.backgroundMask.beginFill(0x000000, 0.9);
    this.backgroundMask.drawRect(0, 0, 1080, 1920);
    this.backgroundMask.endFill();
    this.bigAnimationContainer.addChild(this.backgroundMask);

    // 預設隱藏
    this.hide();
  }

  /**
   * 顯示 FessSpin 動畫
   */
  public showFreeSpin(): FessSpin {
    this.show();
    const fessSpin = new FessSpin();
    this.bigAnimationContainer.addChild(fessSpin);
    // 監聽關閉事件
    fessSpin.on(GameEventEnum.BIG_ANIMATION_CLOSE, () => {
      this.hide();
    });
    return fessSpin;
  }

  /**
   * 顯示 FreeEnd 動畫
   * @param winAmount 獲勝金額
   */
  public showFreeEnd(winAmount: string): FreeEnd {
    this.show();
    const freeEnd = new FreeEnd();
    freeEnd.setWinText(winAmount);
    this.bigAnimationContainer.addChild(freeEnd);
    
    // 監聽關閉事件
    freeEnd.on(GameEventEnum.BIG_ANIMATION_CLOSE, () => {
      this.hide();
    });
    
    return freeEnd;
  }


  /**
   * 顯示動畫容器
   */
  private show(): void {
    this.bigAnimationContainer.visible = true;
  }

  /**
   * 隱藏動畫容器
   */
  private hide(): void {
    this.bigAnimationContainer.visible = false;
  }
}