import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'
import { viteStaticCopy } from 'vite-plugin-static-copy'

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
        }
      ]
    })
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
      }
    }
  }
})
