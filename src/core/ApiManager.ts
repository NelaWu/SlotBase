// API 請求配置
export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

// API 響應格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

// API 錯誤類別
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 拉霸機相關的 API 介面
export interface SpinRequest {
  bet: number;
  lines?: number;
  autoSpin?: boolean;
}

export interface SpinResponse {
  reels: number[][];
  winLines: number[];
  totalWin: number;
  balance: number;
  gameId: string;
  timestamp: number;
}

export interface PlayerInfo {
  id: string;
  username: string;
  balance: number;
  level: number;
}

// API 管理器
export class ApiManager {
  private static instance: ApiManager;
  private config: ApiConfig;
  private authToken?: string;

  private constructor(config: ApiConfig) {
    this.config = {
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json'
      },
      ...config
    };
  }

  // 單例模式
  static getInstance(config?: ApiConfig): ApiManager {
    if (!ApiManager.instance && config) {
      ApiManager.instance = new ApiManager(config);
    }
    if (!ApiManager.instance) {
      throw new Error('API 管理器尚未初始化');
    }
    return ApiManager.instance;
  }

  // 設置認證 Token
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  // 清除認證 Token
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  // 通用 HTTP 請求方法
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    options: Partial<ApiConfig> = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      ...this.config.headers,
      ...options.headers
    };

    // 添加認證 header
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(options.timeout || this.config.timeout || 10000)
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(data);
    }

    const maxAttempts = options.retryAttempts || this.config.retryAttempts || 1;
    const retryDelay = options.retryDelay || this.config.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response
          );
        }

        const result: ApiResponse<T> = await response.json();
        
        if (!result.success) {
          throw new ApiError(
            result.message || '請求失敗',
            result.code,
            result
          );
        }

        return result;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // 等待後重試
        await this.delay(retryDelay * attempt);
      }
    }

    throw new ApiError('請求重試次數已達上限');
  }

  // 延遲輔助方法
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 拉霸機相關 API 方法

  // 獲取玩家資訊
  async getPlayerInfo(): Promise<PlayerInfo> {
    const response = await this.request<PlayerInfo>('/player/info');
    return response.data!;
  }

  // 開始轉動
  async spin(request: SpinRequest): Promise<SpinResponse> {
    const response = await this.request<SpinResponse>('/game/spin', 'POST', request);
    return response.data!;
  }

  // 獲取遊戲歷史
  async getGameHistory(limit: number = 10): Promise<SpinResponse[]> {
    const response = await this.request<SpinResponse[]>(`/game/history?limit=${limit}`);
    return response.data!;
  }

  // 檢查連線狀態
  async ping(): Promise<boolean> {
    try {
      await this.request('/ping');
      return true;
    } catch {
      return false;
    }
  }

  // 登入
  async login(username: string, password: string): Promise<{ token: string; player: PlayerInfo }> {
    const response = await this.request<{ token: string; player: PlayerInfo }>(
      '/auth/login', 
      'POST', 
      { username, password }
    );
    
    const result = response.data!;
    this.setAuthToken(result.token);
    return result;
  }

  // 登出
  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', 'POST');
    } finally {
      this.clearAuthToken();
    }
  }

  // 更新玩家設定
  async updatePlayerSettings(settings: any): Promise<void> {
    await this.request('/player/settings', 'PUT', settings);
  }

  // 獲取遊戲配置
  async getGameConfig(): Promise<any> {
    const response = await this.request('/game/config');
    return response.data!;
  }

  // 報告錯誤
  async reportError(error: any): Promise<void> {
    try {
      await this.request('/error/report', 'POST', {
        error: error.toString(),
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    } catch {
      // 錯誤報告失敗時不拋出異常
      console.warn('無法向伺服器報告錯誤');
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // 獲取當前配置
  getConfig(): ApiConfig {
    return { ...this.config };
  }
} 