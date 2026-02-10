import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        '.next/',
        'coverage/',
        '**/*.config.{ts,js}',
        '**/types.ts',
        '**/*.d.ts',
        'prisma/',
        'public/',
        'scripts/',
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
        'src/app/icon.tsx',
        'src/app/api/**/*.ts',
        'src/middleware.ts',
        'src/components/**/*.tsx', // Exclude UI components
        'src/app/boards/**/*.tsx', // Exclude page-specific components
        'src/**/prisma.ts', // Exclude prisma client initialization
        'src/lib/gemini.ts', // Exclude AI client initialization
        'src/types/**/*.ts', // Exclude type definitions
        'src/app/actions/**/*.ts', // Exclude server actions (better tested via E2E)
        'src/app/lib/ai-actions.ts', // Exclude AI service (external dependencies)
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
