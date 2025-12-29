# ⚡ Titans 拉霸遊戲

這是一個基於 **SlotBase 底層框架** 開發的 Titans 拉霸遊戲，展示了如何繼承底層架構來創建新遊戲。

## 📁 專案結構

```
games/titans/
├── assets/                          # 遊戲資源
│   ├── spine/                       # Spine 動畫資源（.skel, .atlas）
│   └── Symbol/                      # 符號圖片資源
├── constants/
│   ├── enum.ts                      # 遊戲常數定義
│   └── SymbolMapper.ts             # 符號映射工具
├── controllers/
│   └── TitansSlotController.ts      # Titans 拉霸控制器
├── enum/
│   └── gameEnum.ts                  # 遊戲事件枚舉
├── models/
│   └── TitansSlotModel.ts           # Titans 拉霸資料模型
├── views/
│   ├── TitansSlotView.ts            # Titans 拉霸主視圖
│   └── main/
│       ├── BetPanel.ts              # 投注面板
│       ├── GameScene.ts             # 遊戲場景
│       ├── MainGame.ts              # 主遊戲視圖
│       ├── bigAnimation/            # 大獎動畫管理
│       │   ├── BigAnimationManager.ts
│       │   ├── BigTreasure.ts       # 大寶藏動畫
│       │   ├── BigWin.ts            # 大獎動畫
│       │   ├── FessSpin.ts          # 購買免費旋轉
│       │   ├── FreeEnd.ts            # 免費遊戲結束
│       │   └── Transition.ts        # 場景轉換動畫
│       ├── symbol/
│       │   └── TitansSymbol.ts      # Titans 符號組件
│       └── wheel/
│           └── TitansWheel.ts       # Titans 轉輪組件
├── TitansSlotApp.ts                 # Titans 拉霸應用程式
├── main.ts                          # 遊戲入口
├── index.html                       # HTML 入口文件
└── README.md                        # 本文件
```

## 🎮 遊戲功能

### 基礎功能
- ✅ 5 軸 3 排拉霸遊戲
- ✅ 旋轉動畫（使用 Spine 動畫）
- ✅ 獲勝動畫與特效
- ✅ 餘額管理
- ✅ 投注設定（Bet Panel）
- ✅ WebSocket 即時通訊

### 特殊功能
- 🎁 **免費遊戲（Free Game）** - 觸發免費旋轉模式
- 💎 **大獎動畫（Big Win）** - 大獎獲勝動畫效果
- 🏆 **大寶藏（Big Treasure）** - 特殊大獎動畫
- 🛒 **購買免費遊戲（Buy FG）** - 直接購買免費旋轉
- 🌟 **符號動畫** - 使用 Spine 動畫的符號特效
- 🔄 **場景轉換** - 主遊戲與免費遊戲場景切換
- 🌐 **多語言支援** - 支援中文繁體、中文簡體、英文

## 🏗️ 架構說明

### 繼承關係

```
BaseModel
  ↓
SlotMachineModel
  ↓
TitansSlotModel ← 擴展 Titans 拉霸邏輯
```

```
BaseView
  ↓
TitansSlotView ← 實現 Titans 拉霸 UI
  ├── MainGame (主遊戲場景)
  ├── BetPanel (投注面板)
  └── BigAnimationManager (大獎動畫管理)
```

```
BaseController
  ↓
TitansSlotController ← 協調 Model 和 View
```

```
SlotMachineApp
  ↓
TitansSlotApp ← 整合所有組件
```

### MVC 互動流程

```
1. 用戶點擊旋轉按鈕
   → TitansSlotView 觸發 'spinButtonClicked' 事件

2. TitansSlotController 接收事件
   → 調用 TitansSlotModel.startSpin()
   → 發送 WebSocket 訊息（11000）

3. TitansSlotModel 處理邏輯
   → 扣除投注
   → 觸發 'spinStarted' 事件

4. TitansSlotController 接收 'spinStarted'
   → 調用 TitansSlotView.startSpinAnimation()

5. WebSocket 接收伺服器結果（11001）
   → TitansSlotModel.setSpinResult()
   → 觸發 'spinCompleted' 事件

6. TitansSlotController 接收 'spinCompleted'
   → 調用 TitansSlotView.stopSpinAnimation()
   → 根據獲勝類型播放對應動畫（BigWin/BigTreasure）
   → 發送 WebSocket 訊息（11010）確認動畫完成
```

## 🚀 使用方法

### 1. 基本使用

```typescript
import { TitansSlotApp, TitansSlotAppConfig } from './TitansSlotApp';

const config: TitansSlotAppConfig = {
  container: document.getElementById('game-container')!,
  width: 1080,
  height: 1920,
  backgroundColor: 0x000000,
  
  // API 配置
  apiConfig: {
    baseUrl: 'https://your-api-server.com/api',
    timeout: 10000
  },
  
  // 資源配置（圖片、Spine 動畫等）
  resources: [
    { id: 'symbol_01', url: '/games/titans/assets/Symbol/symbol_01.png', type: 'image' },
    { id: 'symbol_01_skel', url: '/games/titans/assets/spine/Symbol_01.skel', type: 'skel' },
    { id: 'symbol_01_atlas', url: '/games/titans/assets/spine/Symbol_01.atlas', type: 'atlas' },
    // ... 更多資源
  ],
  
  // Titans 拉霸特定配置
  TitansConfig: {
    TitansTypes: ['titan1', 'titan2', 'titan3', 'titan4', 'titan5'],
    bonusThreshold: 3,
    jackpotMultiplier: 100,
    autoSpinDelay: 2000,
    spinDuration: 3000
  },
  
  enableOfflineMode: true
};

const app = new TitansSlotApp(config);
await app.initialize();
app.start();
```

### 2. 遊戲控制

```typescript
// 開始旋轉
app.spin();

// 設置投注
app.setBet(50);

// 獲取餘額
const balance = app.getBalance();

// 增加餘額（測試用）
app.addBalance(1000);

// 觸發免費遊戲
app.triggerFreeGame();

// 購買免費遊戲
app.buyFreeGame();

// 重設遊戲
app.resetGame();
```

### 3. 監聽事件

```typescript
const model = app.getTitansModel();

// 監聽旋轉完成
model.on('spinCompleted', (result: TitansSlotResult) => {
  console.log('旋轉結果:', result);
  console.log('獲勝金額:', result.winAmount);
  console.log('獲勝連線:', result.winLines);
});

// 監聽免費遊戲開始
model.on('freeGameStarted', (times: number) => {
  console.log('免費遊戲開始，次數:', times);
});

// 監聽大獎
model.on('bigWin', (amount: number) => {
  console.log('大獎！', amount);
});
```

### 4. WebSocket 通訊

遊戲會自動處理 WebSocket 連接，主要訊息類型：

- **11000** - 發送旋轉請求
- **11001** - 接收旋轉結果
- **11010** - 發送動畫完成確認

```typescript
// WebSocket 連接會在初始化時自動建立
// 可以通過 app 實例訪問 WebSocket Manager
const wsManager = app.getWebSocketManager();
```

## 📝 擴展開發

### 添加新符號類型

在 `TitansSlotModel.ts` 中修改：

```typescript
TitansConfig: {
  TitansTypes: ['titan1', 'titan2', 'titan3', 'titan4', 'titan5', 'titan6'], // 新增符號
  bonusThreshold: 3,
  jackpotMultiplier: 100
}
```

在 `SymbolMapper.ts` 中添加符號映射：

```typescript
export class SymbolMapper {
  static mapSymbolId(id: number): string {
    const mapping: Record<number, string> = {
      1: 'symbol_01',
      2: 'symbol_02',
      // ... 添加新映射
      12: 'symbol_12' // 新符號
    };
    return mapping[id] || 'symbol_01';
  }
}
```

### 自定義獲勝計算

在 `TitansSlotModel.ts` 中重寫：

```typescript
override calculateWin(winLines: WinLineInfo[]): number {
  // 你的自定義邏輯
  let totalWin = 0;
  winLines.forEach(line => {
    totalWin += line.Win;
  });
  return totalWin;
}
```

### 添加新動畫

在 `views/main/bigAnimation/` 中創建新的動畫類：

```typescript
// CustomAnimation.ts
export class CustomAnimation extends Container {
  public async play(): Promise<void> {
    // 你的動畫邏輯
  }
}
```

在 `BigAnimationManager.ts` 中註冊：

```typescript
public playCustomAnimation(): void {
  const animation = new CustomAnimation();
  this.addChild(animation);
  animation.play();
}
```

### 添加新 UI 元素

在 `TitansSlotView.ts` 或對應的子視圖中添加：

```typescript
protected async createComponents(): Promise<void> {
  // 現有組件...
  
  // 新組件
  this.customElement = this.createCustomElement();
  this.addChild(this.customElement);
}
```

## 🧪 測試

### 手動測試

遊戲啟動後可以通過瀏覽器控制台進行測試：

```typescript
// 獲取應用實例
const app = (window as any).TitansSlotApp;

// 執行測試
app.setBet(100);
app.spin();

// 檢查狀態
console.log('餘額:', app.getBalance());
console.log('當前投注:', app.getTitansModel().getCurrentBet());
console.log('遊戲狀態:', app.getCurrentState());
```

### 測試功能

- 🎲 旋轉 - `app.spin()`
- 💰 增加餘額 - `app.addBalance(1000)`
- 💵 設置投注 - `app.setBet(50)`
- 🎁 觸發免費遊戲 - `app.triggerFreeGame()`
- 🛒 購買免費遊戲 - `app.buyFreeGame()`
- 🔄 重設遊戲 - `app.resetGame()`

## 💡 開發技巧

### 1. 使用事件驅動
```typescript
// ❌ 不推薦：直接調用
this.view.updateBalance(1000);

// ✅ 推薦：通過 Model 事件
this.model.setBalance(1000); // 會自動觸發 'balanceChanged' 事件
```

### 2. Spine 動畫使用
```typescript
// 載入 Spine 動畫資源
const skeleton = resourceManager.getResource('symbol_01_skel');
const atlas = resourceManager.getResource('symbol_01_atlas');

// 創建 Spine 動畫實例
const spineAnimation = new Spine(skeleton.data, atlas.data);
spineAnimation.state.setAnimation(0, 'animation_name', true);
```

### 3. WebSocket 訊息處理
```typescript
// 發送訊息
wsManager.send({
  cmd: 11000,
  data: {
    bet: this.model.getCurrentBet()
  }
});

// 監聽訊息
wsManager.on(WebSocketEvent.MESSAGE, (data) => {
  if (data.cmd === 11001) {
    // 處理旋轉結果
    this.handleSpinResult(data.data);
  }
});
```

### 4. 多語言支援
```typescript
// 根據 URL 參數決定語言
const urlParams = new URLSearchParams(window.location.search);
const language = urlParams.get('lang'); // 'zh-TW', 'zh-CN', 'en'

// 資源路徑中使用語言變數
const resourceUrl = `/games/titans/assets/game_logo_${lang}.png`;
```

## 🐛 常見問題

### Q: 如何連接真實 API？

A: 修改 `TitansSlotController.ts` 中的 WebSocket 連接：

```typescript
private async initializeWebSocket(): Promise<void> {
  const wsUrl = 'wss://your-websocket-server.com';
  this.wsManager = WebSocketManager.getInstance();
  await this.wsManager.connect(wsUrl);
}
```

### Q: 如何添加音效？

A: 在資源列表中添加音效，然後在適當時機播放：

```typescript
resources: [
  { id: 'sfx_spin', url: '/games/titans/assets/sfx/spin.mp3', type: 'audio' },
  { id: 'sfx_win', url: '/games/titans/assets/sfx/win.mp3', type: 'audio' }
]

// 播放音效
const sound = resourceManager.getResource('sfx_spin');
sound.play();
```

### Q: Spine 動畫載入失敗怎麼辦？

A: 確保 `.skel` 和 `.atlas` 檔案都正確載入，並且路徑正確：

```typescript
// 確保兩個資源都載入
{ id: 'symbol_01_skel', url: '/games/titans/assets/spine/Symbol_01.skel', type: 'skel' },
{ id: 'symbol_01_atlas', url: '/games/titans/assets/spine/Symbol_01.atlas', type: 'atlas' }
```

### Q: 如何優化性能？

A: 
1. 使用精靈圖集（Sprite Atlas）減少 HTTP 請求
2. 限制同時播放的 Spine 動畫數量
3. 使用對象池（Object Pool）重用符號組件
4. 適當降低 Spine 動畫更新頻率
5. 使用 WebGL 渲染優化

### Q: WebSocket 連接失敗怎麼辦？

A: 檢查 WebSocket URL 是否正確，並確保伺服器支援 WebSocket 協議：

```typescript
// 檢查連接狀態
if (wsManager.isConnected()) {
  console.log('WebSocket 已連接');
} else {
  console.error('WebSocket 連接失敗');
}
```

## 📚 相關文件

- [遊戲繼承開發指南](../../GAME_INHERITANCE_GUIDE.md)
- [SlotBase README](../../README.md)
- [PixiJS 文檔](https://pixijs.com/)
- [Spine 動畫文檔](https://esotericsoftware.com/spine-pixi-v8)

## 🔧 技術棧

- **PixiJS v8** - 2D WebGL 渲染引擎
- **Spine** - 2D 骨骼動畫系統
- **TypeScript** - 類型安全的 JavaScript
- **Vite** - 現代化構建工具
- **WebSocket** - 即時通訊協議

## 📄 授權

與主專案相同

---

**Enjoy coding! 🎮⚡**
