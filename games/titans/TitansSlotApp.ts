import { SlotMachineApp, SlotMachineAppConfig } from '@/SlotMachineApp';
import { TitansSlotModel, TitansSlotConfig } from './models/TitansSlotModel';
import { TitansSlotView } from './views/TitansSlotView';
import { TitansSlotController } from './controllers/TitansSlotController';

// Titans 拉霸應用程式配置
export interface TitansSlotAppConfig extends SlotMachineAppConfig {
  TitansConfig: TitansSlotConfig;
}

// Titans 拉霸應用程式
export class TitansSlotApp extends SlotMachineApp {
  private TitansModel: TitansSlotModel;
  private TitansView: TitansSlotView;
  private TitansController: TitansSlotController;

  constructor(config: TitansSlotAppConfig) {
    super(config);

    // 創建 Titans 拉霸特定的組件
    this.TitansModel = new TitansSlotModel(config.TitansConfig);
    this.TitansView = new TitansSlotView(this.getPixiApp());
    this.TitansController = new TitansSlotController(this.TitansModel, this.TitansView);

    console.log('⚡ Titans 拉霸應用程式已創建');
  }

  // 重寫初始化方法
  async initialize(): Promise<void> {
    try {
      // 先初始化底層
      await super.initialize();

      // 初始化 Titans 拉霸特定組件
      await this.TitansController.initialize();

      // 將視圖添加到舞台
      this.getPixiApp().stage.addChild(this.TitansView);

      console.log('⚡ Titans 拉霸應用程式初始化完成');
      console.log('🎮 餘額:', this.TitansModel.getBalance());
      console.log('💰 投注:', this.TitansModel.getCurrentBet());

    } catch (error) {
      console.error('❌ Titans 拉霸初始化失敗:', error);
      throw error;
    }
  }

  // 重寫更新方法
  protected update(deltaTime: number): void {
    super.update(deltaTime);
    this.TitansController.update(deltaTime);
  }

  // 重寫開始方法
  override start(): void {
    super.start();
    console.log('🎮 Titans 拉霸遊戲開始！');
  }

  // 重寫停止方法
  override stop(): void {
    super.stop();
    console.log('⏸️  Titans 拉霸遊戲暫停');
  }

  // 重寫銷毀方法
  override destroy(): void {
    console.log('🗑️  銷毀 Titans 拉霸組件...');
    this.TitansController.destroy();
    super.destroy();
    console.log('✅ Titans 拉霸應用程式已銷毀');
  }

  // ==================== 公開 API ====================

  // 重寫旋轉方法
  override spin(): void {
    this.TitansController.spin();
  }

  // 重寫設置投注方法
  override setBet(amount: number): void {
    this.TitansController.setBet(amount);
  }

  // 重寫獲取餘額方法
  override getBalance(): number {
    return this.TitansController.getBalance();
  }

  // ==================== Titans 拉霸特定方法 ====================

  // 觸發 Bonus 功能
  public triggerBonus(bonusType: string): void {
    this.TitansModel.triggerBonusFeature(bonusType);
  }

  // 獲取免費旋轉次數
  public getFreeSpinsRemaining(): number {
    return this.TitansModel.getFreeSpinsRemaining();
  }

  // 檢查是否在免費旋轉模式
  public isInFreeSpinsMode(): boolean {
    return this.TitansModel.isInFreeSpinsMode();
  }

  // 增加餘額（測試用）
  public addBalance(amount: number): void {
    this.TitansController.addBalance(amount);
  }

  // 獲取 Titans 配置
  public getTitansConfig(): TitansSlotConfig {
    return this.TitansModel.getTitansConfig();
  }

  // 重設遊戲
  public resetGame(): void {
    this.TitansModel.reset();
    console.log('🔄 遊戲已重設');
  }

  // ==================== 獲取器方法 ====================

  public getTitansModel(): TitansSlotModel {
    return this.TitansModel;
  }

  public getTitansView(): TitansSlotView {
    return this.TitansView;
  }

  public getTitansController(): TitansSlotController {
    return this.TitansController;
  }
}

