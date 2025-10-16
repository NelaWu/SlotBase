# 🍎 水果拉霸遊戲

這是一個基於 **SlotBase 底層框架** 開發的水果拉霸遊戲範例，展示了如何繼承底層架構來創建新遊戲。

## 📁 專案結構

```
games/fruit-slot/
├── models/
│   └── FruitSlotModel.ts          # 水果拉霸資料模型
├── views/
│   └── FruitSlotView.ts           # 水果拉霸視圖
├── controllers/
│   └── FruitSlotController.ts     # 水果拉霸控制器
├── FruitSlotApp.ts                # 水果拉霸應用程式
├── main.ts                        # 遊戲入口
└── README.md                      # 本文件
```

## 🎮 遊戲功能

### 基礎功能
- ✅ 5 軸 3 排拉霸遊戲
- ✅ 旋轉動畫
- ✅ 獲勝動畫
- ✅ 餘額管理
- ✅ 投注設定

### 特殊功能
- 🎁 **免費旋轉** - 收集特定符號觸發
- 💎 **大獎模式** - 隨機觸發高倍數獎勵
- 🌟 **Bonus 遊戲** - 多種獎勵模式

## 🏗️ 架構說明

### 繼承關係

```
BaseModel
  ↓
SlotMachineModel
  ↓
FruitSlotModel ← 擴展水果拉霸邏輯
```

```
BaseView
  ↓
FruitSlotView ← 實現水果拉霸 UI
```

```
BaseController
  ↓
FruitSlotController ← 協調 Model 和 View
```

```
SlotMachineApp
  ↓
FruitSlotApp ← 整合所有組件
```

### MVC 互動流程

```
1. 用戶點擊旋轉按鈕
   → FruitSlotView 觸發 'spinButtonClicked' 事件

2. FruitSlotController 接收事件
   → 調用 FruitSlotModel.startSpin()

3. FruitSlotModel 處理邏輯
   → 扣除投注
   → 觸發 'spinStarted' 事件

4. FruitSlotController 接收 'spinStarted'
   → 調用 FruitSlotView.startSpinAnimation()

5. 伺服器回傳結果（或模擬）
   → FruitSlotModel.setSpinResult()
   → 觸發 'spinCompleted' 事件

6. FruitSlotController 接收 'spinCompleted'
   → 調用 FruitSlotView.stopSpinAnimation()
   → 如果獲勝，調用 playWinAnimation()
```

## 🚀 使用方法

### 1. 基本使用

```typescript
import { FruitSlotApp, FruitSlotAppConfig } from './FruitSlotApp';

const config: FruitSlotAppConfig = {
  container: document.getElementById('game-container')!,
  apiConfig: { baseUrl: 'https://api.example.com' },
  resources: [...],
  fruitConfig: {
    fruitTypes: ['apple', 'orange', 'watermelon', 'grape', 'cherry'],
    bonusThreshold: 3,
    jackpotMultiplier: 100
  },
  enableOfflineMode: true
};

const app = new FruitSlotApp(config);
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

// 觸發 Bonus
app.triggerBonus('freeSpins');

// 重設遊戲
app.resetGame();
```

### 3. 監聽事件

```typescript
const model = app.getFruitModel();

// 監聽旋轉完成
model.on('spinCompleted', (result) => {
  console.log('旋轉結果:', result);
});

// 監聽免費旋轉
model.on('freeSpinsAwarded', (count) => {
  console.log('獲得免費旋轉:', count);
});

// 監聽大獎
model.on('jackpotWon', (amount) => {
  console.log('中大獎！', amount);
});
```

## 📝 擴展開發

### 添加新符號類型

在 `FruitSlotModel.ts` 中修改：

```typescript
fruitConfig: {
  fruitTypes: ['apple', 'orange', 'watermelon', 'grape', 'cherry', 'lemon'], // 新增檸檬
  bonusThreshold: 3,
  jackpotMultiplier: 100
}
```

### 自定義獲勝計算

在 `FruitSlotModel.ts` 中重寫：

```typescript
override calculateFruitWin(symbols: string[][]): number {
  // 你的自定義邏輯
  return totalWin;
}
```

### 添加新動畫

在 `FruitSlotView.ts` 中添加：

```typescript
public playCustomAnimation(): void {
  // 你的動畫邏輯
}
```

### 添加新 UI 元素

在 `FruitSlotView.ts` 的 `createComponents()` 中：

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

遊戲啟動後會自動創建測試控制台（右上角），包含以下功能：
- 🎲 旋轉
- 💰 增加餘額
- 💵 設置投注
- 🎁 觸發免費旋轉
- 🔄 重設遊戲

### 程式化測試

```typescript
// 獲取應用實例
const app = (window as any).fruitSlotApp;

// 執行測試
app.setBet(100);
app.spin();

// 檢查狀態
console.log('餘額:', app.getBalance());
console.log('免費旋轉:', app.getFreeSpinsRemaining());
```

## 💡 開發技巧

### 1. 使用事件驅動
```typescript
// ❌ 不推薦：直接調用
this.view.updateBalance(1000);

// ✅ 推薦：通過 Model 事件
this.model.setBalance(1000); // 會自動觸發 'balanceChanged' 事件
```

### 2. 職責分離
```typescript
// ❌ 不推薦：在 View 中計算邏輯
class FruitSlotView {
  calculateWin() { /* 業務邏輯 */ }
}

// ✅ 推薦：業務邏輯放在 Model
class FruitSlotModel {
  calculateWin() { /* 業務邏輯 */ }
}
```

### 3. 使用 TypeScript 類型
```typescript
// 定義清晰的介面
interface FruitSlotResult extends SpinResult {
  bonusFeature?: 'freeSpins' | 'jackpot' | 'bonusGame';
  freeSpins?: number;
}
```

## 🐛 常見問題

### Q: 如何連接真實 API？

A: 修改 `FruitSlotController.ts` 中的 `simulateSpinResult()`：

```typescript
private async fetchSpinResult(): Promise<FruitSlotResult> {
  const apiManager = ApiManager.getInstance();
  return await apiManager.spin({
    bet: this.model.getCurrentBet()
  });
}
```

### Q: 如何添加音效？

A: 在資源列表中添加音效，然後在適當時機播放：

```typescript
resources: [
  { id: 'sfx_spin', url: '/assets/spin.mp3', type: 'audio' }
]

// 播放音效
const sound = resourceManager.getResource('sfx_spin');
sound.play();
```

### Q: 如何優化性能？

A: 
1. 使用精靈圖集（Sprite Atlas）
2. 限制同時播放的粒子效果
3. 使用對象池（Object Pool）重用組件
4. 適當降低更新頻率

## 📚 相關文件

- [遊戲繼承開發指南](../../GAME_INHERITANCE_GUIDE.md)
- [SlotBase README](../../README.md)
- [PixiJS 文檔](https://pixijs.com/)

## 📄 授權

與主專案相同

---

**Enjoy coding! 🎮**

