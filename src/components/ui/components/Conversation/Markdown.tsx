import React, { useMemo } from 'react';
import { Box, Text, Ansi, stringWidth } from '@anthropic/ink';
import { marked } from 'marked';
import stripAnsi from 'strip-ansi';
import type { Token, Tokens } from 'marked';

let markedConfigured = false;
function configureMarked(): void {
  if (markedConfigured) return;
  markedConfigured = true;
  marked.use({
    tokenizer: {
      del() {
        return undefined;
      },
    },
  });
}

const CODE_COLOR = '#91c1f7';
const LINK_COLOR = '#4a9eff';
const BLOCKQUOTE_BAR = '\u258e';

const ANSI_BOLD = '\x1b[1m';
const ANSI_BOLD_END = '\x1b[22m';

// ── Inline token renderer ──

function renderInline(tokens: Token[] | undefined): React.ReactNode[] {
  if (!tokens) return [];
  return tokens.map((token, i) => {
    switch (token.type) {
      case 'text':
        return token.text;
      case 'strong':
        return <Text bold key={i}>{renderInline((token as { tokens?: Token[] }).tokens)}</Text>;
      case 'em':
        return <Text italic key={i}>{renderInline((token as { tokens?: Token[] }).tokens)}</Text>;
      case 'codespan':
        return <Text color={CODE_COLOR} key={i}>{(token as { text: string }).text}</Text>;
      case 'link':
        return <Text color={LINK_COLOR} key={i}>{renderInline((token as { tokens?: Token[] }).tokens)}</Text>;
      case 'image':
        return <Text dimColor key={i}>[{(token as { href: string }).href}]</Text>;
      case 'del':
        return <Text strikethrough key={i}>{renderInline((token as { tokens?: Token[] }).tokens)}</Text>;
      case 'br':
        return '\n';
      case 'escape':
        return token.text;
      default:
        return null;
    }
  });
}

// ── Number formatting for ordered lists ──

function numberToLetter(n: number): string {
  let result = '';
  while (n > 0) {
    n--;
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

const ROMAN_VALUES: [number, string][] = [
  [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
  [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
  [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
];

function numberToRoman(n: number): string {
  let result = '';
  for (const [value, numeral] of ROMAN_VALUES) {
    while (n >= value) {
      result += numeral;
      n -= value;
    }
  }
  return result;
}

function getListNumber(depth: number, n: number): string {
  switch (depth) {
    case 0:
    case 1: return n.toString();
    case 2: return numberToLetter(n);
    case 3: return numberToRoman(n);
    default: return n.toString();
  }
}

// ── Table: cell text formatting ──

function formatCellAnsi(tokens: Token[] | undefined): string {
  if (!tokens) return '';
  return tokens.map(t => {
    switch (t.type) {
      case 'text': return (t as Tokens.Text).text;
      case 'strong': return ANSI_BOLD + formatCellAnsi((t as { tokens?: Token[] }).tokens) + ANSI_BOLD_END;
      case 'em': return formatCellAnsi((t as { tokens?: Token[] }).tokens);
      case 'codespan': return (t as { text: string }).text;
      case 'link': return formatCellAnsi((t as { tokens?: Token[] }).tokens);
      case 'del': return formatCellAnsi((t as { tokens?: Token[] }).tokens);
      default: return '';
    }
  }).join('');
}

function cellDisplayWidth(tokens: Token[] | undefined): number {
  return stringWidth(stripAnsi(formatCellAnsi(tokens)));
}

// ── Table: padding ──

function padAligned(content: string, displayWidth: number, targetWidth: number, align: 'left' | 'center' | 'right' | null | undefined): string {
  const padding = Math.max(0, targetWidth - displayWidth);
  if (align === 'center') {
    const leftPad = Math.floor(padding / 2);
    return ' '.repeat(leftPad) + content + ' '.repeat(padding - leftPad);
  }
  if (align === 'right') return ' '.repeat(padding) + content;
  return content + ' '.repeat(padding);
}

// ── Table component ──

const MIN_COL_WIDTH = 3;

function MarkdownTable({ token }: { token: Tokens.Table }): React.ReactNode {
  const numCols = token.header.length;

  // Format each cell with ANSI bold for headers
  const headerBold = token.header.map(h => ANSI_BOLD + formatCellAnsi(h.tokens) + ANSI_BOLD_END);
  const rowFormatted = token.rows.map(row =>
    row.map(cell => formatCellAnsi(cell?.tokens)),
  );

  // Calculate column widths
  const columnWidths = token.header.map((_, ci) => {
    let max = Math.max(cellDisplayWidth(token.header[ci]!.tokens), MIN_COL_WIDTH);
    for (const row of token.rows) {
      max = Math.max(max, cellDisplayWidth(row[ci]?.tokens), MIN_COL_WIDTH);
    }
    return max;
  });

  const lines: string[] = [];

  function border(type: 'top' | 'middle' | 'bottom'): string {
    const c = {
      top:    ['\u250c','\u2500','\u252c','\u2510'],
      middle: ['\u251c','\u2500','\u253c','\u2524'],
      bottom: ['\u2514','\u2500','\u2534','\u2518'],
    }[type];
    let line = c[0];
    columnWidths.forEach((w, i) => {
      line += c[1].repeat(w + 2);
      line += i < numCols - 1 ? c[2] : c[3];
    });
    return line;
  }

  function renderRow(cells: string[], isHeader: boolean): string {
    let line = '\u2502';
    cells.forEach((cell, ci) => {
      const w = columnWidths[ci]!;
      const align = isHeader ? 'center' : (token.align?.[ci] ?? 'left');
      const dw = stringWidth(stripAnsi(cell));
      line += ' ' + padAligned(cell, dw, w, align) + ' \u2502';
    });
    return line;
  }

  lines.push(border('top'));
  lines.push(renderRow(headerBold, true));
  lines.push(border('middle'));
  token.rows.forEach((_, ri) => {
    lines.push(renderRow(rowFormatted[ri]!, false));
    if (ri < token.rows.length - 1) {
      lines.push(border('middle'));
    }
  });
  lines.push(border('bottom'));

  return <Ansi>{lines.join('\n')}</Ansi>;
}

// ── Block token renderer ──

function renderBlock(
  token: Token,
  listDepth: number = 0,
  orderedListNumber: number | null = null,
): React.ReactNode {
  switch (token.type) {
    case 'heading': {
      const content = renderInline((token as { tokens?: Token[] }).tokens);
      if ((token as Tokens.Heading).depth === 1) {
        return (
          <Box marginTop={1}>
            <Text bold italic underline>{content}</Text>
          </Box>
        );
      }
      return (
        <Box marginTop={1}>
          <Text bold>{content}</Text>
        </Box>
      );
    }

    case 'paragraph':
      return (
        <Box>
          <Text>{renderInline((token as Tokens.Paragraph).tokens)}</Text>
        </Box>
      );

    case 'code': {
      const codeToken = token as Tokens.Code;
      return (
        <Box flexDirection="column">
          {codeToken.lang ? (
            <Text dimColor>{codeToken.lang}</Text>
          ) : null}
          <Text dimColor>{codeToken.text.trimEnd()}</Text>
        </Box>
      );
    }

    case 'blockquote': {
      return (
        <Box flexDirection="column">
          {((token as Tokens.Blockquote).tokens ?? []).map((t, i) => (
            <Box key={i} flexDirection="row">
              <Text dimColor>{BLOCKQUOTE_BAR} </Text>
              <Text italic>{renderBlock(t)}</Text>
            </Box>
          ))}
        </Box>
      );
    }

    case 'list': {
      const listToken = token as Tokens.List;
      return (
        <Box flexDirection="column">
          {listToken.items.map((item: Token, index: number) =>
            renderBlock(
              item,
              listDepth,
              listToken.ordered ? Number(listToken.start) + index : null,
            ),
          )}
        </Box>
      );
    }

    case 'list_item': {
      const prefix = orderedListNumber !== null
        ? `${getListNumber(listDepth, orderedListNumber)}. `
        : '- ';
      const itemTokens = (token as Tokens.ListItem).tokens ?? [];
      return (
        <Box marginLeft={listDepth * 2} flexDirection="column">
          {itemTokens.map((t, j) => {
            if (j === 0 && t.type === 'text') {
              return (
                <Text key={j}>
                  <Text dimColor>{prefix}</Text>
                  {renderInline((t as Tokens.Text).tokens)}
                </Text>
              );
            }
            if (j === 0 && t.type === 'paragraph') {
              return (
                <Box key={j}>
                  <Text>
                    <Text dimColor>{prefix}</Text>
                    {renderInline((t as Tokens.Paragraph).tokens)}
                  </Text>
                </Box>
              );
            }
            return renderBlock(t, listDepth + 1);
          })}
        </Box>
      );
    }

    case 'table':
      return <MarkdownTable token={token as Tokens.Table} />;

    case 'hr':
      return (
        <Box>
          <Text dimColor>---</Text>
        </Box>
      );

    case 'space':
      return <Box height={1} />;

    case 'text': {
      const textToken = token as Tokens.Text;
      if (textToken.tokens) {
        return <Text>{renderInline(textToken.tokens)}</Text>;
      }
      return <Text>{textToken.text}</Text>;
    }

    case 'html':
    case 'def':
      return null;

    default:
      return null;
  }
}

// ── Markdown component ──

export function Markdown({ children }: { children: string }): React.ReactNode {
  configureMarked();
  const elements = useMemo(() => {
    const tokens = marked.lexer(children);
    return tokens.map((token, i) => (
      <React.Fragment key={i}>
        {renderBlock(token)}
      </React.Fragment>
    ));
  }, [children]);

  return (
    <Box flexDirection="column">
      {elements}
    </Box>
  );
}
