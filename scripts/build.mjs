import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundle dependencies into a single file so `mica` works without node_modules
// (fixes ERR_MODULE_NOT_FOUND for chalk etc. when installed globally).
const external = ['react-devtools-core', 'bun:bundle'];

await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  // Prefer browser builds (e.g. lru-cache) to avoid Node 19+ APIs like tracingChannel.
  conditions: ['browser', 'node', 'import', 'default'],
  mainFields: ['browser', 'module', 'main'],
  banner: {
    js: [
      '#!/usr/bin/env -S node --no-warnings',
      "import { createRequire } from 'module';",
      'const require = createRequire(import.meta.url);',
    ].join('\n'),
  },
  outfile: './dist/bin/index.js',
  external,
  plugins: [
    {
      name: 'bun-bundle-shim',
      setup(build) {
        build.onResolve({ filter: /^bun:bundle$/ }, () => {
          return { path: path.resolve(__dirname, 'bun-bundle-shim.ts') };
        });
      },
    },
  ],
  loader: { '.md': 'text', '.json': 'json' },
});

import { chmodSync } from 'node:fs';
chmodSync('./dist/bin/index.js', 0o755);
console.log('Build complete');
