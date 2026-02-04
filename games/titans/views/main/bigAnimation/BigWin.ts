import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { BigWinType, GameEventEnum } from '../../../enum/gameEnum';
import { BaseNumber } from '@/views/components/BaseNumber';
import { SoundManager } from '../../../core/SoundManager';

// Big Win 階段配置
interface BigWinStageConfig {
    skin: string;
    scrollRate: number; // 每秒滾動的倍數（倍押注/秒）
    multiplierMin: number; // 倍數範圍最小值
    multiplierMax: number; // 倍數範圍最大值
}

// 所有階段的配置
const BIG_WIN_STAGES: BigWinStageConfig[] = [
    { skin: "Prize_01", scrollRate: 4, multiplierMin: 0, multiplierMax: 20 },
    { skin: "Prize_02", scrollRate: 6, multiplierMin: 20, multiplierMax: 50 },
    { skin: "Prize_03", scrollRate: 10, multiplierMin: 50, multiplierMax: 100 },
    { skin: "Prize_04", scrollRate: 25, multiplierMin: 100, multiplierMax: 300 },
    { skin: "Prize_05", scrollRate: 70, multiplierMin: 300, multiplierMax: 1000 },
    { skin: "Prize_06", scrollRate: 80, multiplierMin: 1000, multiplierMax: Infinity },
];

export class BigWin extends PIXI.Container {
    private moneyText?: BaseNumber;
    private winTitle?: Spine;
    private scrollAnimationTimer?: number;
    private winAmount: number = 0; // 保存最終獲勝金額
    private bet?: number; // 保存押注金額

    constructor(type:BigWinType, money:string, bet?:number) {
        super();
        this.init(type, money, bet);
    }

    init(type:BigWinType, money:string, bet?:number): void {
        // 如果是 BIG_WIN 類型且有押注金額，根據倍數分段處理
        if (type === BigWinType.BIG_WIN && bet !== undefined) {
            const winAmount = parseFloat(money);
            const multiplier = winAmount / bet;
            this.initBigWin(type, winAmount, bet, multiplier);
        } else {
            // JP_WIN 或其他類型的處理（保持原有邏輯）
            this.initDefault(type, money);
        }
    }

    private initBigWin(type:BigWinType, winAmount:number, bet:number, multiplier:number): void {
        // 保存最終金額和押注金額
        this.winAmount = winAmount;
        this.bet = bet;
        
        const bg = Spine.from({
            atlas: 'Prize_Win_Vfx_atlas',
            skeleton: 'Prize_Win_Vfx_skel',
        });
        bg.position.set(540, 900);
        bg.state.setAnimation(0, "In_"+this.getAnimationName(type), false);
        bg.state.addAnimation(0, "Idle_"+this.getAnimationName(type), true, 0);
        this.addChild(bg);
        
        // 創建 winTitle（初始使用 Prize_01）
        this.winTitle = Spine.from({
            atlas: 'Prize_Win_atlas',
            skeleton: 'Prize_Win_skel',
        });
        this.winTitle.position.set(540, 1000);
        this.winTitle.skeleton.setSkinByName("Prize_01");
        this.winTitle.state.setAnimation(0, "Prize_Win_Idle", true);
        this.addChild(this.winTitle);
        

        // 創建金額顯示文字
        this.moneyText = new BaseNumber({
            baseName: 'fg_summary_alart_number',
            anchor: 0.5,
            align: 'center',
            useThousandSeparator: true
        });
        this.moneyText.position.set(540, 1250);
        this.addChild(this.moneyText);

        // 開始分段滾分動畫
        this.startStagedScrollAnimation(winAmount, bet, multiplier);
    }

    private initDefault(type:BigWinType, money:string): void {
        const bg = Spine.from({
            atlas: 'Prize_Win_Vfx_atlas',
            skeleton: 'Prize_Win_Vfx_skel',
        });
        bg.position.set(540, 900);
        bg.state.setAnimation(0, "In_"+this.getAnimationName(type), false);
        bg.state.addAnimation(0, "Idle_"+this.getAnimationName(type), true, 0);
        this.addChild(bg);        

        const winTitle = Spine.from({
            atlas: 'Prize_Win_atlas',
            skeleton: 'Prize_Win_skel',
        });
        winTitle.position.set(540, 900);
        winTitle.skeleton.setSkinByName("JP_01");
        winTitle.state.setAnimation(0, "Prize_Win_Idle", true);
        console.log('winTitle', winTitle);
        
        this.addChild(winTitle);

        const moneyText = new BaseNumber({
            baseName: 'fg_summary_alart_number',
            anchor: 0.5,
            align: 'center',
            useThousandSeparator: true
        });
        moneyText.position.set(540, 1250);
        moneyText.showText(money);
        this.addChild(moneyText);
        setTimeout(() => {
            this.destroy();
        }, 5000);
    }

    /**
     * 根據當前金額獲取對應的階段索引
     * @param currentAmount 當前金額
     * @param bet 押注金額
     */
    private getStageIndexByAmount(currentAmount: number, bet: number): number {
        const currentMultiplier = currentAmount / bet;
        
        for (let i = 0; i < BIG_WIN_STAGES.length; i++) {
            const stage = BIG_WIN_STAGES[i];
            // 檢查是否在該階段範圍內（包含最小值，不包含最大值）
            // 例如：20倍時應該屬於 Prize_02 階段（20-50）
            if (currentMultiplier >= stage.multiplierMin && currentMultiplier < stage.multiplierMax) {
                return i;
            }
        }
        // 如果超過所有階段，返回最後一個階段
        return BIG_WIN_STAGES.length - 1;
    }

    /**
     * 開始分段滾分動畫
     * @param winAmount 中獎金額
     * @param bet 押注金額
     * @param multiplier 倍數
     */
    private startStagedScrollAnimation(winAmount: number, bet: number, multiplier: number): void {
        let currentAmount = 0;
        let stageStartTime = Date.now();
        let currentStageIndex = 0;
        let stageStartAmount = 0;
        let lastSoundTime = 0; // 記錄上次播放音效的時間

        // 初始化為第一個階段
        if (this.winTitle) {
            this.winTitle.skeleton.setSkinByName(BIG_WIN_STAGES[0].skin);
        }

        // 初始化音效計時
        lastSoundTime = performance.now();

        const animate = () => {
            // 先根據當前金額判斷應該在哪個階段
            const correctStageIndex = this.getStageIndexByAmount(currentAmount, bet);
            
            // 如果階段改變了，需要切換階段
            if (correctStageIndex !== currentStageIndex) {
                currentStageIndex = correctStageIndex;
                stageStartAmount = currentAmount; // 從當前金額繼續
                stageStartTime = Date.now(); // 重置階段開始時間
                
                // 更新 skin 並播放動畫
                if (this.winTitle) {
                    const newStage = BIG_WIN_STAGES[currentStageIndex];
                    try {
                        // 設置新的 skin
                        this.winTitle.skeleton.setSkinByName(newStage.skin);
                        // 重置 slot 到 setup pose，確保新的 skin 正確顯示
                        this.winTitle.skeleton.setSlotsToSetupPose();
                        
                        // 播放動畫序列：先播放 In 動畫，然後播放 Idle 動畫
                        this.winTitle.state.setAnimation(0, "Prize_Win_In", false);
                        this.winTitle.state.addAnimation(0, "Prize_Win_Idle", true, 0);
                        
                        // 應用動畫狀態，讓新 skin 正確渲染
                        this.winTitle.state.apply(this.winTitle.skeleton);
                        console.log(`[BigWin] 切換到階段 ${currentStageIndex + 1}: ${newStage.skin}, 當前金額: ${currentAmount}, 倍數: ${(currentAmount / bet).toFixed(2)}`);
                    } catch (error) {
                        console.error(`[BigWin] 切換 skin 失敗: ${newStage.skin}`, error);
                    }
                }
            }

            // 獲取當前階段的配置
            const stage = BIG_WIN_STAGES[currentStageIndex];
            
            // 計算當前階段的目標金額（該階段的最大倍數對應的金額）
            const stageMaxMultiplier = Math.min(stage.multiplierMax, multiplier);
            const stageEndAmount = stageMaxMultiplier * bet;
            
            // 計算當前階段應該達到的金額
            const stageElapsed = (Date.now() - stageStartTime) / 1000; // 經過的秒數
            const stageScrollRate = stage.scrollRate * bet; // 每秒增加的金額
            
            // 在當前階段內滾分
            const stageProgressAmount = stageStartAmount + stageScrollRate * stageElapsed;
            
            // 更新當前金額（不能超過階段結束金額和總獲勝金額）
            currentAmount = Math.min(stageProgressAmount, stageEndAmount, winAmount);

            // 更新顯示
            if (this.moneyText) {
                this.moneyText.showText(currentAmount.toFixed(2));
            }
            
            const currentTime = performance.now();
            if (currentTime - lastSoundTime >= 200) {
                SoundManager.playSound('btm_counting');
                lastSoundTime = currentTime;
            }

            // 繼續動畫或結束
            if (currentAmount < winAmount) {
                this.scrollAnimationTimer = requestAnimationFrame(animate);
            } else {
                // 滾分完成，確保最終顯示目標金額
                if (this.moneyText) {
                    this.moneyText.showText(winAmount.toFixed(2));
                }
                
                // 播放結束動畫
                if (this.winTitle) {
                    try {
                        // 停止當前的 Idle 動畫，播放 End 動畫
                        this.winTitle.state.setAnimation(0, "Prize_Win_End", false);
                        setTimeout(() => {
                            this.destroy();
                        }, 5000);
                        console.log('[BigWin] 滾分完成，播放 Prize_Win_End 動畫');
                    } catch (error) {
                        console.error('[BigWin] 播放 End 動畫失敗:', error);
                    }
                }
            }
        };

        // 開始動畫
        this.moneyText?.showText("0");
        this.scrollAnimationTimer = requestAnimationFrame(animate);
    }

    /**
     * 跳過滾分動畫，直接顯示最終金額並播放結束動畫
     */
    public skipToEnd(): void {
        // 停止滾分動畫
        if (this.scrollAnimationTimer !== undefined) {
            cancelAnimationFrame(this.scrollAnimationTimer);
            this.scrollAnimationTimer = undefined;
        }
        
        // 直接顯示最終金額
        if (this.moneyText) {
            this.moneyText.showText(this.winAmount.toFixed(2));
        }
        
        // 根據最終金額設置正確的階段 skin
        if (this.winTitle && this.bet !== undefined) {
            const finalMultiplier = this.winAmount / this.bet;
            const finalStageIndex = this.getStageIndexByAmount(this.winAmount, this.bet);
            const finalStage = BIG_WIN_STAGES[finalStageIndex];
            
            try {
                this.winTitle.skeleton.setSkinByName(finalStage.skin);
                this.winTitle.skeleton.setSlotsToSetupPose();
            } catch (error) {
                console.error(`[BigWin] 設置最終 skin 失敗: ${finalStage.skin}`, error);
            }
        }
        
        // 播放結束動畫
        if (this.winTitle) {
            try {
                this.winTitle.state.setAnimation(0, "Prize_Win_End", false);
                setTimeout(() => {
                    this.destroy();
                }, 5000);
                console.log('[BigWin] 跳過滾分，直接播放 Prize_Win_End 動畫');
            } catch (error) {
                console.error('[BigWin] 播放 End 動畫失敗:', error);
                // 如果播放失敗，直接銷毀
                this.destroy();
            }
        } else {
            // 如果沒有 winTitle，直接銷毀
            this.destroy();
        }
    }

    destroy(): void {
        this.emit(GameEventEnum.BIG_ANIMATION_BIG_WIN_COMPLETE);
        
        // 清理動畫計時器
        if (this.scrollAnimationTimer !== undefined) {
            cancelAnimationFrame(this.scrollAnimationTimer);
        }
        super.destroy();
        return;
    }

    private getAnimationName(type:BigWinType): string {
        switch (type) {
            case BigWinType.BIG_WIN:
                return '1';
            case BigWinType.JP_WIN:
                return '3';
            default:
                return '1';
        }
    }
}