import * as PIXI from 'pixi.js';
import { ResourceManager } from '@/core/ResourceManager';
import { BaseButton } from '@/views/components/BaseButton';
import { ButtonEvent } from '@/views/components/ButtonEvents';

// 投注選項元件
class BetItem extends PIXI.Container {
    private multipleText!: PIXI.Text;
    private betbgSprite!: PIXI.Sprite;

    constructor(multiple: number) {
        super();
        this.init(multiple);
        this.setupClickEvents();
    }

    private init(multiple: number): void {
        const resourceManager = ResourceManager.getInstance();
        const betbgTexture = resourceManager.getTexture('bet_select');
        if (betbgTexture) {
          this.betbgSprite = new PIXI.Sprite(betbgTexture);
          this.addChild(this.betbgSprite);
        }

        this.multipleText = new PIXI.Text(multiple.toString(), {
            fontFamily: 'Arial',
            fontSize: 60,
            fill: 0xffffff,
            fontWeight: 'bold'
        });
        this.multipleText.anchor.set(0.5);
        this.multipleText.position.set(102, 50);
        this.addChild(this.multipleText);

        // 創建點擊區域（使用 Graphics 創建矩形）
        const bounds = this.betbgSprite.getBounds();
        const hitArea = new PIXI.Rectangle(0, 0, bounds.width, bounds.height);
        this.hitArea = hitArea;

        this.unselect();
    }

    private setupClickEvents(): void {
        // 設置為可交互
        this.eventMode = 'static';
        this.cursor = 'pointer';

        // 綁定點擊事件
        this.on('pointerdown', this.onPointerDown.bind(this));
        this.on('pointerup', this.onPointerUp.bind(this));
        this.on('pointerupoutside', this.onPointerUpOutside.bind(this));
        this.on('pointerover', this.onPointerOver.bind(this));
        this.on('pointerout', this.onPointerOut.bind(this));
    }

    private onPointerDown(): void {
        // 按下時的視覺反饋（可選）
        this.scale.set(0.95);
    }

    private onPointerUp(): void {
        // 恢復原始大小
        this.scale.set(1);
        // 觸發點擊事件
        this.emit(ButtonEvent.BUTTON_CLICKED);
    }

    private onPointerUpOutside(): void {
        // 在外部釋放時恢復原始大小
        this.scale.set(1);
    }

    private onPointerOver(): void {
        // 懸停時的視覺反饋（可選）
        this.scale.set(1.05);
    }

    private onPointerOut(): void {
        // 恢復原始大小
        this.scale.set(1);
    }

    // 更新倍數文字
    public updateMultiple(multiple: number): void {
        this.multipleText.text = multiple.toString();
    }

    // 獲取倍數
    public getMultiple(): number {

        return parseInt(this.multipleText.text) || 0;
    }

    public select(): void {
        this.betbgSprite.visible = true;
    }

    public unselect(): void {
        this.betbgSprite.visible = false;
    }
}

export class BetPanel extends PIXI.Container {
    private betList: number[] = [];
    private betItem: BetItem[] = [];
    private onBetSelectedCallback?: (betAmount: number) => void; // 投注選擇回調函數
    
    constructor(betList: number[], onBetSelected?: (betAmount: number) => void) {
        super();
        this.onBetSelectedCallback = onBetSelected;
        this.init(betList);
    }
    init(betList: number[]): void {
        this.betList = betList;
        const backgroundMask = new PIXI.Graphics();
        backgroundMask.beginFill(0x000000, 0.9);
        backgroundMask.drawRect(0, 0, 1080, 1920);
        backgroundMask.endFill();
        this.addChild(backgroundMask);

        const resourceManager = ResourceManager.getInstance();
        const betPanelTexture = resourceManager.getTexture('bet_panel');
        if (betPanelTexture) {
          const betPanelSprite1 = new PIXI.Sprite(betPanelTexture);
          betPanelSprite1.position.set(83,739);
          this.addChild(betPanelSprite1);
          const betPanelSprite2 = new PIXI.Sprite(betPanelTexture);
          betPanelSprite2.scale.x = -1;
          betPanelSprite2.position.set(997,739);
          this.addChild(betPanelSprite2);
        }

        const titleTexture = resourceManager.getTexture('bet_title');
        if (titleTexture) {
          const titleSprite = new PIXI.Sprite(titleTexture);
          titleSprite.position.set(385,780);
          this.addChild(titleSprite);
        }

        this.createBetList(betList);
        
        // 預設選擇第一個投注選項
        if (betList.length > 0) {
            this.selectBet(0);
        }

        const bet:BaseButton = new BaseButton({
            baseName: 'bet_bnt',
            textTexture: 'bet_btntext',
        });
        bet.position.set(541,1470);
        this.addChild(bet);
        bet.on(ButtonEvent.BUTTON_CLICKED, ()=>{
            this.hide();
        });
    }

    private createBetList(betList: number[]): void {
        for(let i:number=0 ; i<betList.length ; i++){
            // 使用 BetItem 元件創建投注選項
            this.betItem[i] = new BetItem(betList[i]);
            this.betItem[i].position.set(116+(i%4)*216,891+(Math.floor(i/4))*127);
            this.betItem[i].on(ButtonEvent.BUTTON_CLICKED, ()=>{
                this.selectBet(i);
            });
            this.addChild(this.betItem[i]);
        }
    }

    private selectBet(index: number): void {
        // 更新視覺選擇狀態
        for(let i:number=0 ; i<this.betList.length ; i++){
            if(i === index){
                this.betItem[i].select();
            }else{
                this.betItem[i].unselect();
            }
        }
        
        // 獲取選擇的投注金額
        const selectedBet = this.betList[index];
        
        // 調用回調函數更新 Model 的 currentBet
        if (this.onBetSelectedCallback && selectedBet !== undefined) {
            this.onBetSelectedCallback(selectedBet);
        }
    }

    private hide(){
        this.visible = false;
    }
    public show(){
        this.visible = true;
    }
}