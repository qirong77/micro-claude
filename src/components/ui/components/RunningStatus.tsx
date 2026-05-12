import React from 'react';
import { Box, Text } from 'ink';
import { C } from '../data.js';

const MAX_VISIBLE = 10;

export const RunningStatus = React.memo(function RunningStatus({
  statuses,
}: {
  statuses?: Array<{ id: string; text: string; completed?: boolean }>;
}): React.ReactNode {
  const hasActive = statuses?.some((s) => !s.completed);

  const [dotFrame, setDotFrame] = React.useState(0);
  React.useEffect(() => {
    if (!hasActive) {
      setDotFrame(0);
      return;
    }
    const interval = setInterval(() => {
      setDotFrame((f) => (f + 1) % 4);
    }, 250);
    return () => clearInterval(interval);
  }, [hasActive]);

  if (!statuses || statuses.length === 0) return null;

  const dots = '.'.repeat(dotFrame);
  const visible = statuses.slice(-MAX_VISIBLE);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {visible.map((s) => (
        <Box key={s.id}>
          <Text>
            <Text color={C.dim}> {s.completed ? '☑️' : ' * '} </Text>
            <Text color={s.completed ? C.dim : undefined}>{s.text}</Text>
            {s.completed ? null : <Text color={C.dim}>{dots}</Text>}
          </Text>
        </Box>
      ))}
    </Box>
  );
});
