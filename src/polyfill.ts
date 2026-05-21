import { execSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync } from 'node:fs';

/** Minimum Node.js version required to run mica. */
export const MIN_NODE_VERSION = '20.10.0';

function parseNodeVersion(version: string): [number, number, number] {
  const match = version.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareNodeVersion(a: string, b: string): number {
  const av = parseNodeVersion(a);
  const bv = parseNodeVersion(b);
  for (let i = 0; i < 3; i++) {
    if (av[i] !== bv[i]) return av[i] - bv[i];
  }
  return 0;
}

function isGteNodeVersion(current: string, minimum: string): boolean {
  return compareNodeVersion(current, minimum) >= 0;
}

function sortNodeVersionsDesc(versions: string[]): string[] {
  return [...versions].sort((a, b) => compareNodeVersion(b, a));
}

const SWITCH_ATTEMPT_ENV = 'MICA_NODE_SWITCH_ATTEMPT';
const MAX_SWITCH_ATTEMPTS = 2;

const FALLBACK_VERSIONS = ['20.10', '20', '22', 'default'] as const;

function isNodeVersionSatisfied(version = process.version): boolean {
  return isGteNodeVersion(version, MIN_NODE_VERSION);
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore', env: process.env });
    return true;
  } catch {
    return false;
  }
}

function resolveNvmDir(): string | null {
  const dir = process.env.NVM_DIR ?? `${process.env.HOME ?? ''}/.nvm`;
  if (dir && existsSync(`${dir}/nvm.sh`)) return dir;
  return null;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function parseVersionTokens(output: string): string[] {
  const versions = new Set<string>();
  for (const match of output.matchAll(/v?(\d+\.\d+(?:\.\d+)?)/g)) {
    const token = match[1]!;
    const normalized = token.split('.').length === 2 ? `${token}.0` : token;
    if (isGteNodeVersion(normalized, MIN_NODE_VERSION)) versions.add(normalized);
  }
  return sortNodeVersionsDesc([...versions]);
}

function listFnmSatisfyingVersions(): string[] {
  try {
    const output = execSync('fnm list', { encoding: 'utf8', env: process.env });
    return parseVersionTokens(output);
  } catch {
    return [];
  }
}

function listNvmSatisfyingVersions(nvmDir: string): string[] {
  try {
    const output = execSync(`source ${shellQuote(`${nvmDir}/nvm.sh`)} && nvm list`, {
      encoding: 'utf8',
      env: process.env,
      shell: '/bin/bash',
    });
    return parseVersionTokens(output);
  } catch {
    return [];
  }
}

function buildVersionCandidates(installed: string[]): string[] {
  const candidates = new Set<string>(installed);
  for (const version of FALLBACK_VERSIONS) candidates.add(version);
  return [...candidates];
}

type Runner = { command: string; args: string[] };

/** Pick runner for re-exec: .js uses node, .ts prefers tsx then bun. */
function resolveRunner(script: string): Runner {
  if (!script.endsWith('.ts')) {
    return { command: 'node', args: [script] };
  }
  if (commandExists('tsx')) {
    return { command: 'tsx', args: [script] };
  }
  if (commandExists('bun')) {
    return { command: 'bun', args: ['run', script] };
  }
  return { command: 'node', args: [script] };
}

function buildFnmExecArgs(version: string, runner: Runner, args: string[]): string[] {
  return ['exec', '--using', version, runner.command, ...runner.args, ...args];
}

function buildNvmExecCommand(version: string, runner: Runner, args: string[]): string {
  const commandArgs = [...runner.args, ...args].map(shellQuote).join(' ');
  return `nvm exec ${version} ${runner.command} ${commandArgs}`;
}

function tryFnmExec(
  version: string,
  script: string,
  args: string[],
  attempt: number,
): SpawnSyncReturns<Buffer> {
  const runner = resolveRunner(script);
  return spawnSync('fnm', buildFnmExecArgs(version, runner, args), {
    stdio: 'inherit',
    env: { ...process.env, [SWITCH_ATTEMPT_ENV]: String(attempt) },
  });
}

function tryNvmExec(
  version: string,
  script: string,
  args: string[],
  nvmDir: string,
  attempt: number,
): SpawnSyncReturns<Buffer> {
  const runner = resolveRunner(script);
  const shellScript = [
    `export ${SWITCH_ATTEMPT_ENV}=${attempt}`,
    `source ${shellQuote(`${nvmDir}/nvm.sh`)}`,
    buildNvmExecCommand(version, runner, args),
  ].join('\n');

  return spawnSync('bash', ['-lc', shellScript], {
    stdio: 'inherit',
    env: process.env,
  });
}

function handoffToChild(result: SpawnSyncReturns<Buffer>): boolean {
  if (result.error) return false;
  return result.status !== null;
}

function exitWithChildStatus(result: SpawnSyncReturns<Buffer>): never {
  process.exit(result.status ?? 1);
}

function formatAttemptErrors(
  manager: string,
  results: Array<{ version: string; message: string }>,
): string {
  return results.map((r) => `  - ${manager} ${r.version}: ${r.message}`).join('\n');
}

function reportVersionFailure(
  currentVersion: string,
  fnmErrors: Array<{ version: string; message: string }>,
  nvmErrors: Array<{ version: string; message: string }>,
  noManager: boolean,
): never {
  const parts = [
    `当前 Node 版本为 ${currentVersion}，需要 >= ${MIN_NODE_VERSION}。`,
  ];

  if (noManager) {
    parts.push('未检测到 fnm 或 nvm，请先安装并配置 Node 版本管理器。');
  } else {
    parts.push('已尝试使用 fnm / nvm 切换 Node 版本，但均失败：');
    if (fnmErrors.length > 0) parts.push(formatAttemptErrors('fnm', fnmErrors));
    if (nvmErrors.length > 0) parts.push(formatAttemptErrors('nvm', nvmErrors));
    parts.push(
      `请安装 Node >= ${MIN_NODE_VERSION}，例如：`,
      '  fnm install 20',
      '  nvm install 20',
    );
  }

  console.error(parts.join('\n'));
  process.exit(1);
}

function reportSwitchStillInsufficient(version: string): never {
  console.error(
    [
      `切换 Node 版本后仍为 ${version}，需要 >= ${MIN_NODE_VERSION}。`,
      '请安装更高版本的 Node，例如：',
      '  fnm install 20',
      '  nvm install 20',
    ].join('\n'),
  );
  process.exit(1);
}

function trySwitchWith(
  manager: 'fnm' | 'nvm',
  versions: string[],
  script: string,
  args: string[],
  attempt: number,
  nvmDir?: string,
): Array<{ version: string; message: string }> {
  const errors: Array<{ version: string; message: string }> = [];

  for (const version of versions) {
    const result =
      manager === 'fnm'
        ? tryFnmExec(version, script, args, attempt)
        : tryNvmExec(version, script, args, nvmDir!, attempt);

    if (handoffToChild(result)) exitWithChildStatus(result);

    errors.push({
      version,
      message: result.error?.message ?? `exit ${result.status ?? 'unknown'}`,
    });
  }

  return errors;
}

/**
 * Ensure the current process runs on a supported Node.js version.
 * If not, re-exec via fnm or nvm. Exits the process on failure.
 */
export function ensureNodeVersion(): void {
  if (process.versions.bun) return;

  if (isNodeVersionSatisfied()) return;

  const attempt = Number(process.env[SWITCH_ATTEMPT_ENV] ?? 0);
  if (attempt >= MAX_SWITCH_ATTEMPTS) {
    reportSwitchStillInsufficient(process.version);
  }

  const script = process.argv[1];
  if (!script) {
    console.error('无法确定入口脚本路径，无法切换 Node 版本。');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const nextAttempt = attempt + 1;

  const fnmErrors: Array<{ version: string; message: string }> = [];
  const nvmErrors: Array<{ version: string; message: string }> = [];

  if (commandExists('fnm')) {
    const installed = listFnmSatisfyingVersions();
    fnmErrors.push(...trySwitchWith('fnm', buildVersionCandidates(installed), script, args, nextAttempt));
  }

  const nvmDir = resolveNvmDir();
  if (nvmDir) {
    const installed = listNvmSatisfyingVersions(nvmDir);
    nvmErrors.push(
      ...trySwitchWith('nvm', buildVersionCandidates(installed), script, args, nextAttempt, nvmDir),
    );
  }

  const noManager = !commandExists('fnm') && !nvmDir;
  reportVersionFailure(process.version, fnmErrors, nvmErrors, noManager);
}

ensureNodeVersion();
