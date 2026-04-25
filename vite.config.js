import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // 解决飞书WebView访问路径问题
  base: './', // 关键：构建后资源路径为相对路径，避免404
  server: {
    host: '0.0.0.0', // 允许飞书访问本地服务
    port: 5173,
    cors: true, // 允许跨域（飞书插件调用API需要）
  },
  build: {
    outDir: 'dist', // 输出目录（默认dist，和你的工程一致）
    assetsDir: 'assets', // 静态资源目录（和你的工程一致）
    rollupOptions: {
      output: {
        // 避免构建产物命名混乱
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
