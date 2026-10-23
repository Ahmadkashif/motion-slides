import { configDefaults, defineConfig } from 'vitest/config';

// Agent worktrees under .claude/ are other branches checked out inside this folder; their tests are not
// this checkout's tests.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
