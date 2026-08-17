import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // R24: Genau eine Persistenzschicht. Aller Speicherzugriff läuft über
  // src/lib/store.ts – dort steht die Fehlerbehandlung und der Migrationspfad.
  // Diese Regel ist die Absicherung, nicht die Erinnerung (B-17 AK 1).
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/lib/store.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'R24: Speicherzugriff nur in src/lib/store.ts.' },
        { name: 'sessionStorage', message: 'R24: Speicherzugriff nur in src/lib/store.ts.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'R24: Speicherzugriff nur in src/lib/store.ts.' },
        { object: 'window', property: 'sessionStorage', message: 'R24: Speicherzugriff nur in src/lib/store.ts.' },
      ],
    },
  },
])
