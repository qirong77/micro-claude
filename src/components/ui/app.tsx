import React, { useCallback, useMemo, useReducer, useState } from 'react';
import { Box } from '@anthropic/ink';
import type { Command } from './data.js';

import { LogArea } from './components/Conversation/LogArea.js';
import { MessageBar } from './components/MessageBar.js';
import { ThinkText } from './components/ThinkText.js';
import { ToolCallList } from './components/ToolCallList.js';
import { TerminalInputUI } from './components/TerminalInput/TerminalInput.js';
import { InputStatus } from './components/InputStatus.js';
import { DropDownSelect } from './components/DropDown/DropDownSelect.js';

interface AppProps {
  isLoading?: boolean;
  quickCommands: readonly Command[];
  onSubmit: (text: string) => void;
}

export function App(): React.ReactNode {
  return (
    <Box flexDirection="column" height="100%">
      {TerminalInputUI.renderFn()}
      <InputStatus />
      <DropDownSelect />
      <MessageBar />
      <ToolCallList />
      <ThinkText />
      <Box paddingBottom={1} />
    </Box>
  );
}
