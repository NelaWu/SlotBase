import { SlotMachineModel, SpinResult } from '@models/SlotMachineModel';
import { SlotMachineConfig } from '@core/SlotMachineStates';

// Titans 拉霸特定配置
export interface TitansSlotConfig extends SlotMachineConfig {
  TitansTypes: string[];
  bonusThreshold: number;
  jackpotMultiplier: number;
}

// 獲勝連線信息
export interface WinLineInfo {
  LineNo: number;
  SymbolID: number;
  SymbolType: number;
  SymbolCount: number;
  WayCount: number;
  WinPosition: number[][]; // [reelIndex, symbolIndex]
  Multiplier: number;
  WinOrg: number;
  Win: number;
  WinType: number;
  Odds: number;
}

// 服務器返回的 SpinInfo 結構
export interface ServerSpinInfo {
  GameStateType: number;
  GameState: number;
  WinType: number;
  Multiplier: number;
  ScreenOrg: number[][];
  SymbolResult: number[][];
  ScreenOutput: number[][];
  WinLineInfos: WinLineInfo[];
  FGTotalTimes: number;
  FGCurrentTimes: number;
  FGRemainTimes: number;
  FGMaxFlag: boolean;
  RndNum: number[];
  Win: number;
  ExtraData: string;
  Stage: number;
  Collection: number;
  DemoModeRound: number;
}

// Titans 拉霸結果
export interface TitansSlotResult extends SpinResult {
  bonusFeature?: string;
  freeSpins?: number;
  jackpotWon?: boolean;
  winLineInfos?: WinLineInfo[]; // 詳細的獲勝連線信息
  // 服務器原始數據
  serverSpinInfo?: ServerSpinInfo; // 完整的服務器 SpinInfo 數據
  gameStateType?: number; // GameStateType
  gameState?: number; // GameState
  winType?: number; // WinType
  screenOrg?: number[][]; // ScreenOrg
  screenOutput?: number[][]; // ScreenOutput
  fgTotalTimes?: number; // FGTotalTimes
  fgCurrentTimes?: number; // FGCurrentTimes
  fgRemainTimes?: number; // FGRemainTimes
  fgMaxFlag?: boolean; // FGMaxFlag
  rndNum?: number[]; // RndNum
  extraData?: string; // ExtraData
  stage?: number; // Stage
  collection?: number; // Collection
  demoModeRound?: number; // DemoModeRound
}

// Titans 拉霸 Model
export class TitansSlotModel extends SlotMachineModel {
  private TitansConfig: TitansSlotConfig;
  private freeSpinsRemaining: number = 0;

  constructor(config: TitansSlotConfig) {
    super(config);
    this.TitansConfig = {
      TitansTypes: ['titan1', 'titan2', 'titan3', 'titan4', 'titan5'],
      bonusThreshold: 3,
      jackpotMultiplier: 100,
      ...config
    };
  }

  async initialize(): Promise<void> {
    await super.initialize();
    console.log('⚡ Titans 拉霸 Model 初始化完成');
    this.emit('TitansSlotInitialized', this.TitansConfig);
  }

  // 觸發 Bonus 功能
  triggerBonusFeature(bonusType: string): void {
    console.log('觸發 Bonus 功能:', bonusType);
    
    switch (bonusType) {
      case 'freeSpins':
        this.freeSpinsRemaining = 10;
        this.emit('freeSpinsAwarded', 10);
        break;
      case 'jackpot':
        this.emit('jackpotTriggered');
        break;
      default:
        this.emit('bonusTriggered', bonusType);
    }
  }

  // 計算 Titans 獲勝
  calculateTitansWin(symbols: string[][]): number {
    let totalWin = 0;

    // 簡單的計算邏輯：相同符號連線
    for (const row of symbols) {
      const uniqueSymbols = new Set(row);
      if (uniqueSymbols.size === 1) {
        // 所有符號相同
        totalWin += this.getCurrentBet() * 10;
      } else if (uniqueSymbols.size === 2) {
        // 兩種符號
        totalWin += this.getCurrentBet() * 2;
      }
    }

    return totalWin;
  }

  // 檢查是否觸發 Bonus
  checkBonusCondition(symbols: string[][]): string | null {
    const flatSymbols = symbols.flat();
    const symbolCounts = new Map<string, number>();

    // 計算每個符號的數量
    for (const symbol of flatSymbols) {
      symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
    }

    // 檢查是否有符號達到 Bonus 門檻
    for (const [symbol, count] of symbolCounts.entries()) {
      if (count >= this.TitansConfig.bonusThreshold) {
        return symbol === 'cherry' ? 'freeSpins' : 'bonusGame';
      }
    }

    return null;
  }

  override setSpinResult(result: TitansSlotResult): void {
    super.setSpinResult(result);

    // 處理 Titans 拉霸特定的結果
    if (result.bonusFeature) {
      this.triggerBonusFeature(result.bonusFeature);
    }

    if (result.jackpotWon) {
      const jackpotAmount = this.getCurrentBet() * this.TitansConfig.jackpotMultiplier;
      this.setBalance(this.getBalance() + jackpotAmount);
      this.emit('jackpotWon', jackpotAmount);
    }

    if (result.freeSpins) {
      this.freeSpinsRemaining += result.freeSpins;
    }
  }

  // 獲取剩餘免費旋轉次數
  getFreeSpinsRemaining(): number {
    return this.freeSpinsRemaining;
  }

  // 使用一次免費旋轉
  useFreeSpins(): void {
    if (this.freeSpinsRemaining > 0) {
      this.freeSpinsRemaining--;
      this.emit('freeSpinsUsed', this.freeSpinsRemaining);
    }
  }

  // 檢查是否在免費旋轉模式
  isInFreeSpinsMode(): boolean {
    return this.freeSpinsRemaining > 0;
  }

  // 重寫開始轉動（考慮免費旋轉）
  override startSpin(): void {
    if (this.isInFreeSpinsMode()) {
      // 免費旋轉不扣除餘額
      this.useFreeSpins();
      this.emit('spinStarted');
    } else {
      super.startSpin();
    }
  }

  // 獲取 Titans 配置
  getTitansConfig(): TitansSlotConfig {
    return { ...this.TitansConfig };
  }

  // 重設遊戲狀態
  override reset(): void {
    super.reset();
    this.freeSpinsRemaining = 0;
    this.emit('gameReset');
  }
}

