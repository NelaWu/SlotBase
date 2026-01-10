import { BaseController } from '@controllers/BaseController';
import { TitansSlotModel, TitansSlotResult } from '../models/TitansSlotModel';
import { TitansSlotView } from '../views/TitansSlotView';
import { GameEventEnum } from '../enum/gameEnum';

export class TitansSlotController extends BaseController {
  protected declare model: TitansSlotModel;
  protected declare view: TitansSlotView;

  // 自動旋轉相關
  private isAutoSpinEnabled: boolean = false;
  private isTurboEnabled: boolean = false;
  private winAnimationPlayCount: number = 0;
  private winAnimationTimer?: NodeJS.Timeout;
  private readonly WIN_ANIMATION_DURATION = 2000; // 每次獲勝動畫循環的持續時間(毫秒)
  private readonly WIN_ANIMATION_PLAY_COUNT = 2; // 需要播放的次數

  // 【新增】連鎖 Spin 相關
  private isProcessingCascade: boolean = false; // 是否正在處理連鎖
  private winAnimationCompleteCallback?: () => void; // 獲勝動畫完成回調

  constructor(model: TitansSlotModel, view: TitansSlotView) {
    super(model, view);
  }

  // 綁定 Model 事件
  protected bindModelEvents(): void {
    this.model.on('spinStarted', this.onSpinStarted.bind(this));
    this.model.on('spinCompleted', this.onSpinCompleted.bind(this));
    this.model.on('balanceChanged', this.onBalanceChanged.bind(this));
    this.model.on('betChanged', this.onBetChanged.bind(this));
    this.model.on('bonusTriggered', this.onBonusTriggered.bind(this));
    this.model.on('freeSpinsAwarded', this.onFreeSpinsAwarded.bind(this));
    this.model.on('freeSpinsUsed', this.onFreeSpinsUsed.bind(this));
    this.model.on('jackpotWon', this.onJackpotWon.bind(this));
    this.model.on('error', this.onError.bind(this));
  }

  // 解綁 Model 事件
  protected unbindModelEvents(): void {
    this.model.off('spinStarted', this.onSpinStarted.bind(this));
    this.model.off('spinCompleted', this.onSpinCompleted.bind(this));
    this.model.off('balanceChanged', this.onBalanceChanged.bind(this));
    this.model.off('betChanged', this.onBetChanged.bind(this));
    this.model.off('bonusTriggered', this.onBonusTriggered.bind(this));
    this.model.off('freeSpinsAwarded', this.onFreeSpinsAwarded.bind(this));
    this.model.off('freeSpinsUsed', this.onFreeSpinsUsed.bind(this));
    this.model.off('jackpotWon', this.onJackpotWon.bind(this));
    this.model.off('error', this.onError.bind(this));
  }

  // 綁定 View 事件
  protected bindViewEvents(): void {
    this.view.on('spinButtonClicked', this.onSpinButtonClicked.bind(this));
    this.view.on('autoButtonClicked', this.onAutoButtonClicked.bind(this));
    this.view.on('turboButtonClicked', this.onTurboButtonClicked.bind(this));
  }

  // 解綁 View 事件
  protected unbindViewEvents(): void {
    this.view.off('spinButtonClicked', this.onSpinButtonClicked.bind(this));
    this.view.off('autoButtonClicked', this.onAutoButtonClicked.bind(this));
    this.view.off('turboButtonClicked', this.onTurboButtonClicked.bind(this));
  }

  // 初始化後更新顯示
  async initialize(): Promise<void> {
    await super.initialize();

    // 初始化顯示
    this.view.updateBalance(this.model.getBalance());
    this.view.updateBet(this.model.getCurrentBet());
    this.view.updateFreeSpins(this.model.getFreeSpinsRemaining());

    this.log('Titans 拉霸 Controller 初始化完成');
  }

  // ==================== Model 事件處理 ====================

  private onSpinStarted(): void {
    this.log('開始旋轉');
    this.view.startSpinAnimation(this.isTurboEnabled);
  }

  /**
   * 旋轉完成 - 主要流程入口
   */
  private onSpinCompleted(result: TitansSlotResult): void {
    this.log('旋轉完成', result);

    // 停止旋轉動畫，並在清空完成後執行後續邏輯
    this.view.stopSpinAnimation(
      result.reels,
      () => {
        // 牌面清空完成後執行這些邏輯
        this.executeAfterClearComplete(result);
      },
      async () => {
        // 符號掉落完成後的回調 - 開始處理獲勝和連鎖
        await this.executeAfterDropComplete(result);
      },
      this.isTurboEnabled
    );
  }

  /**
   * 在牌面清空完成後執行的邏輯
   */
  private executeAfterClearComplete(result: TitansSlotResult): void {
    console.log('executeAfterClearComplete', result);

    //to do 改為動畫加總？或是動畫表演完再出現
    // 更新獲勝金額顯示
    this.view.updateWinAmount(result.totalWin);

    // 檢查是否有倍數球(ID > 50)，如果有則播放倍數球動畫
    const hasMultiBall = result.reels.some(col => col.some(symbolId => symbolId > 50));
    if (hasMultiBall) {
      this.view.playMultiBallAnimation();
    }

    // 【保留】在這裡播放獲勝動畫（延遲 1 秒）
    if (result.winLineInfos && result.winLineInfos.length > 0) {
      setTimeout(() => {
        this.log('🎯 播放獲勝動畫');
        this.view.playWinAnimation(result.winLineInfos!);
      }, 1000);
    }

    // 檢查並處理 Bonus
    if (result.bonusFeature) {
      setTimeout(() => {
        this.handleBonusFeature(result.bonusFeature!);
      }, 0);
    }
  }

  /**
   * 【修改】在符號掉落完成後執行的邏輯 - 處理獲勝和連鎖
   */
  private async executeAfterDropComplete(result: TitansSlotResult): Promise<void> {
    console.log('executeAfterDropComplete - 符號掉落完成', result);

    // 標記開始處理連鎖
    this.isProcessingCascade = true;

    try {
      // 處理當前結果的獲勝動畫和連鎖
      await this.processWinAndCascade(result);

      // 連鎖處理完成
      this.isProcessingCascade = false;
      this.log('✅ 所有連鎖處理完成');

      // 根據是否為自動模式決定後續動作
      if (this.isAutoSpinEnabled) {
        // 自動模式：觸發下一次旋轉
        this.triggerAutoSpin();
      } else {
        // 手動模式：檢查 big win（如果需要）
        // const isBigWin = result.totalWin / this.model.getCurrentBet() > 20;
        // if (isBigWin) {
        //   this.view.showBigWin(result.totalWin, this.model.getCurrentBet());
        // }
      }
    } catch (error) {
      console.error('處理連鎖時發生錯誤:', error);
      this.isProcessingCascade = false;
    }
  }

  /**
   * 【新增】處理 respin 結果（不清空盤面，直接處理獲勝檢查）
   */
  public async handleRespinResult(result: TitansSlotResult): Promise<void> {
    console.log('🔄 handleRespinResult - 處理 respin 結果（不清空盤面）', result);

    // 標記開始處理連鎖
    this.isProcessingCascade = true;

    try {
      const hasWin = result.winLineInfos && result.winLineInfos.length > 0;

      // 1. 播放獲勝動畫並等待完成（如果有獲勝）
      if (hasWin) {
        this.log('🎯 播放獲勝動畫');
        this.view.playWinAnimation(result.winLineInfos!);

        this.log('⏳ 等待獲勝動畫播放完成');
        await this.waitForWinAnimationComplete();

        // 2. 消除得獎符號並等待動畫完成
        this.log('🗑️ 消除得獎符號');
        await this.removeWinSymbolsAndWait();
      }

      // 3. 檢查是否需要連鎖（WaitNGRespin）
      // 如果 WaitNGRespin 為 true，需要發送下一次 respin 請求（11002）
      if (result.WaitNGRespin) {
        this.log('🔄 檢測到 WaitNGRespin=true，發送下一次 respin 請求（11002）');
        // 通過 App 發送 WebSocket 請求（因為 Controller 沒有直接訪問 WebSocket 的權限）
        // 這裡需要通過事件或回調來發送請求
        // 暫時先記錄日誌，實際發送請求應該在 App 層處理
        this.log('⚠️  需要在 App 層發送 11002 請求');
      } else {
        this.log('✅ WaitNGRespin=false，respin 流程結束');
      }

      // 連鎖處理完成
      this.isProcessingCascade = false;
      this.log('✅ respin 連鎖處理完成');

      // 根據是否為自動模式決定後續動作
      if (this.isAutoSpinEnabled) {
        // 自動模式：觸發下一次旋轉
        this.triggerAutoSpin();
      }
    } catch (error) {
      console.error('處理 respin 連鎖時發生錯誤:', error);
      this.isProcessingCascade = false;
    }
  }

  /**
   * 【修改】處理獲勝動畫和連鎖邏輯（遞迴）
   */
  private async processWinAndCascade(result: TitansSlotResult): Promise<void> {
    const hasWin = result.winLineInfos && result.winLineInfos.length > 0;

    // 1. 等待獲勝動畫播放完成（如果有獲勝）
    if (hasWin) {
      this.log('⏳ 等待獲勝動畫播放完成');
      await this.waitForWinAnimationComplete();

      // 2. 消除得獎符號並等待動畫完成
      this.log('🗑️ 消除得獎符號');
      await this.removeWinSymbolsAndWait();
    }

    // 3. 檢查是否需要連鎖（WaitNGRespin）
    if (result.WaitNGRespin) {
      this.log('🔄 檢測到 WaitNGRespin=true，開始連鎖 Spin');
      await this.processCascadeSpin();
    } else {
      this.log('✅ WaitNGRespin=false，本輪結束');
    }
  }

  /**
   * 【新增】處理連鎖 Spin（WaitNGRespin=true）
   */
  private async processCascadeSpin(): Promise<void> {
    // 發送連鎖 Spin 請求
    const cascadeResult = await this.model.requestCascadeSpin();

    if (!cascadeResult) {
      this.log('❌ 連鎖 Spin 請求失敗');
      return;
    }

    this.log('📦 連鎖 Spin 結果:', cascadeResult, cascadeResult.totalWin);

    // 更新累計獲勝金額
    this.view.updateWinAmount(cascadeResult.totalWin);

    // 補充新符號到空位
    await this.fillNewSymbolsAndWait(cascadeResult.newSymbols || cascadeResult.reels);

    // 播放獲勝動畫（如果連鎖有中獎）
    if (cascadeResult.winLineInfos && cascadeResult.winLineInfos.length > 0) {
      this.log('🎯 連鎖中獎，播放獲勝動畫');
      this.view.playWinAnimation(cascadeResult.winLineInfos);
    }

    // 遞迴處理新的獲勝和連鎖
    await this.processWinAndCascade(cascadeResult);
  }

  /**
   * 【修改】等待獲勝動畫播放完成 - 使用真實的動畫完成事件
   */
  private waitForWinAnimationComplete(): Promise<void> {
    return new Promise((resolve) => {
      // 設置回調，當所有獲勝動畫播放完成時會被觸發
      this.winAnimationCompleteCallback = () => {
        this.log('✅ 獲勝動畫播放完成');
        this.winAnimationCompleteCallback = undefined;
        resolve();
      };

      // 當 resolve 時清除超時
      this.winAnimationCompleteCallback = () => {
        this.log('✅ 獲勝動畫播放完成');
        this.winAnimationCompleteCallback = undefined;
        resolve();
      };
    });
  }

  /**
   * 【新增】消除得獎符號並等待動畫完成
   */
  private removeWinSymbolsAndWait(): Promise<void> {
    return new Promise((resolve) => {
      const wheel = this.view.getMainGame().wheel;

      // 保存原有的回調（如果有的話）
      const existingCallback = (wheel as any).removeWinCompleteCallback;

      // 設置消除完成回調（會先執行原有回調，然後 resolve）
      wheel.setOnRemoveWinComplete(() => {
        this.log('✅ 得獎符號消除完成');
        // 如果原有回調存在，先執行它（用於發送 11002）
        // 注意：原有回調執行後會被清除，所以我們需要在執行前保存
        if (existingCallback) {
          try {
            existingCallback();
          } catch (error) {
            console.error('執行原有 removeWinCompleteCallback 時發生錯誤:', error);
          }
        }
        resolve();
      });

      // playWinAnimations 已經在內部會自動觸發 removeWinSymbols
      // 所以這裡只需要等待回調即可
    });
  }

  /**
   * 【新增】補充新符號並等待掉落完成
   */
  private fillNewSymbolsAndWait(symbolIds: number[][]): Promise<void> {
    return new Promise((resolve) => {
      const wheel = this.view.getMainGame().wheel;
      const fastDrop = this.isTurboEnabled;

      this.log('📥 開始補充新符號:', symbolIds);

      wheel.fillNewSymbols(
        symbolIds,
        () => {
          this.log('✅ 新符號補充並掉落完成');
          resolve();
        },
        fastDrop
      );
    });
  }

  /**
   * 開始獲勝動畫計時器（播放兩次後檢查 big win 並觸發自動旋轉）
   */
  private startWinAnimationTimer(result: TitansSlotResult): void {
    // 清除之前的計時器
    if (this.winAnimationTimer) {
      clearTimeout(this.winAnimationTimer);
    }

    // 重置計數器
    this.winAnimationPlayCount = 0;

    // 設置計時器，每 WIN_ANIMATION_DURATION 毫秒增加一次計數
    const checkAnimation = () => {
      this.winAnimationPlayCount++;
      this.log(`獲勝動畫播放次數: ${this.winAnimationPlayCount}/${this.WIN_ANIMATION_PLAY_COUNT}`);

      if (this.winAnimationPlayCount >= this.WIN_ANIMATION_PLAY_COUNT) {
        // 播放次數達到要求，檢查是否需要播放 big win
        this.log('獲勝動畫播放完成，檢查 big win 條件');
        this.checkAndPlayBigWin(result);
      } else {
        // 繼續計時
        this.winAnimationTimer = setTimeout(checkAnimation, this.WIN_ANIMATION_DURATION);
      }
    };

    // 第一次檢查延遲 WIN_ANIMATION_DURATION 毫秒
    this.winAnimationTimer = setTimeout(checkAnimation, this.WIN_ANIMATION_DURATION);
  }

  /**
   * 檢查並播放 big win 動畫（如果達成條件）
   */
  private checkAndPlayBigWin(result: TitansSlotResult): void {
    // 檢查 big win 條件：totalWin / bet > 20
    const bet = this.model.getCurrentBet();
    const isBigWin = bet > 0 && result.totalWin / bet > 20;

    // if (isBigWin) {
    //   this.log(`達成 Big Win 條件！獲勝金額: ${result.totalWin}, 投注: ${bet}, 倍數: ${result.totalWin / bet}`);
    //   
    //   const mainGame = this.view.getMainGame();
    //   const bigWinInstance = mainGame.bigAnimationManager.showBigWin(result.totalWin.toString(), bet);
    //   
    //   bigWinInstance.once(GameEventEnum.BIG_ANIMATION_BIG_WIN_COMPLETE, () => {
    //     this.log('Big Win 動畫播放完成，觸發自動旋轉');
    //     this.triggerAutoSpin();
    //   });
    // } else {
    this.log('未達成 Big Win 條件，直接觸發自動旋轉');
    this.triggerAutoSpin();
    // }
  }

  /**
   * 觸發自動旋轉
   */
  private triggerAutoSpin(): void {
    // 清除獲勝動畫計時器
    if (this.winAnimationTimer) {
      clearTimeout(this.winAnimationTimer);
      this.winAnimationTimer = undefined;
    }

    // 隱藏獲勝動畫
    this.view.hideWinAnimations();

    // 檢查是否可以旋轉
    if (this.model.canSpin() || this.model.isInFreeSpinsMode()) {
      // 稍微延遲後自動旋轉，確保動畫完全結束
      setTimeout(() => {
        this.log('自動旋轉觸發');
        this.model.startSpin();
      }, 500);
    } else {
      // 無法旋轉，關閉自動旋轉
      this.log('無法自動旋轉，關閉自動旋轉模式');
      this.setAutoSpinEnabled(false);
    }
  }

  private onBalanceChanged(newBalance: number): void {
    this.log('餘額變更:', newBalance);
    this.view.updateBalance(newBalance);
  }

  private onBetChanged(newBet: number): void {
    this.log('投注變更:', newBet);
    this.view.updateBet(newBet);
  }

  private onBonusTriggered(bonusType: string): void {
    this.log('觸發 Bonus:', bonusType);
    this.view.showBonusMessage(`${bonusType.toUpperCase()} BONUS!`);
  }

  private onFreeSpinsAwarded(count: number): void {
    this.log('獲得免費旋轉:', count);
    this.view.updateFreeSpins(count);
    this.view.showBonusMessage(`獲得 ${count} 次免費旋轉！`);
  }

  private onFreeSpinsUsed(remaining: number): void {
    this.log('使用免費旋轉，剩餘:', remaining);
    this.view.updateFreeSpins(remaining);
  }

  private onJackpotWon(amount: number): void {
    this.log('中大獎！金額:', amount);
    this.view.showBonusMessage(`🎉 JACKPOT! $${amount} 🎉`);
  }

  private onError(error: string): void {
    this.handleError(error);
    this.view.setSpinButtonEnabled(true);
  }

  // ==================== View 事件處理 ====================

  private onSpinButtonClicked(): void {
    // 如果自動旋轉已啟用，手動點擊旋轉按鈕時關閉自動旋轉
    if (this.isAutoSpinEnabled) {
      this.setAutoSpinEnabled(false);
      this.log('手動旋轉：已關閉自動旋轉模式');
      return;
    }

    // 【新增】如果正在處理連鎖，禁止手動旋轉
    if (this.isProcessingCascade) {
      this.log('正在處理連鎖中，無法手動旋轉');
      return;
    }

    if (this.model.canSpin()) {
      this.model.startSpin();
    } else {
      if (this.model.getBalance() < this.model.getCurrentBet()) {
        this.handleError('餘額不足');
      } else {
        this.handleError('無法開始旋轉');
      }
    }
  }

  private onAutoButtonClicked(): void {
    // 【新增】如果正在處理連鎖，禁止切換自動模式
    if (this.isProcessingCascade) {
      this.log('正在處理連鎖中，無法切換自動模式');
      return;
    }

    // 切換自動旋轉狀態
    this.setAutoSpinEnabled(!this.isAutoSpinEnabled);
  }

  private onTurboButtonClicked(): void {
    this.isTurboEnabled = !this.isTurboEnabled;
    this.log(`Turbo 模式: ${this.isTurboEnabled ? '開啟' : '關閉'}`);
  }

  /**
   * 設置自動旋轉狀態
   */
  private setAutoSpinEnabled(enabled: boolean): void {
    this.isAutoSpinEnabled = enabled;

    if (enabled) {
      this.log('自動旋轉已啟用');
      // 如果當前可以旋轉，立即開始第一次自動旋轉
      if (this.model.canSpin() || this.model.isInFreeSpinsMode()) {
        setTimeout(() => {
          this.log('自動旋轉：開始第一次旋轉');
          this.model.startSpin();
        }, 300);
      }
    } else {
      this.log('自動旋轉已關閉');
      // 清除計時器
      if (this.winAnimationTimer) {
        clearTimeout(this.winAnimationTimer);
        this.winAnimationTimer = undefined;
      }
    }
  }

  // ==================== 輔助方法 ====================

  // 處理 Bonus 功能
  private handleBonusFeature(bonusType: string): void {
    switch (bonusType) {
      case 'freeSpins':
        this.log('進入免費旋轉模式');
        break;
      case 'jackpot':
        this.log('觸發大獎！');
        break;
      default:
        this.log('觸發特殊 Bonus:', bonusType);
    }
  }

  // ==================== 公開方法 ====================

  /**
   * 【新增】當所有符號的獲勝動畫播放完成時由 Wheel 呼叫
   */
  public onAllWinAnimationsComplete(): void {
    if (this.winAnimationCompleteCallback) {
      this.winAnimationCompleteCallback();
    }
  }

  // 開始旋轉
  public spin(): void {
    if (this.model.canSpin() || this.model.isInFreeSpinsMode()) {
      this.model.startSpin();
    } else {
      this.log('無法開始旋轉');
    }
  }

  // 設置投注金額
  public setBet(amount: number): void {
    this.model.setBet(amount);
  }

  // 獲取當前餘額
  public getBalance(): number {
    return this.model.getBalance();
  }

  // 增加餘額（測試用）
  public addBalance(amount: number): void {
    const newBalance = this.model.getBalance() + amount;
    this.model.setBalance(newBalance);
  }

  // 觸發測試 Bonus
  public triggerTestBonus(bonusType: string): void {
    this.model.triggerBonusFeature(bonusType);
  }

  // 獲取自動旋轉狀態
  public getAutoSpinEnabled(): boolean {
    return this.isAutoSpinEnabled;
  }

  public getTurboEnabled(): boolean {
    return this.isTurboEnabled;
  }

  // 設置自動旋轉狀態（公開方法）
  public setAutoSpin(enabled: boolean): void {
    this.setAutoSpinEnabled(enabled);
  }
}