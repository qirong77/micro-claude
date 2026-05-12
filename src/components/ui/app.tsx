import React, { useCallback, useMemo, useReducer, useState } from 'react';
import { Box, useInput } from 'ink';
import type Anthropic from '@anthropic-ai/sdk';
import type { Command } from './data.js';

import { LogArea } from './components/LogArea.js';
import { RunningStatus } from './components/RunningStatus.js';
import { CommandDropdown } from './components/CommandDropdown.js';
import {
  InputBar,
  inputReducer,
  initialState,
  useInputHandler,
} from './components/InputBar/index.js';

interface AppProps {
  messages: Anthropic.MessageParam[];
  isLoading?: boolean;
  quickCommands: Command[];
  onSubmit?: (text: string) => void;
  statuses?: Array<{ id: string; text: string }>;
}

export function App({
  messages,
  isLoading,
  quickCommands,
  onSubmit,
  statuses,
}: AppProps): React.ReactNode {
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
    (name: string) => {
      const cmd = quickCommands.find((c) => c.name === name);
      cmd?.action();
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
  });

  useInput(handleInput);

  return (
    <Box flexDirection="column" height="100%">
      <LogArea messages={messages} />
      <InputBar value={inputValue} cursorOffset={cursorOffset} />
      <RunningStatus statuses={statuses} />
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
