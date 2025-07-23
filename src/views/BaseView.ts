import * as PIXI from 'pixi.js';

// 基礎 View 類別
export abstract class BaseView extends PIXI.Container {
  protected app: PIXI.Application;
  protected isInitialized: boolean = false;

  constructor(app: PIXI.Application) {
    super();
    this.app = app;
  }

  // 初始化視圖
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.createComponents();
    this.setupLayout();
    this.bindEvents();
    
    this.isInitialized = true;
  }

  // 銷毀視圖
  destroy(): void {
    this.unbindEvents();
    this.removeChildren();
    super.destroy();
    this.isInitialized = false;
  }

  // 抽象方法 - 子類必須實現
  protected abstract createComponents(): Promise<void>;
  protected abstract setupLayout(): void;
  protected abstract bindEvents(): void;
  protected abstract unbindEvents(): void;

  // 更新視圖
  update(deltaTime?: number): void {
    // 子類可以重寫此方法
  }

  // 顯示視圖
  show(): void {
    this.visible = true;
    this.alpha = 1;
  }

  // 隱藏視圖
  hide(): void {
    this.visible = false;
  }

  // 淡入效果
  async fadeIn(duration: number = 500): Promise<void> {
    return new Promise(resolve => {
      this.visible = true;
      this.alpha = 0;
      
      // 使用 PIXI 的 ticker 來做動畫
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        this.alpha = progress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }

  // 淡出效果
  async fadeOut(duration: number = 500): Promise<void> {
    return new Promise(resolve => {
      const startTime = Date.now();
      const startAlpha = this.alpha;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        this.alpha = startAlpha * (1 - progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.visible = false;
          resolve();
        }
      };
      
      animate();
    });
  }

  // 調整大小
  resize(width: number, height: number): void {
    // 子類可以重寫此方法來處理大小調整
  }

  // 獲取應用程式實例
  protected getApp(): PIXI.Application {
    return this.app;
  }

  // 檢查是否已初始化
  getIsInitialized(): boolean {
    return this.isInitialized;
  }
} 