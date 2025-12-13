import { BaseButton } from '@/views/components/BaseButton';
import { ButtonEvent } from '@/views/components/ButtonEvents';
import { GameEventEnum } from '../../../enum/gameEnum';
import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { Sprite } from 'pixi.js';
import { ResourceManager } from '@/core/ResourceManager';
import { BaseNumber } from '@/views/components/BaseNumber';

export class FessSpin extends PIXI.Container  {
  private startBtn?: BaseButton
  private cancelBtn?: BaseButton
  constructor() {
    super();
    this.init();
  }

  init(): void {
    const bg = Spine.from({
      atlas: 'Buy_FG_atlas',
      skeleton: 'Buy_FG_skel',
    });
    bg.label = 'buyFgSpine';
    this.addChild(bg);
    bg.position.set(540, 920);
    bg.alpha = 0.5;
    bg.state.setAnimation(0, "Idle", true);


    const resourceManager = ResourceManager.getInstance();
    const title:PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('buyfg_title01') as string));
    title.position.set(433, 853);
    this.addChild(title);
    const title1:PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.from(resourceManager.getResource('buyfg_title02') as string));
    title1.position.set(341, 938);
    this.addChild(title1);


    const costText = new BaseNumber({
      baseName: 'fg_summary_alart_number',
      anchor: 0.5,
      align: 'center',
      useThousandSeparator: true
    });
    costText.position.set(540, 1115);
    costText.scale.set(0.75);
    this.addChild(costText);
    costText.showText('1000000');

    this.startBtn = new BaseButton({
      baseName: 'buyfg_bg_startbtn',
      textTexture: 'buyfg_bg_btntext_start_normal',
      textPressTexture: 'buyfg_bg_btntext_start_pressed',
      anchor: 0.5,
    });
    this.startBtn.position.set(753,1270);
    this.addChild(this.startBtn);
    this.cancelBtn = new BaseButton({
      baseName: 'buyfg_bg_cancelbtn',
      textTexture: 'buyfg_bg_btntext_cancel_normal',
      textPressTexture: 'buyfg_bg_btntext_cancel_pressed',
      anchor: 0.5,
    });
    this.cancelBtn.position.set(353,1270);
    this.cancelBtn.on(ButtonEvent.BUTTON_CLICKED, ()=>{
        this.onCloseBtnClicked();
        
    });
    this.addChild(this.cancelBtn);
  }


  private onCloseBtnClicked(): void {
    this.emit(GameEventEnum.BIG_ANIMATION_CLOSE);
}
}