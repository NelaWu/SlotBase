import { ResourceManager } from '@/core/ResourceManager';
import { BaseButton } from '@/views/components/BaseButton';
import { ButtonEvent } from '@/views/components/ButtonEvents';
import { GameEventEnum } from '../../../enum/gameEnum';
import * as PIXI from 'pixi.js';

export class FreeEnd extends PIXI.Container {
    constructor() {
        super();
        this.init();
    }
    init(): void {
        const resourceManager = ResourceManager.getInstance();
        const freeEndResource = resourceManager.getResource('fg_summary_alart_bg');
        const freeEndTexture = PIXI.Texture.from(freeEndResource);
        const freeEndSprite = new PIXI.Sprite(freeEndTexture);
        freeEndSprite.position.set(60, 300);
        this.addChild(freeEndSprite);

        const title = resourceManager.getResource('fg_summary_alart_Title_cnt');
        const titleTexture = PIXI.Texture.from(title);
        const titleSprite = new PIXI.Sprite(titleTexture);
        titleSprite.position.set(226,681);
        this.addChild(titleSprite);
        
        const closeBtn = new BaseButton({
            baseName: 'fg_summary_alart_btn',
            anchor: 0.5,
            textTexture: 'fg_summary_alart_btntext_cnt',
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
    }

    private onCloseBtnClicked(): void {
        this.emit(GameEventEnum.FreeEndClose);
        
    }
}