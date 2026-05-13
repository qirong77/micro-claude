import React, { useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { C } from '../../data.js';
import { inputBarStatusAtom } from '../../../../store/index.js';
import { useSchedulState } from '../../hooks/useSchedulState.js';
import { useSpinner } from '../common/Spin.js';

const STATUS_CONFIG: Record<string, { label: string; color: string; spinner: boolean }> = {
  idle: { label: '', color: '', spinner: false },
  thinking: { label: 'Thinking', color: C.cyan, spinner: true },
  calling_tool: { label: 'Calling tool', color: C.primary, spinner: true },
  completed: { label: 'Done', color: C.success, spinner: false },
  error: { label: 'Error', color: C.error, spinner: false },
};

/**
 * 根据文本和光标位置，计算考虑终端宽度的光标所在的"显示行"
 * @returns { displayLines, cursorLineIdx, cursorColIdx }
 */
function calculateDisplayLines(
  text: string,
  cursorOffset: number,
  terminalWidth: number,
  promptWidth: number = 2, // '> '
) {
  const lines = text.split('\n');
  const displayLines: string[] = [];
  let cursorLineIdx = 0;
  let cursorColIdx = 0;
  let accumulatedOffset = 0;
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStartOffset = accumulatedOffset;
    const lineEndOffset = accumulatedOffset + line.length;

    // 计算该行是否包含光标
    const cursorInThisLine = !found && cursorOffset >= lineStartOffset && cursorOffset <= lineEndOffset;
    const cursorOffsetInLine = cursorInThisLine ? cursorOffset - lineStartOffset : -1;

    // 根据终端宽度对该行进行软换行
    const availableWidth = terminalWidth - promptWidth; // 减去提示符宽度
    if (availableWidth <= 0) {
      // 防止终端宽度过小
      displayLines.push(line);
      if (cursorInThisLine) {
        cursorLineIdx = displayLines.length - 1;
        cursorColIdx = cursorOffsetInLine;
        found = true;
      }
    } else if (line.length === 0) {
      displayLines.push('');
      if (cursorInThisLine) {
        cursorLineIdx = displayLines.length - 1;
        cursorColIdx = 0;
        found = true;
      }
    } else if (line.length <= availableWidth) {
      // 该行不需要换行
      displayLines.push(line);
      if (cursorInThisLine) {
        cursorLineIdx = displayLines.length - 1;
        cursorColIdx = cursorOffsetInLine;
        found = true;
      }
    } else {
      // 需要进行软换行
      let offset = 0;
      while (offset < line.length) {
        const chunk = line.substring(offset, offset + availableWidth);
        displayLines.push(chunk);

        if (cursorInThisLine && !found && cursorOffsetInLine >= offset && cursorOffsetInLine < offset + chunk.length) {
          cursorLineIdx = displayLines.length - 1;
          cursorColIdx = cursorOffsetInLine - offset;
          found = true;
        } else if (cursorInThisLine && !found && offset + chunk.length === line.length && cursorOffsetInLine === line.length) {
          // 光标在行末的特殊情况
          cursorLineIdx = displayLines.length - 1;
          cursorColIdx = chunk.length;
          found = true;
        }

        offset += availableWidth;
      }
    }

    accumulatedOffset += line.length + 1; // +1 for newline
  }

  return { displayLines, cursorLineIdx, cursorColIdx };
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
  const status = useSchedulState(inputBarStatusAtom);
  const spinner = useSpinner();

  const { displayLines, cursorLineIdx, cursorColIdx } = useMemo(() => {
    if (!value) {
      return { displayLines: [], cursorLineIdx: 0, cursorColIdx: 0 };
    }
    return calculateDisplayLines(value, cursorOffset, stdout.columns);
  }, [value, cursorOffset, stdout.columns]);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box flexDirection="row">
        <Box>
          <Text color={C.primary} >{'>'}</Text>
        </Box>
        <Box flexDirection="column" marginLeft={1} flexGrow={1}>
          {displayLines.length === 0 ? (
            <Box>
              <Text backgroundColor={C.primary}>
                {' '}
              </Text>
              {placeholder && <Text dimColor>{placeholder}</Text>}
            </Box>
          ) : (
            displayLines.map((line, lineIdx) => (
              <Box key={lineIdx}>
                {lineIdx === cursorLineIdx ? (
                  <>
                    {cursorColIdx > 0 && <Text>{line.substring(0, cursorColIdx)}</Text>}
                    <Text
                      backgroundColor={C.primary}
                      key={`cursor-${lineIdx}`}
                    >
                      {line[cursorColIdx] || ' '}
                    </Text>
                    {cursorColIdx < line.length && (
                      <Text>{line.substring(cursorColIdx + 1)}</Text>
                    )}
                  </>
                ) : (
                  <Text>{line}</Text>
                )}
              </Box>
            ))
          )}
        </Box>
        {cfg.label && (
          <Box marginLeft={1}>
            <Text color={cfg.color}>
              {cfg.spinner ? `${spinner} ${cfg.label}...` : `\u2713 ${cfg.label}`}
            </Text>
          </Box>
        )}
      </Box>
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>
    </Box>
  );
}
