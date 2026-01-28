import { ResourceManager } from '@/core/ResourceManager';
import * as PIXI from 'pixi.js';
import { BaseNumber } from '@/views/components/BaseNumber';

export interface JpData {
    JPLevel: number; // 1: Grand, 2: Major, 3: Mini, 4: Minor
    Value: number;
}

export class JpInfo extends PIXI.Container {
    private bgSprite!: PIXI.Sprite;
    private grandSprite!: PIXI.Sprite;
    private majorSprite!: PIXI.Sprite;
    private miniSprite!: PIXI.Sprite;
    private minorSprite!: PIXI.Sprite;
    
    // 四個 JP 等級的數字顯示
    private grandNumber!: BaseNumber;
    private majorNumber!: BaseNumber;
    private miniNumber!: BaseNumber;
    private minorNumber!: BaseNumber;
    
    constructor() {
        super();
        this.init();
    }
    
    private init(): void {
        const resourceManager = ResourceManager.getInstance();
        
        // 背景
        const bgResource = resourceManager.getResource('title_jp_bg');
        if (bgResource) {
            this.bgSprite = new PIXI.Sprite(PIXI.Texture.from(bgResource));
            this.bgSprite.width = 1080;
            this.bgSprite.position.set(0, 0);
            this.addChild(this.bgSprite);
        }

        // Grand Jackpot (JPLevel 1)
        const grandResource = resourceManager.getResource('title_jp_grand');
        if (grandResource) {
            this.grandSprite = new PIXI.Sprite(PIXI.Texture.from(grandResource));
            this.grandSprite.position.set(15, 0);
            this.addChild(this.grandSprite);
        }
        
        // Grand 數字顯示
        this.grandNumber = new BaseNumber({
            baseName: 'jp_number',
            anchor: 0,
            align: 'center',
            useThousandSeparator: true
        });
        this.grandNumber.position.set(150, 0); // 在標題下方
        this.addChild(this.grandNumber);
        this.grandNumber.showText('0');

        // Major Jackpot (JPLevel 2)
        const majorResource = resourceManager.getResource('title_jp_major');
        if (majorResource) {
            this.majorSprite = new PIXI.Sprite(PIXI.Texture.from(majorResource));
            this.majorSprite.position.set(314, 0);
            this.addChild(this.majorSprite);
        }
        
        // Major 數字顯示
        this.majorNumber = new BaseNumber({
            baseName: 'jp_number',
            anchor: 0,
            align: 'center',
            useThousandSeparator: true
        });
        this.majorNumber.position.set(450, 0);
        this.addChild(this.majorNumber);
        this.majorNumber.showText('0');

        // Minor Jackpot (JPLevel 3)
        const minorResource = resourceManager.getResource('title_jp_minor');
        if (minorResource) {
            this.minorSprite = new PIXI.Sprite(PIXI.Texture.from(minorResource));
            this.minorSprite.position.set(598, 0);
            this.addChild(this.minorSprite);
        }
        
        // Minor 數字顯示
        this.minorNumber = new BaseNumber({
            baseName: 'jp_number',
            anchor: 0,
            align: 'center',
            useThousandSeparator: true
        });
        this.minorNumber.position.set(750, 0);
        this.addChild(this.minorNumber);
        this.minorNumber.showText('0');

        // Mini Jackpot (JPLevel 4)
        const miniResource = resourceManager.getResource('title_jp_mini');
        if (miniResource) {
            this.miniSprite = new PIXI.Sprite(PIXI.Texture.from(miniResource));
            this.miniSprite.position.set(950, 0);
            this.addChild(this.miniSprite);
        }
        
        // Mini 數字顯示
        this.miniNumber = new BaseNumber({
            baseName: 'jp_number',
            anchor: 0,
            align: 'center',
            useThousandSeparator: true
        });
        this.miniNumber.position.set(1020, 0);
        this.addChild(this.miniNumber);
        this.miniNumber.showText('0');
    }
    
    /**
     * 更新 JP 數值
     * @param jpDataArray JP 數據數組，格式: [{ JPLevel: 1, Value: 100010 }, ...]
     * JPLevel: 1=Grand, 2=Major, 3=Minor, 4=Mini
     */
    public updateJpValues(jpDataArray: JpData[]): void {
        jpDataArray.forEach((jpData) => {
            const value = jpData.Value.toString();
            
            switch (jpData.JPLevel) {
                case 1: // Grand
                    if (this.grandNumber) {
                        this.grandNumber.showText(value);
                    }
                    break;
                case 2: // Major
                    if (this.majorNumber) {
                        this.majorNumber.showText(value);
                    }
                    break;
                case 3: // Minor
                    if (this.minorNumber) {
                        this.minorNumber.showText(value);
                    }
                    break;
                case 4: // Mini
                    if (this.miniNumber) {
                        this.miniNumber.showText(value);
                    }
                    break;
                default:
                    console.warn(`[JpInfo] 未知的 JPLevel: ${jpData.JPLevel}`);
            }
        });
    }
    
}