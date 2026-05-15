import { Box, render, Text, useStdout, useApp } from 'ink';
import React, { useEffect, useState } from 'react';

function BorderExample() {
  const { stdout } = useStdout();
  const { exit } = useApp();
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const onKeyPress = (ch: string, key: { ctrl: boolean }) => {
      if (key.ctrl && ch === 'c') {
        exit();
      }
    };
    process.stdin.on('keypress', onKeyPress);
    return () => {
      process.stdin.removeListener('keypress', onKeyPress);
    };
  }, [exit]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const count = stdout.columns;
  const dashes = Array.from({ length: count }, (_, i) => (
    <Text key={i}>-</Text>
  ));

  return (
    <Box flexDirection="column">
      <Box>
        {dashes}
      </Box>

      <Text>border-example</Text>
      <Text>运行时间: {elapsed}秒</Text>
    </Box>
  );
}

const {waitUntilExit} = render(<BorderExample />);
waitUntilExit()