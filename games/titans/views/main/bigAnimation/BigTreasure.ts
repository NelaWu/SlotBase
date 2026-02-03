import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { GameEventEnum } from '../../../enum/gameEnum';
import { BaseNumber } from '@/views/components/BaseNumber';

export class BigTreasure extends PIXI.Container {
    private winText?: BaseNumber
  constructor(win:string) {
    super();
    this.init(win);
  }

  init(win:string): void {
    const bg = Spine.from({
      atlas: 'Big_Treasure_atlas',
      skeleton: 'Big_Treasure_skel',
    });
    this.addChild(bg);
    bg.position.set(540, 900);
    
    this.winText = new BaseNumber({
      baseName: 'fg_summary_alart_number',
      anchor: 0.5,
      align: 'center',
      useThousandSeparator: true
    });
    this.winText.position.set(540, 980);
    this.addChild(this.winText);
    this.winText.visible = false;
    
    //animations
    bg.state.setAnimation(0, "In", false);
    bg.state.addAnimation(0, "Loop", false, 0);
    const winEntry = bg.state.addAnimation(0, "Win", false, 0);
    winEntry.listener = {
    start: () => {
        this.winText!.showText(win);
        setTimeout(() => {
            this.winText!.visible = true;
        }, 300);
        setTimeout(() => {
            this.winText!.visible = false;
        }, 3800);
    },
      complete: () => {
        this.emit(GameEventEnum.BIG_ANIMATION_BIG_TREASURE_COMPLETE);
      }
    };
  }
}