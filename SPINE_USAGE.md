# Spine 動畫使用說明

## 導入方式

### 1. 導入 pixi-spine 包

```typescript
import * as PIXI from 'pixi.js';
import 'pixi-spine'; // 這會註冊 Spine 載入器並擴展 PIXI 命名空間
```

### 2. 使用 Spine

```typescript
// 方法 1: 使用 PIXI.spine.Spine
const skeletonData = await PIXI.Assets.load('/games/titans/assets/spine/Transition.json');
const spine = new PIXI.spine.Spine(skeletonData);

// 方法 2: 使用類型定義（需要聲明類型）
import 'pixi-spine';
declare const Spine: typeof PIXI.spine.Spine;
const spine = new Spine(skeletonData);
```

## 完整示例

```typescript
import * as PIXI from 'pixi.js';
import 'pixi-spine';

async function createTransitionSpine() {
  // 載入 Spine JSON 文件（載入器會自動處理相關的 .atlas 和圖片文件）
  const skeletonData = await PIXI.Assets.load('/games/titans/assets/spine/Transition.json');
  
  // 創建 Spine 實例
  const spine = new PIXI.spine.Spine(skeletonData);
  
  // 設置位置和縮放
  spine.x = 540; // 居中
  spine.y = 960;
  
  // 播放動畫
  spine.state.setAnimation(0, 'In', false);
  
  return spine;
}
```

## 注意事項

1. `pixi-spine` 是舊版本的 Spine 插件
2. Spine 類在 `PIXI.spine` 命名空間下
3. 構造函數直接接受 `skeletonData`，不需要包裝成對象
4. 只需載入 JSON 文件，載入器會自動處理相關的 .atlas 和圖片文件

