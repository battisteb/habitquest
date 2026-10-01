import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';
import globals from 'globals';

export default defineConfig([
  ...expoConfig,
  {
    // Supabase Edge Functions run on Deno (URL imports) and are not part of the app bundle.
    ignores: ['node_modules/', 'dist/', '.expo/', 'coverage/', 'supabase/functions/', 'marketing/exports/'],
  },
  {
    files: ['scripts/**/*.js', 'marketing/**/*.js'],
    languageOptions: { globals: globals.node },
  },
]);
