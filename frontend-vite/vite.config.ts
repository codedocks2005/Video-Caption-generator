import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vercel from 'vite-plugin-vercel' // <-- 1. You must import the plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vercel() // <-- 2. You must call the plugin
  ],
  // 3. DELETE the entire 'server.proxy' block.
  //    It was overriding Vercel.
  //    We let 'vercel dev' handle all proxying.
})