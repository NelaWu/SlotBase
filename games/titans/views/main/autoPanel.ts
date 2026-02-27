import * as PIXI from 'pixi.js';
import { ResourceManager } from '@/core/ResourceManager';
import { BaseButton } from '@/views/components/BaseButton';
import { ButtonEvent } from '@/views/components/ButtonEvents';
import { BetItem } from './BetPanel';


export class AutoPanel extends PIXI.Container {
    private countList: number[] = []; // 自動化次數選項（每 call 一次 11010 算一次）
    private countItem: BetItem[] = [];
    private onAutoCountSelectedCallback?: (count: number) => void;

    constructor() {
        super();
        this.init([5, 10, 25, 50, 100,200]);
    }
    init(countList: number[]): void {
        this.countList = countList;
        const backgroundMask = new PIXI.Graphics();
        backgroundMask.beginFill(0x000000, 0.9);
        backgroundMask.drawRect(0, 0, 1080, 1920);
        backgroundMask.endFill();
        this.addChild(backgroundMask);

        const resourceManager = ResourceManager.getInstance();
        const betPanelTexture = resourceManager.getTexture('auto_panel');
        if (betPanelTexture) {
          const betPanelSprite1 = new PIXI.Sprite(betPanelTexture);
          betPanelSprite1.position.set(130,739);
          this.addChild(betPanelSprite1);
          const betPanelSprite2 = new PIXI.Sprite(betPanelTexture);
          betPanelSprite2.scale.x = -1;
          betPanelSprite2.position.set(950,739);
          this.addChild(betPanelSprite2);
        }

        const titleTexture = resourceManager.getTexture(`auto_title_${ResourceManager.getCurrentLang()}`);
        if (titleTexture) {
          const titleSprite = new PIXI.Sprite(titleTexture);
          titleSprite.anchor.set(0.5,0.5);
          titleSprite.position.set(540,850);
          this.addChild(titleSprite);
        }

        this.createCountList(countList);

        const closeTexture = resourceManager.getTexture('auto_close');
        if (closeTexture) {
            const closeSprite = new PIXI.Sprite(closeTexture);
            closeSprite.position.set(826,1321);
            closeSprite.interactive = true;
            closeSprite.cursor = 'pointer';
            this.addChild(closeSprite);
            closeSprite.on('click', ()=>{
                this.hide();
            });
          }

        if (countList.length > 0) {
            this.countItem[0].select();
        }
    }

    public setOnAutoCountSelected(callback: (count: number) => void): void {
        this.onAutoCountSelectedCallback = callback;
    }

    private createCountList(countList: number[]): void {
        for (let i = 0; i < countList.length; i++) {
            this.countItem[i] = new BetItem(countList[i]);
            this.countItem[i].position.set(230 + (i % 3) * 208, 950 + Math.floor(i / 3) * 130);
            this.countItem[i].on(ButtonEvent.BUTTON_CLICKED, () => {
                this.selectCount(i);
            });
            this.addChild(this.countItem[i]);
        }
    }

    private selectCount(index: number): void {
        for (let i = 0; i < this.countList.length; i++) {
            if (i === index) this.countItem[i].select();
            else this.countItem[i].unselect();
        }
        const count = this.countList[index];
        if (this.onAutoCountSelectedCallback != null && count !== undefined) {
            this.onAutoCountSelectedCallback(count);
        }
        this.hide();
    }

    public hide(): void {
        this.visible = false;
    }
    public show(): void {
        this.visible = true;
    }
}