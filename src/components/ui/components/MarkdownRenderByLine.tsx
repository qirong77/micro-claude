import React from 'react';
import { Text } from 'ink';
import { C } from '../data';

export function MarkdownRenderByLine(props: { text: string }) {
  const { text } = props;
  const isTitle = props.text.startsWith('#');
  if (isTitle) return <Text color={C.cyan} bold>{text}</Text>;
  if (text.startsWith('```')) {
    return <Text  dimColor>{text}</Text>;
  }
  if (text.startsWith('> ')) {
    return <Text dimColor>{text}</Text>;
  }
  return <Text>{text}</Text>;
}
