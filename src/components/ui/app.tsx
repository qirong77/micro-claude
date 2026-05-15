import React, { useCallback, useMemo, useReducer, useState } from 'react';
import { Box } from '@anthropic/ink';
import type { Command } from './data.js';

import { LogArea } from './components/LogArea.js';
import { MessageBar } from './components/MessageBar.js';
import { ThinkText } from './components/ThinkText.js';
import { ToolCallList } from './components/ToolCallList.js';
import { TerminalInput } from './components/TerminalInput/TerminalInput.js';
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
      <TerminalInput onSubmit={onSubmit} />
      <InputStatus />
      <DropDownSelect />
      <MessageBar />
      <ToolCallList />
      <ThinkText />
      <Box paddingBottom={1} />
    </Box>
  );
}
