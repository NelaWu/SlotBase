/**
 * WebSocket 連接狀態
 */
export enum WebSocketStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * WebSocket 配置
 */
export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number; // 重連間隔（毫秒）
  maxReconnectAttempts?: number; // 最大重連次數，-1 表示無限重連
  heartbeatInterval?: number; // 心跳間隔（毫秒），0 表示不發送心跳
  heartbeatMessage?: string; // 心跳消息內容
  autoReconnect?: boolean; // 是否自動重連
}

/**
 * WebSocket 事件類型
 */
export enum WebSocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  MESSAGE = 'message',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  RECONNECT_FAILED = 'reconnect_failed'
}

/**
 * 事件監聽器類型
 */
type EventListener = (...args: any[]) => void;

/**
 * WebSocket 管理器
 * 使用單例模式管理 WebSocket 連接
 */
export class WebSocketManager {
  private eventListeners: Map<string, EventListener[]> = new Map();
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private status: WebSocketStatus = WebSocketStatus.DISCONNECTED;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private messageQueue: any[] = []; // 消息隊列，用於在連接前暫存消息

  private constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: -1, // 預設無限重連
      heartbeatInterval: 30000, // 30秒心跳
      heartbeatMessage: JSON.stringify({ type: 'ping' }),
      autoReconnect: true,
      ...config
    };
  }

  /**
   * 獲取單例實例
   */
  static getInstance(config?: WebSocketConfig): WebSocketManager {
    if (!WebSocketManager.instance && config) {
      WebSocketManager.instance = new WebSocketManager(config);
    }
    if (!WebSocketManager.instance) {
      throw new Error('WebSocket 管理器尚未初始化，請先提供配置');
    }
    return WebSocketManager.instance;
  }

  /**
   * 連接 WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.status === WebSocketStatus.CONNECTING) {
        // 如果正在連接中，等待連接完成
        this.once(WebSocketEvent.CONNECT, () => resolve());
        this.once(WebSocketEvent.ERROR, () => reject(new Error('連接失敗')));
        return;
      }

      this.setStatus(WebSocketStatus.CONNECTING);
      this.reconnectAttempts = 0;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.setStatus(WebSocketStatus.CONNECTED);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          this.emit(WebSocketEvent.CONNECT);
          resolve();
          console.log('[WebSocket] 連接成功');
        };

        this.ws.onmessage = (event) => {
          try {
            const data = typeof event.data === 'string' 
              ? JSON.parse(event.data) 
              : event.data;
            this.emit(WebSocketEvent.MESSAGE, data);
          } catch (error) {
            // 如果不是 JSON，直接發送原始數據
            this.emit(WebSocketEvent.MESSAGE, event.data);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] 連接錯誤:', error);
          this.emit(WebSocketEvent.ERROR, error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] 連接關閉:', event.code, event.reason);
          this.setStatus(WebSocketStatus.DISCONNECTED);
          this.stopHeartbeat();
          this.emit(WebSocketEvent.DISCONNECT, event);

          // 如果不是手動關閉，且啟用自動重連，則嘗試重連
          if (event.code !== 1000 && this.config.autoReconnect) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.setStatus(WebSocketStatus.ERROR);
        reject(error);
      }
    });
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    this.config.autoReconnect = false; // 手動斷開時禁用自動重連
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(1000, '手動斷開連接');
      this.ws = null;
    }

    this.setStatus(WebSocketStatus.DISCONNECTED);
    this.messageQueue = [];
  }

  /**
   * 發送消息
   */
  send(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // 如果未連接，將消息加入隊列
      this.messageQueue.push(data);
      console.warn('[WebSocket] 未連接，消息已加入隊列');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('[WebSocket] 發送消息失敗:', error);
      this.emit(WebSocketEvent.ERROR, error);
      return false;
    }
  }

  /**
   * 獲取連接狀態
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * 檢查是否已連接
   */
  isConnected(): boolean {
    return this.status === WebSocketStatus.CONNECTED && 
           this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 獲取當前配置
   */
  getConfig(): Required<WebSocketConfig> {
    return { ...this.config };
  }

  /**
   * 設置連接狀態
   */
  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status;
    }
  }

  /**
   * 安排重連
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // 已經有重連計劃
    }

    // 檢查是否超過最大重連次數
    if (this.config.maxReconnectAttempts > 0 && 
        this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocket] 已達到最大重連次數');
      this.emit(WebSocketEvent.RECONNECT_FAILED);
      return;
    }

    this.setStatus(WebSocketStatus.RECONNECTING);
    this.reconnectAttempts++;

    console.log(`[WebSocket] ${this.config.reconnectInterval}ms 後嘗試重連 (第 ${this.reconnectAttempts} 次)`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.emit(WebSocketEvent.RECONNECT, this.reconnectAttempts);
      this.connect().catch((error) => {
        console.error('[WebSocket] 重連失敗:', error);
        this.scheduleReconnect(); // 繼續嘗試重連
      });
    }, this.config.reconnectInterval);
  }

  /**
   * 清除重連計時器
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 啟動心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // 先停止舊的心跳

    if (this.config.heartbeatInterval <= 0) {
      return; // 不發送心跳
    }

    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected()) {
        this.send(this.config.heartbeatMessage);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 發送隊列中的消息
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * 手動重連
   */
  reconnect(): Promise<void> {
    this.disconnect();
    this.config.autoReconnect = true;
    return this.connect();
  }

  /**
   * 監聽事件
   */
  on(event: string, listener: EventListener): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
    return this;
  }

  /**
   * 監聽事件（僅觸發一次）
   */
  once(event: string, listener: EventListener): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      listener(...args);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * 移除事件監聽器
   */
  off(event: string, listener?: EventListener): this {
    if (!this.eventListeners.has(event)) {
      return this;
    }

    if (!listener) {
      // 移除所有監聽器
      this.eventListeners.delete(event);
      return this;
    }

    const listeners = this.eventListeners.get(event)!;
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.eventListeners.delete(event);
    }

    return this;
  }

  /**
   * 觸發事件
   */
  private emit(event: string, ...args: any[]): boolean {
    const listeners = this.eventListeners.get(event);
    if (listeners && listeners.length > 0) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`[WebSocket] 事件監聽器執行錯誤 (${event}):`, error);
        }
      });
      return true;
    }
    return false;
  }

  /**
   * 移除所有事件監聽器
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
    return this;
  }
}

