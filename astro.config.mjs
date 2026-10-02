import { defineConfig } from 'astro/config';

// Fully static output. No integrations, no client framework.
export default defineConfig({
  output: 'static',
  build: { inlineStylesheets: 'auto' },
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
});
