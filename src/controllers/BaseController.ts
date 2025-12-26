import { BaseModel } from '@models/BaseModel';
import { BaseView } from '@views/BaseView';

// 基礎 Controller 類別
export abstract class BaseController {
  protected model: BaseModel;
  protected view: BaseView;
  protected isInitialized: boolean = false;

  constructor(model: BaseModel, view: BaseView) {
    this.model = model;
    this.view = view;
  }

  // 初始化控制器
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // 初始化 Model 和 View
    await this.model.initialize();
    await this.view.initialize();

    // 綁定 Model 事件
    this.bindModelEvents();
    
    // 綁定 View 事件
    this.bindViewEvents();

    this.isInitialized = true;
  }

  // 銷毀控制器
  destroy(): void {
    this.unbindModelEvents();
    this.unbindViewEvents();
    
    this.model.destroy();
    this.view.destroy();
    
    this.isInitialized = false;
  }

  // 更新控制器
  update(deltaTime?: number): void {
    if (this.isInitialized) {
      this.view.update(deltaTime);
    }
  }

  // 抽象方法 - 子類必須實現
  protected abstract bindModelEvents(): void;
  protected abstract unbindModelEvents(): void;
  protected abstract bindViewEvents(): void;
  protected abstract unbindViewEvents(): void;

  // 獲取 Model
  protected getModel(): BaseModel {
    return this.model;
  }

  // 獲取 View
  protected getView(): BaseView {
    return this.view;
  }

  // 檢查是否已初始化
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  // 處理錯誤的通用方法
  protected handleError(error: string | Error): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    console.error(`[${this.constructor.name}] 錯誤:`, errorMessage);
    
    // 可以在這裡添加錯誤回報邏輯
  }

  // 日誌記錄的通用方法
  protected log(message: string, ...args: any[]): void {
    console.log(`[${this.constructor.name}]`, message, ...args);
  }
} 