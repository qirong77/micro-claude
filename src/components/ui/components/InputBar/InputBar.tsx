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
  // 空文本特殊处理
  if (!text) {
    return { displayLines: [], cursorLineIdx: -1, cursorColIdx: 0 };
  }

  const displayLines: string[] = [];
  let cursorLineIdx = -1;
  let cursorColIdx = 0;
  const availableWidth = Math.max(1, terminalWidth - promptWidth);
  let accumulatedOffset = 0;
  let found = false;

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStartOffset = accumulatedOffset;
    const lineEndOffset = accumulatedOffset + line.length;

    // 判断光标是否在这一逻辑行内（光标可以在行尾，即紧邻换行符之前）
    const cursorInThisLine =
      !found && cursorOffset >= lineStartOffset && cursorOffset <= lineEndOffset;
    const cursorOffsetInLine = cursorInThisLine ? cursorOffset - lineStartOffset : -1;

    if (line.length === 0) {
      // 空行：只产生一行显示
      displayLines.push('');
      if (cursorInThisLine && !found) {
        cursorLineIdx = displayLines.length - 1;
        cursorColIdx = 0;
        found = true;
      }
    } else {
      // 对该行进行软换行
      let offset = 0;
      while (offset < line.length) {
        const chunk = line.substring(offset, offset + availableWidth);
        displayLines.push(chunk);

        if (cursorInThisLine && !found) {
          if (cursorOffsetInLine >= offset && cursorOffsetInLine <= offset + chunk.length) {
            // 光标在这个 chunk 内（或在 chunk 末尾后一个位置，即下一 chunk 开头）
            cursorLineIdx = displayLines.length - 1;
            cursorColIdx = Math.min(cursorOffsetInLine - offset, chunk.length);
            found = true;
          }
        }

        offset += availableWidth;
      }
    }

    accumulatedOffset += line.length + 1; // +1 for newline
  }

  // 如果光标位置超出了文本范围，把光标放在最后
  if (!found) {
    cursorLineIdx = Math.max(0, displayLines.length - 1);
    cursorColIdx = displayLines.length > 0 ? displayLines[displayLines.length - 1].length : 0;
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
    return calculateDisplayLines(value, cursorOffset, stdout.columns);
  }, [value, cursorOffset, stdout.columns]);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <Box flexDirection="column">
      <Box key="sep-top">
        <Text dimColor>{separator}</Text>
      </Box>
      <Box flexDirection="row" key="input-row">
        <Box key="prompt">
          <Text color={C.primary}>{'>'}</Text>
        </Box>
        <Box flexDirection="column" marginLeft={1} flexGrow={1} key="input-area">
          {displayLines.length === 0 ? (
            <Box key="empty">
              <Text backgroundColor={C.primary}>
                {' '}
              </Text>
              {placeholder && <Text dimColor>{placeholder}</Text>}
            </Box>
          ) : (
            displayLines.map((line, lineIdx) => {
              const isCursorLine = lineIdx === cursorLineIdx;
              return (
                <Box key={lineIdx}>
                  {isCursorLine ? (
                    <>
                      {cursorColIdx > 0 ? (
                        <Text>{line.substring(0, cursorColIdx)}</Text>
                      ) : null}
                      <Text backgroundColor={C.primary}>
                        {line[cursorColIdx] || ' '}
                      </Text>
                      {cursorColIdx < line.length ? (
                        <Text>{line.substring(cursorColIdx + 1)}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text>{line}</Text>
                  )}
                </Box>
              );
            })
          )}
        </Box>
        {cfg.label && (
          <Box marginLeft={1} key="status-label">
            <Text color={cfg.color}>
              {cfg.spinner ? `${spinner} ${cfg.label}...` : `\u2713 ${cfg.label}`}
            </Text>
          </Box>
        )}
      </Box>
      <Box key="sep-bottom">
        <Text dimColor>{separator}</Text>
      </Box>
    </Box>
  );
}
