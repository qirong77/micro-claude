import { Box, Text } from "@anthropic/ink";
import React from "react";
import { useCallback, useState } from "react";
import { SimpleTextInput } from "./Input";
import { C } from "../../data";
import mitt from 'mitt'
import { terminalInputTextAtom } from '../../../../store/agentAtom.js';
type Events = {
  submit: string
}
const emitter = mitt<Events>()

function TerminalInput() {
  const [input, setInput] = useState(terminalInputTextAtom.get());
  const [cursorOffset, setCursorOffset] = useState(0);
  const [prevInputs, setPrevInputs] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const columns = process.stdout.columns - 6;

  const onSubmit = useCallback(
    (value: string) => {
      if (value.trim()) {
        const trimmed = value.trim();
        setPrevInputs(prev => [...prev, trimmed]);
        setHistoryIndex(-1);
        setInput('');
        setCursorOffset(0);
        emitter.emit('submit',trimmed)
      }
    },
    [],
  );

  const onExit = useCallback(() => {
    process.exit(0);
  }, []);

  const handleChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const onHistoryUp = useCallback(() => {
    if (prevInputs.length === 0) return;
    const newIndex = historyIndex < prevInputs.length - 1 ? historyIndex + 1 : historyIndex;
    if (newIndex !== historyIndex) {
      setHistoryIndex(newIndex);
      const val = prevInputs[prevInputs.length - 1 - newIndex]!;
      setInput(val);
      setCursorOffset(val.length);
    }
  }, [historyIndex, prevInputs]);

  const onHistoryDown = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const val = prevInputs[prevInputs.length - 1 - newIndex]!;
      setInput(val);
      setCursorOffset(val.length);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setInput('');
      setCursorOffset(0);
    }
  }, [historyIndex, prevInputs]);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        flexDirection="row"
        alignItems="flex-start"
        justifyContent="flex-start"
        borderStyle="round"
        borderLeft={false}
        borderRight={false}
        borderBottom
        width="100%"
      >
        <Box marginLeft={1} marginRight={1}>
          <Text bold color={C.primary}>{'❯'}</Text>
        </Box>
        <Box flexGrow={1} flexShrink={1}>
          <SimpleTextInput
            value={input}
            onChange={handleChange}
            onSubmit={onSubmit}
            onExit={onExit}
            focus={true}
            multiline={true}
            placeholder="Type something and press Enter..."
            columns={columns}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
            onHistoryUp={onHistoryUp}
            onHistoryDown={onHistoryDown}
          />
        </Box>
      </Box>
    </Box>
  );
}

export const TerminalInputUI = {
  renderFn:TerminalInput,
  emitter,
  atomText: terminalInputTextAtom,
}