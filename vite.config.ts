import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { vitePluginAssetsHash } from './vite-plugin-assets-hash'

export default defineConfig({
  base: './',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'games/titans/assets/**/*',
          dest: 'games/titans/assets'
        },
        {
          src: 'games/titans/index.html',
          dest: 'games/titans'
        },
        {
          src: 'games/titans/config/**/*',
          dest: 'games/titans/config'
        }
      ]
    }),
    vitePluginAssetsHash()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@models': fileURLToPath(new URL('./src/models', import.meta.url)),
      '@views': fileURLToPath(new URL('./src/views', import.meta.url)),
      '@controllers': fileURLToPath(new URL('./src/controllers', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0', // 允許外部訪問（手機可以透過 WiFi 連接）
    port: 3000,
    open: true
  },
  preview: {
    port: 4000,
    open: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        // 為 assets 添加 hash
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          if (/mp3|wav|ogg|m4a/i.test(ext)) {
            return `assets/audio/[name]-[hash][extname]`;
          }
          if (/mp4|webm|ogg|mov/i.test(ext)) {
            return `assets/video/[name]-[hash][extname]`;
          }
          // 其他資源文件
          return `assets/[name]-[hash][extname]`;
        },
        // 為 chunk 文件添加 hash（如果需要的話）
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      }
    }
  }
})
