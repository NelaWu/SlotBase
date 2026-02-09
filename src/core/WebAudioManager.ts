/**
 * Web Audio Manager - 高性能音頻管理器
 * 解決 HTMLAudioElement 在 iOS 上造成的嚴重性能問題
 * 
 * 使用方式：
 * const audio = WebAudioManager.getInstance();
 * await audio.loadAudio('bgm', arrayBuffer);
 * audio.play('bgm', true); // 循環播放
 * audio.setVolume('bgm', 0.5);
 * audio.stop('bgm');
 */
export class WebAudioManager {
  private static instance: WebAudioManager;
  private context: AudioContext;
  private buffers: Map<string, AudioBuffer> = new Map();
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gains: Map<string, GainNode> = new Map();
  private masterGain: GainNode;
  private userInteracted: boolean = false;

  private constructor() {
    // @ts-ignore - 支援 Safari
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContextClass();
    
    // 主音量控制
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    
    // 監聽用戶交互以恢復 AudioContext
    this.setupUserInteractionListener();
    
    console.log('[WebAudioManager] 初始化完成');
  }

  /**
   * 設置用戶交互監聽器
   */
  private setupUserInteractionListener(): void {
    const enableAudio = () => {
      if (!this.userInteracted) {
        this.userInteracted = true;
        this.resume();
      }
    };

    const events = ['click', 'touchstart', 'keydown', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, enableAudio, { once: true, passive: true });
    });
  }

  /**
   * 獲取單例
   */
  static getInstance(): WebAudioManager {
    if (!WebAudioManager.instance) {
      WebAudioManager.instance = new WebAudioManager();
    }
    return WebAudioManager.instance;
  }

  /**
   * 載入音頻（從 ArrayBuffer）
   */
  async loadAudio(id: string, arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      console.log(`[WebAudioManager] 開始解碼音頻: ${id}`);
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(id, audioBuffer);
      
      // 為每個音效創建專屬的 gain node
      const gain = this.context.createGain();
      gain.connect(this.masterGain);
      this.gains.set(id, gain);
      
      console.log(`[WebAudioManager] 音頻載入成功: ${id}, 時長: ${audioBuffer.duration.toFixed(2)}s`);
    } catch (error) {
      console.error(`[WebAudioManager] 音頻解碼失敗: ${id}`, error);
      throw error;
    }
  }

  /**
   * 播放音效
   * @param id 音效 ID
   * @param loop 是否循環播放
   * @param volume 音量 (0-1)，可選
   */
  play(id: string, loop: boolean = false, volume?: number): void {
    const buffer = this.buffers.get(id);
    const gain = this.gains.get(id);
    
    if (!buffer || !gain) {
      console.warn(`[WebAudioManager] 音效未載入: ${id}`);
      return;
    }

    // iOS 需要在用戶互動後 resume AudioContext
    if (this.context.state === 'suspended') {
      console.log('[WebAudioManager] AudioContext suspended, resuming...');
      this.context.resume();
    }

    // 停止舊的播放（如果存在）
    this.stop(id);

    // 創建新的 source node
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(gain);
    
    // 設置音量（如果提供）
    if (volume !== undefined) {
      gain.gain.value = Math.max(0, Math.min(1, volume));
    }
    
    // 播放結束後自動清理（非循環模式）
    source.onended = () => {
      if (!loop && this.sources.get(id) === source) {
        this.sources.delete(id);
        source.disconnect();
      }
    };
    
    source.start(0);
    this.sources.set(id, source);
    
    console.log(`[WebAudioManager] 播放音效: ${id}, loop: ${loop}`);
  }

  /**
   * 停止音效
   */
  stop(id: string): void {
    const source = this.sources.get(id);
    if (source) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // 已經停止或已 disconnect，忽略錯誤
      }
      this.sources.delete(id);
      console.log(`[WebAudioManager] 停止音效: ${id}`);
    }
  }

  /**
   * 停止所有音效
   */
  stopAll(): void {
    console.log('[WebAudioManager] 停止所有音效');
    const ids = Array.from(this.sources.keys());
    ids.forEach(id => this.stop(id));
  }

  /**
   * 設置特定音效的音量
   * @param id 音效 ID
   * @param volume 音量 (0-1)
   */
  setVolume(id: string, volume: number): void {
    const gain = this.gains.get(id);
    if (gain) {
      gain.gain.value = Math.max(0, Math.min(1, volume));
      console.log(`[WebAudioManager] 設置音量: ${id} = ${volume}`);
    } else {
      console.warn(`[WebAudioManager] 音效不存在: ${id}`);
    }
  }

  /**
   * 設置主音量
   * @param volume 音量 (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    console.log(`[WebAudioManager] 設置主音量: ${volume}`);
  }

  /**
   * 獲取主音量
   */
  getMasterVolume(): number {
    return this.masterGain.gain.value;
  }

  /**
   * 檢查音效是否已載入
   */
  isLoaded(id: string): boolean {
    return this.buffers.has(id);
  }

  /**
   * 檢查音效是否正在播放
   */
  isPlaying(id: string): boolean {
    return this.sources.has(id);
  }

  /**
   * 恢復 AudioContext（在用戶互動後調用）
   * iOS 需要在用戶手勢後才能播放音頻
   */
  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
      console.log('[WebAudioManager] AudioContext resumed');
    }
  }

  /**
   * 獲取 AudioContext 狀態
   */
  getState(): AudioContextState {
    return this.context.state;
  }

  /**
   * 淡入音效
   * @param id 音效 ID
   * @param duration 淡入時長（秒）
   * @param targetVolume 目標音量 (0-1)
   */
  fadeIn(id: string, duration: number = 1, targetVolume: number = 1): void {
    const gain = this.gains.get(id);
    if (gain) {
      gain.gain.setValueAtTime(0, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(targetVolume, this.context.currentTime + duration);
      console.log(`[WebAudioManager] 淡入: ${id}, ${duration}s -> ${targetVolume}`);
    }
  }

  /**
   * 淡出音效
   * @param id 音效 ID
   * @param duration 淡出時長（秒）
   * @param stopAfterFade 淡出後是否停止播放
   */
  fadeOut(id: string, duration: number = 1, stopAfterFade: boolean = true): void {
    const gain = this.gains.get(id);
    if (gain) {
      const currentVolume = gain.gain.value;
      gain.gain.setValueAtTime(currentVolume, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.context.currentTime + duration);
      
      if (stopAfterFade) {
        setTimeout(() => this.stop(id), duration * 1000);
      }
      
      console.log(`[WebAudioManager] 淡出: ${id}, ${duration}s, stop: ${stopAfterFade}`);
    }
  }

  /**
   * 獲取已載入的音效列表
   */
  getLoadedSounds(): string[] {
    return Array.from(this.buffers.keys());
  }

  /**
   * 卸載音效
   */
  unload(id: string): void {
    this.stop(id);
    this.buffers.delete(id);
    
    const gain = this.gains.get(id);
    if (gain) {
      gain.disconnect();
      this.gains.delete(id);
    }
    
    console.log(`[WebAudioManager] 卸載音效: ${id}`);
  }

  /**
   * 清除所有音效
   */
  clear(): void {
    this.stopAll();
    this.buffers.clear();
    this.gains.forEach(gain => gain.disconnect());
    this.gains.clear();
    console.log('[WebAudioManager] 清除所有音效');
  }
}
