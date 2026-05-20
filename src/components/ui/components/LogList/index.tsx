import React from 'react';
import { Box, Text } from '@anthropic/ink';
import { useSchedulState } from '../../hooks/useSchedulState.js';
import { logTextAtom, toolCallsAtom } from '../../../../store/ui-state.js';
import { systemLogAtom } from '../../../../store/logAtom.js';

const MAX_LINES = 8;
const MAX_TOOL_CALLS = 3;

function AgentLogPanel(): React.ReactNode {
  const text = useSchedulState(logTextAtom);
  const toolCalls = useSchedulState(toolCallsAtom);

  if (text.length > 0) {
    const lines = text.split('\n');
    const display = lines.length > MAX_LINES ? lines.slice(-MAX_LINES).join('\n') : text;

    return (
      <Box flexDirection="column" height={MAX_LINES}>
        <Text dimColor>{display}</Text>
      </Box>
    );
  }

  if (toolCalls.length > 0) {
    const sorted = [...toolCalls].sort((a, b) => Number(a.completed) - Number(b.completed));
    const displayed = sorted.slice(0, MAX_TOOL_CALLS);

    return (
      <Box flexDirection="column">
        {displayed.map((tc) => (
          <Box key={tc.id}>
            <Text dimColor>{tc.displayText}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  return null;
}

function SystemLogPanel(): React.ReactNode {
  const lines = useSchedulState(systemLogAtom);
  if (lines.length === 0) return null;

  const display =
    lines.length > MAX_LINES ? lines.slice(-MAX_LINES).join('\n') : lines.join('\n');

  return (
    <Box flexDirection="column" height={MAX_LINES}>
      <Text dimColor>{display}</Text>
    </Box>
  );
}

export const LogList = React.memo(function LogList(): React.ReactNode {
  const text = useSchedulState(logTextAtom);
  const toolCalls = useSchedulState(toolCallsAtom);
  const systemLines = useSchedulState(systemLogAtom);

  const hasAgentLog = text.length > 0 || toolCalls.length > 0;
  const hasSystemLog = systemLines.length > 0;
  if (!hasAgentLog && !hasSystemLog) return null;

  return (
    <Box flexDirection="row" width="100%">
      <Box flexGrow={1} width="50%" paddingRight={1}>
        <AgentLogPanel />
      </Box>
      <Box flexGrow={1} width="50%" paddingLeft={1}>
        <SystemLogPanel />
      </Box>
    </Box>
  );
});

export const LogListUI = {
  renderFn: LogList,
  atomData: { logText: logTextAtom, systemLog: systemLogAtom },
};
