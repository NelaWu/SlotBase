import type { Plugin } from 'vite';
import { readdirSync, statSync, renameSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, extname, basename, relative } from 'path';
import { createHash } from 'crypto';

/**
 * 為 vite-plugin-static-copy 複製的文件添加 hash
 * 並生成 manifest.json 文件用於運行時解析
 */
export function vitePluginAssetsHash(): Plugin {
  return {
    name: 'vite-plugin-assets-hash',
    enforce: 'post', // 確保在其他插件之後執行
    closeBundle() {
      // 在 bundle 關閉後處理複製的文件
      const distDir = join(process.cwd(), 'dist');
      const assetsDir = join(distDir, 'games/titans/assets');
      
      try {
        const stats = statSync(assetsDir, { throwIfNoEntry: false });
        if (!stats || !stats.isDirectory()) {
          return;
        }

        // 創建 manifest 映射表
        const manifest: Record<string, string> = {};
        
        // 遞歸處理所有文件
        processDirectory(assetsDir, assetsDir, manifest);
        
        // 將 manifest 寫入文件
        const manifestPath = join(distDir, 'games/titans/assets-manifest.json');
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        console.log(`[vite-plugin-assets-hash] 生成 manifest: ${manifestPath}`);
        console.log(`[vite-plugin-assets-hash] 處理了 ${Object.keys(manifest).length} 個文件`);
      } catch (error) {
        console.warn('[vite-plugin-assets-hash] 處理 assets 目錄失敗:', error);
      }
    }
  };
}

/**
 * 遞歸處理目錄中的所有文件，為它們添加 hash
 * @param dir 當前處理的目錄
 * @param baseDir 基礎目錄（用於計算相對路徑）
 * @param manifest manifest 映射表
 */
function processDirectory(dir: string, baseDir: string, manifest: Record<string, string>): void {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath, baseDir, manifest);
    } else {
      try {
        // 讀取文件內容並計算 hash
        const content = readFileSync(filePath);
        const hash = createHash('md5').update(content).digest('hex').substring(0, 8);
        
        // 生成新文件名（添加 hash）
        const ext = extname(file);
        const name = basename(file, ext);
        const newFileName = `${name}-${hash}${ext}`;
        const newFilePath = join(dirname(filePath), newFileName);
        
        // 如果文件名已經包含 hash（格式：name-hash.ext），跳過
        if (file === newFileName) {
          continue;
        }
        
        // 計算相對路徑（相對於 baseDir）
        const relativePath = relative(baseDir, filePath).replace(/\\/g, '/');
        const newRelativePath = relative(baseDir, newFilePath).replace(/\\/g, '/');
        
        // 添加到 manifest（原路徑 -> 新路徑）
        manifest[relativePath] = newRelativePath;
        
        // 重命名文件
        renameSync(filePath, newFilePath);
        console.log(`[vite-plugin-assets-hash] ${relativePath} -> ${newRelativePath}`);
      } catch (error) {
        console.warn(`[vite-plugin-assets-hash] 處理文件失敗: ${filePath}`, error);
      }
    }
  }
}

export default vitePluginAssetsHash;
