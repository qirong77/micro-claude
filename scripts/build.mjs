import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  banner: { js: '#!/usr/bin/env -S node --no-warnings' },
  outfile: './dist/bin/index.js',
  packages: 'external',
  external: ['react-devtools-core'],
  loader: { '.md': 'text' },
});

import { chmodSync } from 'node:fs';
chmodSync('./dist/bin/index.js', 0o755);
console.log('Build complete');
