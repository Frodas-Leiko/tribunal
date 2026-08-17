import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Regelwerk §5.4: Musik-Logik wird automatisch getestet. Environment `node` –
  // die Logik in src/lib kennt kein DOM. Der Alias `@/` gilt über resolve.alias
  // im Test genauso wie im Build.
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
