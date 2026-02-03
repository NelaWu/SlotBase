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
   * 播放音效
   * @param soundId 音效ID
   * @param options 播放選項
   */
  public playSound(
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
   * 停止音效
   * @param soundId 音效ID
   */
  public stopSound(soundId: string): void {
    const player = this.soundPlayers.get(soundId);
    if (player) {
      player.stop();
      player.destroy();
      this.soundPlayers.delete(soundId);
    }
  }

  /**
   * 暫停音效
   * @param soundId 音效ID
   */
  public pauseSound(soundId: string): void {
    const player = this.soundPlayers.get(soundId);
    if (player) {
      player.pause();
    }
  }

  /**
   * 恢復音效
   * @param soundId 音效ID
   */
  public resumeSound(soundId: string): void {
    const player = this.soundPlayers.get(soundId);
    if (player) {
      player.play();
    }
  }

  /**
   * 播放背景音樂（BGM）
   * @param bgmId 背景音樂ID（mg_bgm 或 fg_bgm）
   * @param volume 音量（0.0-1.0，默認 0.5）
   * @param waitForInteraction 是否等待用戶交互（默認 true，如果用戶未交互則延遲播放）
   */
  public playBGM(bgmId: 'mg_bgm' | 'fg_bgm', volume: number = 0.5, waitForInteraction: boolean = true): void {
    // 如果正在播放相同的BGM，不重複播放
    if (this.currentBgmId === bgmId && this.bgmPlayer?.getIsPlaying()) {
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

    // 播放新BGM
    const player = this.playSound(bgmId, {
      loop: true,
      volume: volume
    });

    if (player) {
      this.bgmPlayer = player;
      this.currentBgmId = bgmId;
      
      // 嘗試播放，如果失敗則等待用戶交互
      player.play(false, true).catch(() => {
        // 播放失敗，保存為待播放
        if (waitForInteraction) {
          this.pendingBgmId = bgmId;
          this.pendingBgmVolume = volume;
        }
      });
    }
  }

  /**
   * 停止背景音樂
   */
  public stopBGM(): void {
    if (this.bgmPlayer) {
      this.bgmPlayer.stop();
      this.bgmPlayer.destroy();
      this.bgmPlayer = null;
      this.currentBgmId = null;
    }
  }

  /**
   * 設置背景音樂音量
   * @param volume 音量（0.0-1.0）
   */
  public setBGMVolume(volume: number): void {
    if (this.bgmPlayer) {
      this.bgmPlayer.setVolume(volume);
    }
  }

  /**
   * 設置音效音量
   * @param volume 音量（0.0-1.0）
   */
  public setSoundVolume(volume: number): void {
    // 設置所有非BGM音效的音量
    this.soundPlayers.forEach((player, soundId) => {
      if (soundId !== 'mg_bgm' && soundId !== 'fg_bgm') {
        player.setVolume(volume);
      }
    });
  }

  /**
   * 停止所有音效（不包括BGM）
   */
  public stopAllSounds(): void {
    this.soundPlayers.forEach((player, soundId) => {
      if (soundId !== 'mg_bgm' && soundId !== 'fg_bgm') {
        player.stop();
        player.destroy();
        this.soundPlayers.delete(soundId);
      }
    });
  }

  /**
   * 停止所有音效和BGM
   */
  public stopAll(): void {
    this.stopAllSounds();
    this.stopBGM();
  }

  /**
   * 檢查音效是否正在播放
   * @param soundId 音效ID
   */
  public isPlaying(soundId: string): boolean {
    const player = this.soundPlayers.get(soundId);
    return player ? player.getIsPlaying() : false;
  }

  /**
   * 獲取音效播放器實例
   * @param soundId 音效ID
   */
  public getSoundPlayer(soundId: string): SoundPlayer | null {
    return this.soundPlayers.get(soundId) || null;
  }

  /**
   * 銷毀管理器（清理所有資源）
   */
  public destroy(): void {
    this.stopAll();
    this.soundPlayers.clear();
  }
}
