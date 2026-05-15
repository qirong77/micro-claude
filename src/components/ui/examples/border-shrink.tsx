import { Box, render, Text, useStdout, useApp } from 'ink';
import React, { useEffect, useState } from 'react';

function BorderExample() {
  const { stdout } = useStdout();
  const { exit } = useApp();
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [columns, setColumns] = useState(stdout.columns);

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

  useEffect(() => {
    const handleResize = () => {
      setColumns(process.stdout.columns);
    };
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.removeListener('resize', handleResize);
    };
  }, []);

  const dashLine = '-'.repeat(Math.max(0, columns - 1));

  return (
    <Box flexDirection="column">
      <Text>{dashLine}</Text>

      <Text>border-example</Text>
      <Text>运行时间: {elapsed}秒</Text>
    </Box>
  );
}

const {waitUntilExit} = render(<BorderExample />);
waitUntilExit()