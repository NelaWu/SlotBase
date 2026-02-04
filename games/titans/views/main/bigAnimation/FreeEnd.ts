import { ResourceManager } from '@/core/ResourceManager';
import { BaseButton } from '@/views/components/BaseButton';
import { ButtonEvent } from '@/views/components/ButtonEvents';
import { GameEventEnum } from '../../../enum/gameEnum';
import * as PIXI from 'pixi.js';
import { BaseNumber } from '@/views/components/BaseNumber';
import { gsap } from 'gsap';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { SoundManager } from '../../../core/SoundManager';

export class FreeEnd extends PIXI.Container {
    private winText?: BaseNumber
    constructor() {
        super();
        this.init();
    }
    init(): void {
        const resourceManager = ResourceManager.getInstance();
        
        const bg = Spine.from({
            atlas: 'FG_Summary_Alart_atlas',
            skeleton: 'FG_Summary_Alart_skel',
          });
        bg.position.set(540,900);
        bg.state.setAnimation(0, "Idle", true);
        this.addChild(bg);
        const titleTexture = resourceManager.getTexture(`fg_summary_alart_Title_${ResourceManager.getCurrentLang()}`);
        if (titleTexture) {
          const titleSprite = new PIXI.Sprite(titleTexture);
          titleSprite.anchor.set(0.5);
          titleSprite.position.set(540,670);
          this.addChild(titleSprite);
        }
        
        const closeBtn = new BaseButton({
            baseName: 'fg_summary_alart_btn',
            anchor: 0.5,
            textTexture: 'fg_summary_alart_btntext',
            textPosition: { x: -10, y: -25 }
        });
        closeBtn.position.set(540,1300);
        //點擊的時候不顯示文字
        const text = closeBtn.getChildByLabel('text') as PIXI.Sprite;
        closeBtn.on(ButtonEvent.BUTTON_DOWN, ()=>{
            text.visible = false;
            
        });
        closeBtn.on(ButtonEvent.BUTTON_CLICKED, ()=>{
            text.visible = true;
            
        });
        closeBtn.on(ButtonEvent.BUTTON_CLICKED, ()=>{
            text.visible = true;
            this.onCloseBtnClicked();
            
        });
        closeBtn.on(ButtonEvent.BUTTON_OVER, ()=>{
            text.visible = true;
            
        });
        closeBtn.on(ButtonEvent.BUTTON_OUT, ()=>{
            text.visible = true;
            
        });
        this.addChild(closeBtn);
        this.winText = new BaseNumber({
            baseName: 'fg_summary_alart_number',
            anchor: 0.5,
            align: 'center',
            useThousandSeparator: true
        });
        this.winText.position.set(540,962);
        this.winText.showText('0');
        this.addChild(this.winText);
    }
    public setWinText(text: string): void {
        SoundManager.playBGM('btm_fg_out_bgm');
        let num:{money:number} = {money:0}
        let lastSoundTime = 0; // 記錄上次播放音效的時間
        
        gsap.to(num, { money: text, duration: 5,
            onStart: () => {
                SoundManager.playSound('btm_fg_out');
                lastSoundTime = performance.now(); // 記錄開始時間
            },
             onUpdate: () => {
            this.winText?.showText(num.money.toFixed(2));
            
            const currentTime = performance.now();
            if (currentTime - lastSoundTime >= 200) {
                SoundManager.playSound('btm_counting');
                lastSoundTime = currentTime;
            }
        } });
    }

    private onCloseBtnClicked(): void {
        SoundManager.playBGM('mg_bgm');
        this.emit(GameEventEnum.BIG_ANIMATION_CLOSE);
    }
}