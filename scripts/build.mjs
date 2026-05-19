import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  banner: { js: '#!/usr/bin/env -S node --no-warnings' },
  outfile: './dist/bin/index.js',
  packages: 'external',
  external: ['react-devtools-core', 'bun:bundle'],
  plugins: [
    {
      name: 'bun-bundle-shim',
      setup(build) {
        // Replace bun:bundle imports with a shim that returns false for all features
        build.onResolve({ filter: /^bun:bundle$/ }, () => {
          return { path: path.resolve(__dirname, 'bun-bundle-shim.ts') };
        });
      },
    },
  ],
  loader: { '.md': 'text' },
});

import { chmodSync } from 'node:fs';
import { installGlobal } from './install-global.mjs';

chmodSync('./dist/bin/index.js', 0o755);
console.log('Build complete');

installGlobal();
