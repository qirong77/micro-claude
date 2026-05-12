import React from 'react';
import { Text, Box } from 'ink';
import { marked } from 'marked';
import type { Token, Tokens } from 'marked';
import { C } from '../data.js';

function subKey(prefix: string | number, ...parts: (string | number)[]) {
  return [prefix, ...parts].join('-');
}

function mapInlineTokens(tokens: Token[], prefix: string | number) {
  return tokens.map((child, j) => renderInlineToken(child, subKey(prefix, j)));
}

function renderInline(tokens: Token[], key: string | number): React.ReactNode {
  return <Text key={key}>{mapInlineTokens(tokens, key)}</Text>;
}

type InkTextStyle = Pick<React.ComponentProps<typeof Text>, 'bold' | 'italic' | 'strikethrough'>;

function styledInline(key: string | number, style: InkTextStyle, tokens: Token[]): React.ReactNode {
  return (
    <Text key={key} {...style}>
      {mapInlineTokens(tokens, key)}
    </Text>
  );
}

function renderInlineToken(token: Token, key: string | number): React.ReactNode {
  switch (token.type) {
    case 'strong':
      return styledInline(key, { bold: true }, (token as Tokens.Strong).tokens);
    case 'em':
      return styledInline(key, { italic: true }, (token as Tokens.Em).tokens);
    case 'del':
      return styledInline(key, { strikethrough: true }, (token as Tokens.Del).tokens);
    case 'codespan':
      return (
        <Text key={key} color={C.cyan}>
          {(token as Tokens.Codespan).text}
        </Text>
      );
    case 'link': {
      const t = token as Tokens.Link;
      return (
        <Text key={key} color={C.cyan} dimColor>
          {t.text || t.href}
        </Text>
      );
    }
    case 'image': {
      const t = token as Tokens.Image;
      return (
        <Text key={key} color={C.dim}>
          [Image: {t.title || t.href}]
        </Text>
      );
    }
    case 'br':
      return '\n';
    case 'html':
    case 'escape':
    case 'text':
    default: {
      const t = token as Tokens.Text | Tokens.HTML | Tokens.Escape;
      return t.text || '';
    }
  }
}

type LooseBlockToken = Token & { tokens?: Token[]; text?: string };

function renderFallbackBlock(token: Token, key: string | number) {
  const t = token as LooseBlockToken;
  if (Array.isArray(t.tokens)) {
    return renderInline(t.tokens, key);
  }
  if (typeof t.text === 'string') {
    return <Text key={key}>{t.text}</Text>;
  }
  return null;
}

function renderBlock(token: Token, key: string | number): React.ReactNode {
  switch (token.type) {
    case 'heading': {
      const t = token as Tokens.Heading;
      return (
        <Box key={key} paddingY={1}>
          <Text bold>{mapInlineTokens(t.tokens, key)}</Text>
        </Box>
      );
    }
    case 'paragraph':
      return renderInline((token as Tokens.Paragraph).tokens, key);
    case 'blockquote': {
      const t = token as Tokens.Blockquote;
      return (
        <Box key={key} flexDirection="column" paddingLeft={1}>
          {t.tokens.map((child, j) => renderBlock(child, subKey(key, j)))}
        </Box>
      );
    }
    case 'list': {
      const t = token as Tokens.List;
      let n = t.start || 1;
      return (
        <Box key={key} flexDirection="column" paddingLeft={1}>
          {t.items.map((item: Tokens.ListItem, j: number) => {
            const bullet = t.ordered ? `${n++}.` : '•';
            return (
              <Box key={subKey(key, j)} flexDirection="row">
                <Text color={C.muted}>{bullet} </Text>
                <Box flexDirection="column" flexGrow={1}>
                  {item.tokens.map((child, k) => renderBlock(child, subKey(key, j, k)))}
                </Box>
              </Box>
            );
          })}
        </Box>
      );
    }
    case 'hr':
      return (
        <Box key={key} paddingY={1}>
          <Text color={C.muted}>{'─'.repeat(40)}</Text>
        </Box>
      );
    case 'space':
      return <Box key={key} height={1} />;
    case 'html':
      return (
        <Text key={key} color={C.dim}>
          {(token as Tokens.HTML).text}
        </Text>
      );
    case 'table': {
      const t = token as Tokens.Table;
      const rows: Tokens.TableCell[][] = [...(t.header.length > 0 ? [t.header] : []), ...t.rows];
      return (
        <Box key={key} flexDirection="column" paddingLeft={1}>
          {rows.map((row, j) => (
            <Box key={subKey(key, j)} flexDirection="row">
              {row.map((cell, k) => (
                <Box key={subKey(key, j, k)} width={20}>
                  {renderInline(cell.tokens, subKey(key, j, k))}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      );
    }
    case 'checkbox':
      return (
        <Text key={key} color={C.muted}>
          [{(token as Tokens.Checkbox).checked ? 'x' : ' '}]
        </Text>
      );
    case 'code': {
      const t = token as Tokens.Code;
      return (
        <Box key={key} flexDirection="column">
          {t.lang ? (
            <Text color={C.muted} dimColor>
              {t.lang}
            </Text>
          ) : null}
          <Text>{t.text}</Text>
        </Box>
      );
    }
    default:
      return renderFallbackBlock(token, key);
  }
}

export function MarkdownRenderText({ text }: { text: string }) {
  return (
    <Box flexDirection="column">{marked.lexer(text).map((token, i) => renderBlock(token, i))}</Box>
  );
}
