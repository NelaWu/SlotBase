
import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { GameEventEnum } from '../../../enum/gameEnum';
import { SoundManager } from '../../../core/SoundManager';

export class Transition extends PIXI.Container {
  constructor() {
    super();
    this.init();
  }

  init(): void {
    const transition = Spine.from({
      atlas: 'Transition_atlas',
      skeleton: 'Transition_skel',
    });
    SoundManager.playSound('btm_trans');

    this.addChild(transition);
    transition.position.set(540, 900);
    transition.state.setAnimation(0, "In", false);
    transition.state.addListener({
      complete: () => {
        this.emit(GameEventEnum.BIG_ANIMATION_TRANSITION_COMPLETE);
      }
    });
  }
}