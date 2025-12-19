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
 * 初始化消息配置
 */
export interface InitMessageConfig {
  GameToken: string;
  GameID: number;
  DemoOn: boolean;
  Lang: string;
}

/**
 * WebSocket 配置
 */
export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number; // 重連間隔（毫秒）
  maxReconnectAttempts?: number; // 最大重連次數，-1 表示無限重連
  heartbeatInterval?: number; // 心跳間隔（毫秒），0 表示不發送心跳
  autoReconnect?: boolean; // 是否自動重連
  initMessage?: InitMessageConfig; // 初始化消息配置
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
  private config: WebSocketConfig & {
    reconnectInterval: number;
    maxReconnectAttempts: number;
    heartbeatInterval: number;
    autoReconnect: boolean;
  };
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
        console.log('[WebSocket] 開始建立連接:', this.config.url);
        
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] 連接已建立');
          
          this.setStatus(WebSocketStatus.CONNECTED);
          this.reconnectAttempts = 0;
          
          // 發送初始化消息
          this.sendInitMessage();
          
          // 啟動心跳
          this.startHeartbeat();
          
          // 發送隊列中的消息
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
            
            console.log('[WebSocket] 收到消息:',data);
            
            // 處理心跳回應
            if (data && typeof data === 'object' && data.Code === -2) {
              return;
            }
            
            // 所有消息都正常觸發 MESSAGE 事件（包括 Code >= 1000 的消息）
            // Code 只是狀態碼，不是錯誤標記
            this.emit(WebSocketEvent.MESSAGE, data);
          } catch (error) {
            // 如果不是 JSON，直接發送原始數據
            console.log('[WebSocket] 收到非 JSON 消息:', event.data);
            this.emit(WebSocketEvent.MESSAGE, event.data);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] 連接錯誤:', error);
          this.emit(WebSocketEvent.ERROR, error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] 連接關閉:', {
            code: event.code,
            reason: event.reason || '無',
            wasClean: event.wasClean,
            readyState: this.ws?.readyState,
            status: this.status
          });
          
          this.setStatus(WebSocketStatus.DISCONNECTED);
          this.stopHeartbeat();
          this.emit(WebSocketEvent.DISCONNECT, event);

          // 如果啟用自動重連，則嘗試重連（不根據消息內容判斷）
          if (this.config.autoReconnect) {
            console.log(`[WebSocket] 將在 ${this.config.reconnectInterval}ms 後嘗試重連`);
            this.scheduleReconnect();
          } else {
            console.log('[WebSocket] 自動重連已禁用');
          }
        };
      } catch (error) {
        this.setStatus(WebSocketStatus.ERROR);
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();
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
  getConfig(): WebSocketConfig {
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
   * 發送初始化消息
   */
  private sendInitMessage(): void {
    if (!this.config.initMessage) {
      console.warn('[WebSocket] 未配置初始化消息，跳過發送');
      return; // 沒有配置初始化消息
    }

    const initMessage = {
      Code: 1002,
      GameToken: this.config.initMessage.GameToken,
      GameID: this.config.initMessage.GameID,
      DemoOn: this.config.initMessage.DemoOn,
      Lang: this.config.initMessage.Lang
    };

    const success = this.send(initMessage);
    if (success) {
      console.log('[WebSocket] 發送初始化消息:', JSON.stringify(initMessage));
    } else {
      console.error('[WebSocket] 初始化消息發送失敗（連接可能未就緒）');
    }
  }

  /**
   * 啟動心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // 先停止舊的心跳

    if (this.config.heartbeatInterval <= 0) {
      console.log('[WebSocket] 心跳已禁用（heartbeatInterval <= 0）');
      return; // 不發送心跳
    }

    console.log(`[WebSocket] 啟動心跳，間隔: ${this.config.heartbeatInterval}ms`);

    // 立即發送第一次心跳
    if (this.isConnected()) {
      const heartbeatMsg = { Code: -1 };
      const success = this.send(heartbeatMsg);
      if (success) {
        console.log('[WebSocket] 發送心跳:', JSON.stringify(heartbeatMsg));
      } else {
        console.warn('[WebSocket] 第一次心跳發送失敗');
      }
    }

    // 設置定時器
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected()) {
        // 發送心跳消息：{ "Code": -1 }
        const heartbeatMsg = { Code: -1 };
        const success = this.send(heartbeatMsg);
        if (success) {
          console.log('[WebSocket] 發送心跳:', JSON.stringify(heartbeatMsg));
        } else {
          console.warn('[WebSocket] 心跳消息發送失敗');
        }
      } else {
        console.warn('[WebSocket] 心跳定時器運行中，但連接未就緒，停止心跳');
        this.stopHeartbeat();
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
    console.log('[WebSocket] 嘗試重連...');
    // 不先斷開連接，直接嘗試建立新連接
    // 如果已有連接且是打開狀態，直接返回
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] 連接已存在且正常，無需重連');
      return Promise.resolve();
    }
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

