import * as PIXI from 'pixi.js';

// 資源類型定義
export interface ResourceDefinition {
  id: string;
  url: string;
  type: 'image' | 'audio' | 'json' | 'font' | 'spine' | 'atlas' | 'skel';
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
  
  private onProgress?: LoadProgressCallback;
  private onComplete?: LoadCompleteCallback;
  private onError?: LoadErrorCallback;

  private constructor() {}

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

    const loadPromises = definitions.map(async (definition) => {
      try {
        this.onProgress?.({
          loaded,
          total,
          percentage: (loaded / total) * 100,
          currentResource: definition.id
        });

        await this.loadResource(definition);
        loaded++;

        this.onProgress?.({
          loaded,
          total,
          percentage: (loaded / total) * 100,
          currentResource: definition.id
        });
      } catch (error) {
        const errorMessage = `載入資源失敗: ${definition.id} - ${error}`;
        this.onError?.(errorMessage);
        throw new Error(errorMessage);
      }
    });

    try {
      await Promise.all(loadPromises);
      this.onComplete?.();
    } catch (error) {
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
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = () => reject(new Error(`無法載入音效: ${url}`));
      audio.src = url;
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
  getResource<T = any>(id: string): T | undefined {
    return this.resources.get(id);
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
} 