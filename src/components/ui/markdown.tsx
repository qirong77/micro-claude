import React from "react";
import { Text, Box } from "ink";
import { C } from "./data.js";

// ── Simple Markdown Parser & Renderer for Ink ────────────

interface MarkdownToken {
  type:
    | "text"
    | "bold"
    | "italic"
    | "code"
    | "inlineCode"
    | "heading"
    | "hr"
    | "listItem"
    | "blockquote"
    | "codeBlock";
  content: string;
  language?: string;
  depth?: number; // heading level
}

/**
 * Parse inline markdown (bold, italic, inline code, text).
 */
function parseInline(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  // Regex order matters: bold before italic, inline code first
  const parts = text.split(
    /(`[^`]+`)|(\*\*\*(.+?)\*\*\*)|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(___(.+?)___)|(__(.+?)__)|(_(.+?)_)/,
  );

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === undefined) continue;

    // inline code
    if (part.startsWith("`") && part.endsWith("`")) {
      tokens.push({ type: "inlineCode", content: part.slice(1, -1) });
      continue;
    }

    // bold+italic ***
    const biMatch = part.match(/^\*\*\*(.+?)\*\*\*$/);
    if (biMatch) {
      tokens.push({ type: "bold", content: biMatch[1] });
      tokens.push({ type: "italic", content: "" });
      continue;
    }

    // bold **
    const bMatch = part.match(/^\*\*(.+?)\*\*$/);
    if (bMatch) {
      tokens.push({ type: "bold", content: bMatch[1] });
      continue;
    }

    // italic *
    const iMatch = part.match(/^\*(.+?)\*$/);
    if (iMatch) {
      tokens.push({ type: "italic", content: iMatch[1] });
      continue;
    }

    // bold+italic ___
    const biMatch2 = part.match(/^___(.+?)___$/);
    if (biMatch2) {
      tokens.push({ type: "bold", content: biMatch2[1] });
      tokens.push({ type: "italic", content: "" });
      continue;
    }

    // bold __
    const bMatch2 = part.match(/^__(.+?)__$/);
    if (bMatch2) {
      tokens.push({ type: "bold", content: bMatch2[1] });
      continue;
    }

    // italic _
    const iMatch2 = part.match(/^_(.+?)_$/);
    if (iMatch2) {
      tokens.push({ type: "italic", content: iMatch2[1] });
      continue;
    }

    // plain text
    if (part.length > 0) {
      tokens.push({ type: "text", content: part });
    }
  }

  return tokens;
}

/**
 * Parse a full markdown text into block-level tokens.
 * Each block may contain inline tokens.
 */
export function parseMarkdown(text: string): MarkdownToken[] {
  const lines = text.split("\n");
  const blocks: MarkdownToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (line.trimStart().startsWith("```")) {
      const language = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "codeBlock", content: codeLines.join("\n"), language: language || undefined });
      continue;
    }

    // Heading (###)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: "heading", content: headingMatch[2], depth: headingMatch[1].length });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      blocks.push({ type: "hr", content: "" });
      i++;
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        quoteLines.push(lines[i].trimStart().slice(2));
        i++;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join("\n") });
      continue;
    }

    // List item
    const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listMatch) {
      const listLines: string[] = [listMatch[2]];
      const indent = listMatch[1];
      i++;
      // Continuation lines
      while (i < lines.length) {
        const trimmed = lines[i];
        // next list item at same level or blank line
        if (/^\s*[-*+]\s/.test(trimmed) && trimmed.search(/\S/) === indent.length) break;
        if (/^\s*$/.test(trimmed)) { i++; break; }
        listLines.push(trimmed);
        i++;
      }
      blocks.push({ type: "listItem", content: listLines.join("\n") });
      continue;
    }

    // Ordered list item
    const oListMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (oListMatch) {
      const listLines: string[] = [oListMatch[2]];
      i++;
      while (i < lines.length) {
        const trimmed = lines[i];
        if (/^\s*\d+\.\s/.test(trimmed)) break;
        if (/^\s*$/.test(trimmed)) { i++; break; }
        listLines.push(trimmed);
        i++;
      }
      blocks.push({ type: "listItem", content: listLines.join("\n") });
      continue;
    }

    // Blank line — skip
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Regular paragraph — collect until blank line or block element
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i];
      if (/^\s*$/.test(next)) break;
      if (/^(#{1,6}\s|```|>\s|[-*_]{3,}\s*$)/.test(next)) break;
      if (/^\s*[-*+]\s/.test(next)) break;
      if (/^\s*\d+\.\s/.test(next)) break;
      paraLines.push(next);
      i++;
    }
    blocks.push({ type: "text", content: paraLines.join("\n") });
  }

  return blocks;
}

// ── Render Inline Tokens ────────────────────────────────

function InlineRenderer({ tokens }: { tokens: MarkdownToken[] }): React.ReactNode {
  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case "bold":
            return (
              <Text key={i} bold color={C.primary}>
                {token.content}
              </Text>
            );
          case "italic":
            return (
              <Text key={i} italic color={C.cyan}>
                {token.content}
              </Text>
            );
          case "inlineCode":
            return (
              <Text key={i} color={C.warning} backgroundColor="#333">
                {" "}
                {token.content}
                {" "}
              </Text>
            );
          case "text":
          default:
            return <Text key={i}>{token.content}</Text>;
        }
      })}
    </>
  );
}

// ── Block Renderer ──────────────────────────────────────

export function MarkdownBlock({ block }: { block: MarkdownToken }): React.ReactNode {
  switch (block.type) {
    case "heading":
      return (
        <Box paddingX={1}>
          <Text bold color={C.secondary} underline>
            {"#".repeat(block.depth ?? 3)} {block.content}
          </Text>
        </Box>
      );

    case "hr":
      return (
        <Box paddingX={1}>
          <Text dimColor>{"─".repeat(40)}</Text>
        </Box>
      );

    case "codeBlock":
      return (
        <Box
          paddingX={1}
          paddingY={0}
          flexDirection="column"
          borderStyle="round"
          borderColor="#555"
        >
          {block.language && (
            <Text dimColor>{block.language}</Text>
          )}
          {block.content.split("\n").map((line, i) => (
            <Text key={i} color={C.magenta}>
              {"  "}{line}
            </Text>
          ))}
        </Box>
      );

    case "blockquote":
      return (
        <Box paddingX={1} borderLeft borderColor={C.cyan}>
          <InlineRenderer tokens={parseInline(block.content)} />
        </Box>
      );

    case "listItem":
      return (
        <Box paddingX={1}>
          <Text color={C.primary}>• </Text>
          <Box flexDirection="column">
            {block.content.split("\n").map((line, i) => (
              <Text key={i}>
                <InlineRenderer tokens={parseInline(line)} />
              </Text>
            ))}
          </Box>
        </Box>
      );

    case "text":
    default:
      return (
        <Box paddingX={1}>
          <Text>
            <InlineRenderer tokens={parseInline(block.content)} />
          </Text>
        </Box>
      );
  }
}

// ── Full Markdown Renderer ──────────────────────────────

export function MarkdownRenderer({ text }: { text: string }): React.ReactNode {
  const blocks = parseMarkdown(text);

  return (
    <Box flexDirection="column">
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} />
      ))}
    </Box>
  );
}

/** Memoized version — skips re-render when text hasn't changed */
export const MemoizedMarkdownRenderer = React.memo(MarkdownRenderer);
