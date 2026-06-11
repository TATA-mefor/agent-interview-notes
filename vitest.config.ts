import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['agent-testing/tests/**/*.test.ts'],
  },
});
