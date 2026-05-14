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
} from '../../../store';
import { C } from '../data.js';
import { CommandDropdown } from './CommandDropdown.js';

export function DropDownSelect() {
  const showModelSwitch = useSchedulState(showModelSwitchAtom);
  const modelOptions = useSchedulState(modelOptionsAtom);
  const selectedModelIndex = useSchedulState(selectedModelIndexAtom);
  const currentModel = useSchedulState(modelAtom);
  const showEffortSwitch = useSchedulState(showEffortSwitchAtom);
  const effortOptions = useSchedulState(effortOptionsAtom);
  const selectedEffortIndex = useSchedulState(selectedEffortIndexAtom);
  const currentEffort = useSchedulState(effortAtom);

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
    </Box>
  );
}
