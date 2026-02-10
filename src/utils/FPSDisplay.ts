import * as PIXI from 'pixi.js';

/**
 * FPS 和 Drawcall 顯示器
 * 只在開發環境（localhost）顯示
 */
export class FPSDisplay extends PIXI.Container {
  private fpsText: PIXI.Text;
  private drawcallText: PIXI.Text;
  private app: PIXI.Application;
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 0;
  private drawcallUpdateFrame: number = 0; // Drawcall 更新計數器
  private cachedDrawcalls: number = 0; // 緩存的 drawcall 數量

  constructor(app: PIXI.Application) {
    super();
    this.app = app;
    
    // 只在開發環境顯示
    if (!this.isDevelopment()) {
      return;
    }

    this.init();
    this.startUpdate();
  }

  private isDevelopment(): boolean {
    return (
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname.includes('192.168') ||
      location.hostname.includes('0.0.0.0')
    );
  }

  private init(): void {
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 16,
      fill: 0x00ff00,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeWidth: 2,
    });

    // FPS 顯示
    this.fpsText = new PIXI.Text('FPS: 0', style);
    this.fpsText.position.set(10, 10);
    this.addChild(this.fpsText);

    // Drawcall 顯示
    this.drawcallText = new PIXI.Text('Drawcalls: 0', style);
    this.drawcallText.position.set(10, 35);
    this.addChild(this.drawcallText);

    // 設置 z-index，確保在最上層
    this.zIndex = 9999;
    this.eventMode = 'none'; // 不響應事件
  }

  private startUpdate(): void {
    // 使用 ticker 更新 FPS
    this.app.ticker.add(() => {
      this.update();
    });
  }

  private update(): void {
    if (!this.isDevelopment()) {
      return;
    }

    // 使用 PixiJS ticker 的 FPS（更準確）
    const tickerFPS = Math.round(this.app.ticker.FPS);
    if (tickerFPS > 0) {
      this.fps = tickerFPS;
    } else {
      // 備用方法：手動計算
      this.frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastTime;

      if (deltaTime >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.frameCount = 0;
        this.lastTime = currentTime;
      }
    }

    // 更新 FPS 顯示
    this.fpsText.text = `FPS: ${this.fps}`;

    // 估算 Drawcall（基於場景中的可渲染對象數量）
    const drawcalls = this.estimateDrawcalls();
    this.drawcallText.text = `Drawcalls: ~${drawcalls}`;

    // 根據 FPS 改變顏色
    if (this.fps >= 55) {
      this.fpsText.style.fill = 0x00ff00; // 綠色（良好）
    } else if (this.fps >= 30) {
      this.fpsText.style.fill = 0xffff00; // 黃色（一般）
    } else {
      this.fpsText.style.fill = 0xff0000; // 紅色（較差）
    }
  }

  private estimateDrawcalls(): number {
    // 優化：緩存結果，每 30 幀更新一次（大幅減少計算開銷）
    this.drawcallUpdateFrame++;
    
    // 每 30 幀更新一次計算
    if (this.drawcallUpdateFrame < 30) {
      return this.cachedDrawcalls; // 返回緩存值
    }
    
    // 重置計數器
    this.drawcallUpdateFrame = 0;
    
    // 嘗試從渲染器獲取實際的 drawcall 數量（最準確）
    let count = 0;
    try {
      const renderer = this.app.renderer as any;
      if (renderer && typeof renderer.gl !== 'undefined') {
        // WebGL 渲染器：從統計信息獲取
        if (renderer.gl && renderer.gl.drawElements) {
          // 嘗試從 PIXI 的統計信息獲取（如果可用）
          const stats = (renderer as any).stats;
          if (stats && typeof stats.drawCalls !== 'undefined') {
            count = stats.drawCalls;
          }
        }
      }
    } catch (e) {
      // 如果無法獲取，使用估算方法
    }
    
    // 如果無法從渲染器獲取，使用估算方法
    if (count === 0) {
      count = this.estimateDrawcallsByScene();
    }
    
    this.cachedDrawcalls = count;
    return count;
  }

  /**
   * 通過遍歷場景估算 drawcall 數量
   */
  private estimateDrawcallsByScene(): number {
    let count = 0;
    const maxChildren = 200; // 增加限制以提高準確性
    
    // 遞歸計算所有可見的可渲染對象
    const countRecursive = (container: PIXI.Container, depth: number = 0): void => {
      // 限制遞歸深度，避免性能問題
      if (depth > 5) return;
      
      for (const child of container.children) {
        if (!child.visible) continue;
        
        if (child instanceof PIXI.Sprite || 
            child instanceof PIXI.Graphics || 
            child instanceof PIXI.Mesh ||
            child instanceof PIXI.NineSlicePlane ||
            child instanceof PIXI.AnimatedSprite) {
          count++;
        } else if (child instanceof PIXI.Container) {
          // 遞歸計算子容器
          countRecursive(child, depth + 1);
        }
      }
    };
    
    // 從 stage 開始計算
    for (let i = 0; i < Math.min(this.app.stage.children.length, maxChildren); i++) {
      const child = this.app.stage.children[i];
      if (child.visible) {
        if (child instanceof PIXI.Sprite || 
            child instanceof PIXI.Graphics || 
            child instanceof PIXI.Mesh ||
            child instanceof PIXI.NineSlicePlane ||
            child instanceof PIXI.AnimatedSprite) {
          count++;
        } else if (child instanceof PIXI.Container) {
          countRecursive(child, 0);
        }
      }
    }
    
    return count;
  }

  public destroy(): void {
    if (this.app && this.app.ticker) {
      this.app.ticker.remove(() => this.update());
    }
    super.destroy();
  }
}
