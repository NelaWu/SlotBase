/**
 * Assets Manifest 管理器
 * 用於解析構建時添加了 hash 的資源文件名
 */
export class AssetsManifest {
  private static instance: AssetsManifest;
  private manifest: Record<string, string> = {};
  private loaded: boolean = false;

  private constructor() {}

  /**
   * 獲取單例實例
   */
  public static getInstance(): AssetsManifest {
    if (!AssetsManifest.instance) {
      AssetsManifest.instance = new AssetsManifest();
    }
    return AssetsManifest.instance;
  }

  /**
   * 載入 manifest 文件
   */
  public async loadManifest(manifestPath: string = 'games/titans/assets-manifest.json'): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      const baseUrl = import.meta.env.BASE_URL || './';
      const url = `${baseUrl}${manifestPath}`;
      const response = await fetch(url);
      
      if (response.ok) {
        this.manifest = await response.json();
        this.loaded = true;
        console.log('[AssetsManifest] Manifest 載入成功:', Object.keys(this.manifest).length, '個文件');
      } else {
        console.warn('[AssetsManifest] Manifest 文件不存在，使用原始路徑');
      }
    } catch (error) {
      console.warn('[AssetsManifest] 載入 manifest 失敗，使用原始路徑:', error);
    }
  }

  /**
   * 解析資源路徑（如果 manifest 中有對應的 hash 版本，返回 hash 版本，否則返回原路徑）
   * @param originalPath 原始資源路徑（相對於 games/titans/assets）
   * @returns 解析後的資源路徑
   */
  public resolvePath(originalPath: string): string {
    // 如果 manifest 中沒有對應項，返回原路徑
    if (!this.loaded || !this.manifest[originalPath]) {
      return originalPath;
    }

    return this.manifest[originalPath];
  }

  /**
   * 解析完整的資源 URL（包含 BASE_URL）
   * @param originalPath 原始資源路徑（例如：'games/titans/assets/png/titans1-0.json'）
   * @returns 完整的資源 URL
   */
  public resolveUrl(originalPath: string): string {
    const baseUrl = import.meta.env.BASE_URL || './';
    
    // 檢查是否是 games/titans/assets 路徑
    if (originalPath.startsWith('games/titans/assets/')) {
      const relativePath = originalPath.replace('games/titans/assets/', '');
      const resolvedPath = this.resolvePath(relativePath);
      return `${baseUrl}games/titans/assets/${resolvedPath}`;
    }

    // 如果不是 assets 路徑，直接返回
    return `${baseUrl}${originalPath}`;
  }
}
