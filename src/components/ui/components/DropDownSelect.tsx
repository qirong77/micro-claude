import { Box } from 'ink';
import React from 'react';
import { useSchedulState } from '../hooks';
import {
  showModelSwitchAtom,
  modelOptionsAtom,
  selectedModelIndexAtom,
  modelAtom,
  showEffortSwitchAtom,
  effortOptionsAtom,
  selectedEffortIndexAtom,
  effortAtom,
  EFFORT_TOKENS,
  showSessionListAtom,
  sessionsIndexAtom,
  selectedSessionIndexAtom,
  currentSessionIdAtom,
} from '../../../store';
import { C } from '../data.js';
import { CommandDropdown } from './CommandDropdown.js';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DropDownSelect() {
  const showModelSwitch = useSchedulState(showModelSwitchAtom);
  const modelOptions = useSchedulState(modelOptionsAtom);
  const selectedModelIndex = useSchedulState(selectedModelIndexAtom);
  const currentModel = useSchedulState(modelAtom);
  const showEffortSwitch = useSchedulState(showEffortSwitchAtom);
  const effortOptions = useSchedulState(effortOptionsAtom);
  const selectedEffortIndex = useSchedulState(selectedEffortIndexAtom);
  const currentEffort = useSchedulState(effortAtom);
  const showSessionList = useSchedulState(showSessionListAtom);
  const sessions = useSchedulState(sessionsIndexAtom);
  const selectedSessionIndex = useSchedulState(selectedSessionIndexAtom);
  const currentSessionId = useSchedulState(currentSessionIdAtom);

  return (
    <Box flexDirection="column">
      {showEffortSwitch && (
        <CommandDropdown
          items={effortOptions.map((opt) => ({
            key: opt.name,
            label: opt.label,
            suffix: opt.name === currentEffort
              ? { text: '(active)', color: C.success }
              : { text: `${EFFORT_TOKENS[opt.name]} tok`, color: C.dim },
          }))}
          selectedIndex={selectedEffortIndex}
          title="select effort level:"
          emptyMessage="no options available"
        />
      )}

      {showModelSwitch && (
        <CommandDropdown
          items={modelOptions.map((opt) => ({
            key: opt.name,
            label: opt.label,
            suffix: opt.name === currentModel ? { text: '(active)', color: C.success } : undefined,
          }))}
          selectedIndex={selectedModelIndex}
          title="select a model:"
          emptyMessage="no models available"
        />
      )}

      {showSessionList && (
        <CommandDropdown
          items={sessions.map((s) => ({
            key: s.id,
            label: `${s.title}  ${formatTime(s.createdAt)}`,
            suffix: s.id === currentSessionId ? { text: '(active)', color: C.success } : undefined,
          }))}
          selectedIndex={selectedSessionIndex}
          title="select a session:"
          emptyMessage="no sessions yet"
        />
      )}
    </Box>
  );
}
