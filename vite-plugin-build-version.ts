import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Vite 插件：管理構建版本號
 * 每次執行 build 時自動將版本號 +1
 */
export function vitePluginBuildVersion(): Plugin {
  const versionFile = join(process.cwd(), 'build-version.json');
  let currentVersion = 1;

  // 讀取版本號的輔助函數
  const readVersion = (): number => {
    try {
      if (existsSync(versionFile)) {
        const content = readFileSync(versionFile, 'utf-8');
        const data = JSON.parse(content);
        return data.version || 1;
      } else {
        // 如果文件不存在，創建它
        writeFileSync(versionFile, JSON.stringify({ version: 1 }, null, 2), 'utf-8');
        return 1;
      }
    } catch (error) {
      console.warn('[vite-plugin-build-version] 讀取版本號失敗，使用默認值 1:', error);
      return 1;
    }
  };

  return {
    name: 'vite-plugin-build-version',
    enforce: 'pre', // 在其他插件之前執行
    config(config, { command }) {
      // 在配置階段讀取版本號（僅在 build 模式下）
      if (command === 'build') {
        currentVersion = readVersion();
        console.log(`[vite-plugin-build-version] 當前版本號: ${currentVersion}`);
        
        // 將版本號注入到 define 中
        if (!config.define) {
          config.define = {};
        }
        config.define['import.meta.env.BUILD_VERSION'] = JSON.stringify(currentVersion);
      }
    },
    buildStart() {
      // 確保版本號已讀取
      if (currentVersion === 1 && existsSync(versionFile)) {
        currentVersion = readVersion();
      }
    },
    closeBundle() {
      // 構建完成時將版本號 +1（僅在 build 模式下）
      try {
        const newVersion = currentVersion + 1;
        writeFileSync(versionFile, JSON.stringify({ version: newVersion }, null, 2), 'utf-8');
        console.log(`[vite-plugin-build-version] 版本號已更新: ${currentVersion} -> ${newVersion}`);
      } catch (error) {
        console.warn('[vite-plugin-build-version] 更新版本號失敗:', error);
      }
    }
  };
}

export default vitePluginBuildVersion;
