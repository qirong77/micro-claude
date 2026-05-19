import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function resolveGlobalPrefix() {
  const nodePath = process.execPath;
  const binDir = dirname(nodePath);
  if (basename(nodePath) === 'node' && (binDir.endsWith(`${sep}bin`) || binDir.endsWith('\\bin'))) {
    return dirname(binDir);
  }

  const res = spawnSync(nodePath, ['-p', 'process.config.prefix'], { encoding: 'utf8' });
  const prefix = res.stdout?.trim();
  if (res.status === 0 && prefix) return prefix;

  throw new Error(`无法解析 Node 全局安装目录: ${nodePath}`);
}

function resolveNpmCli() {
  const binDir = dirname(process.execPath);
  const name = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npm = join(binDir, name);
  if (existsSync(npm)) return npm;
  return name;
}

export function installGlobal() {
  const prefix = resolveGlobalPrefix();
  const npm = resolveNpmCli();

  const result = spawnSync(npm, ['install', '-g', projectRoot], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_prefix: prefix,
      npm_config_global: 'true',
    },
  });

  if (result.status !== 0) {
    throw new Error('global install failed');
  }
}
