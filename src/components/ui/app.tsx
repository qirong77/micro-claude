import React, { useCallback, useMemo, useReducer, useState } from 'react';
import { Box, useInput, useStdout } from 'ink';
import type { Command } from './data.js';

import { LogArea } from './components/LogArea.js';
import { StatusBar } from './components/StatusBar.js';
import { ThinkText } from './components/ThinkText.js';
import { ToolCallList } from './components/ToolCallList.js';
import { CommandDropdown } from './components/CommandDropdown.js';
import { IfComponent } from './components/common/IfComponent.js';
import {
  InputBar,
  inputReducer,
  initialState,
  useInputHandler,
} from './components/InputBar/index.js';

interface AppProps {
  isLoading?: boolean;
  quickCommands: readonly Command[];
  onSubmit?: (text: string) => void;
}

export function App({
  quickCommands,
  onSubmit,
}: AppProps): React.ReactNode {
  const { stdout } = useStdout();
  const [state, dispatch] = useReducer(inputReducer, initialState);
  const { value: inputValue, cursor: cursorOffset } = state;

  const [selectedIndex, setSelectedIndex] = useState(0);

  const showDropdown = inputValue.startsWith('/');
  const filterText = showDropdown ? inputValue.slice(1) : '';

  const filteredCommands = useMemo(
    () => (showDropdown ? quickCommands.filter((c) => c.name.startsWith(filterText)) : []),
    [showDropdown, filterText, quickCommands],
  );

  const executeCommand = useCallback(
    (name: string, arg?: string) => {
      const cmd = quickCommands.find((c) => c.name === name);
      cmd?.action(arg);
    },
    [quickCommands],
  );

  const handleInput = useInputHandler({
    inputValue,
    cursorOffset,
    showDropdown,
    filteredCommands,
    selectedIndex,
    dispatch,
    setSelectedIndex,
    executeCommand,
    onSubmit,
    terminalWidth: stdout.columns,
  });

  useInput(handleInput);

  return (
    <Box flexDirection="column" height="100%">
      <LogArea />
      <InputBar value={inputValue} cursorOffset={cursorOffset} />
      <StatusBar />
      <ToolCallList />
      <ThinkText />
      {showDropdown && (
        <CommandDropdown
          commands={filteredCommands}
          selectedIndex={selectedIndex}
          filter={filterText}
        />
      )}
      <Box paddingBottom={1} />
    </Box>
  );
}
