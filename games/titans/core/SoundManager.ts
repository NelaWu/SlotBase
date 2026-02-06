import { ResourceManager } from '@/core/ResourceManager';
import { SoundPlayer } from '@/core/SoundPlayer';

/**
 * 音效說明
 * 
 * mg_bgm - mg主旋律（循環播放）
 * fg_bgm - fg主旋律（循環播放）
 * btm_butt - 一般按鈕按下音效
 * btm_butt_cancel - 一般按鈕取消音效
 * btm_spin - 啟動Spin轉軸的按鈕音效
 * btm_fall_normal_2 - 輪軸轉動-一般
 * btm_fall_auto_2 - 輪軸轉動-快速
 * btm_w_jp_line - JP觸發音效（與scatter共用）
 * btm_symbol_hit - 一般Symbol落定
 * btm_fx_symbol_frame - 一般Symbol得分
 * btm_symbol_out - 一般Symbol消除爆炸音效
 * btm_multiple_total - 倍數symbol往贏分框飛的時後將出現此音效
 * btm_fx_symbol_function_2 - 倍數Symbol_一般落定
 * btm_fx_symbol_function_2_100x - 倍數Symbol_高倍落定
 * gaint_angry - 巨人怒吼音效
 * btm_fg_press_start - 購買free spins 介面按下START按鈕的音效
 * btm_trans - 閃電雲的轉場音效
 * treasure_chest_open - 寶箱開啟的整段畫面的音效
 * btm_fg_out - fg結算畫面彈出時的爆炸音效
 * btm_fg_out_bgm - fg結算畫面的背景循環音樂
 * btm_counting - 金額跑分時播放的單顆錢幣音效（每跳兩個數字播一次）
 */

/**
 * 音效管理器
 * 統一管理遊戲中的所有音效播放
 */
export class SoundManager {
  private static instance: SoundManager;
  private resourceManager: ResourceManager;
  private soundPlayers: Map<string, SoundPlayer> = new Map();
  private bgmPlayer: SoundPlayer | null = null; // 當前播放的背景音樂
  private currentBgmId: string | null = null; // 當前背景音樂ID
  private userInteracted: boolean = false; // 用戶是否已與頁面交互
  private pendingBgmId: string | null = null; // 待播放的背景音樂ID（用戶交互後播放）
  private pendingBgmVolume: number = 0.5; // 待播放的背景音樂音量
  
  // BGM 無縫循環相關（提前0.1秒播放）
  private bgmAudio1: HTMLAudioElement | null = null; // BGM 音頻元素1（用於無縫循環）
  private bgmAudio2: HTMLAudioElement | null = null; // BGM 音頻元素2（用於無縫循環）
  private currentBgmAudio: HTMLAudioElement | null = null; // 當前播放的BGM音頻元素
  private bgmVolume: number = 0.5; // BGM音量
  private bgmTimeUpdateHandler?: () => void; // timeupdate 事件處理器
  private bgmEndedHandler1?: () => void; // audio1 ended 事件處理器
  private bgmEndedHandler2?: () => void; // audio2 ended 事件處理器

  private constructor() {
    this.resourceManager = ResourceManager.getInstance();
    this.setupUserInteractionListener();
  }

  /**
   * 設置用戶交互監聽器（用於解除瀏覽器自動播放限制）
   */
  private setupUserInteractionListener(): void {
    const enableAudio = () => {
      if (!this.userInteracted) {
        this.userInteracted = true;
        console.log('[SoundManager] 用戶已交互，音頻已啟用');
        
        // 如果有待播放的背景音樂，現在播放
        if (this.pendingBgmId) {
          this.playBGM(this.pendingBgmId as 'mg_bgm' | 'fg_bgm', this.pendingBgmVolume, false);
          this.pendingBgmId = null;
        }
      }
    };

    // 監聽多種用戶交互事件
    const events = ['click', 'touchstart', 'keydown', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, enableAudio, { once: true, passive: true });
    });
  }

  /**
   * 獲取單例實例
   */
  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * 播放音效（靜態方法，可直接通過 SoundManager.playSound() 調用）
   * @param soundId 音效ID
   * @param options 播放選項
   */
  public static playSound(
    soundId: string,
    options?: {
      loop?: boolean;
      volume?: number;
      resetTime?: boolean;
    }
  ): SoundPlayer | null {
    return SoundManager.getInstance().playSound(soundId, options);
  }

  /**
   * 播放音效（實例方法）
   * @param soundId 音效ID
   * @param options 播放選項
   */
  private playSound(
    soundId: string,
    options?: {
      loop?: boolean;
      volume?: number;
      resetTime?: boolean;
    }
  ): SoundPlayer | null {
    try {
      const audioResource = this.resourceManager.getResource(soundId);
      if (!audioResource || !(audioResource instanceof HTMLAudioElement)) {
        console.warn(`[SoundManager] 找不到音效資源: ${soundId}`);
        return null;
      }

      // 如果已經有播放器實例，複製音頻元素以避免衝突
      const audio = audioResource.cloneNode(true) as HTMLAudioElement;
      
      const player = new SoundPlayer(audio, {
        loop: options?.loop || false,
        volume: options?.volume !== undefined ? options.volume : 1.0
      });

      // 存儲播放器（用於後續控制）
      this.soundPlayers.set(soundId, player);

      // 播放（靜默處理瀏覽器自動播放限制）
      player.play(options?.resetTime || false, true).catch(() => {
        // 播放失敗已靜默處理，這裡不需要額外操作
      });

      // 播放結束後清理（非循環音效）
      if (!options?.loop) {
        player.onEnded(() => {
          this.soundPlayers.delete(soundId);
          player.destroy();
        });
      }

      return player;
    } catch (error) {
      console.error(`[SoundManager] 播放音效失敗: ${soundId}`, error);
      return null;
    }
  }

  /**
   * 停止音效（靜態方法）
   * @param soundId 音效ID
   */
  public static stopSound(soundId: string): void {
    SoundManager.getInstance().stopSound(soundId);
  }

  /**
   * 停止音效（實例方法）
   * @param soundId 音效ID
   */
  private stopSound(soundId: string): void {
    const player = this.soundPlayers.get(soundId);
    if (player) {
      player.stop();
      player.destroy();
      this.soundPlayers.delete(soundId);
    }
  }

  /**
   * 暫停音效（靜態方法）
   * @param soundId 音效ID
   */
  public static pauseSound(soundId: string): void {
    SoundManager.getInstance().pauseSound(soundId);
  }

  /**
   * 暫停音效（實例方法）
   * @param soundId 音效ID
   */
  private pauseSound(soundId: string): void {
    const player = this.soundPlayers.get(soundId);
    if (player) {
      player.pause();
    }
  }

  /**
   * 恢復音效（靜態方法）
   * @param soundId 音效ID
   */
  public static resumeSound(soundId: string): void {
    SoundManager.getInstance().resumeSound(soundId);
  }

  /**
   * 恢復音效（實例方法）
   * @param soundId 音效ID
   */
  private resumeSound(soundId: string): void {
    const player = this.soundPlayers.get(soundId);
    if (player) {
      player.play();
    }
  }

  /**
   * 播放背景音樂（BGM）- 使用無縫循環，提前0.1秒播放（靜態方法）
   * @param bgmId 背景音樂ID（mg_bgm 或 fg_bgm）
   * @param volume 音量（0.0-1.0，默認 0.5）
   * @param waitForInteraction 是否等待用戶交互（默認 true，如果用戶未交互則延遲播放）
   */
  public static playBGM(bgmId: 'mg_bgm' | 'fg_bgm' | 'btm_fg_out_bgm', volume: number = 0.5, waitForInteraction: boolean = true): void {
    SoundManager.getInstance().playBGM(bgmId, volume, waitForInteraction);
  }

  /**
   * 播放背景音樂（BGM）- 使用無縫循環，提前0.1秒播放（實例方法）
   * @param bgmId 背景音樂ID（mg_bgm 或 fg_bgm）
   * @param volume 音量（0.0-1.0，默認 0.5）
   * @param waitForInteraction 是否等待用戶交互（默認 true，如果用戶未交互則延遲播放）
   */
  private playBGM(bgmId: 'mg_bgm' | 'fg_bgm' | 'btm_fg_out_bgm', volume: number = 0.5, waitForInteraction: boolean = true): void {
    // 如果正在播放相同的BGM，不重複播放
    if (this.currentBgmId === bgmId && this.currentBgmAudio && !this.currentBgmAudio.paused) {
      return;
    }

    // 如果用戶尚未交互且需要等待，則保存待播放的BGM
    if (waitForInteraction && !this.userInteracted) {
      console.log(`[SoundManager] 用戶尚未交互，BGM ${bgmId} 將在用戶交互後播放`);
      this.pendingBgmId = bgmId;
      this.pendingBgmVolume = volume;
      return;
    }

    // 停止當前BGM
    this.stopBGM();

    // 使用無縫循環播放（提前0.1秒）
    this.playBGMSeamless(bgmId, volume);
  }

  /**
   * 無縫循環播放背景音樂（提前0.1秒播放，實現無縫銜接）
   * @param bgmId 背景音樂ID
   * @param volume 音量
   */
  private playBGMSeamless(bgmId: 'mg_bgm' | 'fg_bgm' | 'btm_fg_out_bgm', volume: number): void {
    try {
      const audioResource = this.resourceManager.getResource(bgmId);
      if (!audioResource || !(audioResource instanceof HTMLAudioElement)) {
        console.warn(`[SoundManager] 找不到BGM資源: ${bgmId}`);
        return;
      }

      // 清理舊的BGM音頻元素
      this.cleanupBGM();

      // 創建兩個音頻元素用於無縫循環
      this.bgmAudio1 = new Audio(audioResource.src);
      this.bgmAudio2 = new Audio(audioResource.src);
      
      this.bgmAudio1.volume = volume;
      this.bgmAudio2.volume = volume;
      this.bgmAudio1.loop = false; // 不使用原生 loop，手動控制
      this.bgmAudio2.loop = false;
      this.bgmVolume = volume;

      // 確保音頻元素已加載
      this.bgmAudio1.load();
      this.bgmAudio2.load();

      this.currentBgmAudio = this.bgmAudio1;
      
      let nextAudioStarted = false; // 標記下一個音頻是否已開始播放

      // 使用 timeupdate 事件在即將結束時提前0.1秒播放下一個音頻（實現無縫循環）
      const timeUpdateHandler = () => {
        if (!this.currentBgmAudio) return;
        
        const duration = this.currentBgmAudio.duration;
        const currentTime = this.currentBgmAudio.currentTime;
        
        // 如果音頻即將結束（剩餘時間小於 0.1 秒），提前開始播放下一個音頻
        if (duration > 0 && duration - currentTime < 0.15 && !nextAudioStarted) {
          if (this.currentBgmAudio === this.bgmAudio1 && this.bgmAudio2) {
            // 提前開始播放 audio2
            this.bgmAudio2.currentTime = 0;
            this.bgmAudio2.play().then(() => {
            }).catch((error) => {
              console.error('[SoundManager] ❌ audio2 提前播放失敗:', error);
            });
            nextAudioStarted = true;
          } else if (this.currentBgmAudio === this.bgmAudio2 && this.bgmAudio1) {
            // 提前開始播放 audio1
            this.bgmAudio1.currentTime = 0;
            this.bgmAudio1.play().then(() => {
            }).catch((error) => {
              console.error('[SoundManager] ❌ audio1 提前播放失敗:', error);
            });
            nextAudioStarted = true;
          }
        }
      };

      // 保存 timeupdate 處理器引用以便清理
      this.bgmTimeUpdateHandler = timeUpdateHandler;
      
      // 監聽兩個音頻的 timeupdate 事件
      this.bgmAudio1.addEventListener('timeupdate', this.bgmTimeUpdateHandler);
      this.bgmAudio2.addEventListener('timeupdate', this.bgmTimeUpdateHandler);

      // 在音頻完整播放結束時切換到下一個（此時下一個已經開始播放了）
      this.bgmEndedHandler1 = () => {
        console.log('[SoundManager] 🔄 audio1 播放結束，切換到 audio2');
        if (this.currentBgmAudio === this.bgmAudio1 && this.bgmAudio2) {
          // 停止 audio1
          this.bgmAudio1.pause();
          this.bgmAudio1.currentTime = 0;
          
          // 切換到 audio2（應該已經在播放了）
          this.currentBgmAudio = this.bgmAudio2;
          nextAudioStarted = false; // 重置標記
        }
      };

      this.bgmEndedHandler2 = () => {
        console.log('[SoundManager] 🔄 audio2 播放結束，切換到 audio1');
        if (this.currentBgmAudio === this.bgmAudio2 && this.bgmAudio1) {
          // 停止 audio2
          this.bgmAudio2.pause();
          this.bgmAudio2.currentTime = 0;
          
          // 切換到 audio1（應該已經在播放了）
          this.currentBgmAudio = this.bgmAudio1;
          nextAudioStarted = false; // 重置標記
        }
      };

      this.bgmAudio1.addEventListener('ended', this.bgmEndedHandler1);
      this.bgmAudio2.addEventListener('ended', this.bgmEndedHandler2);
      
      console.log('[SoundManager] BGM 無縫循環設置完成（提前0.1秒），開始播放:', bgmId);

      // 創建一個包裝對象來管理BGM（兼容 SoundPlayer 接口）
      const bgmPlayerWrapper = {
        play: (resetTime: boolean = false, silentFail: boolean = true): Promise<void> => {
          if (!this.currentBgmAudio) return Promise.resolve();
          
          this.currentBgmAudio.currentTime = resetTime ? 0 : this.currentBgmAudio.currentTime;
          return this.currentBgmAudio.play().then(() => {
            console.log('[SoundManager] ▶️ BGM 播放成功');
          }).catch((error) => {
            if (silentFail && (error.name === 'NotAllowedError' || error.name === 'NotSupportedError')) {
              console.warn('[SoundManager] 播放被瀏覽器阻止（需要用戶交互）:', error.message);
              return Promise.resolve();
            }
            throw error;
          });
        },
        stop: (): void => {
          this.cleanupBGM();
        },
        pause: (): void => {
          if (this.currentBgmAudio) {
            this.currentBgmAudio.pause();
          }
        },
        setVolume: (vol: number): void => {
          this.bgmVolume = vol;
          if (this.bgmAudio1) this.bgmAudio1.volume = vol;
          if (this.bgmAudio2) this.bgmAudio2.volume = vol;
        },
        getIsPlaying: (): boolean => {
          return this.currentBgmAudio ? !this.currentBgmAudio.paused : false;
        },
        destroy: (): void => {
          this.cleanupBGM();
        }
      };

      // 將包裝對象轉換為 SoundPlayer 類型（用於兼容性）
      this.bgmPlayer = bgmPlayerWrapper as any;
      this.currentBgmId = bgmId;

      // 開始播放第一個音頻
      this.currentBgmAudio.play().then(() => {
        console.log('[SoundManager] ✅ BGM 開始播放:', bgmId);
      }).catch((error) => {
        console.error('[SoundManager] ❌ BGM 播放失敗:', error);
      });
    } catch (error) {
      console.error(`[SoundManager] 播放BGM失敗: ${bgmId}`, error);
    }
  }

  /**
   * 清理BGM音頻元素
   */
  private cleanupBGM(): void {
    if (this.bgmAudio1) {
      this.bgmAudio1.pause();
      // 移除所有事件監聽器
      if (this.bgmTimeUpdateHandler) {
        this.bgmAudio1.removeEventListener('timeupdate', this.bgmTimeUpdateHandler);
      }
      if (this.bgmEndedHandler1) {
        this.bgmAudio1.removeEventListener('ended', this.bgmEndedHandler1);
      }
      this.bgmAudio1.src = '';
      this.bgmAudio1.load();
      this.bgmAudio1 = null;
    }
    if (this.bgmAudio2) {
      this.bgmAudio2.pause();
      // 移除所有事件監聽器
      if (this.bgmTimeUpdateHandler) {
        this.bgmAudio2.removeEventListener('timeupdate', this.bgmTimeUpdateHandler);
      }
      if (this.bgmEndedHandler2) {
        this.bgmAudio2.removeEventListener('ended', this.bgmEndedHandler2);
      }
      this.bgmAudio2.src = '';
      this.bgmAudio2.load();
      this.bgmAudio2 = null;
    }
    this.currentBgmAudio = null;
    this.bgmTimeUpdateHandler = undefined;
    this.bgmEndedHandler1 = undefined;
    this.bgmEndedHandler2 = undefined;
  }

  /**
   * 停止背景音樂（靜態方法）
   */
  public static stopBGM(): void {
    SoundManager.getInstance().stopBGM();
  }

  /**
   * 停止背景音樂（實例方法）
   */
  private stopBGM(): void {
    if (this.bgmPlayer) {
      this.bgmPlayer.stop();
      this.bgmPlayer.destroy();
      this.bgmPlayer = null;
      this.currentBgmId = null;
    }
    this.cleanupBGM();
  }

  /**
   * 設置背景音樂音量（靜態方法）
   * @param volume 音量（0.0-1.0）
   */
  public static setBGMVolume(volume: number): void {
    SoundManager.getInstance().setBGMVolume(volume);
  }

  /**
   * 設置背景音樂音量（實例方法）
   * @param volume 音量（0.0-1.0）
   */
  private setBGMVolume(volume: number): void {
    this.bgmVolume = volume;
    if (this.bgmAudio1) this.bgmAudio1.volume = volume;
    if (this.bgmAudio2) this.bgmAudio2.volume = volume;
    if (this.bgmPlayer) {
      this.bgmPlayer.setVolume(volume);
    }
  }

  /**
   * 設置音效音量（靜態方法）
   * @param volume 音量（0.0-1.0）
   */
  public static setSoundVolume(volume: number): void {
    SoundManager.getInstance().setSoundVolume(volume);
  }

  /**
   * 設置音效音量（實例方法）
   * @param volume 音量（0.0-1.0）
   */
  private setSoundVolume(volume: number): void {
    // 設置所有非BGM音效的音量
    this.soundPlayers.forEach((player, soundId) => {
      if (soundId !== 'mg_bgm' && soundId !== 'fg_bgm') {
        player.setVolume(volume);
      }
    });
  }

  /**
   * 停止所有音效（不包括BGM）（靜態方法）
   */
  public static stopAllSounds(): void {
    SoundManager.getInstance().stopAllSounds();
  }

  /**
   * 停止所有音效（不包括BGM）（實例方法）
   */
  private stopAllSounds(): void {
    this.soundPlayers.forEach((player, soundId) => {
      if (soundId !== 'mg_bgm' && soundId !== 'fg_bgm') {
        player.stop();
        player.destroy();
        this.soundPlayers.delete(soundId);
      }
    });
  }

  /**
   * 停止所有音效和BGM（靜態方法）
   */
  public static stopAll(): void {
    SoundManager.getInstance().stopAll();
  }

  /**
   * 停止所有音效和BGM（實例方法）
   */
  private stopAll(): void {
    this.stopAllSounds();
    this.stopBGM();
  }

  /**
   * 檢查音效是否正在播放（靜態方法）
   * @param soundId 音效ID
   */
  public static isPlaying(soundId: string): boolean {
    return SoundManager.getInstance().isPlaying(soundId);
  }

  /**
   * 檢查音效是否正在播放（實例方法）
   * @param soundId 音效ID
   */
  private isPlaying(soundId: string): boolean {
    const player = this.soundPlayers.get(soundId);
    return player ? player.getIsPlaying() : false;
  }

  /**
   * 獲取音效播放器實例（靜態方法）
   * @param soundId 音效ID
   */
  public static getSoundPlayer(soundId: string): SoundPlayer | null {
    return SoundManager.getInstance().getSoundPlayer(soundId);
  }

  /**
   * 獲取音效播放器實例（實例方法）
   * @param soundId 音效ID
   */
  private getSoundPlayer(soundId: string): SoundPlayer | null {
    return this.soundPlayers.get(soundId) || null;
  }

  /**
   * 銷毀管理器（清理所有資源）（靜態方法）
   */
  public static destroy(): void {
    SoundManager.getInstance().destroy();
  }

  /**
   * 銷毀管理器（清理所有資源）（實例方法）
   */
  private destroy(): void {
    this.stopAll();
    this.soundPlayers.clear();
  }
}
