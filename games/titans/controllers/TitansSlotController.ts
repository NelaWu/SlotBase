import { BaseController } from '@controllers/BaseController';
import { TitansSlotModel, TitansSlotResult } from '../models/TitansSlotModel';
import { TitansSlotView } from '../views/TitansSlotView';

export class TitansSlotController extends BaseController {
  protected declare model: TitansSlotModel;
  protected declare view: TitansSlotView;

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
  }

  // 解綁 View 事件
  protected unbindViewEvents(): void {
    this.view.off('spinButtonClicked', this.onSpinButtonClicked.bind(this));
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
    this.view.startSpinAnimation();
  }

  private onSpinCompleted(result: TitansSlotResult): void {
    this.log('旋轉完成', result);
    
    // 停止旋轉動畫，並在清空完成後執行後續邏輯
    this.view.stopSpinAnimation(result.reels, () => {
      // 牌面清空完成後執行這些邏輯
      this.executeAfterClearComplete(result);
    });
  }

  /**
   * 在牌面清空完成後執行的邏輯
   */
  private executeAfterClearComplete(result: TitansSlotResult): void {
    console.log('executeAfterClearComplete',result);
    
    // 更新獲勝金額顯示
    this.view.updateWinAmount(result.totalWin);

    // 如果有獲勝，播放動畫
    if (result.winLineInfos && result.winLineInfos.length > 0) {
      setTimeout(() => {
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
}

