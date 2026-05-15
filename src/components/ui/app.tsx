import React, { useCallback, useMemo, useReducer, useState } from 'react';
import { Box, useInput, useStdout } from 'ink';
import type { Command } from './data.js';

import { LogArea } from './components/LogArea.js';
import { MessageBar } from './components/MessageBar.js';
import { ThinkText } from './components/ThinkText.js';
import { ToolCallList } from './components/ToolCallList.js';
import { TerminalInput } from './components/TerminalInput.js';
import { InputStatus } from './components/InputStatus.js';
import { DropDownSelect } from './components/DropDownSelect.js';

interface AppProps {
  isLoading?: boolean;
  quickCommands: readonly Command[];
  onSubmit: (text: string) => void;
}

export function App({ quickCommands, onSubmit }: AppProps): React.ReactNode {
  return (
    <Box flexDirection="column" height="100%">
      <LogArea />
      <TerminalInput onSubmit={onSubmit} commands={quickCommands} />
      <InputStatus />
      <DropDownSelect />
      <MessageBar />
      <ToolCallList />
      <ThinkText />
      <Box paddingBottom={1} />
    </Box>
  );
}
