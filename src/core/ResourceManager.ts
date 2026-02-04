import * as PIXI from 'pixi.js';

// 資源類型定義
export interface ResourceDefinition {
  id: string;
  url: string;
  type: 'image' | 'audio' | 'json' | 'font' | 'spine' | 'atlas' | 'skel' | 'spritesheet';
  preload?: boolean;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentResource?: string;
}

export type LoadProgressCallback = (progress: LoadProgress) => void;
export type LoadCompleteCallback = () => void;
export type LoadErrorCallback = (error: string) => void;

// 資源管理器
export class ResourceManager {
  private static instance: ResourceManager;
  private resources: Map<string, any> = new Map();
  private loadedResources: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private currentLang: string = 'cns'; // 默認語言
  
  private onProgress?: LoadProgressCallback;
  private onComplete?: LoadCompleteCallback;
  private onError?: LoadErrorCallback;

  private constructor() {
    // 從 URL 參數獲取語言
    this.detectLanguage();
  }

  // 檢測語言
  private detectLanguage(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const language = urlParams.get('language');
    if (language === 'zh-tw') {
      this.currentLang = 'cnt';
    } else if (language === 'en') {
      this.currentLang = 'en';
    } else {
      this.currentLang = 'cns';
    }
  }

  // 獲取當前語言
  getCurrentLang(): string {
    return this.currentLang;
  }

  // 單例模式
  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  // 設置回調函數
  setCallbacks(
    onProgress?: LoadProgressCallback,
    onComplete?: LoadCompleteCallback,
    onError?: LoadErrorCallback
  ): void {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }


  // 載入單一資源
  async loadResource(definition: ResourceDefinition): Promise<any> {
    if (this.loadedResources.has(definition.id)) {
      return this.resources.get(definition.id);
    }

    // 如果正在載入中，返回現有的 Promise
    if (this.loadingPromises.has(definition.id)) {
      return this.loadingPromises.get(definition.id);
    }

    const loadPromise = this.performLoad(definition);
    this.loadingPromises.set(definition.id, loadPromise);

    try {
      const resource = await loadPromise;
      this.resources.set(definition.id, resource);
      this.loadedResources.add(definition.id);
      this.loadingPromises.delete(definition.id);
      return resource;
    } catch (error) {
      this.loadingPromises.delete(definition.id);
      throw error;
    }
  }

  // 批量載入資源
  async loadResources(definitions: ResourceDefinition[]): Promise<void> {
    const total = definitions.length;
    let loaded = 0;

    // 為每個資源添加超時機制（30秒）
    const loadWithTimeout = async (definition: ResourceDefinition, timeout: number = 30000): Promise<any> => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`載入超時 (${timeout}ms): ${definition.id} - ${definition.url}`));
        }, timeout);
      });

      return Promise.race([
        this.loadResource(definition),
        timeoutPromise
      ]);
    };

    const loadPromises = definitions.map(async (definition, index) => {
      try {
        // 更新進度：顯示即將載入的資源
        loaded = index; // 當前索引就是已載入數量
        this.onProgress?.({
          loaded,
          total,
          percentage: (loaded / total) * 100,
          currentResource: `正在載入: ${definition.id}`
        });

        console.log(`[ResourceManager] [${index + 1}/${total}] 開始載入資源: ${definition.id} (${definition.type})`);
        console.log(`[ResourceManager] URL: ${definition.url}`);

        const startTime = Date.now();
        await loadWithTimeout(definition);
        const loadTime = Date.now() - startTime;
        
        loaded++;
        console.log(`[ResourceManager] ✓ [${loaded}/${total}] 資源載入完成: ${definition.id} (耗時: ${loadTime}ms)`);

        this.onProgress?.({
          loaded,
          total,
          percentage: (loaded / total) * 100,
          currentResource: definition.id
        });
      } catch (error) {
        const errorMessage = `載入資源失敗 [${index + 1}/${total}]: ${definition.id} (${definition.type}) - ${definition.url} - ${error}`;
        console.error(`[ResourceManager] ✗ ${errorMessage}`);
        this.onError?.(errorMessage);
        throw new Error(errorMessage);
      }
    });

    try {
      await Promise.all(loadPromises);
      console.log(`[ResourceManager] ✅ 所有資源載入完成！共 ${total} 個資源`);
      this.onComplete?.();
    } catch (error) {
      console.error(`[ResourceManager] ❌ 資源載入失敗:`, error);
      throw error;
    }
  }

  // 執行實際的載入操作
  private async performLoad(definition: ResourceDefinition): Promise<any> {
    switch (definition.type) {
      case 'image':
        return this.loadImage(definition.url);
      case 'audio':
        return this.loadAudio(definition.url);
      case 'json':
        return this.loadJson(definition.url);
      case 'font':
        return this.loadFont(definition.url);
      case 'spine':
        return this.loadSpine(definition.id, definition.url);
      case 'atlas':
        // Atlas 文件需要載入到 PIXI.Assets 以供 spine-pixi-v8 使用
        return this.loadAtlas(definition.id, definition.url);
      case 'skel':
        // Skeleton 文件（.skel）需要載入到 PIXI.Assets 以供 spine-pixi-v8 使用
        return this.loadSkel(definition.id, definition.url);
      case 'spritesheet':
        // Sprite sheet 使用 PIXI.Assets 載入，會自動處理 multipack
        return this.loadSpritesheet(definition.id, definition.url);
      default:
        throw new Error(`不支援的資源類型: ${definition.type}`);
    }
  }

  // 載入圖片
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`無法載入圖片: ${url}`));
      img.src = url;
    });
  }

  // 載入音效
  private loadAudio(url: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      let resolved = false;
      
      // 設置超時（30秒）
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`音效載入超時: ${url}`));
        }
      }, 30000);

      const cleanup = () => {
        clearTimeout(timeout);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('loadeddata', onLoadedData);
      };

      const onCanPlay = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.log(`[ResourceManager] 音效載入完成 (canplaythrough): ${url}`);
          resolve(audio);
        }
      };

      const onLoadedData = () => {
        // 對於某些瀏覽器（特別是 iOS Safari），loadeddata 事件可能比 canplaythrough 更早觸發
        // 但我們仍然等待 canplaythrough 以確保音頻可以播放
        console.log(`[ResourceManager] 音效數據已載入 (loadeddata): ${url}`);
      };

      const onError = (e: Event) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          const errorMsg = `無法載入音效: ${url}`;
          console.error(`[ResourceManager] ${errorMsg}`, e);
          reject(new Error(errorMsg));
        }
      };

      // 監聽多個事件以確保兼容性
      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('loadeddata', onLoadedData);
      audio.addEventListener('error', onError);
      
      // 設置 preload 屬性（iOS Safari 可能需要）
      audio.preload = 'auto';
      
      // 開始載入
      audio.src = url;
      audio.load(); // 明確調用 load() 以觸發載入
    });
  }

  // 載入 JSON
  private async loadJson(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`無法載入 JSON: ${url} - ${error}`);
    }
  }

  // 載入字體
  private async loadFont(url: string): Promise<FontFace> {
    try {
      const fontName = url.split('/').pop()?.split('.')[0] || 'CustomFont';
      const fontFace = new FontFace(fontName, `url(${url})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      return fontFace;
    } catch (error) {
      throw new Error(`無法載入字體: ${url} - ${error}`);
    }
  }

  // 載入 Atlas 資源（用於 spine-pixi-v8）
  private async loadAtlas(id: string, url: string): Promise<any> {
    try {
      // 使用 PIXI.Assets.add() 添加資源定義
      // @esotericsoftware/spine-pixi-v8 會自動註冊 .atlas 文件的載入器
      PIXI.Assets.add({
        alias: id,
        src: url
      });
      
      // 載入資源
      const resource = await PIXI.Assets.load(id);
      return resource;
    } catch (error) {
      throw new Error(`Atlas 資源載入失敗: ${id} - ${error}`);
    }
  }

  // 載入 Skeleton 資源（.skel 文件，用於 spine-pixi-v8）
  private async loadSkel(id: string, url: string): Promise<any> {
    try {
      // 使用 PIXI.Assets.add() 添加資源定義
      // @esotericsoftware/spine-pixi-v8 會自動註冊 .skel 文件的載入器
      PIXI.Assets.add({
        alias: id,
        src: url
      });
      
      // 載入資源
      const resource = await PIXI.Assets.load(id);
      return resource;
    } catch (error) {
      throw new Error(`Skeleton 資源載入失敗: ${id} - ${error}`);
    }
  }

  // 載入 Sprite Sheet 資源（使用 PIXI.Assets API，適用於 PixiJS v8）
  // 支援 TexturePacker multipack 格式，只需要載入第一個 JSON 文件
  private async loadSpritesheet(id: string, url: string): Promise<any> {
    try {
      console.log(`[ResourceManager] 開始載入 Sprite Sheet: ${id} from ${url}`);
      
      // 使用 PIXI.Assets.load() 載入 sprite sheet
      // PixiJS 會自動處理 multipack，只需要載入第一個 JSON 文件
      const resource = await PIXI.Assets.load({
        alias: id,
        src: url
      });

      console.log(`[ResourceManager] Sprite Sheet ${id} 載入完成`);
      
      // 檢查資源結構並記錄可用的紋理鍵名（用於調試）
      if (resource && typeof resource === 'object') {
        if (resource.textures) {
          const textureKeys = Object.keys(resource.textures).slice(0, 10); // 只顯示前10個
          console.log(`[ResourceManager] Sprite Sheet 包含 ${Object.keys(resource.textures).length} 個紋理，前10個示例:`, textureKeys);
        }
        if (resource.data && resource.data.frames) {
          const frameKeys = Object.keys(resource.data.frames).slice(0, 10); // 只顯示前10個
          console.log(`[ResourceManager] Sprite Sheet JSON 包含 ${Object.keys(resource.data.frames).length} 個幀，前10個示例:`, frameKeys);
        }
        
        // 檢查是否有 Spritesheet 對象
        if (resource instanceof PIXI.Spritesheet) {
          console.log(`[ResourceManager] Sprite Sheet 是 PIXI.Spritesheet 實例`);
        }
      }
      
      // 返回 sprite sheet 資源（包含 textures 和 animations）
      return resource;
    } catch (error) {
      throw new Error(`Sprite Sheet 資源載入失敗: ${id} - ${error}`);
    }
  }

  // 載入 Spine 資源（使用 PIXI.Assets API，適用於 PixiJS v8）
  private async loadSpine(id: string, url: string): Promise<any> {
    try {
      // 在 PixiJS v8 中，使用 Assets API 載入資源
      // @pixi-spine/all-4.1 會自動註冊 Spine 資源載入器
      // 使用 alias 來標識資源
      const resource = await PIXI.Assets.load({
        alias: id,
        src: url
      });

      // 在 @pixi-spine/all-4.1 中，PIXI.Assets.load() 返回的資源可能直接是 spineData
      // 或者包含在一個對象中，需要檢查不同的格式
      
      // 情況 1: 資源直接是 spineData（包含 skeleton 屬性）
      if (resource && typeof resource === 'object' && 'skeleton' in resource) {
        return {
          spineData: resource,
          resource: resource
        };
      }

      // 情況 2: 資源包含 spineData 屬性
      if (resource && (resource as any).spineData) {
        return {
          spineData: (resource as any).spineData,
          resource: resource
        };
      }

      // 情況 3: 資源本身就是 spineData（直接返回）
      // 如果以上都不匹配，嘗試直接使用資源
      if (resource) {
        console.warn(`[ResourceManager] Spine 資源 ${id} 的格式可能不標準，嘗試直接使用資源`, resource);
        return {
          spineData: resource,
          resource: resource
        };
      }

      throw new Error(`Spine 資源載入失敗: ${id} - 無法獲取 spineData`);
    } catch (error) {
      throw new Error(`Spine 資源載入失敗: ${id} - ${error}`);
    }
  }

  // 獲取資源
  // 對於 sprite sheet 中的紋理，會自動從 PixiJS Assets cache 中查找
  getResource<T = any>(id: string): T | undefined {
    // 首先從本地資源映射中查找
    const localResource = this.resources.get(id);
    if (localResource !== undefined) {
      return localResource as T;
    }

    // 對於 sprite sheet 中的紋理，直接使用 PIXI.Texture.from() 來查找
    // 這樣可以避免不必要的 Cache 查找警告
    // PIXI.Texture.from() 會自動從 sprite sheet 中查找紋理
    const textureVariants = [
      id,                    // 1. 直接使用 id
      `${id}.png`,           // 2. 添加 .png 後綴
    ];

    // 3. 對於 symbol 資源，嘗試添加 Symbol/ 前綴
    if (id.startsWith('symbol_')) {
      textureVariants.push(`Symbol/${id}.png`);
    }

    // 4. 對於 manual 資源，嘗試添加 manual/ 前綴
    if (id.startsWith('manual_page_')) {
      textureVariants.push(`manual/${id}.png`);
    }

    // 嘗試每個變體來查找 Texture（使用 silent 模式避免警告）
    for (const variant of textureVariants) {
      try {
        // 使用 PIXI.Texture.from() 會自動從 sprite sheet 中查找
        const texture = PIXI.Texture.from(variant);
        if (texture && texture !== PIXI.Texture.EMPTY) {
          // 找到有效的 Texture，直接返回
          return texture as T;
        }
      } catch (error) {
        // 忽略錯誤，繼續嘗試下一個變體
      }
    }

    // 如果都沒找到，返回 id 字符串，讓調用者使用 PIXI.Texture.from() 來查找
    // 這樣可以保持向後兼容性
    return id as T;
  }

  // 檢查資源是否已載入
  isLoaded(id: string): boolean {
    return this.loadedResources.has(id);
  }

  // 移除資源
  removeResource(id: string): void {
    this.resources.delete(id);
    this.loadedResources.delete(id);
  }

  // 清除所有資源
  clear(): void {
    this.resources.clear();
    this.loadedResources.clear();
    this.loadingPromises.clear();
  }

  // 獲取載入狀態
  getLoadedCount(): number {
    return this.loadedResources.size;
  }

  // 獲取總資源數量
  getTotalCount(): number {
    return this.resources.size + this.loadingPromises.size;
  }

  // 獲取載入進度百分比
  getLoadProgress(): number {
    const total = this.getTotalCount();
    return total > 0 ? (this.getLoadedCount() / total) * 100 : 0;
  }

  // 輔助方法：將資源轉換為 Texture 對象
  // 如果資源已經是 Texture，直接返回；如果是字符串，使用 PIXI.Texture.from() 轉換
  // 對於 sprite sheet 中的紋理，會嘗試多種名稱變體來查找
  getTexture(id: string): PIXI.Texture | null {
    const resource = this.getResource(id);
    
    // 如果資源已經是 Texture 對象，直接返回
    if (resource instanceof PIXI.Texture) {
      return resource;
    }
    
    // 構建所有可能的紋理名稱變體
    const textureVariants: string[] = [];
    
    // 1. 基本變體
    textureVariants.push(`${id}.png`, id);
    
    // 2. 對於 symbol 資源，嘗試添加 Symbol/ 前綴
    if (id.startsWith('symbol_')) {
      textureVariants.push(`Symbol/${id}.png`);
    }
    
    // 3. 對於 manual 資源，嘗試添加 manual/ 前綴
    if (id.startsWith('manual_page_')) {
      textureVariants.push(`manual/${id}.png`);
    }
    
    // 4. 對於 info_bar 資源，嘗試添加語言後綴
    if (id.startsWith('info_bar_')) {
      textureVariants.push(`${id}_${this.currentLang}.png`);
    }
    
    // 5. 對於 game_logo 資源，已經包含語言後綴，直接使用
    if (id.startsWith('game_logo_')) {
      textureVariants.push(`${id}.png`);
    }
    
    // 優先從 sprite sheet 對象中直接獲取紋理（避免警告）
    const spriteSheetId = 'titans_spritesheet';
    const spriteSheet = this.resources.get(spriteSheetId);
    if (spriteSheet && spriteSheet.textures) {
      for (const variant of textureVariants) {
        if (spriteSheet.textures[variant]) {
          return spriteSheet.textures[variant];
        }
      }
    }
    
    // 如果從 sprite sheet 對象中找不到，使用 PIXI.Texture.from() 來查找
    // 這會自動從 PixiJS 的 cache 中查找（包括 sprite sheet 中的紋理）
    for (const variant of textureVariants) {
      try {
        const texture = PIXI.Texture.from(variant);
        if (texture && texture !== PIXI.Texture.EMPTY) {
          return texture;
        }
      } catch (error) {
        // 忽略錯誤，繼續嘗試下一個變體
      }
    }
    
    // 如果所有變體都失敗，返回 null
    return null;
  }
} 