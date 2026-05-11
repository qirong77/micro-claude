import React from "react";
import { Box, Text } from "ink";
import { C } from "../data.js";

export const RunningStatus = React.memo(function RunningStatus({
  statuses,
}: {
  statuses?: Array<{ id: string; text: string }>;
}): React.ReactNode {
  const [dotFrame, setDotFrame] = React.useState(0);
  React.useEffect(() => {
    if (!statuses || statuses.length === 0) {
      return;
    }
    const interval = setInterval(() => {
      setDotFrame((f) => (f + 1) % 4);
    }, 250);
    return () => clearInterval(interval);
  }, [statuses && statuses.length > 0]);

  if (!statuses || statuses.length === 0) return null;

  const dots = ".".repeat(dotFrame);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {statuses.map((s) => (
        <Box key={s.id}>
          <Text>
            <Text color={C.dim}> * </Text>
            <Text color={C.dim}>{s.text}</Text>
            <Text color={C.dim}>{dots}</Text>
          </Text>
        </Box>
      ))}
    </Box>
  );
});
