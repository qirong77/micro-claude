import React, { useCallback, useMemo, useReducer, useState } from 'react';
import { Box, useInput, useStdout } from 'ink';
import type { Command } from './data.js';

import { LogArea } from './components/LogArea.js';
import { StatusBar } from './components/StatusBar.js';
import { ThinkText } from './components/ThinkText.js';
import { ToolCallList } from './components/ToolCallList.js';
import { TerminalInput } from './components/TerminalInput.js';

interface AppProps {
  isLoading?: boolean;
  quickCommands: readonly Command[];
  onSubmit: (text: string) => void;
}

export function App({
  quickCommands,
  onSubmit,
}: AppProps): React.ReactNode {
  const { stdout } = useStdout();

  return (
    <Box flexDirection="column" height="100%">
      <LogArea />
      <TerminalInput onSubmit={onSubmit}/>
      <StatusBar />
      <ToolCallList />
      <ThinkText />
      <Box paddingBottom={1} />
    </Box>
  );
}
