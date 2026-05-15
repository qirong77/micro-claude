import React from 'react';
import { Box } from '@anthropic/ink';

import { TerminalInputUI } from './components/TerminalInput/TerminalInput.js';
import { ConversationUI } from './components/Conversation/index.js';
import { MessageBarUI } from './components/MessageBar/index.js';
import { ThinkTextUI } from './components/ThinkText/index.js';
import { ToolCallListUI } from './components/ToolCallList/index.js';
import { WorkingStatusUI } from './components/WorkingStatus/index.js';
import { DropDownUI } from './components/DropDown/index.js';

export function App(): React.ReactNode {
  return (
    <Box flexDirection="column" height="100%">
      <TerminalInputUI.renderFn />
      <WorkingStatusUI.renderFn />
      <DropDownUI.renderFn />
      <MessageBarUI.renderFn />
      <ToolCallListUI.renderFn />
      <ThinkTextUI.renderFn />
      <ConversationUI.renderFn />
      <Box paddingBottom={1} />
    </Box>
  );
}
