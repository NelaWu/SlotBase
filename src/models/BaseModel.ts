// 基礎 Model 類別
export type EventCallback = (...args: any[]) => void;

export abstract class BaseModel {
  private eventListeners: Map<string, EventCallback[]> = new Map();

  constructor() {}

  // 添加事件監聽器
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // 移除事件監聽器
  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 移除所有事件監聽器
  removeAllListeners(event?: string): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  // 觸發事件
  protected emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }

  // 檢查是否有監聽器
  hasListeners(event: string): boolean {
    const listeners = this.eventListeners.get(event);
    return listeners ? listeners.length > 0 : false;
  }

  // 獲取事件監聽器數量
  getListenerCount(event: string): number {
    const listeners = this.eventListeners.get(event);
    return listeners ? listeners.length : 0;
  }

  // 抽象方法 - 子類必須實現
  abstract initialize(): Promise<void>;
  abstract destroy(): void;
} 