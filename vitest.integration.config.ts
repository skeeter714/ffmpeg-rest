import { mergeConfig, defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      globalSetup: './src/test-utils/global-setup.ts'
    }
  })
);
