/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 全局 Window 接口擴展
declare global {
  interface Window {
    Entry?: {
      getDetail: any;
      setGameDetail: (detail: any) => void;
      clearGameDetail: () => void;
    };
    openPopup?: (url: string, gameInfo?: any) => void;
    closePopup?: () => void;
  }
}

