# 拉霸機底層系統

這是一個使用 **PixiJS + TypeScript + Vite** 開發的拉霸機底層系統，採用 **狀態機架構** 和 **MVC 設計模式**。

## 🎯 主要功能

- **狀態機管理** - 完整的遊戲狀態控制
- **MVC 架構** - 清晰的代碼結構和職責分離
- **資源管理** - 統一的資源載入和管理
- **API 通訊** - 與後端伺服器的通訊管理
- **載入系統** - 完整的遊戲載入流程
- **響應式設計** - 支援不同螢幕尺寸

## 📁 專案結構

```
SlotBase/
├── src/                      # 源代碼目錄
│   ├── core/                 # 核心系統
│   │   ├── StateMachine.ts   # 狀態機核心
│   │   ├── SlotMachineStates.ts  # 拉霸機狀態定義
│   │   ├── ResourceManager.ts    # 資源管理器
│   │   ├── ApiManager.ts     # API 管理器
│   │   └── GameLoader.ts     # 遊戲載入器
│   ├── models/              # 資料模型 (MVC-Model)
│   │   ├── BaseModel.ts     # 基礎模型類別
│   │   └── SlotMachineModel.ts   # 拉霸機模型
│   ├── views/               # 視圖層 (MVC-View)
│   │   └── BaseView.ts      # 基礎視圖類別
│   ├── controllers/         # 控制器 (MVC-Controller)
│   │   └── BaseController.ts    # 基礎控制器類別
│   ├── utils/               # 工具函數
│   ├── assets/              # 靜態資源
│   ├── SlotMachineApp.ts    # 主應用程式類別
│   └── main.ts              # 程式入口點
├── index.html               # HTML 入口檔案
├── package.json            # 專案配置
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 配置
└── README.md               # 專案說明
```

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動開發伺服器

```bash
npm run dev
```

### 3. 建構專案

```bash
npm run build
```

### 4. 預覽建構結果

```bash
npm run preview
```

## 🏗️ 架構說明

### 狀態機 (State Machine)

拉霸機使用狀態機來管理遊戲流程：

- **LOADING** - 載入中
- **IDLE** - 待機狀態
- **SPINNING** - 轉動中
- **STOPPING** - 停止中
- **RESULT** - 顯示結果
- **CELEBRATE** - 慶祝動畫
- **ERROR** - 錯誤狀態

### MVC 架構

- **Model** - 管理遊戲資料和商業邏輯
- **View** - 處理 UI 顯示和用戶互動
- **Controller** - 協調 Model 和 View 之間的通訊

### 核心系統

#### 資源管理器 (ResourceManager)

- 統一管理圖片、音效、字體等資源
- 支援批量載入和進度追蹤
- 單例模式確保資源共享

#### API 管理器 (ApiManager)

- 處理與後端伺服器的通訊
- 內建重試機制和錯誤處理
- 支援認證和請求攔截

#### 載入器 (GameLoader)

- 協調資源載入和 API 初始化
- 提供詳細的載入進度
- 支援離線模式

## 🎮 使用方法

### 基本使用

```typescript
import { SlotMachineApp, SlotMachineAppConfig } from "./SlotMachineApp";

// 配置應用程式
const config: SlotMachineAppConfig = {
  container: document.getElementById("game-container")!,
  width: 1024,
  height: 768,
  apiConfig: {
    baseUrl: "https://your-api-server.com",
  },
  resources: [
    { id: "symbol1", url: "/assets/symbol1.png", type: "image" },
    // 更多資源...
  ],
  enableOfflineMode: false,
};

// 創建和初始化應用程式
const app = new SlotMachineApp(config);
await app.initialize();
app.start();

// 控制遊戲
app.setBet(50); // 設置投注金額
app.spin(); // 開始轉動
console.log(app.getCurrentState()); // 獲取當前狀態
```

### 自定義狀態處理

```typescript
// 擴展狀態機
const stateMachine = app.getStateMachine();
stateMachine.onStateChange((from, to) => {
  console.log(`狀態轉換: ${from} → ${to}`);
});

// 監聽模型事件
const model = app.getModel();
model.on("spinCompleted", (result) => {
  console.log("轉動完成:", result);
});
```

### 資源管理

```typescript
import { ResourceManager } from "@core/ResourceManager";

const resourceManager = ResourceManager.getInstance();

// 載入單一資源
await resourceManager.loadResource({
  id: "background",
  url: "/assets/background.jpg",
  type: "image",
});

// 獲取資源
const backgroundImage = resourceManager.getResource("background");
```

### API 通訊

```typescript
import { ApiManager } from "@core/ApiManager";

const apiManager = ApiManager.getInstance({
  baseUrl: "https://api.example.com",
  timeout: 10000,
});

// 登入
const { token, player } = await apiManager.login("username", "password");

// 開始轉動
const result = await apiManager.spin({ bet: 50 });
```

## 🛠️ 開發指南

### 添加新狀態

1. 在 `SlotMachineStates.ts` 中定義新狀態
2. 在 `SlotMachineApp.ts` 中添加狀態處理邏輯
3. 配置狀態轉換規則

### 創建自定義 View

```typescript
import { BaseView } from "@views/BaseView";

export class CustomView extends BaseView {
  protected async createComponents(): Promise<void> {
    // 創建 UI 組件
  }

  protected setupLayout(): void {
    // 設置佈局
  }

  protected bindEvents(): void {
    // 綁定事件
  }

  protected unbindEvents(): void {
    // 解綁事件
  }
}
```

### 擴展 Model

```typescript
import { BaseModel } from "@models/BaseModel";

export class CustomModel extends BaseModel {
  async initialize(): Promise<void> {
    // 初始化邏輯
  }

  destroy(): void {
    // 清理邏輯
  }
}
```

## 🔧 配置選項

### 應用程式配置

```typescript
interface SlotMachineAppConfig {
  container: HTMLElement; // 遊戲容器
  width?: number; // 遊戲寬度 (預設: 1024)
  height?: number; // 遊戲高度 (預設: 768)
  backgroundColor?: number; // 背景色 (預設: 0x1099bb)
  resolution?: number; // 解析度 (預設: devicePixelRatio)
  apiConfig: ApiConfig; // API 配置
  gameConfig?: SlotMachineConfig; // 遊戲配置
  resources: ResourceDefinition[]; // 資源列表
  enableOfflineMode?: boolean; // 離線模式 (預設: false)
}
```

### API 配置

```typescript
interface ApiConfig {
  baseUrl: string; // API 基礎 URL
  timeout?: number; // 請求超時 (預設: 10000ms)
  retryAttempts?: number; // 重試次數 (預設: 3)
  retryDelay?: number; // 重試延遲 (預設: 1000ms)
  headers?: Record<string, string>; // 自定義 headers
}
```

## 📝 注意事項

1. **離線模式**: 開發時可啟用 `enableOfflineMode` 來跳過 API 連接
2. **資源路徑**: 確保資源文件路徑正確且可訪問
3. **狀態管理**: 避免手動修改狀態，使用狀態機的轉換方法
4. **記憶體管理**: 適當清理事件監聽器和資源引用
5. **錯誤處理**: 實現適當的錯誤處理和用戶提示

## 快速開始

### 安裝依賴

npm install

### 啟動開發伺服器

npm run dev

### 建構專案

npm run build

## 基本使用

```typescript
 // 創建應用程式
const app = new SlotMachineApp({
  container: document.getElementById('game-canvas')!,
  apiConfig: { baseUrl: 'https://your-api.com' },
  resources: [...], // 您的資源配置
  enableOfflineMode: true // 開發模式
});

// 初始化並啟動
await app.initialize();
app.start();

// 控制遊戲
app.setBet(50);
app.spin();
```
