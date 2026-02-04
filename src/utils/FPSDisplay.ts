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
      strokeThickness: 2,
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
    if (!this.drawcallUpdateFrame) {
      this.drawcallUpdateFrame = 0;
      this.cachedDrawcalls = 0;
    }
    
    this.drawcallUpdateFrame++;
    if (this.drawcallUpdateFrame < 30) {
      return this.cachedDrawcalls; // 返回緩存值
    }
    
    this.drawcallUpdateFrame = 0;
    
    // 簡化計算：只計算直接子對象，不遞歸（避免性能問題）
    let count = 0;
    const maxChildren = 100; // 限制計算的子對象數量
    
    // 只計算 stage 的直接子對象，不遞歸
    for (let i = 0; i < Math.min(this.app.stage.children.length, maxChildren); i++) {
      const child = this.app.stage.children[i];
      if (child.visible) {
        if (child instanceof PIXI.Sprite || 
            child instanceof PIXI.Graphics || 
            child instanceof PIXI.Mesh) {
          count++;
        } else if (child instanceof PIXI.Container) {
          // 只計算第一層子對象
          count += Math.min(child.children.length, 20); // 限制每個容器的子對象數量
        }
      }
    }
    
    this.cachedDrawcalls = count;
    return count;
  }

  public destroy(): void {
    if (this.app && this.app.ticker) {
      this.app.ticker.remove(() => this.update());
    }
    super.destroy();
  }
}
