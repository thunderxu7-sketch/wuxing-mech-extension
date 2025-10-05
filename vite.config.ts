import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// 导入 path 模块来解析路径，增强兼容性
import { resolve } from 'path'; 

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 关键配置：确保构建产物是相对路径
  base: './', 

  build: {
    // 确保构建产物在插件加载时能正确找到资源
    assetsDir: 'assets',
    // 禁用 CSS 代码分割，确保所有样式都在 JS 中加载，简化插件加载流程
    cssCodeSplit: false,
    
    // 自定义 Rollup 配置，指定入口文件
    rollupOptions: {
        input: {
          popup: resolve(__dirname, 'index.html'), 
        },
        output: {
            // 确保生成的文件名是固定的，而不是哈希化（可选，但更清晰）
            entryFileNames: `[name].js`,
            chunkFileNames: `[name].js`,
            assetFileNames: `[name].[ext]`,
        },
    },
  },
});