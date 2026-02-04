/**
 * 聲音播放器
 * 提供音頻播放功能，支持循環播放控制
 */
export class SoundPlayer {
  private audio: HTMLAudioElement | null = null;
  private isLooping: boolean = false;
  private volume: number = 1.0; // 音量範圍 0.0 - 1.0
  private isPlaying: boolean = false;
  private onEndedCallback?: () => void;

  /**
   * 創建聲音播放器實例
   * @param audioSource 音頻資源（可以是 URL 字符串或 HTMLAudioElement）
   * @param options 配置選項
   */
  constructor(
    audioSource?: string | HTMLAudioElement,
    options?: {
      loop?: boolean;
      volume?: number;
      autoplay?: boolean;
    }
  ) {
    if (audioSource) {
      this.setAudioSource(audioSource);
    }

    if (options) {
      if (options.loop !== undefined) {
        this.setLoop(options.loop);
      }
      if (options.volume !== undefined) {
        this.setVolume(options.volume);
      }
      if (options.autoplay) {
        this.play();
      }
    }
  }

  /**
   * 設置音頻資源
   * @param audioSource 音頻資源（可以是 URL 字符串或 HTMLAudioElement）
   */
  public setAudioSource(audioSource: string | HTMLAudioElement): void {
    // 清理舊的音頻
    this.stop();
    this.cleanup();

    if (audioSource instanceof HTMLAudioElement) {
      this.audio = audioSource;
    } else {
      this.audio = new Audio(audioSource);
    }

    // 設置事件監聽器
    this.setupEventListeners();
    
    // 恢復設置
    this.audio.loop = this.isLooping;
    this.audio.volume = this.volume;
  }

  /**
   * 設置事件監聽器
   */
  private setupEventListeners(): void {
    if (!this.audio) return;

    // 播放結束事件
    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });

    // 播放開始事件
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
    });

    // 暫停事件
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
    });

    // 錯誤處理
    this.audio.addEventListener('error', (e) => {
      console.error('[SoundPlayer] 音頻播放錯誤:', e);
      this.isPlaying = false;
    });
  }

  /**
   * 播放音頻
   * @param resetTime 是否重置播放時間到開始（默認 false，從當前位置繼續）
   * @param silentFail 是否靜默失敗（不拋出錯誤，用於處理瀏覽器自動播放限制）
   */
  public play(resetTime: boolean = false, silentFail: boolean = true): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audio) {
        if (silentFail) {
          resolve();
          return;
        }
        reject(new Error('音頻資源未設置'));
        return;
      }

      // 如果要求重置時間，將播放位置設為 0
      if (resetTime) {
        this.audio.currentTime = 0;
      }

      // 播放音頻
      const playPromise = this.audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            resolve();
          })
          .catch((error) => {
            // 處理瀏覽器自動播放限制
            if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
              if (silentFail) {
                // 靜默失敗，不拋出錯誤（瀏覽器要求用戶交互後才能播放）
                console.warn('[SoundPlayer] 播放被瀏覽器阻止（需要用戶交互）:', error.message);
                this.isPlaying = false;
                resolve(); // 仍然 resolve，不中斷流程
                return;
              }
            }
            console.error('[SoundPlayer] 播放失敗:', error);
            this.isPlaying = false;
            if (silentFail) {
              resolve();
            } else {
              reject(error);
            }
          });
      } else {
        // 舊版瀏覽器可能不支持 Promise
        this.isPlaying = true;
        resolve();
      }
    });
  }

  /**
   * 暫停播放
   */
  public pause(): void {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  /**
   * 停止播放（暫停並重置播放位置）
   */
  public stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
    }
  }

  /**
   * 設置是否循環播放
   * @param loop 是否循環
   */
  public setLoop(loop: boolean): void {
    this.isLooping = loop;
    if (this.audio) {
      this.audio.loop = loop;
    }
  }

  /**
   * 獲取是否循環播放
   */
  public getLoop(): boolean {
    return this.isLooping;
  }

  /**
   * 設置音量
   * @param volume 音量值（0.0 - 1.0）
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume)); // 限制在 0-1 範圍
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * 獲取當前音量
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * 獲取當前播放時間（秒）
   */
  public getCurrentTime(): number {
    return this.audio ? this.audio.currentTime : 0;
  }

  /**
   * 設置播放時間（秒）
   * @param time 播放時間
   */
  public setCurrentTime(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  /**
   * 獲取音頻總時長（秒）
   */
  public getDuration(): number {
    return this.audio ? this.audio.duration : 0;
  }

  /**
   * 檢查是否正在播放
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 設置播放結束回調
   * @param callback 回調函數
   */
  public onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  /**
   * 移除播放結束回調
   */
  public removeOnEnded(): void {
    this.onEndedCallback = undefined;
  }

  /**
   * 清理資源
   */
  private cleanup(): void {
    if (this.audio) {
      // 移除事件監聽器
      this.audio.removeEventListener('ended', () => {});
      this.audio.removeEventListener('play', () => {});
      this.audio.removeEventListener('pause', () => {});
      this.audio.removeEventListener('error', () => {});
      
      // 停止播放
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
    }
  }

  /**
   * 銷毀播放器（清理所有資源）
   */
  public destroy(): void {
    this.stop();
    this.removeOnEnded();
    this.cleanup();
    this.audio = null;
  }
}
