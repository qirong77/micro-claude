import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, unlinkSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

// 直接导入待测试函数
import { toolDefinitions, executeTool } from '../src/components/tools/index';

describe('toolDefinitions', () => {
  it('应包含所有 6 个工具定义', () => {
    expect(toolDefinitions.length).toBe(6);
  });

  it('每个工具定义都包含 name / description / input_schema', () => {
    for (const tool of toolDefinitions) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema).toBeTruthy();
    }
  });
});

describe('executeTool - read_file', () => {
  const tmpFile = path.join(tmpdir(), 'micra-test-read.txt');
  beforeEach(() => writeFileSync(tmpFile, 'hello\nworld'));
  afterEach(() => unlinkSync(tmpFile));

  it('应读取文件并返回带行号的内容', async () => {
    const result = await executeTool('read_file', { file_path: tmpFile });
    expect(result).toContain('1 | hello');
    expect(result).toContain('2 | world');
  });
});

describe('executeTool - write_file', () => {
  const tmpFile = path.join(tmpdir(), 'micra-test-write.txt');
  afterEach(() => {
    try {
      unlinkSync(tmpFile);
    } catch {}
  });

  it('应写入文件并返回成功消息', async () => {
    const result = await executeTool('write_file', { file_path: tmpFile, content: 'test content' });
    expect(result).toBe(`写入成功: ${tmpFile}`);
    expect(readFileSync(tmpFile, 'utf-8')).toBe('test content');
  });

  it('应自动创建不存在的目录', async () => {
    const nestedFile = path.join(tmpdir(), 'micra-nested', 'test.txt');
    await executeTool('write_file', { file_path: nestedFile, content: 'nested' });
    expect(readFileSync(nestedFile, 'utf-8')).toBe('nested');
    rmSync(path.dirname(nestedFile), { recursive: true });
  });
});

describe('executeTool - edit_file', () => {
  const tmpFile = path.join(tmpdir(), 'micra-test-edit.txt');
  beforeEach(() => writeFileSync(tmpFile, 'foo bar baz'));
  afterEach(() => unlinkSync(tmpFile));

  it('应替换匹配的文本', async () => {
    const result = await executeTool('edit_file', {
      file_path: tmpFile,
      old_string: 'bar',
      new_string: 'qux',
    });
    expect(result).toBe(`编辑成功: ${tmpFile}`);
    expect(readFileSync(tmpFile, 'utf-8')).toBe('foo qux baz');
  });

  it('未找到匹配文本时应返回提示', async () => {
    const result = await executeTool('edit_file', {
      file_path: tmpFile,
      old_string: 'notfound',
      new_string: 'xxx',
    });
    expect(result).toBe('未找到匹配文本');
  });
});

describe('executeTool - list_files', () => {
  it('应列出当前目录下 .ts 文件', async () => {
    const result = await executeTool('list_files', { pattern: 'src/components/Tools/index.ts' });
    expect(result).toContain('index.ts');
  });

  it('无匹配时应返回提示', async () => {
    const result = await executeTool('list_files', { pattern: 'zzz_no_match_*.xyz' });
    expect(result).toBe('没有匹配的文件。');
  });
});

describe('executeTool - grep_search', () => {
  it('应在工具文件中搜索内容', async () => {
    const result = await executeTool('grep_search', {
      pattern: 'executeTool',
      path: 'src',
      include: '*.ts',
    });
    expect(result).toContain('executeTool');
  });
});

describe('executeTool - run_shell', () => {
  it('应执行 shell 命令并返回输出', async () => {
    const result = await executeTool('run_shell', { command: 'echo hello' });
    expect(result).toContain('hello');
  });
});

describe('executeTool - unknown tool', () => {
  it('未知工具名应返回提示', async () => {
    const result = await executeTool('nonexistent_tool', {});
    expect(result).toBe('未知工具: nonexistent_tool');
  });
});
