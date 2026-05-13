import React, { useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { C } from '../../data.js';

/**
 * 计算软换行后的显示行、光标行和列
 * @param text 原始文本
 * @param cursorOffset 光标在原始文本中的偏移量
 * @param terminalWidth 终端宽度
 * @returns { displayLines, logicalLineIndices, cursorLineIdx, cursorColIdx }
 */
function calculateDisplayLines(
  text: string,
  cursorOffset: number,
  terminalWidth: number,
) {
  const lines = text.split('\n');
  const displayLines: string[] = [];
  const logicalLineIndices: number[] = []; // 每一个 displayLine 对应的逻辑行索引
  let cursorLineIdx = 0;
  let cursorColIdx = 0;
  let globalOffset = 0;
  let cursorFound = false;

  for (let logicalLineIdx = 0; logicalLineIdx < lines.length; logicalLineIdx++) {
    const line = lines[logicalLineIdx];
    const lineStart = globalOffset;
    const lineEnd = globalOffset + line.length;

    // 检查光标是否在当前逻辑行
    const cursorInThisLine = !cursorFound && cursorOffset >= lineStart && cursorOffset <= lineEnd;
    const cursorOffsetInLine = cursorInThisLine ? cursorOffset - lineStart : -1;

    // 根据终端宽度进行软换行（保留左边的 prompt 空间）
    const PROMPT_WIDTH = 2; // '> ' 或 '  '
    const availableWidth = Math.max(20, terminalWidth - PROMPT_WIDTH); // 最小宽度 20

    if (line.length === 0) {
      displayLines.push('');
      logicalLineIndices.push(logicalLineIdx);
      if (cursorInThisLine) {
        cursorLineIdx = displayLines.length - 1;
        cursorColIdx = 0;
        cursorFound = true;
      }
    } else if (line.length <= availableWidth) {
      // 不需要软换行
      displayLines.push(line);
      logicalLineIndices.push(logicalLineIdx);
      if (cursorInThisLine) {
        cursorLineIdx = displayLines.length - 1;
        cursorColIdx = cursorOffsetInLine;
        cursorFound = true;
      }
    } else {
      // 需要软换行，按 availableWidth 分割
      let charIdx = 0;
      while (charIdx < line.length) {
        const chunkEnd = Math.min(charIdx + availableWidth, line.length);
        const chunk = line.substring(charIdx, chunkEnd);
        displayLines.push(chunk);
        logicalLineIndices.push(logicalLineIdx);

        if (cursorInThisLine && !cursorFound) {
          // 光标在这个块内（包括块的末尾）
          if (cursorOffsetInLine >= charIdx && cursorOffsetInLine <= chunkEnd) {
            cursorLineIdx = displayLines.length - 1;
            cursorColIdx = cursorOffsetInLine - charIdx;
            cursorFound = true;
          }
        }

        charIdx = chunkEnd;
      }
    }

    globalOffset += line.length + 1; // +1 for '\n'
  }

  return { displayLines, logicalLineIndices, cursorLineIdx, cursorColIdx };
}

export function InputBar({
  value,
  cursorOffset,
  placeholder,
}: {
  value: string;
  cursorOffset: number;
  placeholder?: string;
}): React.ReactNode {
  const { stdout } = useStdout();
  const separator = useMemo(() => '─'.repeat(stdout.columns), [stdout.columns]);

  const { displayLines, logicalLineIndices, cursorLineIdx, cursorColIdx } = useMemo(() => {
    if (!value) {
      return { displayLines: [], logicalLineIndices: [], cursorLineIdx: 0, cursorColIdx: 0 };
    }
    return calculateDisplayLines(value, cursorOffset, stdout.columns);
  }, [value, cursorOffset, stdout.columns]);

  return (
    <Box flexDirection="column">
      <Text dimColor>{separator}</Text>
      {value ? (
        displayLines.map((line, i) => (
          <Box key={i} paddingX={1}>
            <Text bold color={C.primary}>
              {logicalLineIndices[i] === 0 ? '>' : ' '}
            </Text>
            <Text>
              {' '}
              {i === cursorLineIdx ? (
                <>
                  {line.slice(0, cursorColIdx)}
                  <Text color={C.primary}>█</Text>
                  {line.slice(cursorColIdx)}
                </>
              ) : (
                line
              )}
            </Text>
          </Box>
        ))
      ) : (
        <Box paddingX={1}>
          <Text bold color={C.primary}>
            {'>'}
          </Text>
          <Text> </Text>
          <Text color={C.primary}>█</Text>
          <Text dimColor> {placeholder}</Text>
        </Box>
      )}
      <Text dimColor>{separator}</Text>
    </Box>
  );
}
