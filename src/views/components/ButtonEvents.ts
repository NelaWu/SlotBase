/**
 * 按鈕事件枚舉
 * 定義所有按鈕相關的事件類型
 */
export enum ButtonEvent {
  /** 按鈕被點擊 */
  BUTTON_CLICKED = 'buttonClicked',
  /** 按鈕按下 */
  BUTTON_DOWN = 'buttonDown',
  /** 鼠標移入按鈕 */
  BUTTON_OVER = 'buttonOver',
  /** 鼠標移出按鈕 */
  BUTTON_OUT = 'buttonOut',
  /** 按鈕啟用狀態改變 */
  ENABLED_CHANGED = 'enabledChanged',
  /** 開關狀態改變（僅在 isToggle 為 true 時觸發） */
  TOGGLE_CHANGED = 'toggleChanged',
}

/**
 * 按鈕狀態枚舉
 */
export enum ButtonState {
  /** 正常狀態 */
  NORMAL = 'normal',
  /** 懸停狀態 */
  HOVER = 'hover',
  /** 按下狀態 */
  PRESSED = 'pressed',
  /** 禁用狀態 */
  DISABLED = 'disabled',
}

