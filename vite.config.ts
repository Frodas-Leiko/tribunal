import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  // B-33: Kennung dieses Builds. Sie wandert in die Registrierungsadresse des
  // Service Workers (`sw.js?v=…`) und von dort in den Namen seines Caches – so
  // bekommt jeder Build einen eigenen Cache, und der alte wird beim Aktivieren
  // gelöscht. Ein Zeitstempel genügt: Er muss sich je Build unterscheiden, nicht
  // den Inhalt beschreiben.
  define: {
    __BUILD_ID__: JSON.stringify(new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)),
  },
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
