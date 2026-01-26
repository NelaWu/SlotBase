import * as PIXI from 'pixi.js';
import { FessSpin } from './FessSpin';
import { FreeEnd } from './FreeEnd';
import { Transition } from './Transition';
import { BigWinType, GameEventEnum } from '../../../enum/gameEnum';
import { BigTreasure } from './BigTreasure';
import { BigWin } from './BigWin';

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
    this.backgroundMask.eventMode = 'static';
    this.backgroundMask.hitArea = new PIXI.Rectangle(0, 0, 1080, 1920);
    this.bigAnimationContainer.addChild(this.backgroundMask);

    // 預設隱藏
    this.hide();
  }

  /**
   * 顯示 FessSpin 動畫
   */
  public showFreeSpin(bet:number): FessSpin {
    this.show();
    const fessSpin = new FessSpin(bet);
    this.bigAnimationContainer.addChild(fessSpin);
    // 監聽關閉事件
    fessSpin.once(GameEventEnum.BIG_ANIMATION_CLOSE, () => {
      this.bigAnimationContainer.removeChild(fessSpin);
      this.hide();
    });
    // 監聽開始免費遊戲事件
    fessSpin.once(GameEventEnum.BIG_ANIMATION_FREE_SPIN_START, () => {
      this.bigAnimationContainer.removeChild(fessSpin);
      this.emit(GameEventEnum.BIG_ANIMATION_FREE_SPIN_START);
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
    freeEnd.once(GameEventEnum.BIG_ANIMATION_CLOSE, () => {
      this.hide();
    });
    
    return freeEnd;
  }

  public showTransition(): Transition {
    this.show();
    this.backgroundMask.visible = false;
    const transition = new Transition();
    this.bigAnimationContainer.addChild(transition);
    // 監聽關閉事件
    transition.once(GameEventEnum.BIG_ANIMATION_TRANSITION_COMPLETE, () => {
      this.hide();
      this.backgroundMask.visible = true;
    });
    return transition;
  }
  public showBigTreasure(win:string): BigTreasure {
    this.show();
    const bigTreasure = new BigTreasure(win);
    this.bigAnimationContainer.addChild(bigTreasure);
    bigTreasure.once(GameEventEnum.BIG_ANIMATION_BIG_TREASURE_COMPLETE, () => {
      this.hide();
    });
    return bigTreasure;
  }

  public showBigWin( money:string,bet?:number): BigWin {
    let type:BigWinType = BigWinType.BIG_WIN;
    this.show();
    const bigWin = new BigWin(type, money.toString(),bet);
    this.bigAnimationContainer.addChild(bigWin);

    bigWin.once(GameEventEnum.BIG_ANIMATION_BIG_WIN_COMPLETE, () => {
      this.hide();
    });
    
    // 添加點擊空白處跳過動畫功能
    const onBackgroundClick = () => {
      bigWin.skipToEnd();
      this.backgroundMask.off('pointerdown', onBackgroundClick);
    };
    this.backgroundMask.on('pointerdown', onBackgroundClick);
    
    return bigWin;
  }

  /**
   * 顯示 BigWin 動畫並返回 Promise（等待動畫完成）
   */
  public async showBigWinAsync(money: string, bet?: number): Promise<void> {
    return new Promise((resolve) => {
      const bigWin = this.showBigWin(money, bet);
      bigWin.once(GameEventEnum.BIG_ANIMATION_BIG_WIN_COMPLETE, () => {
        resolve();
      });
    });
  }


  /**
   * 顯示動畫容器
   */
  private show(): void {
    this.visible = true;
  }

  /**
   * 隱藏動畫容器
   */
  private hide(): void {
    this.visible = false;
  }
}