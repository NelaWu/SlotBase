import { BaseButton } from '@/views/components/BaseButton';
import { ButtonEvent } from '@/views/components/ButtonEvents';
import { GameEventEnum } from '../../../enum/gameEnum';
import * as PIXI from 'pixi.js';

export class FessSpin extends PIXI.Container  {
  private startBtn?: BaseButton
  private cancelBtn?: BaseButton
  constructor() {
    super();
    this.init();
  }

  init(): void {
    this.startBtn = new BaseButton({
      baseName: 'buyfg_bg_startbtn',
      textTexture: 'buyfg_bg_btntext_start_normal',
      textPressTexture: 'buyfg_bg_btntext_start_pressed',
      anchor: 0.5,
    });
    this.startBtn.position.set(753,1221);
    this.addChild(this.startBtn);
    this.cancelBtn = new BaseButton({
      baseName: 'buyfg_bg_cancelbtn',
      textTexture: 'buyfg_bg_btntext_cancel_normal',
      textPressTexture: 'buyfg_bg_btntext_cancel_pressed',
      anchor: 0.5,
    });
    this.cancelBtn.position.set(353,1221);
    this.cancelBtn.on(ButtonEvent.BUTTON_CLICKED, ()=>{
        this.onCloseBtnClicked();
        
    });
    this.addChild(this.cancelBtn);
  }


  private onCloseBtnClicked(): void {
    this.emit(GameEventEnum.BIG_ANIMATION_CLOSE);
}
}