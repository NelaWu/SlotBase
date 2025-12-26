// 拉霸機狀態常數
export const SLOT_STATES = {
  LOADING: 'loading',          // 載入中
  IDLE: 'idle',                // 待機
  SPINNING: 'spinning',        // 轉動中
  STOPPING: 'stopping',        // 停止中
  RESULT: 'result',            // 顯示結果
  CELEBRATE: 'celebrate',      // 慶祝動畫
  ERROR: 'error'               // 錯誤狀態
} as const;

export type SlotState = typeof SLOT_STATES[keyof typeof SLOT_STATES];

// 拉霸機事件
export const SLOT_EVENTS = {
  ASSETS_LOADED: 'assetsLoaded',
  SPIN_START: 'spinStart',
  SPIN_STOP: 'spinStop',
  REELS_STOPPED: 'reelsStopped',
  RESULT_CALCULATED: 'resultCalculated',
  CELEBRATION_COMPLETE: 'celebrationComplete',
  ERROR_OCCURRED: 'errorOccurred',
  RETRY: 'retry'
} as const;

export type SlotEvent = typeof SLOT_EVENTS[keyof typeof SLOT_EVENTS];

// 拉霸機狀態配置介面
export interface SlotMachineConfig {
  autoSpinDelay?: number;      // 自動轉動延遲（毫秒）
  spinDuration?: number;       // 轉動持續時間（毫秒）
  celebrationDuration?: number; // 慶祝動畫持續時間（毫秒）
  errorRetryDelay?: number;    // 錯誤重試延遲（毫秒）
}

// 拉霸機狀態資料
export interface SlotStateData {
  isSpinning: boolean;
  betList: number[];
  lastResult?: any;
  currentBet?: number;
  balance?: number;
  error?: string;
  loadingProgress?: number;
} 